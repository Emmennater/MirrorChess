
const MIRROR_RADIUS = 3;
let highlighted = { row: 0, col: 0, sectorRow: 0, sectorCol: 0 };
let checked = { row: 0, col: 0 };
let squaresHighlighted = [];
let squaresChecked = [];
let focusModeEnabled = false;

function getPieceSrcUrl(letter) {
    let side = letter.toUpperCase() == letter ? "w" : "b";
    return `https://images.chesscomfiles.com/chess-themes/pieces/icy_sea/150/${side + letter.toLowerCase()}.png`;
}

function verifySquareLoc(row, col) {
    if (row < 0 || row > 13 || col < 0 || col > 7) {
        console.error("square out of bounds");
        return false;
    }
    return true;
}

function setPieceIcon(row, col, type) {
    if (!verifySquareLoc(row, col)) return;
    const index = row * 8 + col;
    for (let r = 0; r < allboards.length; ++r) {
        for (let c = 0; c < allboards[r].length; ++c) {
            const board = allboards[r][c];
            const square = board.children[index];
            const piece = square.children[0].children[0];
            if (type == ' ')
                piece.removeAttribute("style");
            else
                piece.setAttribute("style", `background-image: url(${getPieceSrcUrl(type)});`);
        }
    }
}

function displayGameMessage(type) {
    const message = document.getElementById("splash-text");
    
    switch (type) {
    case "checkmate": message.innerText = "Checkmate!"; break;
    case "stalemate": message.innerText = "Stalemate!"; break;
    case "check": message.innerText = "Check!"; return; // break;
    }

    message.style.visibility = "visible";
}

function removeGameMessage() {
    const message = document.getElementById("splash-text");
    message.style.visibility = "hidden";
}

function highlightChecks(row, col) {
    checked.row = row;
    checked.col = col;

    for (let i = 0; i < allboards.length; ++i) {
        for (let j = 0; j < allboards[i].length; ++j) {
            const board = allboards[i][j];
            const index = row * 8 + col;
            const square = board.children[index];
            square.classList.add("check");
            squaresChecked.push(square);
        }
    }
}

function unhighlightChecks() {
    for (const square of squaresChecked) {
        square.classList.remove("check");
    }
    squaresChecked = [];
}

function highlightMoves(row, col, sectorRow, sectorCol) {
    highlighted.row = row;
    highlighted.col = col;
    highlighted.sectorRow = sectorRow;
    highlighted.sectorCol = sectorCol;

    // Get possible moves for piece
    let moves = MoveGenerator.findPieceMoves(row, col);
    for (let move of moves) {
        const index = move.to.row * 8 + move.to.col;
        let moveSectorRow = sectorRow + move.boardOffset.row + viewport.sectorRow;
        let moveSectorCol = sectorCol + move.boardOffset.col + viewport.sectorCol;

        // Focus mode
        if (focusModeEnabled) {
            moveSectorRow = MIRROR_RADIUS;
            moveSectorCol = MIRROR_RADIUS;
        }

        // Highlight main sectors moves
        // const mainBoard = allboards[sectorRow][sectorCol];
        // const mainSquare = mainBoard.children[index];
        // mainSquare.classList.add(move.isCapture ? "possible-capture" : "possible-move");
        // squaresHighlighted.push(mainSquare);
        // if (moveSectorRow == sectorRow && moveSectorCol == sectorCol) continue;

        // Highlight sector specific moves
        if (moveSectorRow < 0 || moveSectorRow >= allboards.length) continue;
        if (moveSectorCol < 0 || moveSectorCol >= allboards[moveSectorRow].length) continue;
        const board = allboards[moveSectorRow][moveSectorCol];
        const square = board.children[index];
        square.classList.add(move.isCapture ? "possible-capture" : "possible-move");
        squaresHighlighted.push(square);
    }
}

function updateHighlightedMoves() {
    resetHighlightedMoves();
    highlightMoves(highlighted.row, highlighted.col, highlighted.sectorRow, highlighted.sectorCol);
}

function resetHighlightedMoves() {
    for (const square of squaresHighlighted) {
        square.classList.remove("possible-move");
        square.classList.remove("possible-capture");
    }

    squaresHighlighted = [];
}

function setupBoard(rows, cols) {
    // Dimensions
    let ratio_r = cols > rows ? rows / cols : 1;
    let ratio_c = rows > cols ? cols / rows : 1;
    let boardElem = document.getElementById("chessboard");
    boardElem.setAttribute("style", `--cols:${cols};--rows:${rows};--ratio_r:${ratio_r};--ratio_c:${ratio_c};`);

    // Create squares
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Create square element
            let square = document.createElement("div");
            square.setAttribute("class", "square");
            square.setAttribute("draggable", "false");

            // Odd and even squares
            square.classList.add((r + c) % 2 ? "even-square" : "odd-square");

            // Piece container
            let container = document.createElement("div");
            container.setAttribute("class", "piece-container");
            container.setAttribute("draggable", "false");

            // Piece element
            let piece = document.createElement("div");
            piece.setAttribute("class", "piece");
            piece.setAttribute("draggable", "false");
            
            // Append elements
            container.appendChild(piece);
            square.appendChild(container);
            boardElem.appendChild(square);
        }
    }

    return boardElem;
}

function setupMirrors(chesselem) {
    let wrapper = document.getElementById("viewport");
    const radius = MIRROR_RADIUS; // 4
    let boards = Array(radius * 2 + 1);
    for (let i = 0; i < boards.length; ++i)
        boards[i] = Array(radius * 2 + 1);
    boards[radius][radius] = chesselem;

    // let clone = chesselem.cloneNode(true);
    // let style = clone.getAttribute("style");
    // style += `--offset_x:${1};--offset_y:${0};`;
    // clone.setAttribute("style", style);
    // wrapper.appendChild(clone);
    
    for (let r = -radius; r <= radius; ++r) {
        for (let c = -radius; c <= radius; ++c) {
            if (r == 0 && c == 0) continue;
            let clone = chesselem.cloneNode(true);
            let style = clone.getAttribute("style");
            style += `--offset_x:${c};--offset_y:${r};`;
            clone.setAttribute("style", style);
            wrapper.appendChild(clone);
            boards[r + radius][c + radius] = clone;
        }
    }
    
    chesselem.classList.add("center");
    
    return boards;
}

function enableFocusMode() {
    focusModeEnabled = true;
    boardIterator((board, r, c) => {
        if (r == MIRROR_RADIUS && c == MIRROR_RADIUS) return;
        board.style.display = "none";
    });
    const centerBoard = allboards[MIRROR_RADIUS][MIRROR_RADIUS];
    centerBoard.classList.add("focus-mode");
    viewport.left = 0;
    viewport.top = 0;
    viewport.zoom = 1;
    updateViewport();
}

function disableFocusMode() {
    focusModeEnabled = false;
    boardIterator((board, r, c) => {
        if (r == MIRROR_RADIUS && c == MIRROR_RADIUS) return;
        board.style.display = "grid";
    });
    const centerBoard = allboards[MIRROR_RADIUS][MIRROR_RADIUS];
    centerBoard.classList.remove("focus-mode");
}

function setupEventListeners(boards, eventHandler) {
    for (let r = 0; r < boards.length; ++r) {
        for (let c = 0; c < boards[r].length; ++c) {
            const board = boards[r][c];
            for (let row = 0; row < 14; ++row) {
                for (let col = 0; col < 8; ++col) {
                    const index = row * 8 + col;
                    const square = board.children[index];
                    
                    // Event listeners
                    square.addEventListener("mouseenter", e => {
                        eventHandler.setHovered(row, col, r, c, square);
                    });
                    square.addEventListener("mousedown", e => {
                        if (e.buttons != 1) return;
                        eventHandler.squareDown(row, col, r, c, square);
                    });
                    square.addEventListener("mouseup", e => {
                        if (e.button != 0) return;
                        eventHandler.squareUp(row, col, r, c, square);
                    });
                }
            }
        }
    }
}

let previousTimestamp = performance.now();
function loop(timestamp) {
    const deltaTime = (timestamp - previousTimestamp) / 1000; // Convert to seconds
    previousTimestamp = timestamp;

    CustomAnimation.updateAnimations(deltaTime);
    requestAnimationFrame(loop);
}

(function start() {
    chesselem = setupBoard(14, 8);
    allboards = setupMirrors(chesselem);
    game = new ChessGame();
    gameEvents = new ChessEvents(game);
    setupEventListeners(allboards, gameEvents);
    updateViewport();
    requestAnimationFrame(loop);

    // Menu Events
    MenuEvents.openMenu();
    MenuEvents.serverIsOffline();
    if (isMobileDevice()) MenuEvents.toggleFocusMode();

    // Connect to server
    Sockets.establishConnection();
})();

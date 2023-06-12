
viewport = { oldleft:0, oldtop:0, left: 0, top: 0, zoom: 1.8, sectorRow: 0, sectorCol: 0 };
mouse = { down: false, startX: 0, startY: 0, x: 0, y: 0, button: 0 };
gameEvents = null;

window.addEventListener('dragstart', function(e) {
    // Stop dragging events
    e.preventDefault();
});

document.addEventListener('contextmenu', function(event) {
    // Disable right-click context menu
    event.preventDefault();
});

document.addEventListener("mousedown", e => {
    if (mouse.down) return;
    mouse.down = true;
    mouse.button = e.button;
    mouse.startX = e.clientX;
    mouse.startY = e.clientY;
});

document.addEventListener("mouseup", e => {
    if (e.button != mouse.button) return;
    mouse.down = false;

    // Lock in changes
    viewport.oldleft = viewport.left;
    viewport.oldtop = viewport.top;
});

document.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (mouse.down && mouse.button == 2 && !gameEvents.busy && !focusModeEnabled) {
        // Pan
        // viewport.left = viewport.oldleft + e.clientX - mouse.startX;
        // viewport.top = viewport.oldtop + e.clientY - mouse.startY;
        viewport.left += e.movementX;
        viewport.top += e.movementY;
        updateViewport();
    }

    if (gameEvents)
        gameEvents.mouseMove(e);
});

document.addEventListener("wheel", e => {
    if (focusModeEnabled) return;
    if (mouse.down) return;
    if (gameEvents.busy) return;

    const moveViewport = !focusModeEnabled;
    const speed = 1.2;
    const minZoom = 0.7; // 1
    const viewportWidth = document.body.clientWidth;
    const viewportHeight = document.body.clientHeight;
    let focalX = mouse.x - viewportWidth / 2;
    let focalY = mouse.y - viewportHeight / 2;
    const oldZoom = viewport.zoom;
    let newZoom;

    if (!moveViewport) {
        focalX = 0;
        focalY = 0;
    }

    if (e.deltaY < 0) {
        newZoom = oldZoom * speed; // Zoom in
        const zoomRatio = speed;
        viewport.left = (viewport.left - focalX) * zoomRatio + focalX;
        viewport.top = (viewport.top - focalY) * zoomRatio + focalY;
    } else {
        newZoom = Math.max(oldZoom / speed, minZoom); // Zoom out
        const newSpeed = oldZoom / newZoom;
        const zoomRatio = 1 / newSpeed;
        viewport.left = (viewport.left - focalX) * zoomRatio + focalX;
        viewport.top = (viewport.top - focalY) * zoomRatio + focalY;
    }

    viewport.zoom = newZoom;
    viewport.oldleft = viewport.left;
    viewport.oldtop = viewport.top;
    updateViewport();
});

function updateViewport() {
    let wrapper = document.getElementById("viewport");
    const zoom = viewport.zoom;
    const width = chesselem.clientWidth * zoom;
    const height = chesselem.clientHeight * zoom;
    let left = viewport.left;
    let top = viewport.top;
    let sectorUpdated = false;

    // Wrapping
    if (!focusModeEnabled) {
        while (left > width / 2) { left -= width; ++viewport.sectorCol; sectorUpdated = true; }
        while (top > height / 2) { top -= height; ++viewport.sectorRow; sectorUpdated = true; }
        while (left < -width / 2) { left += width; --viewport.sectorCol; sectorUpdated = true; }
        while (top < -height / 2) { top += height; --viewport.sectorRow; sectorUpdated = true; }
    }
    
    // Update viewport
    viewport.left = left;
    viewport.top = top;

    // Update style
    wrapper.setAttribute("style", `
    transform: translate(${Math.round(left)}px, ${Math.round(top)}px)
    scale(${zoom});`);

    // Update highlighted moves
    if (sectorUpdated) updateHighlightedMoves();
}

class ChessEvents {
    static animationSpeed = 0.2; // 0.15

    constructor(chessgame) {
        this.chessgame = chessgame;
        this.dragOffset = { x: 0, y: 0};
        this.selected = { none: true, row: -1, col: -1, sectorRow: 0, sectorCol: 0 };
        this.hovered = { none: true, row: 0, col: 0, sectorRow: 0, sectorCol: 0 };
        this.busy = false;
        this.waiting = false;
        this.waitForPlayer = true;
        this.session = null;
    }
}

ChessEvents.prototype.resetPieceOffsets = function(index) {
    boardIterator((board, r, c) => {
        const square = board.children[index];
        const container = square.children[0];
        container.removeAttribute("style");
    });
}

ChessEvents.prototype.movePiece = function(from, to) {
    game.movePiece(from.row, from.col, to.row, to.col);
}

ChessEvents.prototype.setHovered = function(row, col, sectorRow, sectorCol) {
    this.hovered.row = row;
    this.hovered.col = col;
    this.hovered.sectorRow = sectorRow;
    this.hovered.sectorCol = sectorCol;
}

ChessEvents.prototype.squareDown = function(row, col, sectorRow, sectorCol, elem) {
    if (this.waiting) return;
    
    // Un-highlight possible moves
    resetHighlightedMoves(this.selected.row, this.selected.col, this.selected.sectorRow, this.selected.sectorCol);

    // Try to move selected (click move)
    const success = this.playMove(
        {row: this.selected.row, col: this.selected.col, sectorRow: this.selected.sectorRow, sectorCol: this.selected.sectorCol},
        {row, col, sectorRow, sectorCol}, true
    );

    // Stop if the move was valid
    if (success) {
        this.selected.none = true;
        return;
    }

    // Set selected
    this.selected.none = false;
    this.selected.row = row;
    this.selected.col = col;
    this.selected.sectorRow = sectorRow;
    this.selected.sectorCol = sectorCol;

    // Calculate offset to center piece with cursor
    const rect = elem.getClientRects()[0];
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    this.dragOffset.x = (mouse.x - centerX) / viewport.zoom;
    this.dragOffset.y = (mouse.y - centerY) / viewport.zoom;

    // Reset viewport sector
    viewport.sectorRow = 0;
    viewport.sectorCol = 0;

    // Highlight possible moves
    highlightMoves(row, col, sectorRow, sectorCol);
}

ChessEvents.prototype.squareUp = function() {
    if (this.waiting) return;
    
    // Un-highlight possible moves
    // resetHighlightedMoves(this.selected.row, this.selected.col, this.selected.sectorRow, this.selected.sectorCol);
    
    let row = this.hovered.row;
    let col = this.hovered.col;
    let sectorRow = this.hovered.sectorRow;
    let sectorCol = this.hovered.sectorCol;

    // Release the selected pieces
    if (!this.selected.none) {
        const index = this.selected.row * 8 + this.selected.col;
        this.resetPieceOffsets(index);
        const success = this.playMove(
            {row: this.selected.row, col: this.selected.col, sectorRow: this.selected.sectorRow, sectorCol: this.selected.sectorCol},
            {row, col, sectorRow, sectorCol}
        );
    
        if (success) resetHighlightedMoves();
    }

    this.selected.none = true;
    this.selected.row = row;
    this.selected.col = col;
    this.selected.sectorRow = sectorRow;
    this.selected.sectorCol = sectorCol;
}

ChessEvents.prototype.mouseMove = function(e) {
    if (this.selected.none) return;

    // Adjust the offset of all the selected pieces
    const xoff = Math.round(((e.clientX - mouse.startX) / viewport.zoom + this.dragOffset.x) * 100) / 100;
    const yoff = Math.round(((e.clientY - mouse.startY) / viewport.zoom + this.dragOffset.y) * 100) / 100;
    const index = this.selected.row * 8 + this.selected.col;
    boardIterator((board, r, c) => {
        const square = board.children[index];
        const container = square.children[0];
        container.setAttribute("style", `transform: translate(${xoff}px, ${yoff}px); z-index: 3; pointer-events: none;`);
        // container.style.transform = `translate(${xoff}px, ${yoff}px);`;
    });
}

ChessEvents.prototype.movePlayed = function(move, promotion) {
    // Play move sound
    let audioFile = move.isCapture ? "assets/capture.mp3" : "assets/move-self.mp3";
    const audio = new Audio(audioFile);
    audio.play();
}

ChessEvents.prototype.playMove = function(from, to, promotion) {
    to.sectorRow -= viewport.sectorRow;
    to.sectorCol -= viewport.sectorCol;
    
    const callback = (move, promotion) => {
        
        // Only proceed if multiplayer
        if (!this.waitForPlayer || this.session == null) return;

        // Wait for next player
        this.waiting = true;

        // Send move information to other player
        this.session.sendMove({ from, to, promotion });

        // Request move from other player
        this.session.requestMove(data => {
            // print("received move: ", data);
            const movedata = data.data;
            this.chessgame.playMove(movedata.from, movedata.to, movedata.promotion, true, false, true, true);
            this.waiting = false;
        });
    }

    const success = this.chessgame.playMove(from, to, null, promotion, false, true, false, callback);

    return success;
}

ChessEvents.prototype.animatePieceMove = function(from, to, callback) {

    const centerBoard = allboards[MIRROR_RADIUS][MIRROR_RADIUS];
    const index = from.row * 8 + from.col;
    const boardSize = centerBoard.getClientRects()[0];
    // const fromBoard = allboards[from.sectorRow][from.sectorCol];
    // const toBoard = allboards[to.sectorRow][to.sectorCol];
    // const fromSquare = fromBoard.children[from.row * 8 + from.col];
    // const toSquare = toBoard.children[to.row * 8 + to.col];
    const fromSquare = centerBoard.children[from.row * 8 + from.col];
    const toSquare = centerBoard.children[to.row * 8 + to.col];
    const fromRects = fromSquare.getClientRects()[0];
    const toRects = toSquare.getClientRects()[0];

    let sectorDeltaX = (to.sectorCol - from.sectorCol) * boardSize.width;
    let sectorDeltaY = (to.sectorRow - from.sectorRow) * boardSize.height;
    
    // Focus mode
    if (focusModeEnabled) {
        sectorDeltaX = 0;
        sectorDeltaY = 0;
    }

    const deltaX = (toRects.x - fromRects.x) + sectorDeltaX;
    const deltaY = (toRects.y - fromRects.y) + sectorDeltaY;

    const animate = time => {
        const xoff = (deltaX * time / viewport.zoom);
        const yoff = (deltaY * time / viewport.zoom);

        // Translate all the pieces
        boardIterator((board, r, c) => {
            const square = board.children[index];
            const container = square.children[0];
            container.setAttribute("style", `transform: translate(${xoff}px, ${yoff}px); z-index: 3; pointer-events: none;`);
        });
    }

    const finish = () => {
        boardIterator((board, r, c) => {
            const square = board.children[index];
            const container = square.children[0];
            container.removeAttribute("style");
        });
        this.updatePieceMove(from, to);
        callback();
    }

    new CustomAnimation(ChessEvents.animationSpeed, animate, finish);
}

ChessEvents.prototype.updatePieceMove = function(from, to) {
    const toSquare = game.squares[to.row][to.col];

    // Update the elements
    setPieceIcon(from.row, from.col, ' ');
    setPieceIcon(to.row, to.col, toSquare.piece.piece);
}

ChessEvents.prototype.requestPromotion = function(row, col, sectorRow, sectorCol, isWhite, callback) {
    this.busy = true;
    
    // Get square
    const board = allboards[sectorRow][sectorCol];
    const square = board.children[row * 8 + col];
    
    // Dim the board
    const gameElem = document.getElementById("game");
    gameElem.classList.add("dim");
    
    let rect = square.getClientRects()[0];
    let promoteElems = document.getElementsByClassName("promotion-wrapper");
    
    const promoPieces = "qnrb";
    for (let i = 0; i < promoPieces.length; i++) {
        let promotePiece = promoPieces[i];
        let promoteElem = promoteElems[0];
        let promoteWrapper = promoteElem;

        // Black or white promotion
        let promoteName = isWhite ? promotePiece.toUpperCase() : promotePiece;
        let listDirection = isWhite ? 1 : -1;

        promoteWrapper.setAttribute("class", "promotion-wrapper");
        promoteWrapper.setAttribute("style", `
        display: block;
        width: ${rect.width}px;
        height: ${rect.height}px;
        left: ${rect.left}px;
        top: ${rect.top + rect.height * i * listDirection}px;
        `);

        let promoteTile = promoteElem.children[0];
        promoteTile.setAttribute("class", "promotion");
        promoteTile.setAttribute("style", `
        background-image: url(${getPieceSrcUrl(promoteName)});
        `);

        // Select promotion option (dont add more than one of these!)
        promoteWrapper.onclick = () => {
            for (let promoElem of promoteElems) {
                promoElem.setAttribute("style", "display:none");
            }
            gameElem.classList.remove("dim");
            this.busy = false;
            callback(promotePiece);
        };

        promoteWrapper.appendChild(promoteTile);
        document.body.appendChild(promoteWrapper);
    }
}

ChessEvents.prototype.resetAllSelected = function() {
    this.selected = { none: true, row: -1, col: -1, sectorRow: 0, sectorCol: 0 };
}

function playSound(audioFile) {
    const audio = new Audio(audioFile);
    audio.play();
}

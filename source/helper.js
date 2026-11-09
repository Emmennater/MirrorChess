
const CASTLING_SQUARES = {
    whiteKingside: { letter: 'K', king: { row: 10, col: 4 }, rook: { row: 10, col: 7 } },
    whiteQueenside: { letter: 'Q', king: { row: 10, col: 4 }, rook: { row: 10, col: 0 } },
    blackKingside: { letter: 'k', king: { row: 3, col: 4 }, rook: { row: 3, col: 7 } },
    blackQueenside: { letter: 'q', king: { row: 3, col: 4 }, rook: { row: 3, col: 0 } },
};

/**
 * Load a FEN string: piece placement, then optionally the side to move ('w' or 'b') and castling rights ('KQkq' or '-')
 * @param {string} fen FEN string, where missing fields default to white to move and all castling rights
 */
ChessGame.prototype.loadFen = function(fen) {
    const [placement, side = 'w', castling = 'KQkq'] = fen.trim().split(/\s+/);

    this.loadPlacement(placement);
    this.blacksTurn = side == 'b';

    // Only keep castling rights whose king and rook are still on their home squares
    for (const [right, { letter, king, rook }] of Object.entries(CASTLING_SQUARES)) {
        const kingPiece = this.squares[king.row][king.col].piece;
        const rookPiece = this.squares[rook.row][rook.col].piece;
        const isWhite = letter == letter.toUpperCase();
        this.castling[right] = castling.includes(letter) &&
            kingPiece?.piece == (isWhite ? 'K' : 'k') && rookPiece?.piece == (isWhite ? 'R' : 'r');
    }
}

/**
 * Place pieces from the placement field of a FEN string
 * @param {string} placement Rows from top to bottom separated by '/', with digits for runs of empty squares
 */
ChessGame.prototype.loadPlacement = function(placement) {
    let row = 0;
    let col = 0;
    let idx = 0;

    while (idx < placement.length) {
        let ch = placement[idx];
        let digit = parseFloat(ch);

        if (!isNaN(digit)) {
            col += digit;
        } else if (ch === '/') {
            row++;
            col = 0;
        } else {
            // Set piece
            const square = this.squares[row][col];
            const piece = new Piece(ch);
            square.setPiece(piece);
            piece.setSquare(square);

            // Update elem
            setPieceIcon(row, col, ch);
            col++;
        }

        idx++;
    }

}

/**
 * Export the position as a FEN string, in the same format loadFen reads
 * @returns {string} Piece placement, side to move and castling rights, separated by spaces
 */
ChessGame.prototype.exportFen = function() {
    const side = this.blacksTurn ? 'b' : 'w';
    const castling = Object.entries(CASTLING_SQUARES)
        .filter(([right]) => this.castling[right])
        .map(([, { letter }]) => letter)
        .join('');

    return [this.exportPlacement(), side, castling || '-'].join(' ');
}

/**
 * Export the piece placement field of a FEN string
 * @returns {string} Rows from top to bottom separated by '/', with digits for runs of empty squares
 */
ChessGame.prototype.exportPlacement = function() {
    const rows = [];

    for (let row = 0; row < this.rows; ++row) {
        let line = '';
        let empty = 0;

        for (let col = 0; col < this.cols; ++col) {
            const piece = this.squares[row][col].piece;

            // Count empty squares until the next piece
            if (piece == null) {
                empty++;
                continue;
            }

            if (empty > 0) line += empty;
            empty = 0;
            line += piece.piece;
        }

        if (empty > 0) line += empty;
        rows.push(line);
    }

    return rows.join('/');
}

ChessGame.prototype.resetBoard = function() {
    // Reset status
    this.resetStatus();

    // Remove pieces
    for (let row = 0; row < this.rows; ++row) {
        for (let col = 0; col < this.cols; ++col) {
            const square = this.squares[row][col];
            const piece = square.piece;
            if (piece == null) continue;

            // Remove piece from square
            square.removePiece();
            setPieceIcon(row, col, ' ');
        }
    }
}

ChessGame.prototype.newGame = function(fenString) {
    // Reset annotations
    resetHighlightedMoves();
    removeGameMessage();
    unhighlightChecks();

    // Reset game board
    game.resetBoard();
    game.loadFen(fenString);

    // Reset selections
    gameEvents.resetAllSelected();

    // Update possible moves
    MoveGenerator.generateMoves(game);

    // Show a check, checkmate or stalemate the position starts in
    Move.showStatus();
}

ChessGame.prototype.movePiece = function(fromrow, fromcol, torow, tocol) {
    // Cannot move to same square
    if (fromrow == torow && fromcol == tocol) return false;
    
    // Move the piece
    const fromSquare = this.squares[fromrow][fromcol];
    const toSquare = this.squares[torow][tocol];
    if (fromSquare.piece == null) return false;
    const success = fromSquare.piece.moveTo(toSquare);
    if (!success) {
        console.error("bad move!");
        return false; // This should never be the case
    }

    return true;
}

ChessGame.prototype.removePiece = function(row, col) {
    const square = this.squares[row][col];
    if (square.piece == null) {
        console.error("no piece to remove");
        return;
    }

    // Remove the piece
    square.removePiece();

    // Update the elements
    setPieceIcon(row, col, ' ');
}

ChessGame.prototype.playMove = function(from, to, promotion = null, animate = false, override = false, sound = false, opponent = false, callback = ()=>{}) {
    // Make sure the move is to a different square
    if (from.row == to.row && from.col == to.col && from.sectorRow == to.sectorRow && from.sectorCol == to.sectorCol)
        return false;

    // Get the move if it is legal
    const move = MoveGenerator.findMove(from.row, from.col, to.row, to.col);
    if (move === false) {
        // Illegal move
        if (sound && !animate)
            playSound("assets/illegal.mp3");
        return false;
    }

    // Move is made once the animations are complete
    let promoteCallback = (promotion) => {
        if (sound) {
            // Play promote sound
            playSound("assets/promote.mp3");
        }

        callback(move, promotion);
    }

    // Instant feedback without promotion
    if (!move.isPromotion) {
        callback(move, promotion);
        promoteCallback = ()=>{}
    }

    // Make move before animation?
    move.makeMove(this, promotion, { row: to.sectorRow, col: to.sectorCol }, promoteCallback);

    if (sound) {
        // Play move sound
        const gameOver = MoveGenerator.moves.length == 0;
        let audioFile = move.isCapture ? "assets/capture.mp3" :
            opponent ? "assets/move-opponent.mp3" : "assets/move-self.mp3";
        if (move.isCastle) audioFile = "assets/castle.mp3";
        if (MoveGenerator.kingInCheck && !gameOver) audioFile = "assets/move-check.mp3";
        playSound(audioFile);
        if (gameOver) playSound("assets/game-end.mp3");
    }

    // Animate rook while castling
    if (move.constructor.name == "CastleMove") {
        move.rookMove(this, !override);
    }

    // Animate move
    if (animate) {
        gameEvents.animatePieceMove(from, to, ()=>{});
    } else {
        gameEvents.updatePieceMove(from, to);
    }

    return true;
}

function boardIterator(fun) {
    for (let r = 0; r < allboards.length; ++r) {
        for (let c = 0; c < allboards[r].length; ++c) {
            fun(allboards[r][c], r, c);
        }
    }
}

function squareIterator(fun) {

}

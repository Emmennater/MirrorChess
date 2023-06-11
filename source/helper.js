
ChessGame.prototype.loadFen = function(fen) {
    let row = 0;
    let col = 0;
    let idx = 0;

    while (idx < fen.length) {
        let ch = fen[idx];
        let digit = parseFloat(ch);

        if (ch == ' ') {
            // Only set up position
            break;
        } else if (!isNaN(digit)) {
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
    
    // Update possible moves
    MoveGenerator.generateMoves(game);
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

    // Update the elements
    setPieceIcon(fromrow, fromcol, ' ');
    setPieceIcon(torow, tocol, toSquare.piece.piece);
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

ChessGame.prototype.playMove = function(from, to, animate = false, override = false) {
    // Make sure the move is to a different square
    if (from.row == to.row && from.col == to.col && from.sectorRow == to.sectorRow && from.sectorCol == to.sectorCol)
        return false;

    const move = MoveGenerator.findMove(from.row, from.col, to.row, to.col);
    if (move === false) return false;

    const callback = () => {
        move.makeMove(this, null, { row: to.sectorRow, col: to.sectorCol });
    };

    if (move.constructor.name == "CastleMove") {
        move.rookMove(this, !override);
    }

    if (animate) {
        gameEvents.animatePieceMove(from, to, callback);
    } else {
        callback();
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

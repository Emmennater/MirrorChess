
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

    // Reset selections
    gameEvents.resetAllSelected();

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

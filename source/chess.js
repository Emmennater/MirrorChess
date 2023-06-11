
class ChessGame {
    static defaultFen = "8/8/pppppppp/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR/PPPPPPPP/8/8";

    constructor() {
        this.init();
        // this.loadFen("8/8/pppppppp/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR/PPPPPPPP/8/8");
        // this.loadFen("8/8/pppppppp/rnbqkbnr/pppppppp/8/8/8/K7/PPPPPPPP/RNBQ1BNR/PPPPPPPP/8/8");
        // this.loadFen("8/8/pppppppp/rnb1kbnr/pppppppp/8/8/7q/8/PPPPPPPP/RNBQKBNR/PPPPPPPP/8/8");
        // this.loadFen("8/8/pppppppp/rnbqk1n1/p1pppppp/8/1pKP3r/8/8/PPP1PPPP/RNBQ1BNR/PPPPPPPP/8/8");
        // this.loadFen("8/8/pppppppp/r2qk2r/8/8/8/8/8/8/R2QK2R/PPPPPPPP/8/8");
        // this.loadFen("8/8/8/3q4/8/8/8/8/8/8/4Q3/8/8/8");
        // this.loadFen("8/8/8/1p1k4/8/8/8/8/8/8/5Q2/8/8/8");
        MoveGenerator.generateMoves(this);
    }

    resetStatus() {
        // Status
        this.castling = { whiteQueenside: true, whiteKingside: true, blackQueenside: true, blackKingside: true }
        this.enPassant = null;
        this.blacksTurn = 0;
        this.moves = 0;
        this.fiftyMoveRuleCounter = 0;
        this.pastPositions = [];
    }

    init() {
        // Squares
        this.rows = 14;
        this.cols = 8;
        this.squares = Array(this.rows);
        for (let r = 0; r < this.rows; ++r) {
            this.squares[r] = Array(this.cols);
            for (let c = 0; c < this.cols; ++c) {
                this.squares[r][c] = new Square(r, c, this);
            }
        }

        // Status
        this.resetStatus();
    }
}

class Square {
    constructor(row, col, game) {
        this.game = game;
        this.row = row;
        this.col = col;
        this.piece = null;
        this.whiteAttack = false;
        this.blackAttack = false;
    }

    setPiece(obj) {
        this.removePiece();
        this.piece = obj;
    }

    removePiece() {
        if (this.piece != null)
            this.piece.square = null;
        this.piece = null;
    }
}

class Piece {
    constructor(piece) {
        this.piece = piece;
        this.type = piece.toLowerCase();
        this.isWhite = this.type != piece;
        this.square = null;
    }

    setSquare(obj) {
        this.removeSquare();
        this.square = obj;
    }

    removeSquare() {
        if (this.square != null)
            this.square.piece = null;
        this.square = null;
    }

    moveTo(square) {
        if (square == this.square) {
            console.error("cannot move piece to same square");
            return false;
        }
        if (square.piece)
            square.piece.square = null;
        square.piece = this;
        this.square.piece = null;
        this.square = square;
        return true;
    }

    promote(type) {
        this.type = type;
        this.piece = this.isWhite ? type.toUpperCase() : type;
    }
}

class Move {
    constructor(fromrow, fromcol, torow, tocol, isCapture = false, isWhite = false) {
        this.from = { row: fromrow, col: fromcol };
        this.to = { row: torow, col: tocol };
        this.boardOffset = { row: 0, col: 0 };
        this.moveVector = { row: 0, col: 0 };
        this.isAttack = true;
        this.isCapture = isCapture;
        this.isWhite = isWhite;
    }

    static moveMade(chessgame) {
        // Toggle turn
        chessgame.blacksTurn = !chessgame.blacksTurn;

        // Update possible moves
        MoveGenerator.generateMoves(chessgame);

        // Update highlighted checks
        unhighlightChecks();
        if (MoveGenerator.kingInCheck) highlightChecks(MoveGenerator.kingInCheck.row, MoveGenerator.kingInCheck.col);

        // Check & Checkmate message
        if (MoveGenerator.moves.length == 0) displayGameMessage(MoveGenerator.kingInCheck ? "checkmate" : "stalemate");
        else if (MoveGenerator.kingInCheck) displayGameMessage("check");
        else removeGameMessage();
    }

    makeMove(chessgame, _0, _1, callback) {
        // Identify the piece
        const fromSquare = chessgame.squares[this.from.row][this.from.col];
        const toSquare = chessgame.squares[this.to.row][this.to.col];
        const fromPiece = fromSquare.piece;
        const toPiece = toSquare.piece;

        // If the piece is a rook, disable castling for that side if it has not moved
        if (fromPiece != null && fromPiece.type == 'r') {
            const index = fromSquare.row * 8 + fromSquare.col;
            switch (index) {
            case 24: chessgame.castling.blackQueenside = false; break;
            case 31: chessgame.castling.blackKingside = false; break;
            case 80: chessgame.castling.whiteQueenside = false; break;
            case 87: chessgame.castling.whiteKingside = false; break;
            }
        }

        // If a rook is captured disable, disable castling for that side if it has not moved
        if (toPiece != null && toPiece.type == 'r') {
            const index = toSquare.row * 8 + toSquare.col;
            switch (index) {
            case 24: chessgame.castling.blackQueenside = false; break;
            case 31: chessgame.castling.blackKingside = false; break;
            case 80: chessgame.castling.whiteQueenside = false; break;
            case 87: chessgame.castling.whiteKingside = false; break;
            }
        }

        // King moves disable castling
        if (fromPiece != null && fromPiece.type == 'k') {
            if (this.isWhite) {
                chessgame.castling.whiteQueenside = false;
                chessgame.castling.whiteKingside = false;
            } else {
                chessgame.castling.blackQueenside = false;
                chessgame.castling.blackKingside = false;
            }
        }

        // Move the piece
        chessgame.movePiece(this.from.row, this.from.col, this.to.row, this.to.col);
        
        Move.moveMade(chessgame);
        callback(null);
    }
}

class PawnMove extends Move {
    constructor(fromrow, fromcol, torow, tocol, isCapture = false, isWhite = false, isDouble = false) {
        super(fromrow, fromcol, torow, tocol, isCapture, isWhite);
        this.isDouble = isDouble;
        this.isEnPassant = false;
        this.isPromotion = false;
        this.direction = 1;
        this.moveVector.row = Math.sign(torow - fromrow);
        this.moveVector.col = Math.sign(tocol - fromcol);
    }

    makeMove(chessgame, promotionPiece = null, sector = null, callback) {
        chessgame.movePiece(this.from.row, this.from.col, this.to.row, this.to.col);
        
        // En passant move
        if (this.isEnPassant) {
            chessgame.removePiece(game.enPassant.row, game.enPassant.col);
        }

        // Double move for en passant
        if (this.isDouble) {
            chessgame.enPassant = chessgame.squares[this.to.row][this.to.col];
        } else {
            chessgame.enPassant = null;
        }

        // Promotion
        if (this.isPromotion) {
            let promoteTo = promotionPiece => {
                // Promote the piece
                const square = chessgame.squares[this.to.row][this.to.col];;
                const piece = square.piece;
                piece.promote(promotionPiece);

                // Update the piece element
                setPieceIcon(this.to.row, this.to.col, piece.piece);

                Move.moveMade(chessgame);
                callback(promotionPiece);
            };

            // Get promotion piece if null
            if (promotionPiece == null) {
                // Temporarily clear the piece element
                setPieceIcon(this.to.row, this.to.col, ' ');

                // Pend promotion piece
                gameEvents.requestPromotion(this.to.row, this.to.col, sector.row, sector.col, this.isWhite, promoteTo);
            } else {
                promoteTo(promotionPiece);
            }

            // Exit
            return;
        }

        Move.moveMade(chessgame);
        callback(null);
    }
}

class CastleMove {
    constructor(castleType, isWhite = false) {
        this.boardOffset = { row: 0, col: 0 };
        this.moveVector = { row: 0, col: 0 };
        this.castleType = castleType;
        
        switch (castleType) {
        case "whiteQueenside":
            this.from = { row: 10, col: 4};
            this.to = { row: 10, col: 2};
            this.rook = { from: { row: 10, col: 0 }, to: { row: 10, col: 3 } };
            break;
        case "whiteKingside":
            this.from = { row: 10, col: 4};
            this.to = { row: 10, col: 6};
            this.rook = { from: { row: 10, col: 7 }, to: { row: 10, col: 5 } };
            break;
        case "blackQueenside":
            this.from = { row: 3, col: 4};
            this.to = { row: 3, col: 2};
            this.rook = { from: { row: 3, col: 0 }, to: { row: 3, col: 3 } };
            break;
        case "blackKingside":
            this.from = { row: 3, col: 4};
            this.to = { row: 3, col: 6};
            this.rook = { from: { row: 3, col: 7 }, to: { row: 3, col: 5 } };
            break;
        }
        
        this.isWhite = isWhite;
        this.isAttack = false;
        this.isCapture = false;
    }

    makeMove(chessgame, moveRook = true, _0, callback) {
        // Move the king
        chessgame.movePiece(this.from.row, this.from.col, this.to.row, this.to.col);
        if (moveRook) chessgame.movePiece(this.rook.from.row, this.rook.from.col, this.rook.to.row, this.rook.to.col);

        // Disable castling
        if (this.isWhite) {
            chessgame.castling.whiteQueenside = false;
            chessgame.castling.whiteKingside = false;
        } else {
            chessgame.castling.blackQueenside = false;
            chessgame.castling.blackKingside = false;
        }

        Move.moveMade(chessgame);
        callback(null);
    }

    rookMove(chessgame, animate = false) {
        // Animate rook movement
        const callback = () => chessgame.movePiece(this.rook.from.row, this.rook.from.col, this.rook.to.row, this.rook.to.col);
        if (!animate) return callback();
        const rookfrom = { row: this.rook.from.row, col: this.rook.from.col, sectorRow: 0, sectorCol: 0 };
        const rookto = { row: this.rook.to.row, col: this.rook.to.col, sectorRow: 0, sectorCol: 0 };
        gameEvents.animatePieceMove(rookfrom, rookto, callback);
    }
}

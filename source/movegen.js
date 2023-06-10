
const UPPER_BOUND = 100000;

function wrapRow(row) {
    if (row < 0) row += 14;
    else if (row > 13) row -= 14;
    return row;
}

function wrapCol(col) {
    if (col < 0) col += 8;
    else if (col > 7) col -= 8;
    return col;
}

class MoveGenerator {
    static position = null;
    static moves = [];
    static castleMoves = [];
    static whiteAttacks = Array.from({ length: 14 }, () => Array(8).fill(0));
    static blackAttacks = Array.from({ length: 14 }, () => Array(8).fill(0));
    static kingInCheck = null;

    static generateMoves(chessgame) {
        this.position = chessgame;
        this.moves = [];
        this.castleMoves = [];
        this.kingInCheck = null;

        // Reset attack arrays
        for (let i = 0; i < 14; ++i) {
            for (let j = 0; j < 8; ++j) {
                this.whiteAttacks[i][j] = 0;
                this.blackAttacks[i][j] = 0;
            }
        }

        // Iterate over each piece
        for (let r = 0; r < this.position.squares.length; ++r) {
            for (let c = 0; c < this.position.squares[c].length; ++c) {
                const square = this.position.squares[r][c];
                const piece = square.piece;
                if (piece == null) continue;
                // if (piece.isWhite == this.position.blacksTurn) continue;

                // Generate their moves
                switch (piece.type) {
                case 'k': this.generateKingMoves(r, c); break;
                case 'q': this.generateQueenMoves(r, c); break;
                case 'r': this.generateRookMoves(r, c); break;
                case 'b': this.generateBishopMoves(r, c); break;
                case 'n': this.generateKnightMoves(r, c); break;
                case 'p': this.generatePawnMoves(r, c); break;
                }
            }
        }

        this.generateCastleMoves();
        this.filterLegalMoves();

        // Add castle moves to moves list
        for (let move of this.castleMoves)
            this.moves.push(move);

    }

    static addPieceVector(fromrow, fromcol, rowdir, coldir, range) {
        const MAX_RANGE = 100;
        const square = this.position.squares[fromrow][fromcol];
        const piece = square.piece; // It is assumed that this exists
        let torow = fromrow;
        let tocol = fromcol;
        let boardOffset = { row: 0, col: 0 };
        let iterations = 0;
        for (let i = 0; i < range; ++i, ++iterations) {
            if (iterations > MAX_RANGE) break;
            
            // Next square
            torow += rowdir;
            tocol += coldir;
            
            // Wrapping
            if (torow < 0) {
                torow += 14;
                --boardOffset.row;
            } else if (torow > 13) {
                torow -= 14;
                ++boardOffset.row;
            }
            if (tocol < 0) {
                tocol += 8;
                --boardOffset.col;
            } else if (tocol > 7) {
                tocol -= 8;
                ++boardOffset.col;
            }

            // Overwrapping
            // if (Math.abs(boardOffset.row) > MIRROR_RADIUS * 2 || Math.abs(boardOffset.col) > MIRROR_RADIUS * 2) {
            //     break;
            // }

            const toSquare = this.position.squares[torow][tocol];
            const toPiece = toSquare.piece;

            // Add attack (if not itself)
            if (toSquare != square) {
                const attackBoard = piece.isWhite ? this.whiteAttacks : this.blackAttacks;
                attackBoard[torow][tocol] = 1;
            }

            // Check if move is legal
            if (toPiece != null && piece.isWhite == toPiece.isWhite && piece != toPiece) break;
            const capture = toPiece != null && piece != toPiece;

            // Add move
            let move = new Move(fromrow, fromcol, torow, tocol, capture, piece.isWhite);
            move.boardOffset.row = boardOffset.row;
            move.boardOffset.col = boardOffset.col;
            move.moveVector.row = rowdir;
            move.moveVector.col = coldir;
            this.moves.push(move);

            if (capture) break;

            // Stop when wrapped back to itself
            if (toSquare == square) break;
        }
    }

    static generateCastleMoves() {
        const chessgame = this.position;
        const opponentAttacks = chessgame.blacksTurn ? this.whiteAttacks : this.blackAttacks;

        function isBlocked(blockers, attackers) {
            for (let block of blockers) {
                const square = chessgame.squares[block.row][block.col];
                if (square.piece != null) return true;
            }
            for (let attack of attackers) {
                if (opponentAttacks[attack.row][attack.col]) return true;
            }
            return false;
        }

        // Castling
        // Black queenside
        if (this.position.castling.blackQueenside && this.position.blacksTurn) {
            const blockers = [{row:3,col:1},{row:3,col:2},{row:3,col:3}];
            const attackers = [{row:3,col:2},{row:3,col:3},{row:3,col:4}];
            if (!isBlocked(blockers, attackers)) {
                let move = new CastleMove("blackQueenside", false);
                this.castleMoves.push(move);
            }
        }

        // Black kingside
        if (this.position.castling.blackKingside && this.position.blacksTurn) {
            const blockers = [{row:3,col:5},{row:3,col:6}];
            const attackers = [{row:3,col:4},{row:3,col:5},{row:3,col:6}];
            if (!isBlocked(blockers, attackers)) {
                let move = new CastleMove("blackKingside", false);
                this.castleMoves.push(move);
            }
        }

        // White queenside
        if (this.position.castling.whiteQueenside && !this.position.blacksTurn) {
            const blockers = [{row:10,col:1},{row:10,col:2},{row:10,col:3}];
            const attackers = [{row:10,col:2},{row:10,col:3},{row:10,col:4}];
            if (!isBlocked(blockers, attackers)) {
                let move = new CastleMove("whiteQueenside", true);
                this.castleMoves.push(move);
            }
        }

        // White kingside
        if (this.position.castling.whiteKingside && !this.position.blacksTurn) {
            const blockers = [{row:10,col:5},{row:10,col:6}];
            const attackers = [{row:10,col:4},{row:10,col:5},{row:10,col:6}];
            if (!isBlocked(blockers, attackers)) {
                let move = new CastleMove("whiteKingside", true);
                this.castleMoves.push(move);
            }
        }
    }

    static generateKingMoves(fromrow, fromcol) {
        this.addPieceVector(fromrow, fromcol, -1, -1,  1);
        this.addPieceVector(fromrow, fromcol, -1,  0,  1);
        this.addPieceVector(fromrow, fromcol, -1,  1,  1);
        this.addPieceVector(fromrow, fromcol,  0, -1,  1);
        this.addPieceVector(fromrow, fromcol,  0,  1,  1);
        this.addPieceVector(fromrow, fromcol,  1, -1,  1);
        this.addPieceVector(fromrow, fromcol,  1,  0,  1);
        this.addPieceVector(fromrow, fromcol,  1,  1,  1);
    }

    static generateQueenMoves(fromrow, fromcol) {
        this.addPieceVector(fromrow, fromcol, -1, -1, Infinity);
        this.addPieceVector(fromrow, fromcol, -1,  0, Infinity);
        this.addPieceVector(fromrow, fromcol, -1,  1, Infinity);
        this.addPieceVector(fromrow, fromcol,  0, -1, Infinity);
        this.addPieceVector(fromrow, fromcol,  0,  1, Infinity);
        this.addPieceVector(fromrow, fromcol,  1, -1, Infinity);
        this.addPieceVector(fromrow, fromcol,  1,  0, Infinity);
        this.addPieceVector(fromrow, fromcol,  1,  1, Infinity);
    }

    static generateRookMoves(fromrow, fromcol) {
        this.addPieceVector(fromrow, fromcol, -1,  0, Infinity);
        this.addPieceVector(fromrow, fromcol,  0, -1, Infinity);
        this.addPieceVector(fromrow, fromcol,  0,  1, Infinity);
        this.addPieceVector(fromrow, fromcol,  1,  0, Infinity);
    }
    
    static generateBishopMoves(fromrow, fromcol) {
        this.addPieceVector(fromrow, fromcol, -1, -1, Infinity);
        this.addPieceVector(fromrow, fromcol, -1,  1, Infinity);
        this.addPieceVector(fromrow, fromcol,  1, -1, Infinity);
        this.addPieceVector(fromrow, fromcol,  1,  1, Infinity);
    }

    static generateKnightMoves(fromrow, fromcol) {
        this.addPieceVector(fromrow, fromcol, -2, -1,  1);
        this.addPieceVector(fromrow, fromcol, -2,  1,  1);
        this.addPieceVector(fromrow, fromcol, -1,  2,  1);
        this.addPieceVector(fromrow, fromcol,  1,  2,  1);
        this.addPieceVector(fromrow, fromcol,  2,  1,  1);
        this.addPieceVector(fromrow, fromcol,  2, -1,  1);
        this.addPieceVector(fromrow, fromcol, -1, -2,  1);
        this.addPieceVector(fromrow, fromcol,  1, -2,  1);
    }

    static generatePawnMoves(fromrow, fromcol) {
        const square = this.position.squares[fromrow][fromcol];
        const piece = square.piece;
        const whiteRank = 10;
        const blackRank = 3;
        let direction = 1;
        
        // Pawn movement direction
        if (piece.isWhite) {
            if (piece.square.row > blackRank && piece.square.row < whiteRank)
                direction = -1;
        } else {
            if (piece.square.row < blackRank || piece.square.row > whiteRank)
                direction = -1;
        }

        // Single pawn move
        let boardOffsetRow = 0;
        let torow = fromrow + direction;
        let tocol = fromcol;

        const promotion = piece.isWhite ? torow == blackRank : torow == whiteRank;

        // Wrapping
        if (torow < 0) {
            torow += 14;
            boardOffsetRow = -1;
        } else if (torow > 13) {
            torow -= 14;
            boardOffsetRow = 1;
        }

        if (this.position.squares[torow][tocol].piece == null) {
            // Add move to moves
            let move = new PawnMove(fromrow, fromcol, torow, tocol, false, piece.isWhite);
            move.direction = direction;
            move.boardOffset.row = boardOffsetRow;
            move.isPromotion = promotion;
            move.isAttack = false;
            this.moves.push(move);

            // Double pawn move
            const canDoubleMove = (fromrow - direction) == (piece.isWhite ? whiteRank : blackRank);
            if (canDoubleMove) {

                let torow2 = fromrow + direction * 2;
                let tocol2 = tocol;
                let boardOffsetRow2 = boardOffsetRow;
                
                // Wrapping
                if (torow2 < 0) {
                    torow2 += 14;
                    --boardOffsetRow2;
                } else if (torow2 > 13) {
                    torow2 -= 14;
                    ++boardOffsetRow2;
                }
    
                if (this.position.squares[torow2][tocol2].piece == null) {
                    // Add move to moves
                    let move = new PawnMove(fromrow, fromcol, torow2, tocol2, false, piece.isWhite, true);
                    move.direction = direction;
                    move.boardOffset.row = boardOffsetRow2;
                    move.isPromotion = promotion;
                    move.isAttack = false;
                    this.moves.push(move);
                }
            }
        }
        
        // Capture left
        tocol = fromcol - 1;
        
        // Wrapping
        let boardOffsetCol = 0;
        if (tocol < 0) {
            boardOffsetCol = -1;
            tocol += 8;
        }

        this.addPawnCapture(piece, fromrow, fromcol, torow, tocol, direction, boardOffsetRow, boardOffsetCol, promotion);

        // Capture right
        tocol = fromcol + 1;
        
        // Wrapping
        boardOffsetCol = 0;
        if (tocol > 7) {
            boardOffsetCol = 1;
            tocol -= 8;
        }

        this.addPawnCapture(piece, fromrow, fromcol, torow, tocol, direction, boardOffsetRow, boardOffsetCol, promotion);

    }

    static addPawnCapture(piece, row, col, torow, tocol, direction, boardOffsetRow, boardOffsetCol, promotion) {
        // Add attack
        const attackBoard = piece.isWhite ? this.whiteAttacks : this.blackAttacks;
        attackBoard[torow][tocol] = 1;
        
        // Normal capture
        let captured = this.position.squares[torow][tocol].piece;
        if (captured != null && captured.isWhite != piece.isWhite) {
            let move = new PawnMove(row, col, torow, tocol, true, piece.isWhite);
            move.boardOffset.row = boardOffsetRow;
            move.boardOffset.col = boardOffsetCol;
            move.direction = direction;
            move.isPromotion = promotion;
            this.moves.push(move);
        }

        // En passant
        let target = this.position.enPassant;
        if (target != null && (target.row + direction) == torow && target.col == tocol) {
            let move = new PawnMove(row, col, torow, tocol, true, piece.isWhite);
            move.boardOffset.row = boardOffsetRow;
            move.boardOffset.col = boardOffsetCol;
            move.isEnPassant = true;
            move.direction = direction;
            move.isPromotion = promotion;
            this.moves.push(move);
        }
    }

    static getSquaresWithin(fromrow, fromcol, torow, tocol, rowdir, coldir) {
        let row = fromrow;
        let col = fromcol;
        let iterations = 0;
        let squares = [];
        while (row != torow || col != tocol && ++iterations != UPPER_BOUND) {
            squares.push(this.position.squares[row][col]);

            // Next square
            row = wrapRow(row + rowdir);
            col = wrapCol(col + coldir);
        }

        return squares;
    }

    static filterLegalMoves() {
        const whiteToMove = !this.position.blacksTurn;
        let opponentAttacks = this.position.blacksTurn ? this.whiteAttacks : this.blackAttacks;
        let kingInCheck = false;
        let kingAttackers = [];
        let kingSquare = null;
        let unfilteredMoves = Array(this.moves.length);

        // Find the king
        outerloop:
        for (let r = 0; r < 14; ++r) {
            for (let c = 0; c < 8; ++c) {
                const square = this.position.squares[r][c];
                const piece = square.piece;
                if (piece == null) continue;
                if (piece.type != 'k') continue;
                if (piece.isWhite == this.position.blacksTurn) continue;
                kingSquare = square;
                break outerloop;
            }
        }

        // Preserve unfiltered moves
        for (let i = 0; i < this.moves.length; ++i)
            unfilteredMoves[i] = this.moves[i];

        // Filter out turn moves
        for (let i = this.moves.length - 1; i >= 0; --i) {
            const move = this.moves[i];
            if (this.position.blacksTurn == move.isWhite) {
                this.moves.splice(i, 1);
            }
        }

        // If the king is not found, no illegal moves exist
        if (kingSquare == null) return;

        // Look for king moves to attacked squares
        for (let i = this.moves.length - 1; i >= 0; --i) {
            const move = this.moves[i];
            const fromSquare = this.position.squares[move.from.row][move.from.col];
            const piece = fromSquare.piece;
            if (piece.type != 'k') continue;

            // Check
            if (opponentAttacks[move.from.row][move.from.col]) {
                kingInCheck = true;
            }

            // Eliminate moves that go to an attacked square
            if (opponentAttacks[move.to.row][move.to.col]) {
                this.moves.splice(i, 1);
            }
        }

        // Resolving check
        if (kingInCheck) {
            let duplicateAttacker = false;

            // Find king attackers
            for (let attackMove of unfilteredMoves) {
                if (!attackMove.isAttack) continue;
                if (kingSquare.row != attackMove.to.row || kingSquare.col != attackMove.to.col) continue;
                
                // Skip duplicate attackers
                if (kingAttackers.length == 1 && kingAttackers[0].from.row == attackMove.from.row &&
                    kingAttackers[0].from.col == attackMove.from.col) duplicateAttacker = attackMove;
                
                // Add attacker
                kingAttackers.push(attackMove);
            }

            if (kingAttackers.length > 1) {
                // When the king is in check, find attackers
                // If there are more than one only king moves are allowed
                for (let i = this.moves.length - 1; i >= 0; --i) {
                    const move = this.moves[i];
                    const square = this.position.squares[move.from.row][move.from.col];
                    
                    // If move captures duplicate attacker do not discard it
                    if (kingAttackers.length == 2 && duplicateAttacker && move.to.row == duplicateAttacker.from.row &&
                        move.to.col == duplicateAttacker.from.col) continue;

                    if (square.piece.type != 'k') {
                        this.moves.splice(i, 1);
                    } else {
                        // If the king move matches any xray attack square, discard it
                        const toSquare = this.position.squares[move.to.row][move.to.col];
                        for (const attack of kingAttackers) {
                            const xrayAttack = this.position.squares
                                [wrapRow(attack.to.row + attack.moveVector.row)]
                                [wrapCol(attack.to.col + attack.moveVector.col)];
                            if (toSquare == xrayAttack) {
                                this.moves.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            } else {
                // If there is just one then only allow moves that either
                // take the captured piece or block the attack
                const attack = kingAttackers[0];

                // King cannot move in direction of attack
                // if the attacker is a sliding piece
                const xrayAttack = this.position.squares
                    [wrapRow(attack.to.row + attack.moveVector.row)]
                    [wrapCol(attack.to.col + attack.moveVector.col)];
                for (let i = this.moves.length - 1; i >= 0; --i) {
                    const move = this.moves[i];
                    const fromSquare = this.position.squares[move.from.row][move.from.col];
                    if (fromSquare.piece.type != 'k') continue;
                    const toSquare = this.position.squares[move.to.row][move.to.col];
                    if (toSquare == xrayAttack) {
                        this.moves.splice(i, 1);
                    }
                }

                // Calculate attack line
                let attackLine = this.getSquaresWithin(attack.from.row, attack.from.col, attack.to.row, attack.to.col,
                    attack.moveVector.row, attack.moveVector.col);

                // Make sure all moves lie within the attack line
                for (let i = this.moves.length - 1; i >= 0; --i) {
                    const move = this.moves[i];
                    const fromSquare = this.position.squares[move.from.row][move.from.col];
                    if (fromSquare.piece.type == 'k') continue;
                    const toSquare = this.position.squares[move.to.row][move.to.col];
                    if (!attackLine.includes(toSquare)) {
                        this.moves.splice(i, 1);
                    }
                }
            }
        }


        // Update the following code to account for en passant
        // Each pawn move has the variable isEnPassant which signifies
        // If the move will result in an en passant.
        // The position also has a variable enPassant which contains a
        // reference to the square where a pawn is that just double moved (null if none)
        // Here are how these variables can be accessed:
        // isEnPassant = this.moves[index].isEnPassant
        // enPassant = this.position.enPassant

        // Remove pinned moves
        if (!kingInCheck) {
            let pins = [];
            
            // First step:
            // Look in every direction of the king, skipping the empty squares
            // Keep looking in that direction until we wrap back around to the king
            const directions = [
                { row: -1, col: -1 },
                { row: -1, col:  0 },
                { row: -1, col:  1 }, 
                { row:  0, col: -1 },
                { row:  0, col:  1 }, 
                { row:  1, col: -1 },
                { row:  1, col:  0 },
                { row:  1, col:  1 }
            ];

            // To find en passant captures check if the second piece was a pawn that just moved
            // twice. If it is, then skip that piece and look for the next sliding piece.
            // If the sliding piece is found that corresponds to that direction then we know this
            // capture is pinned so remove that en passant from the list of possible moves.

            for (let direction of directions) {
                const isDiagonal = direction.row != 0 && direction.col != 0;

                // Max travel length is 14 (longest side of the board)
                let row = kingSquare.row;
                let col = kingSquare.col;
                let firstPieceSquare = null;
                let secondPieceSquare = null;
                let enPassantSquare = null;
                for (let i = 0; i < 14; ++i) {
                    
                    // Next square
                    row = wrapRow(row + direction.row);
                    col = wrapCol(col + direction.col);
                    const square = this.position.squares[row][col];
                    if (square.piece == null) continue;

                    // Second step: Find the next two pieces
                    if (firstPieceSquare == null) { firstPieceSquare = square; continue; }
                    if (secondPieceSquare == null) {
                        if (this.position.enPassant == square) { enPassantSquare = square; continue; }
                        secondPieceSquare = square;
                        break;
                    }
                }

                // If the second piece is not found skip this direction
                if (secondPieceSquare == null) continue;

                // If the second piece is the same color as the turn, skip this direction (piece.isWhite == whiteToMove)
                if (secondPieceSquare.piece.isWhite == whiteToMove) continue;
                
                // If the second piece is not a sliding piece (queen, rook, or bishop) skip this direction
                if (!"qrb".includes(secondPieceSquare.piece.type)) continue;

                // If the direction is diagonal and the sliding piece is a rook (piece.type == 'r') skip this direction
                if (isDiagonal && secondPieceSquare.piece.type == 'r') continue;
                
                // If the direction is straight and the sliding piece is a bishop (piece.type == 'b') skip this direction
                if (!isDiagonal && secondPieceSquare.piece.type == 'b') continue;

                // If all the previous criteria are met then the first piece is pinned in the respective direction   
                pins.push({ square: firstPieceSquare, direction, enPassant: enPassantSquare });
            }
            
            // Final Step: Remove illegal moves of pinned pieces
            // If the movement vector of the pinned piece does not match the direction of which it is pinned
            // then discard this move
            for (let i = this.moves.length - 1; i >= 0; --i) {
                const move = this.moves[i];
                const fromSquare = this.position.squares[move.from.row][move.from.col];
                
                // Find the pin associated with this move
                for (let pin of pins) {
                    if (pin.square != fromSquare) continue;
                    
                    // Check the direction of the pin
                    // let rowdir = Math.sign(move.to.row - move.from.row)
                    // let coldir = Math.sign(move.to.col - move.from.col)
                    let rowdir = move.moveVector.row;
                    let coldir = move.moveVector.col;
                    if (pin.direction.row == rowdir && pin.direction.col == coldir) continue;

                    // Also check if this move is an en passant move and if it's pinned
                    if (pin.enPassant) {
                        if (move.isEnPassant) {
                            this.moves.splice(i, 1);
                            break;
                        } else continue;
                    }

                    // Eliminate moves that don't go the same direction
                    this.moves.splice(i, 1);
                    break;
                }
            }
        }

        // Update checks
        if (kingInCheck)
            this.kingInCheck = kingSquare;
    }

    static findMove(fromrow, fromcol, torow, tocol) {
        for (let move of this.moves) {
            if (move.from.row == fromrow && move.from.col == fromcol &&
                move.to.row == torow && move.to.col == tocol)
                return move;
        }
        return false;
    }

    static findPieceMoves(fromrow, fromcol) {
        let moves = [];
        for (let move of this.moves) {
            if (move.from.row == fromrow && move.from.col == fromcol)
                moves.push(move);
        }
        return moves;
    }

}

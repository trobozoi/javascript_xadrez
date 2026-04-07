// ============================================================
// Chess Engine - Gerenciamento completo de regras do xadrez
// ============================================================

class ChessEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.createInitialBoard();
        this.turn = 'w';
        this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.moveHistory = [];
        this.positionHistory = [];
        this.gameOver = false;
        this.gameResult = null;
        this.positionHistory.push(this.getBoardHash());
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: backRank[col], color: 'b' };
            board[1][col] = { type: 'P', color: 'b' };
            board[6][col] = { type: 'P', color: 'w' };
            board[7][col] = { type: backRank[col], color: 'w' };
        }
        return board;
    }

    clone() {
        const copy = new ChessEngine();
        copy.board = this.board.map(row => row.map(p => p ? { ...p } : null));
        copy.turn = this.turn;
        copy.castlingRights = { ...this.castlingRights };
        copy.enPassantTarget = this.enPassantTarget ? [...this.enPassantTarget] : null;
        copy.halfMoveClock = this.halfMoveClock;
        copy.fullMoveNumber = this.fullMoveNumber;
        copy.moveHistory = [...this.moveHistory];
        copy.positionHistory = [...this.positionHistory];
        copy.gameOver = this.gameOver;
        copy.gameResult = this.gameResult;
        return copy;
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return undefined;
        return this.board[row][col];
    }

    isInBounds(row, col) {
        return row >= 0 && row <= 7 && col >= 0 && col <= 7;
    }

    // Gerar todos os movimentos pseudo-legais para uma cor
    generatePseudoLegalMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getPieceMoves(row, col, piece);
                    moves.push(...pieceMoves);
                }
            }
        }
        return moves;
    }

    getPieceMoves(row, col, piece) {
        switch (piece.type) {
            case 'P': return this.getPawnMoves(row, col, piece.color);
            case 'R': return this.getRookMoves(row, col, piece.color);
            case 'N': return this.getKnightMoves(row, col, piece.color);
            case 'B': return this.getBishopMoves(row, col, piece.color);
            case 'Q': return this.getQueenMoves(row, col, piece.color);
            case 'K': return this.getKingMoves(row, col, piece.color);
            default: return [];
        }
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;

        // Avanço simples
        if (this.isInBounds(row + dir, col) && !this.board[row + dir][col]) {
            if (row + dir === promoRow) {
                for (const promo of ['Q', 'R', 'B', 'N']) {
                    moves.push({ from: [row, col], to: [row + dir, col], promotion: promo });
                }
            } else {
                moves.push({ from: [row, col], to: [row + dir, col] });
            }

            // Avanço duplo
            if (row === startRow && !this.board[row + 2 * dir][col]) {
                moves.push({ from: [row, col], to: [row + 2 * dir, col] });
            }
        }

        // Capturas
        for (const dc of [-1, 1]) {
            const nr = row + dir;
            const nc = col + dc;
            if (!this.isInBounds(nr, nc)) continue;

            const target = this.board[nr][nc];
            if (target && target.color !== color) {
                if (nr === promoRow) {
                    for (const promo of ['Q', 'R', 'B', 'N']) {
                        moves.push({ from: [row, col], to: [nr, nc], promotion: promo, capture: target });
                    }
                } else {
                    moves.push({ from: [row, col], to: [nr, nc], capture: target });
                }
            }

            // En passant
            if (this.enPassantTarget && this.enPassantTarget[0] === nr && this.enPassantTarget[1] === nc) {
                moves.push({
                    from: [row, col], to: [nr, nc],
                    enPassant: true,
                    capture: this.board[row][nc]
                });
            }
        }

        return moves;
    }

    getSlidingMoves(row, col, color, directions) {
        const moves = [];
        for (const [dr, dc] of directions) {
            let nr = row + dr;
            let nc = col + dc;
            while (this.isInBounds(nr, nc)) {
                const target = this.board[nr][nc];
                if (!target) {
                    moves.push({ from: [row, col], to: [nr, nc] });
                } else {
                    if (target.color !== color) {
                        moves.push({ from: [row, col], to: [nr, nc], capture: target });
                    }
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
        return moves;
    }

    getRookMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0]]);
    }

    getBishopMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[1,1],[1,-1],[-1,1],[-1,-1]]);
    }

    getQueenMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of offsets) {
            const nr = row + dr;
            const nc = col + dc;
            if (!this.isInBounds(nr, nc)) continue;
            const target = this.board[nr][nc];
            if (!target) {
                moves.push({ from: [row, col], to: [nr, nc] });
            } else if (target.color !== color) {
                moves.push({ from: [row, col], to: [nr, nc], capture: target });
            }
        }
        return moves;
    }

    getKingMoves(row, col, color) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (!this.isInBounds(nr, nc)) continue;
                const target = this.board[nr][nc];
                if (!target) {
                    moves.push({ from: [row, col], to: [nr, nc] });
                } else if (target.color !== color) {
                    moves.push({ from: [row, col], to: [nr, nc], capture: target });
                }
            }
        }

        // Roque
        const backRow = color === 'w' ? 7 : 0;
        if (row === backRow && col === 4) {
            // Roque do lado do rei
            const kKey = color === 'w' ? 'wK' : 'bK';
            if (this.castlingRights[kKey]) {
                if (!this.board[backRow][5] && !this.board[backRow][6] &&
                    this.board[backRow][7] && this.board[backRow][7].type === 'R' && this.board[backRow][7].color === color) {
                    if (!this.isSquareAttacked(backRow, 4, color) &&
                        !this.isSquareAttacked(backRow, 5, color) &&
                        !this.isSquareAttacked(backRow, 6, color)) {
                        moves.push({ from: [row, col], to: [backRow, 6], castling: 'K' });
                    }
                }
            }
            // Roque do lado da dama
            const qKey = color === 'w' ? 'wQ' : 'bQ';
            if (this.castlingRights[qKey]) {
                if (!this.board[backRow][1] && !this.board[backRow][2] && !this.board[backRow][3] &&
                    this.board[backRow][0] && this.board[backRow][0].type === 'R' && this.board[backRow][0].color === color) {
                    if (!this.isSquareAttacked(backRow, 4, color) &&
                        !this.isSquareAttacked(backRow, 3, color) &&
                        !this.isSquareAttacked(backRow, 2, color)) {
                        moves.push({ from: [row, col], to: [backRow, 2], castling: 'Q' });
                    }
                }
            }
        }

        return moves;
    }

    // Verificar se uma casa é atacada por alguma peça do oponente
    isSquareAttacked(row, col, friendlyColor) {
        const enemyColor = friendlyColor === 'w' ? 'b' : 'w';

        // Ataque de peão
        const pawnDir = friendlyColor === 'w' ? -1 : 1;
        for (const dc of [-1, 1]) {
            const pr = row + pawnDir;
            const pc = col + dc;
            if (this.isInBounds(pr, pc)) {
                const p = this.board[pr][pc];
                if (p && p.type === 'P' && p.color === enemyColor) return true;
            }
        }

        // Ataque de cavalo
        const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightOffsets) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc)) {
                const p = this.board[nr][nc];
                if (p && p.type === 'N' && p.color === enemyColor) return true;
            }
        }

        // Ataque de bispo/dama (diagonais)
        for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
            let nr = row + dr;
            let nc = col + dc;
            while (this.isInBounds(nr, nc)) {
                const p = this.board[nr][nc];
                if (p) {
                    if (p.color === enemyColor && (p.type === 'B' || p.type === 'Q')) return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        // Ataque de torre/dama (linhas e colunas)
        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let nr = row + dr;
            let nc = col + dc;
            while (this.isInBounds(nr, nc)) {
                const p = this.board[nr][nc];
                if (p) {
                    if (p.color === enemyColor && (p.type === 'R' || p.type === 'Q')) return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        // Ataque de rei
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (this.isInBounds(nr, nc)) {
                    const p = this.board[nr][nc];
                    if (p && p.type === 'K' && p.color === enemyColor) return true;
                }
            }
        }

        return false;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.board[row][col];
                if (p && p.type === 'K' && p.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        return this.isSquareAttacked(kingPos[0], kingPos[1], color);
    }

    // Gerar todos os movimentos legais
    getLegalMoves(color) {
        const pseudoMoves = this.generatePseudoLegalMoves(color || this.turn);
        const legalMoves = [];

        for (const move of pseudoMoves) {
            const engine = this.clone();
            engine.applyMoveUnchecked(move);
            if (!engine.isInCheck(color || this.turn)) {
                legalMoves.push(move);
            }
        }

        return legalMoves;
    }

    // Aplicar um movimento sem verificar legalidade (usado internamente)
    applyMoveUnchecked(move) {
        const [fromRow, fromCol] = move.from;
        const [toRow, toCol] = move.to;
        const piece = this.board[fromRow][fromCol];

        // En passant capture
        if (move.enPassant) {
            this.board[fromRow][toCol] = null;
        }

        // Mover peça
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Promoção
        if (move.promotion) {
            this.board[toRow][toCol] = { type: move.promotion, color: piece.color };
        }

        // Roque - mover torre
        if (move.castling) {
            const backRow = piece.color === 'w' ? 7 : 0;
            if (move.castling === 'K') {
                this.board[backRow][5] = this.board[backRow][7];
                this.board[backRow][7] = null;
            } else {
                this.board[backRow][3] = this.board[backRow][0];
                this.board[backRow][0] = null;
            }
        }

        // Atualizar en passant
        this.enPassantTarget = null;
        if (piece.type === 'P' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = [(fromRow + toRow) / 2, fromCol];
        }

        // Atualizar direitos de roque
        if (piece.type === 'K') {
            if (piece.color === 'w') { this.castlingRights.wK = false; this.castlingRights.wQ = false; }
            else { this.castlingRights.bK = false; this.castlingRights.bQ = false; }
        }
        if (piece.type === 'R') {
            if (fromRow === 7 && fromCol === 0) this.castlingRights.wQ = false;
            if (fromRow === 7 && fromCol === 7) this.castlingRights.wK = false;
            if (fromRow === 0 && fromCol === 0) this.castlingRights.bQ = false;
            if (fromRow === 0 && fromCol === 7) this.castlingRights.bK = false;
        }
        // Se capturar torre no canto, remover direito de roque
        if (toRow === 7 && toCol === 0) this.castlingRights.wQ = false;
        if (toRow === 7 && toCol === 7) this.castlingRights.wK = false;
        if (toRow === 0 && toCol === 0) this.castlingRights.bQ = false;
        if (toRow === 0 && toCol === 7) this.castlingRights.bK = false;

        // Atualizar contadores
        if (piece.type === 'P' || move.capture) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        if (this.turn === 'b') {
            this.fullMoveNumber++;
        }

        this.turn = this.turn === 'w' ? 'b' : 'w';
    }

    // Fazer um movimento (com validação), retorna true se legal
    makeMove(move) {
        const legalMoves = this.getLegalMoves(this.turn);
        const matching = legalMoves.find(m =>
            m.from[0] === move.from[0] && m.from[1] === move.from[1] &&
            m.to[0] === move.to[0] && m.to[1] === move.to[1] &&
            (m.promotion || null) === (move.promotion || null)
        );

        if (!matching) return false;

        // Guardar info para notação
        const piece = this.board[move.from[0]][move.from[1]];
        const captured = this.board[move.to[0]][move.to[1]] || (matching.enPassant ? this.board[move.from[0]][move.to[1]] : null);

        // Gerar notação algébrica
        const notation = this.getMoveNotation(matching, piece, captured);

        this.applyMoveUnchecked(matching);
        this.positionHistory.push(this.getBoardHash());

        // Verificar check/checkmate para notação
        let finalNotation = notation;
        if (this.isInCheck(this.turn)) {
            if (this.getLegalMoves(this.turn).length === 0) {
                finalNotation += '#';
            } else {
                finalNotation += '+';
            }
        }

        this.moveHistory.push({
            move: matching,
            notation: finalNotation,
            piece: { ...piece },
            captured: captured ? { ...captured } : null,
            timestamp: Date.now()
        });

        // Verificar fim de jogo
        this.checkGameEnd();

        return true;
    }

    getMoveNotation(move, piece, captured) {
        if (move.castling === 'K') return 'O-O';
        if (move.castling === 'Q') return 'O-O-O';

        const files = 'abcdefgh';
        const ranks = '87654321';
        let notation = '';

        if (piece.type !== 'P') {
            notation += piece.type;
            // Desambiguação
            const samePieceMoves = this.generatePseudoLegalMoves(piece.color)
                .filter(m => {
                    const p = this.board[m.from[0]][m.from[1]];
                    return p && p.type === piece.type &&
                        m.to[0] === move.to[0] && m.to[1] === move.to[1] &&
                        (m.from[0] !== move.from[0] || m.from[1] !== move.from[1]);
                });
            if (samePieceMoves.length > 0) {
                const sameFile = samePieceMoves.some(m => m.from[1] === move.from[1]);
                const sameRank = samePieceMoves.some(m => m.from[0] === move.from[0]);
                if (!sameFile) {
                    notation += files[move.from[1]];
                } else if (!sameRank) {
                    notation += ranks[move.from[0]];
                } else {
                    notation += files[move.from[1]] + ranks[move.from[0]];
                }
            }
        }

        if (captured) {
            if (piece.type === 'P') notation += files[move.from[1]];
            notation += 'x';
        }

        notation += files[move.to[1]] + ranks[move.to[0]];

        if (move.promotion) {
            notation += '=' + move.promotion;
        }

        return notation;
    }

    checkGameEnd() {
        const legalMoves = this.getLegalMoves(this.turn);

        if (legalMoves.length === 0) {
            this.gameOver = true;
            if (this.isInCheck(this.turn)) {
                this.gameResult = this.turn === 'w' ? '0-1' : '1-0';
            } else {
                this.gameResult = '1/2-1/2'; // Empate por afogamento
            }
            return;
        }

        // Regra dos 50 movimentos
        if (this.halfMoveClock >= 100) {
            this.gameOver = true;
            this.gameResult = '1/2-1/2';
            return;
        }

        // Repetição tripla
        const currentHash = this.getBoardHash();
        const count = this.positionHistory.filter(h => h === currentHash).length;
        if (count >= 3) {
            this.gameOver = true;
            this.gameResult = '1/2-1/2';
            return;
        }

        // Material insuficiente
        if (this.isInsufficientMaterial()) {
            this.gameOver = true;
            this.gameResult = '1/2-1/2';
            return;
        }
    }

    isInsufficientMaterial() {
        const pieces = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c]) {
                    pieces.push(this.board[r][c]);
                }
            }
        }

        if (pieces.length === 2) return true; // Rei vs Rei
        if (pieces.length === 3) {
            const nonKing = pieces.find(p => p.type !== 'K');
            if (nonKing && (nonKing.type === 'B' || nonKing.type === 'N')) return true;
        }
        if (pieces.length === 4) {
            const bishops = pieces.filter(p => p.type === 'B');
            if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
                // Verificar se bispos estão na mesma cor de casa
                let bPos = [];
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (this.board[r][c] && this.board[r][c].type === 'B') {
                            bPos.push((r + c) % 2);
                        }
                    }
                }
                if (bPos.length === 2 && bPos[0] === bPos[1]) return true;
            }
        }

        return false;
    }

    getBoardHash() {
        let hash = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p) {
                    hash += (p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase());
                } else {
                    hash += '.';
                }
            }
        }
        hash += this.turn;
        hash += (this.castlingRights.wK ? 'K' : '') + (this.castlingRights.wQ ? 'Q' : '') +
                (this.castlingRights.bK ? 'k' : '') + (this.castlingRights.bQ ? 'q' : '');
        if (this.enPassantTarget) {
            hash += this.enPassantTarget[0] + '' + this.enPassantTarget[1];
        }
        return hash;
    }

    // Gerar representação do tabuleiro em texto (para logs)
    getBoardText() {
        const pieceSymbols = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };
        let text = '```\n    a   b   c   d   e   f   g   h\n  ┌───┬───┬───┬───┬───┬───┬───┬───┐\n';
        for (let r = 0; r < 8; r++) {
            text += (8 - r) + ' │';
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p) {
                    const key = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
                    text += ' ' + pieceSymbols[key] + ' │';
                } else {
                    text += '   │';
                }
            }
            text += ' ' + (8 - r) + '\n';
            if (r < 7) {
                text += '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n';
            }
        }
        text += '  └───┴───┴───┴───┴───┴───┴───┴───┘\n    a   b   c   d   e   f   g   h\n```';
        return text;
    }

    // Obter FEN da posição
    getFEN() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p) {
                    empty++;
                } else {
                    if (empty > 0) { fen += empty; empty = 0; }
                    fen += p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
                }
            }
            if (empty > 0) fen += empty;
            if (r < 7) fen += '/';
        }
        fen += ' ' + this.turn;
        let castling = '';
        if (this.castlingRights.wK) castling += 'K';
        if (this.castlingRights.wQ) castling += 'Q';
        if (this.castlingRights.bK) castling += 'k';
        if (this.castlingRights.bQ) castling += 'q';
        fen += ' ' + (castling || '-');
        if (this.enPassantTarget) {
            const files = 'abcdefgh';
            const ranks = '87654321';
            fen += ' ' + files[this.enPassantTarget[1]] + ranks[this.enPassantTarget[0]];
        } else {
            fen += ' -';
        }
        fen += ' ' + this.halfMoveClock + ' ' + this.fullMoveNumber;
        return fen;
    }

    // Notação do movimento em formato legível
    getMoveDescription(moveRecord) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        const pieceNames = { 'K': 'Rei', 'Q': 'Dama', 'R': 'Torre', 'B': 'Bispo', 'N': 'Cavalo', 'P': 'Peão' };
        const m = moveRecord.move;
        const piece = moveRecord.piece;

        let desc = pieceNames[piece.type] + ' de ' +
            files[m.from[1]] + ranks[m.from[0]] + ' para ' +
            files[m.to[1]] + ranks[m.to[0]];

        if (moveRecord.captured) {
            desc += ' (captura ' + pieceNames[moveRecord.captured.type] + ')';
        }
        if (m.castling === 'K') desc = 'Roque curto (O-O)';
        if (m.castling === 'Q') desc = 'Roque longo (O-O-O)';
        if (m.enPassant) desc += ' (en passant)';
        if (m.promotion) desc += ' (promoção para ' + pieceNames[m.promotion] + ')';

        return desc;
    }
}

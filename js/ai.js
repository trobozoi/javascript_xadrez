// ============================================================
// Chess AI - Motor de IA com Minimax + Alpha-Beta Pruning
// Nível máximo de dificuldade
// ============================================================

class ChessAI {
    constructor() {
        this.MAX_DEPTH = 6;
        this.QUIESCENCE_DEPTH = 6;
        this.nodesSearched = 0;
        this.lastEvaluation = 0;
        this.lastJustification = '';
        this.transpositionTable = new Map();
        this.killerMoves = Array(40).fill(null).map(() => [null, null]);
        this.historyTable = {};
        this.counterMoves = {};
        this.searchStartTime = 0;
        this.timeLimit = 30000; // 30 segundos
        this.searchAborted = false;
        this.bestMoveAtDepth = null;
        this.openingBook = typeof OpeningBook !== 'undefined' ? new OpeningBook() : null;
        this.previousBestMove = null; // para aspiration window

        // Valores das peças
        this.PIECE_VALUES = {
            'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
        };

        // Tabelas de posição das peças (perspectiva branca, invertir para pretas)
        this.PST = {
            'P': [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [ 5,  5, 10, 25, 25, 10,  5,  5],
                [ 0,  0,  0, 20, 20,  0,  0,  0],
                [ 5, -5,-10,  0,  0,-10, -5,  5],
                [ 5, 10, 10,-20,-20, 10, 10,  5],
                [ 0,  0,  0,  0,  0,  0,  0,  0]
            ],
            'N': [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            'B': [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            'R': [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [ 5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [ 0,  0,  0,  5,  5,  0,  0,  0]
            ],
            'Q': [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [ -5,  0,  5,  5,  5,  5,  0, -5],
                [  0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            'K_MID': [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [ 20, 20,  0,  0,  0,  0, 20, 20],
                [ 20, 30, 10,  0,  0, 10, 30, 20]
            ],
            'K_END': [
                [-50,-40,-30,-20,-20,-30,-40,-50],
                [-30,-20,-10,  0,  0,-10,-20,-30],
                [-30,-10, 20, 30, 30, 20,-10,-30],
                [-30,-10, 30, 40, 40, 30,-10,-30],
                [-30,-10, 30, 40, 40, 30,-10,-30],
                [-30,-10, 20, 30, 30, 20,-10,-30],
                [-30,-30,  0,  0,  0,  0,-30,-30],
                [-50,-30,-30,-30,-30,-30,-30,-50]
            ]
        };
    }

    // Obter melhor movimento para a cor do computador
    getBestMove(engine) {
        // Tentar livro de aberturas primeiro
        if (this.openingBook) {
            const bookMove = this.openingBook.getBookMove(engine);
            if (bookMove) {
                // Verificar se é um movimento legal
                const legalMoves = engine.getLegalMoves(engine.turn);
                const match = legalMoves.find(m =>
                    m.from[0] === bookMove.from[0] && m.from[1] === bookMove.from[1] &&
                    m.to[0] === bookMove.to[0] && m.to[1] === bookMove.to[1]
                );
                if (match) {
                    this.lastJustification = '📖 **Livro de aberturas**: Jogada baseada em teoria de aberturas de Grandes Mestres.\n⚙️ **Tempo de cálculo**: instantâneo.';
                    this.lastEvaluation = 0;
                    this.nodesSearched = 0;
                    return match;
                }
            }
        }

        this.nodesSearched = 0;
        // Limpar TT se ficar muito grande para evitar problemas de memória
        if (this.transpositionTable.size > 3000000) {
            this.transpositionTable.clear();
        }
        this.searchStartTime = performance.now();
        this.searchAborted = false;
        this.historyTable = { 'w': Array(64).fill(null).map(() => Array(64).fill(0)), 'b': Array(64).fill(null).map(() => Array(64).fill(0)) };
        const aiColor = engine.turn;
        const legalMoves = engine.getLegalMoves(aiColor);

        if (legalMoves.length === 0) return null;
        if (legalMoves.length === 1) {
            this.lastJustification = 'Único movimento legal disponível.';
            return legalMoves[0];
        }

        let bestMove = null;
        let bestScore = -Infinity;
        let moveScores = [];

        // Iterative deepening com aspiration windows
        let aspirationScore = this.previousBestMove ? this.lastEvaluation : 0;
        for (let depth = 1; depth <= this.MAX_DEPTH; depth++) {
            if (depth > 1 && (performance.now() - this.searchStartTime) > this.timeLimit * 0.5) {
                break;
            }

            let currentBest = null;
            let currentBestScore = -Infinity;
            const orderedMoves = this.orderMoves(engine, legalMoves, 0);
            let depthComplete = true;
            let depthScores = [];

            // Aspiration window: busca mais rápida com janela estreita
            let windowAlpha = depth >= 4 ? aspirationScore - 50 : -Infinity;
            let windowBeta = depth >= 4 ? aspirationScore + 50 : Infinity;
            let runningAlpha = windowAlpha;

            for (const move of orderedMoves) {
                const undo = engine.applyMoveUnchecked(move);
                let score = -this.alphaBeta(engine, depth - 1, -windowBeta, -runningAlpha, this.oppositeColor(aiColor), 1);

                // Se falhou a aspiration window, re-buscar com janela completa
                if (depth >= 4 && !this.searchAborted && (score <= windowAlpha || score >= windowBeta)) {
                    score = -this.alphaBeta(engine, depth - 1, -Infinity, Infinity, this.oppositeColor(aiColor), 1);
                }

                engine.undoMoveUnchecked(move, undo);

                if (this.searchAborted) {
                    depthComplete = false;
                    break;
                }

                depthScores.push({ move, score });

                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBest = move;
                    if (score > runningAlpha) runningAlpha = score;
                }
            }

            if (depthComplete && currentBest) {
                bestScore = currentBestScore;
                bestMove = currentBest;
                moveScores = depthScores;
                aspirationScore = bestScore;
            }

            if (this.searchAborted) break;
        }

        this.previousBestMove = bestMove;

        // Evitar empates: se o melhor movimento leva a empate e a IA não está perdendo, preferir alternativa
        if (bestMove && moveScores.length > 1 && bestScore > -200) {
            const undo = engine.applyMoveUnchecked(bestMove);
            const wouldDraw = this.wouldBeDraw(engine);
            engine.undoMoveUnchecked(bestMove, undo);

            if (wouldDraw) {
                const sorted = [...moveScores].sort((a, b) => b.score - a.score);
                for (const { move, score } of sorted) {
                    if (this.movesEqual(move, bestMove)) continue;
                    const u = engine.applyMoveUnchecked(move);
                    const draws = this.wouldBeDraw(engine);
                    engine.undoMoveUnchecked(move, u);
                    if (!draws && score > bestScore - 150) {
                        bestMove = move;
                        bestScore = score;
                        break;
                    }
                }
            }
        }

        this.lastEvaluation = bestScore;
        this.lastJustification = this.generateJustification(engine, bestMove, bestScore, moveScores, aiColor);

        return bestMove;
    }

    alphaBeta(engine, depth, alpha, beta, color, ply) {
        this.nodesSearched++;

        // Verificar tempo a cada 4096 nós
        if ((this.nodesSearched & 4095) === 0) {
            if (performance.now() - this.searchStartTime > this.timeLimit) {
                this.searchAborted = true;
                return 0;
            }
        }

        if (this.searchAborted) return 0;

        // Verificar tabela de transposição
        const hash = engine.getBoardHash();
        const ttEntry = this.transpositionTable.get(hash);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 'exact') return ttEntry.score;
            if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.score);
            if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.score);
            if (alpha >= beta) return ttEntry.score;
        }

        // Detecção de empate durante a busca (contempt = IA evita empates)
        if (ply > 0) {
            if (engine.halfMoveClock >= 100) return -15;
            const posHist = engine.positionHistory;
            for (let i = posHist.length - 1; i >= 0; i--) {
                if (posHist[i] === hash) return -15;
            }
        }

        const legalMoves = engine.getLegalMoves(color);

        if (legalMoves.length === 0) {
            if (engine.isInCheck(color)) {
                return -20000 + ply; // Xeque-mate (quanto mais perto, melhor)
            }
            return 0; // Empate por afogamento
        }

        if (depth <= 0) {
            return this.quiescenceSearch(engine, alpha, beta, color, this.QUIESCENCE_DEPTH);
        }

        // Null move pruning (adaptivo - R depende da profundidade)
        const inCheck = engine.isInCheck(color);
        if (depth >= 3 && !inCheck && this.hasNonPawnMaterial(engine, color)) {
            const R = depth >= 6 ? 4 : 3;
            // Aplicar null move sem clone
            const savedTurn = engine.turn;
            const savedEP = engine.enPassantTarget;
            const savedHash = engine.zobristHash;
            engine.turn = this.oppositeColor(color);
            engine.enPassantTarget = null;
            let nullHash = engine.zobristHash ^ ChessEngine.ZOBRIST.turn;
            if (savedEP) nullHash ^= ChessEngine.ZOBRIST.enPassant[savedEP[1]];
            engine.zobristHash = nullHash >>> 0;
            const nullScore = -this.alphaBeta(engine, depth - 1 - R, -beta, -beta + 1, this.oppositeColor(color), ply + 1);
            engine.turn = savedTurn;
            engine.enPassantTarget = savedEP;
            engine.zobristHash = savedHash;
            if (nullScore >= beta) {
                // Verificação: não retornar mate scores do null move
                if (nullScore < 19000) return beta;
            }
        }

        // Razoring: próximo a folhas, se a avaliação está muito abaixo de alpha, pular direto para quiescence
        if (depth <= 2 && !inCheck) {
            const razoringMargin = depth === 1 ? 300 : 600;
            const lazyEval = this.evaluate(engine, color);
            if (lazyEval + razoringMargin < alpha) {
                if (depth === 1) {
                    return this.quiescenceSearch(engine, alpha, beta, color, this.QUIESCENCE_DEPTH);
                }
                const qScore = this.quiescenceSearch(engine, alpha - razoringMargin, alpha - razoringMargin + 1, color, this.QUIESCENCE_DEPTH);
                if (qScore + razoringMargin <= alpha) {
                    return qScore;
                }
            }
        }

        // Internal Iterative Deepening: se não há TT move, buscar um
        if (depth >= 4 && !(ttEntry && ttEntry.bestMove)) {
            this.alphaBeta(engine, depth - 2, alpha, beta, color, ply);
        }

        const orderedMoves = this.orderMoves(engine, legalMoves, ply);
        let bestScore = -Infinity;
        let bestMove = null;
        let flag = 'upper';

        // Futility pruning margin
        const futilityMargin = [0, 200, 300, 500];
        const canFutility = depth <= 3 && !inCheck && Math.abs(beta) < 19000;
        let futilityBase = 0;
        if (canFutility) {
            futilityBase = this.evaluate(engine, color) + futilityMargin[depth];
        }

        for (let i = 0; i < orderedMoves.length; i++) {
            const move = orderedMoves[i];

            // Futility pruning: skip quiet moves that can't raise alpha
            if (canFutility && i > 0 && !move.capture && !move.promotion && futilityBase <= alpha) {
                continue;
            }

            const undo = engine.applyMoveUnchecked(move);

            // Check extension: buscar mais fundo quando dá xeque
            const givesCheck = engine.isInCheck(this.oppositeColor(color));
            const extension = givesCheck ? 1 : 0;

            let score;
            // Late Move Reduction - mais agressivo com log-based reduction
            if (i >= 3 && depth >= 2 && !move.capture && !move.promotion && !inCheck && !givesCheck) {
                // Fórmula logarítmica: R = max(1, floor(log2(depth) * log2(i)))
                let reduction = Math.max(1, Math.floor(Math.log2(depth) * Math.log2(i) * 0.5));
                if (reduction >= depth - 1) reduction = depth - 2;
                score = -this.alphaBeta(engine, depth - 1 - reduction + extension, -alpha - 1, -alpha, this.oppositeColor(color), ply + 1);
                if (score > alpha) {
                    score = -this.alphaBeta(engine, depth - 1 + extension, -beta, -alpha, this.oppositeColor(color), ply + 1);
                }
            } else {
                // Principal Variation Search
                if (i === 0) {
                    score = -this.alphaBeta(engine, depth - 1 + extension, -beta, -alpha, this.oppositeColor(color), ply + 1);
                } else {
                    score = -this.alphaBeta(engine, depth - 1 + extension, -alpha - 1, -alpha, this.oppositeColor(color), ply + 1);
                    if (score > alpha && score < beta) {
                        score = -this.alphaBeta(engine, depth - 1 + extension, -beta, -alpha, this.oppositeColor(color), ply + 1);
                    }
                }
            }

            engine.undoMoveUnchecked(move, undo);

            if (this.searchAborted) return bestScore === -Infinity ? 0 : bestScore;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            if (score > alpha) {
                alpha = score;
                flag = 'exact';
            }

            if (alpha >= beta) {
                // Killer move heuristic
                if (!move.capture && ply < this.killerMoves.length) {
                    this.killerMoves[ply][1] = this.killerMoves[ply][0];
                    this.killerMoves[ply][0] = move;
                }
                // History heuristic
                if (!move.capture) {
                    const fromIdx = move.from[0] * 8 + move.from[1];
                    const toIdx = move.to[0] * 8 + move.to[1];
                    this.historyTable[color][fromIdx][toIdx] += depth * depth;
                }
                flag = 'lower';
                break;
            }
        }

        // Salvar na tabela de transposição
        if (this.transpositionTable.size < 4000000) {
            this.transpositionTable.set(hash, { score: bestScore, depth, flag, bestMove });
        }

        return bestScore;
    }

    quiescenceSearch(engine, alpha, beta, color, depth) {
        this.nodesSearched++;

        const standPat = this.evaluate(engine, color);

        if (depth <= 0) return standPat;
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        // Delta pruning: se mesmo capturando a rainha não chega em alpha, pular
        const DELTA = 975; // valor da rainha + margem
        if (standPat + DELTA < alpha) return alpha;

        // Gerar apenas capturas pseudo-legais
        const pseudoMoves = engine.generatePseudoLegalMoves(color);
        const captures = pseudoMoves.filter(m => m.capture || m.promotion);

        if (captures.length === 0) return alpha;

        const orderedCaptures = this.orderMoves(engine, captures, 0);

        for (const move of orderedCaptures) {
            // SEE simplificado: pular capturas claramente perdedoras
            if (move.capture && !move.promotion) {
                const seeScore = this.seeCapture(engine, move);
                if (seeScore < -50) continue; // pular capturas perdedoras
            }

            const undo = engine.applyMoveUnchecked(move);
            if (engine.isInCheck(color)) {
                engine.undoMoveUnchecked(move, undo);
                continue;
            }

            const score = -this.quiescenceSearch(engine, -beta, -alpha, this.oppositeColor(color), depth - 1);
            engine.undoMoveUnchecked(move, undo);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // Static Exchange Evaluation simplificado
    seeCapture(engine, move) {
        const SEE_VALUES = { 'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000 };

        const attackerPiece = engine.board[move.from[0]][move.from[1]];
        if (!attackerPiece) return 0;

        const capturedPiece = move.capture;
        if (!capturedPiece) return 0;

        const gain = SEE_VALUES[capturedPiece.type] || 0;
        const cost = SEE_VALUES[attackerPiece.type] || 0;

        // Simplificação: se capturamos peça mais valiosa, é bom
        if (gain >= cost) return gain - cost;

        // Verificar se a casa de destino é defendida
        const enemyColor = attackerPiece.color === 'w' ? 'b' : 'w';
        const isDefended = engine.isSquareAttacked(move.to[0], move.to[1], attackerPiece.color);

        if (!isDefended) return gain; // ninguém defende, livre pra capturar
        return gain - cost; // troca simples
    }

    // Verificar se há material além de peões (para null move pruning)
    hasNonPawnMaterial(engine, color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = engine.board[r][c];
                if (p && p.color === color && p.type !== 'P' && p.type !== 'K') return true;
            }
        }
        return false;
    }

    // Ordenação de movimentos para melhor poda alpha-beta
    orderMoves(engine, moves, ply) {
        // Verificar TT para best move
        const hash = engine.getBoardHash();
        const ttEntry = this.transpositionTable.get(hash);

        return moves.map(move => {
            let score = 0;

            // TT move primeiro
            if (ttEntry && ttEntry.bestMove && this.movesEqual(move, ttEntry.bestMove)) {
                score += 50000;
            }

            // Capturas por MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
            if (move.capture) {
                const victimValue = this.PIECE_VALUES[move.capture.type] || 0;
                const attackerPiece = engine.board[move.from[0]][move.from[1]];
                const attackerValue = attackerPiece ? this.PIECE_VALUES[attackerPiece.type] || 0 : 0;
                score += 10000 + victimValue * 10 - attackerValue;
            }

            // Promoções
            if (move.promotion) {
                score += 9000 + this.PIECE_VALUES[move.promotion];
            }

            // Killer moves
            if (ply < this.killerMoves.length) {
                if (this.killerMoves[ply][0] && this.movesEqual(move, this.killerMoves[ply][0])) {
                    score += 5000;
                } else if (this.killerMoves[ply][1] && this.movesEqual(move, this.killerMoves[ply][1])) {
                    score += 4000;
                }
            }

            // History heuristic
            if (!move.capture) {
                const piece = engine.board[move.from[0]][move.from[1]];
                if (piece) {
                    const fromIdx = move.from[0] * 8 + move.from[1];
                    const toIdx = move.to[0] * 8 + move.to[1];
                    score += Math.min(3000, this.historyTable[piece.color][fromIdx][toIdx]);
                }
            }

            // Movimentos para o centro
            const centerBonus = 4 - Math.abs(move.to[0] - 3.5) - Math.abs(move.to[1] - 3.5);
            score += centerBonus * 5;

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    movesEqual(a, b) {
        return a.from[0] === b.from[0] && a.from[1] === b.from[1] &&
               a.to[0] === b.to[0] && a.to[1] === b.to[1];
    }

    // Verificar se a posição atual do engine seria empate
    wouldBeDraw(engine) {
        // Regra dos 50 movimentos
        if (engine.halfMoveClock >= 100) return true;
        // Repetição: verificar se hash atual já apareceu 2+ vezes no histórico
        const hash = engine.getBoardHash();
        let count = 0;
        for (let i = engine.positionHistory.length - 1; i >= 0; i--) {
            if (engine.positionHistory[i] === hash) {
                count++;
                if (count >= 2) return true;
            }
        }
        // Material insuficiente
        if (engine.isInsufficientMaterial()) return true;
        // Afogamento
        if (!engine.isInCheck(engine.turn) && engine.getLegalMoves(engine.turn).length === 0) return true;
        return false;
    }

    oppositeColor(color) {
        return color === 'w' ? 'b' : 'w';
    }

    // Avaliação da posição
    evaluate(engine, color) {
        let score = 0;
        let whiteMaterial = 0;
        let blackMaterial = 0;
        let whitePieces = [];
        let blackPieces = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = engine.board[r][c];
                if (!p) continue;

                const value = this.PIECE_VALUES[p.type];
                if (p.color === 'w') {
                    whiteMaterial += value;
                    whitePieces.push({ piece: p, row: r, col: c });
                } else {
                    blackMaterial += value;
                    blackPieces.push({ piece: p, row: r, col: c });
                }
            }
        }

        // Material
        score += whiteMaterial - blackMaterial;

        // Determinar fase do jogo (0 = endgame, 1 = opening/middlegame)
        const totalMaterial = whiteMaterial + blackMaterial - 40000; // Excluir reis
        const gamePhase = Math.min(1, totalMaterial / 6000);

        // Tabelas de posição
        for (const { piece, row, col } of whitePieces) {
            if (piece.type === 'K') {
                const midScore = this.PST['K_MID'][row][col];
                const endScore = this.PST['K_END'][row][col];
                score += midScore * gamePhase + endScore * (1 - gamePhase);
            } else if (this.PST[piece.type]) {
                score += this.PST[piece.type][row][col];
            }
        }

        for (const { piece, row, col } of blackPieces) {
            const mirrorRow = 7 - row;
            if (piece.type === 'K') {
                const midScore = this.PST['K_MID'][mirrorRow][col];
                const endScore = this.PST['K_END'][mirrorRow][col];
                score -= midScore * gamePhase + endScore * (1 - gamePhase);
            } else if (this.PST[piece.type]) {
                score -= this.PST[piece.type][mirrorRow][col];
            }
        }

        // Bônus por par de bispos (maior no endgame)
        const whiteBishops = whitePieces.filter(p => p.piece.type === 'B').length;
        const blackBishops = blackPieces.filter(p => p.piece.type === 'B').length;
        if (whiteBishops >= 2) score += 50 + (1 - gamePhase) * 20;
        if (blackBishops >= 2) score -= 50 + (1 - gamePhase) * 20;

        // Análise da estrutura de peões por coluna
        const wPawnsByCol = Array(8).fill(0);
        const bPawnsByCol = Array(8).fill(0);
        const wPawnMinRow = Array(8).fill(8); // mais avançado (menor row = mais avançado para brancas)
        const bPawnMaxRow = Array(8).fill(-1);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = engine.board[r][c];
                if (p && p.type === 'P') {
                    if (p.color === 'w') {
                        wPawnsByCol[c]++;
                        wPawnMinRow[c] = Math.min(wPawnMinRow[c], r);
                    } else {
                        bPawnsByCol[c]++;
                        bPawnMaxRow[c] = Math.max(bPawnMaxRow[c], r);
                    }
                }
            }
        }

        // Penalidade por peões dobrados e isolados
        for (let c = 0; c < 8; c++) {
            if (wPawnsByCol[c] > 1) score -= 20 * (wPawnsByCol[c] - 1);
            if (bPawnsByCol[c] > 1) score += 20 * (bPawnsByCol[c] - 1);
            // Peões isolados
            const wLeft = c > 0 ? wPawnsByCol[c - 1] : 0;
            const wRight = c < 7 ? wPawnsByCol[c + 1] : 0;
            if (wPawnsByCol[c] > 0 && wLeft === 0 && wRight === 0) score -= 25;
            const bLeft = c > 0 ? bPawnsByCol[c - 1] : 0;
            const bRight = c < 7 ? bPawnsByCol[c + 1] : 0;
            if (bPawnsByCol[c] > 0 && bLeft === 0 && bRight === 0) score += 25;
            // Peões atrasados
            if (wPawnsByCol[c] > 0 && wLeft === 0 && wRight === 0) {
                // Verificar se está na frente de um peão inimigo na mesma coluna
                if (bPawnsByCol[c] > 0 && bPawnMaxRow[c] > wPawnMinRow[c]) score -= 15;
            }
        }

        // Segurança do rei (escudo de peões)
        const wKing = engine.findKing('w');
        const bKing = engine.findKing('b');
        if (wKing && gamePhase > 0.3) {
            score += this.evaluateKingSafety(engine, wKing, 'w') * gamePhase;
        }
        if (bKing && gamePhase > 0.3) {
            score -= this.evaluateKingSafety(engine, bKing, 'b') * gamePhase;
        }

        // Mobilidade aproximada
        const wMobility = this.estimateMobility(engine, 'w');
        const bMobility = this.estimateMobility(engine, 'b');
        score += (wMobility - bMobility) * 5;

        // Vantagem de espaço (peões avançados no meio-jogo)
        if (gamePhase > 0.4) {
            let wSpace = 0, bSpace = 0;
            for (let c = 2; c <= 5; c++) {
                for (let r = 0; r < 4; r++) {
                    const p = engine.board[r][c];
                    if (p && p.type === 'P' && p.color === 'w') wSpace += (4 - r);
                }
                for (let r = 4; r < 8; r++) {
                    const p = engine.board[r][c];
                    if (p && p.type === 'P' && p.color === 'b') bSpace += (r - 3);
                }
            }
            score += (wSpace - bSpace) * 5;
        }

        // Torres em colunas abertas/semi-abertas
        for (const { piece, row, col } of whitePieces) {
            if (piece.type === 'R') {
                const ownPawns = wPawnsByCol[col] > 0;
                const enemyPawns = bPawnsByCol[col] > 0;
                if (!ownPawns && !enemyPawns) score += 30;
                else if (!ownPawns) score += 15;
                if (row === 1) score += 25; // 7ª fila
                if (row === 0) score += 10; // 8ª fila
            }
            // Cavaleiro em outpost (casa avançada protegida por peão, sem peão inimigo para expulsar)
            if (piece.type === 'N' && row <= 3) {
                const isOutpost = (col > 0 && wPawnsByCol[col - 1] > 0 || col < 7 && wPawnsByCol[col + 1] > 0) &&
                                  !(col > 0 && bPawnsByCol[col - 1] > 0 && bPawnMaxRow[col - 1] < row) &&
                                  !(col < 7 && bPawnsByCol[col + 1] > 0 && bPawnMaxRow[col + 1] < row);
                if (isOutpost) score += 30 + (3 - row) * 5;
            }
        }
        for (const { piece, row, col } of blackPieces) {
            if (piece.type === 'R') {
                const ownPawns = bPawnsByCol[col] > 0;
                const enemyPawns = wPawnsByCol[col] > 0;
                if (!ownPawns && !enemyPawns) score -= 30;
                else if (!ownPawns) score -= 15;
                if (row === 6) score -= 25; // 7ª fila
                if (row === 7) score -= 10; // 8ª fila
            }
            if (piece.type === 'N' && row >= 4) {
                const isOutpost = (col > 0 && bPawnsByCol[col - 1] > 0 || col < 7 && bPawnsByCol[col + 1] > 0) &&
                                  !(col > 0 && wPawnsByCol[col - 1] > 0 && wPawnMinRow[col - 1] > row) &&
                                  !(col < 7 && wPawnsByCol[col + 1] > 0 && wPawnMinRow[col + 1] > row);
                if (isOutpost) score -= 30 + (row - 4) * 5;
            }
        }

        // Peões passados (muito importante!)
        score += this.evaluatePassedPawns(engine, whitePieces, 'w', gamePhase);
        score -= this.evaluatePassedPawns(engine, blackPieces, 'b', gamePhase);

        // Bônus por conectar torres
        const wRooks = whitePieces.filter(x => x.piece.type === 'R');
        const bRooks = blackPieces.filter(x => x.piece.type === 'R');
        if (wRooks.length === 2) {
            if (wRooks[0].row === wRooks[1].row) score += 15; // mesma fila
            else if (wRooks[0].col === wRooks[1].col) score += 10; // mesma coluna
        }
        if (bRooks.length === 2) {
            if (bRooks[0].row === bRooks[1].row) score -= 15;
            else if (bRooks[0].col === bRooks[1].col) score -= 10;
        }

        // Penalizar bispo ruim (bloqueado por próprios peões)
        for (const { piece, row, col } of whitePieces) {
            if (piece.type === 'B') {
                const bishopColor = (row + col) % 2;
                let blockedPawns = 0;
                for (const wp of whitePieces) {
                    if (wp.piece.type === 'P' && (wp.row + wp.col) % 2 === bishopColor) blockedPawns++;
                }
                if (blockedPawns >= 4) score -= 20;
                else if (blockedPawns >= 3) score -= 10;
            }
        }
        for (const { piece, row, col } of blackPieces) {
            if (piece.type === 'B') {
                const bishopColor = (row + col) % 2;
                let blockedPawns = 0;
                for (const bp of blackPieces) {
                    if (bp.piece.type === 'P' && (bp.row + bp.col) % 2 === bishopColor) blockedPawns++;
                }
                if (blockedPawns >= 4) score += 20;
                else if (blockedPawns >= 3) score += 10;
            }
        }

        // Peças presas (bispo/cavalo sem mobilidade)
        for (const { piece, row, col } of whitePieces) {
            if (piece.type === 'B' || piece.type === 'N') {
                let moves = 0;
                if (piece.type === 'N') {
                    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                        const nr = row + dr, nc = col + dc;
                        if (engine.isInBounds(nr, nc) && (!engine.board[nr][nc] || engine.board[nr][nc].color !== 'w')) moves++;
                    }
                } else {
                    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                        const nr = row + dr, nc = col + dc;
                        if (engine.isInBounds(nr, nc) && (!engine.board[nr][nc] || engine.board[nr][nc].color !== 'w')) moves++;
                    }
                }
                if (moves === 0) score -= 50;
                else if (moves === 1) score -= 20;
            }
        }
        for (const { piece, row, col } of blackPieces) {
            if (piece.type === 'B' || piece.type === 'N') {
                let moves = 0;
                if (piece.type === 'N') {
                    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                        const nr = row + dr, nc = col + dc;
                        if (engine.isInBounds(nr, nc) && (!engine.board[nr][nc] || engine.board[nr][nc].color !== 'b')) moves++;
                    }
                } else {
                    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                        const nr = row + dr, nc = col + dc;
                        if (engine.isInBounds(nr, nc) && (!engine.board[nr][nc] || engine.board[nr][nc].color !== 'b')) moves++;
                    }
                }
                if (moves === 0) score += 50;
                else if (moves === 1) score += 20;
            }
        }

        return color === 'w' ? score : -score;
    }

    // Avaliar peões passados
    evaluatePassedPawns(engine, pieces, color, gamePhase) {
        let bonus = 0;
        const dir = color === 'w' ? -1 : 1;
        const promoRow = color === 'w' ? 0 : 7;
        const enemyColor = color === 'w' ? 'b' : 'w';

        for (const { piece, row, col } of pieces) {
            if (piece.type !== 'P') continue;

            let passed = true;
            // Verificar se há peão inimigo bloqueando ou nas colunas adjacentes
            const startR = color === 'w' ? row - 1 : row + 1;
            const endR = promoRow;
            const step = dir;

            for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
                for (let r = startR; (color === 'w' ? r >= endR : r <= endR); r += step) {
                    if (!engine.isInBounds(r, c)) continue;
                    const p = engine.board[r][c];
                    if (p && p.type === 'P' && p.color === enemyColor) {
                        passed = false;
                        break;
                    }
                }
                if (!passed) break;
            }

            if (passed) {
                const distToPromo = Math.abs(row - promoRow);
                // Quanto mais perto da promoção, maior o bônus
                const passedBonus = [0, 120, 80, 50, 30, 20, 10, 5][distToPromo] || 0;
                // No endgame, peões passados valem muito mais
                bonus += passedBonus * (1 + (1 - gamePhase) * 0.5);

                // Peão passado protegido vale mais
                for (const dc of [-1, 1]) {
                    const pr = row + (color === 'w' ? 1 : -1);
                    const pc = col + dc;
                    if (engine.isInBounds(pr, pc)) {
                        const supporter = engine.board[pr][pc];
                        if (supporter && supporter.type === 'P' && supporter.color === color) {
                            bonus += 15;
                            break;
                        }
                    }
                }
            }
        }
        return bonus;
    }

    // Estimativa rápida de mobilidade sem gerar movimentos legais completos
    estimateMobility(engine, color) {
        let mobility = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = engine.board[r][c];
                if (!p || p.color !== color) continue;
                switch (p.type) {
                    case 'N':
                        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                            const nr = r + dr, nc = c + dc;
                            if (engine.isInBounds(nr, nc)) {
                                const t = engine.board[nr][nc];
                                if (!t || t.color !== color) mobility++;
                            }
                        }
                        break;
                    case 'B':
                        for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                            let nr = r + dr, nc = c + dc;
                            while (engine.isInBounds(nr, nc)) {
                                const t = engine.board[nr][nc];
                                if (!t) { mobility++; }
                                else { if (t.color !== color) mobility++; break; }
                                nr += dr; nc += dc;
                            }
                        }
                        break;
                    case 'R':
                        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                            let nr = r + dr, nc = c + dc;
                            while (engine.isInBounds(nr, nc)) {
                                const t = engine.board[nr][nc];
                                if (!t) { mobility++; }
                                else { if (t.color !== color) mobility++; break; }
                                nr += dr; nc += dc;
                            }
                        }
                        break;
                    case 'Q':
                        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
                            let nr = r + dr, nc = c + dc;
                            let count = 0;
                            while (engine.isInBounds(nr, nc) && count < 3) {
                                const t = engine.board[nr][nc];
                                if (!t) { mobility++; }
                                else { if (t.color !== color) mobility++; break; }
                                nr += dr; nc += dc; count++;
                            }
                        }
                        break;
                }
            }
        }
        return mobility;
    }

    evaluateKingSafety(engine, kingPos, color) {
        let safety = 0;
        const [kr, kc] = kingPos;
        const pawnDir = color === 'w' ? -1 : 1;
        const enemyColor = color === 'w' ? 'b' : 'w';

        // Escudo de peões na frente do rei (mais detalhado)
        for (let dc = -1; dc <= 1; dc++) {
            const pc = kc + dc;
            if (pc < 0 || pc > 7) continue;

            let foundShield = false;
            // Verificar 1 e 2 casas na frente
            for (let dist = 1; dist <= 2; dist++) {
                const pr = kr + pawnDir * dist;
                if (engine.isInBounds(pr, pc)) {
                    const p = engine.board[pr][pc];
                    if (p && p.type === 'P' && p.color === color) {
                        safety += dist === 1 ? 15 : 8;
                        foundShield = true;
                        break;
                    }
                }
            }
            if (!foundShield) {
                safety -= 20; // Coluna semi-aberta perto do rei
            }
        }

        // Penalizar colunas abertas/semi-abertas adjacentes ao rei
        for (let dc = -1; dc <= 1; dc++) {
            const fileCol = kc + dc;
            if (fileCol < 0 || fileCol > 7) continue;
            let friendlyPawn = false;
            let enemyPawn = false;
            for (let r = 0; r < 8; r++) {
                const p = engine.board[r][fileCol];
                if (p && p.type === 'P') {
                    if (p.color === color) friendlyPawn = true;
                    else enemyPawn = true;
                }
            }
            if (!friendlyPawn && !enemyPawn) safety -= 25; // Coluna aberta
            else if (!friendlyPawn) safety -= 15; // Semi-aberta contra nós
        }

        // Contar ataques inimigos na zona do rei (2 casas ao redor)
        let attackedSquares = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc2 = -1; dc2 <= 1; dc2++) {
                const ar = kr + dr;
                const ac = kc + dc2;
                if (!engine.isInBounds(ar, ac)) continue;
                if (engine.isSquareAttacked(ar, ac, color)) {
                    attackedSquares++;
                }
            }
        }
        if (attackedSquares >= 3) safety -= attackedSquares * 12;
        else if (attackedSquares >= 2) safety -= attackedSquares * 6;

        return safety;
    }

    // Gerar justificativa do movimento em português
    generateJustification(engine, move, score, moveScores, aiColor) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        const pieceNames = { 'K': 'Rei', 'Q': 'Dama', 'R': 'Torre', 'B': 'Bispo', 'N': 'Cavalo', 'P': 'Peão' };

        const piece = engine.board[move.from[0]][move.from[1]];
        const pieceName = pieceNames[piece.type];
        const fromSq = files[move.from[1]] + ranks[move.from[0]];
        const toSq = files[move.to[1]] + ranks[move.to[0]];

        let reasons = [];

        // Razão principal do movimento
        if (move.castling) {
            reasons.push(`🏰 **Roque ${move.castling === 'K' ? 'curto' : 'longo'}**: Protege o rei e ativa a torre.`);
        } else if (move.capture) {
            const capturedName = pieceNames[move.capture.type];
            const capturedValue = this.PIECE_VALUES[move.capture.type];
            const attackerValue = this.PIECE_VALUES[piece.type];
            reasons.push(`⚔️ **Captura**: ${pieceName} em ${fromSq} captura ${capturedName} em ${toSq}.`);
            if (capturedValue > attackerValue) {
                reasons.push(`💰 **Ganho material**: Captura peça de maior valor (${capturedValue} vs ${attackerValue} centipeões).`);
            } else if (capturedValue === attackerValue) {
                reasons.push(`🔄 **Troca**: Troca de peças de mesmo valor.`);
            }
        } else if (move.promotion) {
            reasons.push(`👑 **Promoção**: Peão promovido a ${pieceNames[move.promotion]} em ${toSq}!`);
        } else {
            // Analisar o propósito do movimento
            const clone = engine.clone();
            clone.applyMoveUnchecked(move);

            if (clone.isInCheck(this.oppositeColor(aiColor))) {
                reasons.push(`♚ **Xeque**: ${pieceName} dá xeque ao rei adversário em ${toSq}.`);
            }

            // Controle do centro
            if ((move.to[0] >= 3 && move.to[0] <= 4) && (move.to[1] >= 2 && move.to[1] <= 5)) {
                reasons.push(`🎯 **Controle central**: ${pieceName} ocupa/controla casas centrais (${toSq}).`);
            }

            // Desenvolvimento de peça
            const startRow = aiColor === 'w' ? 7 : 0;
            if (move.from[0] === startRow && (piece.type === 'N' || piece.type === 'B')) {
                reasons.push(`📐 **Desenvolvimento**: ${pieceName} é desenvolvido de ${fromSq} para ${toSq}.`);
            }

            // Defesa
            if (!reasons.some(r => r.includes('Xeque') || r.includes('Captura'))) {
                reasons.push(`♟️ **Posicionamento**: ${pieceName} move de ${fromSq} para ${toSq} para melhorar a posição.`);
            }
        }

        // Avaliação numérica
        const evalInPawns = (score / 100).toFixed(2);
        const evalSign = score > 0 ? '+' : '';
        reasons.push(`📊 **Avaliação**: ${evalSign}${evalInPawns} (em peões). Nós analisados: ${this.nodesSearched.toLocaleString()}.`);

        // Melhor alternativa
        if (moveScores.length > 1) {
            const sorted = moveScores.sort((a, b) => b.score - a.score);
            if (sorted.length >= 2) {
                const alt = sorted[1].move;
                const altPiece = engine.board[alt.from[0]][alt.from[1]];
                const altFrom = files[alt.from[1]] + ranks[alt.from[0]];
                const altTo = files[alt.to[1]] + ranks[alt.to[0]];
                const altEval = (sorted[1].score / 100).toFixed(2);
                reasons.push(`🔀 **Alternativa**: ${pieceNames[altPiece.type]} ${altFrom}→${altTo} (avaliação: ${altEval}).`);
            }
        }

        // Status geral
        if (Math.abs(score) > 300) {
            if (score > 0) {
                reasons.push(`✅ **Vantagem significativa** para o computador.`);
            } else {
                reasons.push(`⚠️ **Posição difícil** para o computador.`);
            }
        } else if (Math.abs(score) < 50) {
            reasons.push(`⚖️ **Posição equilibrada**.`);
        }

        return reasons.join('\n');
    }
}

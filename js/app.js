// ============================================================
// Chess App - Controlador principal do jogo
// ============================================================

class ChessApp {
    constructor() {
        this.engine = new ChessEngine();
        this.ui = new ChessUI();
        this.logger = new ChessLogger();
        this.playerColor = 'w';
        this.aiColor = 'b';
        this.capturedByPlayer = [];
        this.capturedByAI = [];
        this.isAIThinking = false;
        this.aiWorker = null;
        this.aiStartTime = 0;

        this.pieceSymbols = {
            'w': { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙' },
            'b': { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' }
        };

        this.initWorker();
        this.setupEventListeners();
    }

    initWorker() {
        if (this.aiWorker) {
            this.aiWorker.terminate();
            this.aiWorker = null;
        }

        try {
            this.aiWorker = new Worker('js/ai-worker.js');
            this.aiWorker.onmessage = (e) => this.handleWorkerMessage(e);
            this.aiWorker.onerror = (err) => {
                console.warn('Worker falhou, usando fallback:', err.message);
                this.aiWorker = null;
                this.makeAIMoveFallback();
            };
            this.useWorker = true;
        } catch (err) {
            console.warn('Worker não disponível (file:// ?), usando thread principal:', err.message);
            this.aiWorker = null;
            this.useWorker = false;
        }
    }

    handleWorkerMessage(e) {
        const { type, move, justification, evaluation, nodesSearched } = e.data;

        if (type === 'bestMove') {
            if (!move) {
                this.isAIThinking = false;
                return;
            }

            const thinkTime = ((performance.now() - this.aiStartTime) / 1000).toFixed(1);

            this.engine.makeMove(move);

            const lastMoveRecord = this.engine.moveHistory[this.engine.moveHistory.length - 1];

            if (lastMoveRecord.captured) {
                this.capturedByAI.push(lastMoveRecord.captured);
            }

            this.logger.logMove(lastMoveRecord, this.engine.getBoardText(), justification, this.engine);

            this.ui.setLastMove(move.from, move.to);
            this.ui.renderBoard(this.engine);
            this.ui.updateMoveHistory(this.engine.moveHistory);
            this.updateGameState();

            const moveNum = Math.ceil(this.engine.moveHistory.length / 2);
            const fullJustification = justification + `\n⏱️ **Tempo de cálculo**: ${thinkTime}s`;
            this.ui.addAIJustification(lastMoveRecord.notation, fullJustification, moveNum);

            this.isAIThinking = false;

            if (this.engine.gameOver) {
                this.handleGameOver();
                return;
            }

            this.ui.setEnabled(true);
            this.ui.setStatus('Sua vez - Mova uma peça');
        }
    }

    // Serializar estado do engine para enviar ao Worker
    serializeEngine() {
        return {
            board: this.engine.board.map(row =>
                row.map(p => p ? { type: p.type, color: p.color } : null)
            ),
            turn: this.engine.turn,
            castlingRights: { ...this.engine.castlingRights },
            enPassantTarget: this.engine.enPassantTarget ? [...this.engine.enPassantTarget] : null,
            halfMoveClock: this.engine.halfMoveClock,
            fullMoveNumber: this.engine.fullMoveNumber,
            moveHistory: [],
            positionHistory: [...this.engine.positionHistory],
            gameOver: this.engine.gameOver,
            gameResult: this.engine.gameResult
        };
    }

    setupEventListeners() {
        // Botões de seleção de cor
        document.getElementById('btn-white').addEventListener('click', () => this.startGame('w'));
        document.getElementById('btn-black').addEventListener('click', () => this.startGame('b'));

        // Controles do jogo
        document.getElementById('btn-new-game').addEventListener('click', () => this.goToColorSelection());
        document.getElementById('btn-resign').addEventListener('click', () => this.resign());
        document.getElementById('btn-download-log').addEventListener('click', () => this.downloadLog());

        // Modal de fim de jogo
        document.getElementById('btn-play-again').addEventListener('click', () => this.goToColorSelection());
        document.getElementById('btn-download-final').addEventListener('click', () => this.downloadLog());
    }

    startGame(playerColor) {
        this.playerColor = playerColor;
        this.aiColor = playerColor === 'w' ? 'b' : 'w';
        this.engine.reset();
        this.capturedByPlayer = [];
        this.capturedByAI = [];
        this.isAIThinking = false;

        // Iniciar log
        const gameNumber = this.logger.getNextGameNumber();
        this.logger.startNewGame(playerColor, gameNumber);

        // Trocar telas
        document.getElementById('color-selection').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';

        // Limpar justificativas e histórico
        document.getElementById('ai-justification').innerHTML =
            '<div style="color: #888; text-align: center; padding: 20px;">As justificativas dos movimentos do computador aparecerão aqui.</div>';
        document.getElementById('move-history').innerHTML = '';

        // Inicializar UI
        this.ui.init(playerColor, (action, data) => this.handleUIAction(action, data));
        this.ui.renderBoard(this.engine);
        this.updateGameState();

        // Se jogador é preto, IA joga primeiro
        if (playerColor === 'b') {
            this.ui.setStatus('🤔 Computador pensando...', true);
            this.ui.setEnabled(false);
            this.makeAIMove();
        } else {
            this.ui.setStatus('Sua vez - Mova uma peça');
        }
    }

    handleUIAction(action, data) {
        if (this.isAIThinking || this.engine.gameOver) return;

        if (action === 'select') {
            const piece = this.engine.getPiece(data.row, data.col);
            if (piece && piece.color === this.playerColor && this.engine.turn === this.playerColor) {
                this.ui.selectSquare(data.row, data.col, this.engine);
            }
        } else if (action === 'move') {
            this.makePlayerMove(data);
        }
    }

    makePlayerMove(move) {
        if (this.engine.turn !== this.playerColor) return;

        const success = this.engine.makeMove(move);
        if (!success) return;

        const lastMoveRecord = this.engine.moveHistory[this.engine.moveHistory.length - 1];

        // Registrar captura
        if (lastMoveRecord.captured) {
            this.capturedByPlayer.push(lastMoveRecord.captured);
        }

        // Log do movimento
        this.logger.logMove(lastMoveRecord, this.engine.getBoardText(), null, this.engine);

        // Atualizar UI
        this.ui.setLastMove(move.from, move.to);
        this.ui.renderBoard(this.engine);
        this.ui.updateMoveHistory(this.engine.moveHistory);
        this.updateGameState();

        // Verificar fim de jogo
        if (this.engine.gameOver) {
            this.handleGameOver();
            return;
        }

        // Turno da IA
        this.ui.setStatus('🤔 Computador pensando...', true);
        this.ui.setEnabled(false);
        this.isAIThinking = true;

        // Enviar para o Web Worker (thread separada - não trava a UI)
        this.makeAIMove();
    }

    makeAIMove() {
        this.isAIThinking = true;
        this.aiStartTime = performance.now();

        if (this.aiWorker && this.useWorker) {
            this.aiWorker.postMessage({
                type: 'getBestMove',
                engineState: this.serializeEngine()
            });
        } else {
            // Fallback: usar setTimeout para não travar UI completamente
            setTimeout(() => this.makeAIMoveFallback(), 50);
        }
    }

    // Fallback caso o Worker falhe (executa na thread principal)
    makeAIMoveFallback() {
        this.isAIThinking = true;
        const startTime = performance.now();

        const ai = new ChessAI();
        const bestMove = ai.getBestMove(this.engine);

        if (!bestMove) {
            this.isAIThinking = false;
            return;
        }

        const thinkTime = ((performance.now() - startTime) / 1000).toFixed(1);
        const justification = ai.lastJustification;

        this.engine.makeMove(bestMove);

        const lastMoveRecord = this.engine.moveHistory[this.engine.moveHistory.length - 1];

        if (lastMoveRecord.captured) {
            this.capturedByAI.push(lastMoveRecord.captured);
        }

        this.logger.logMove(lastMoveRecord, this.engine.getBoardText(), justification, this.engine);

        this.ui.setLastMove(bestMove.from, bestMove.to);
        this.ui.renderBoard(this.engine);
        this.ui.updateMoveHistory(this.engine.moveHistory);
        this.updateGameState();

        const moveNum = Math.ceil(this.engine.moveHistory.length / 2);
        const fullJustification = justification + `\n⏱️ **Tempo de cálculo**: ${thinkTime}s`;
        this.ui.addAIJustification(lastMoveRecord.notation, fullJustification, moveNum);

        this.isAIThinking = false;

        if (this.engine.gameOver) {
            this.handleGameOver();
            return;
        }

        this.ui.setEnabled(true);
        this.ui.setStatus('Sua vez - Mova uma peça');
    }

    updateGameState() {
        // Atualizar peças capturadas
        const playerCapturedStr = this.capturedByPlayer
            .map(p => this.pieceSymbols[p.color][p.type])
            .join(' ');
        const aiCapturedStr = this.capturedByAI
            .map(p => this.pieceSymbols[p.color][p.type])
            .join(' ');

        this.ui.updatePlayerInfo(this.engine, this.playerColor, playerCapturedStr, aiCapturedStr);
    }

    handleGameOver() {
        this.ui.setEnabled(false);
        this.isAIThinking = false;

        let title = '';
        let message = '';
        let icon = '';

        if (this.engine.gameResult === '1-0') {
            if (this.playerColor === 'w') {
                title = 'Você Venceu!';
                message = 'Parabéns! Você derrotou o computador com as brancas!';
                icon = '🏆';
            } else {
                title = 'Computador Venceu';
                message = 'O computador venceu com as brancas por xeque-mate.';
                icon = '🤖';
            }
        } else if (this.engine.gameResult === '0-1') {
            if (this.playerColor === 'b') {
                title = 'Você Venceu!';
                message = 'Parabéns! Você derrotou o computador com as pretas!';
                icon = '🏆';
            } else {
                title = 'Computador Venceu';
                message = 'O computador venceu com as pretas por xeque-mate.';
                icon = '🤖';
            }
        } else {
            title = 'Empate!';
            icon = '🤝';
            if (this.engine.halfMoveClock >= 100) {
                message = 'Empate pela regra dos 50 movimentos.';
            } else if (!this.engine.isInCheck(this.engine.turn) && this.engine.getLegalMoves(this.engine.turn).length === 0) {
                message = 'Empate por afogamento (stalemate).';
            } else if (this.engine.isInsufficientMaterial()) {
                message = 'Empate por material insuficiente.';
            } else {
                message = 'Empate por repetição tripla.';
            }
        }

        this.logger.setResult(this.engine.gameResult, message);
        this.ui.setStatus(`Fim de jogo: ${title}`);

        // Mostrar modal
        const modal = document.getElementById('game-over-modal');
        modal.querySelector('.result-icon').textContent = icon;
        modal.querySelector('h2').textContent = title;
        modal.querySelector('.result-text').textContent = message;
        modal.classList.add('show');
    }

    resign() {
        if (this.engine.gameOver) return;

        if (this.isAIThinking) {
            if (this.aiWorker) {
                this.aiWorker.terminate();
                this.aiWorker = null;
                this.initWorker();
            }
            this.isAIThinking = false;
        }

        if (!confirm('Tem certeza que deseja desistir?')) return;

        this.engine.gameOver = true;
        this.engine.gameResult = this.playerColor === 'w' ? '0-1' : '1-0';

        this.logger.setResult(this.engine.gameResult, 'Jogador desistiu.');
        this.handleGameOver();
    }

    goToColorSelection() {
        if (this.aiWorker) {
            this.aiWorker.terminate();
            this.aiWorker = null;
            this.initWorker();
        }
        this.isAIThinking = false;

        document.getElementById('game-over-modal').classList.remove('show');
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('color-selection').style.display = 'flex';
    }

    downloadLog() {
        this.logger.downloadLog(this.engine);
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    window.chessApp = new ChessApp();
});

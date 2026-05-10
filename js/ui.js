// ============================================================
// Chess UI - Interface do tabuleiro e interação do jogador
// ============================================================

class ChessUI {
    constructor() {
        this.boardElement = document.getElementById('chess-board');
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.boardFlipped = false;
        this.lastMoveFrom = null;
        this.lastMoveTo = null;
        this.playerColor = 'w';
        this.onMoveCallback = null;
        this.dragPiece = null;
        this.dragElement = null;
        this.enabled = true;

        // Símbolos Unicode das peças (usando glifos preenchidos para melhor visibilidade)
        this.pieceSymbols = {
            'w': { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' },
            'b': { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' }
        };
    }

    init(playerColor, onMoveCallback) {
        this.playerColor = playerColor;
        this.boardFlipped = playerColor === 'w';
        this.onMoveCallback = onMoveCallback;
        this.enabled = true;
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.lastMoveFrom = null;
        this.lastMoveTo = null;
        this.buildBoard();
    }

    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        this.buildBoard();
    }

    buildBoard() {
        this.boardElement.innerHTML = '';
        const files = 'abcdefgh';
        const ranks = '87654321';

        for (let displayRow = 0; displayRow < 8; displayRow++) {
            for (let displayCol = 0; displayCol < 8; displayCol++) {
                const row = this.boardFlipped ? 7 - displayRow : displayRow;
                const col = this.boardFlipped ? 7 - displayCol : displayCol;

                const square = document.createElement('div');
                square.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = row;
                square.dataset.col = col;

                // Labels de coordenadas
                if (displayCol === 7) {
                    const rankLabel = document.createElement('span');
                    rankLabel.className = 'rank-label';
                    rankLabel.textContent = ranks[row];
                    square.appendChild(rankLabel);
                }
                if (displayRow === 7) {
                    const fileLabel = document.createElement('span');
                    fileLabel.className = 'file-label';
                    fileLabel.textContent = files[col];
                    square.appendChild(fileLabel);
                }

                square.addEventListener('click', (e) => this.handleSquareClick(row, col));

                // Drag and drop
                square.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });

                square.addEventListener('drop', (e) => {
                    e.preventDefault();
                    if (this.dragPiece) {
                        this.handleDrop(row, col);
                    }
                });

                this.boardElement.appendChild(square);
            }
        }
    }

    renderBoard(engine) {
        const squares = this.boardElement.querySelectorAll('.square');
        squares.forEach(sq => {
            const row = parseInt(sq.dataset.row);
            const col = parseInt(sq.dataset.col);
            const piece = engine.board[row][col];

            // Remover peça existente
            const existingPiece = sq.querySelector('.piece');
            if (existingPiece) existingPiece.remove();

            // Remover classes de estado
            sq.classList.remove('selected', 'legal-move', 'legal-capture', 'last-move-from', 'last-move-to', 'check');

            // Último movimento
            if (this.lastMoveFrom && this.lastMoveFrom[0] === row && this.lastMoveFrom[1] === col) {
                sq.classList.add('last-move-from');
            }
            if (this.lastMoveTo && this.lastMoveTo[0] === row && this.lastMoveTo[1] === col) {
                sq.classList.add('last-move-to');
            }

            // Xeque
            if (piece && piece.type === 'K' && piece.color === engine.turn && engine.isInCheck(engine.turn)) {
                sq.classList.add('check');
            }

            // Adicionar peça
            if (piece) {
                const pieceEl = document.createElement('span');
                pieceEl.className = 'piece piece-' + piece.color;
                pieceEl.textContent = this.pieceSymbols[piece.color][piece.type];
                pieceEl.draggable = (piece.color === this.playerColor && this.enabled);

                pieceEl.addEventListener('dragstart', (e) => {
                    if (!this.enabled || piece.color !== this.playerColor) {
                        e.preventDefault();
                        return;
                    }
                    this.dragPiece = { row, col };
                    e.dataTransfer.effectAllowed = 'move';
                    // Usar uma imagem transparente como ghost
                    const ghost = document.createElement('span');
                    ghost.textContent = this.pieceSymbols[piece.color][piece.type];
                    ghost.style.fontSize = '50px';
                    ghost.style.position = 'absolute';
                    ghost.style.top = '-100px';
                    document.body.appendChild(ghost);
                    e.dataTransfer.setDragImage(ghost, 25, 25);
                    setTimeout(() => ghost.remove(), 0);

                    // Mostrar movimentos legais
                    this.selectSquare(row, col, engine);
                });

                pieceEl.addEventListener('dragend', () => {
                    this.dragPiece = null;
                });

                sq.appendChild(pieceEl);
            }
        });
    }

    selectSquare(row, col, engine) {
        // Limpar seleção anterior
        this.clearSelection();

        this.selectedSquare = [row, col];
        const legalMoves = engine.getLegalMoves(this.playerColor);
        this.legalMovesForSelected = legalMoves.filter(m => m.from[0] === row && m.from[1] === col);

        // Marcar casa selecionada
        const sq = this.getSquareElement(row, col);
        if (sq) sq.classList.add('selected');

        // Mostrar movimentos legais
        for (const move of this.legalMovesForSelected) {
            const targetSq = this.getSquareElement(move.to[0], move.to[1]);
            if (targetSq) {
                if (move.capture || move.enPassant) {
                    targetSq.classList.add('legal-capture');
                } else {
                    targetSq.classList.add('legal-move');
                }
            }
        }
    }

    clearSelection() {
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.clearHighlights();
    }

    clearHighlights() {
        this.selectedSquare = null;
        const squares = this.boardElement.querySelectorAll('.square');
        squares.forEach(sq => {
            sq.classList.remove('selected', 'legal-move', 'legal-capture');
        });
    }

    handleSquareClick(row, col) {
        if (!this.enabled) return;

        // Se já tem uma peça selecionada, tentar mover
        if (this.selectedSquare) {
            const [selRow, selCol] = this.selectedSquare;

            // Clicou na mesma casa - desselecionar
            if (selRow === row && selCol === col) {
                this.clearSelection();
                return;
            }

            // Tentar mover para a casa clicada
            const targetMove = this.legalMovesForSelected.find(m =>
                m.to[0] === row && m.to[1] === col
            );

            if (targetMove) {
                // Salvar movimentos antes de limpar seleção (para promoção)
                const savedMoves = [...this.legalMovesForSelected];
                this.clearHighlights();
                this.executeMove(targetMove, savedMoves);
                return;
            }

            // Se clicou em outra peça própria, selecionar ela
            this.clearSelection();
        }

        // Selecionar peça (vai ser tratado pelo app que tem acesso ao engine)
        if (this.onMoveCallback) {
            this.onMoveCallback('select', { row, col });
        }
    }

    handleDrop(row, col) {
        if (!this.dragPiece) return;

        const targetMove = this.legalMovesForSelected.find(m =>
            m.to[0] === row && m.to[1] === col
        );

        const savedMoves = [...this.legalMovesForSelected];
        this.clearHighlights();

        if (targetMove) {
            this.executeMove(targetMove, savedMoves);
        }

        this.dragPiece = null;
    }

    executeMove(move, availableMoves) {
        // Verificar promoção - se há múltiplas opções de promoção (peão chegando ao fim)
        if (move.promotion !== undefined && availableMoves) {
            const promoMoves = availableMoves.filter(m =>
                m.to[0] === move.to[0] && m.to[1] === move.to[1] && m.promotion
            );

            if (promoMoves.length > 1) {
                this.showPromotionDialog(promoMoves);
                return;
            }
        }

        // Executar movimento
        this.lastMoveFrom = move.from;
        this.lastMoveTo = move.to;

        if (this.onMoveCallback) {
            this.onMoveCallback('move', move);
        }
    }

    showPromotionDialog(promoMoves) {
        const modal = document.getElementById('promotion-modal');
        const piecesContainer = modal.querySelector('.promotion-pieces');
        piecesContainer.innerHTML = '';

        const color = this.playerColor;

        for (const move of promoMoves) {
            const btn = document.createElement('div');
            btn.className = 'promotion-piece';
            btn.textContent = this.pieceSymbols[color][move.promotion];
            btn.addEventListener('click', () => {
                modal.classList.remove('show');
                this.lastMoveFrom = move.from;
                this.lastMoveTo = move.to;
                if (this.onMoveCallback) {
                    this.onMoveCallback('move', move);
                }
            });
            piecesContainer.appendChild(btn);
        }

        modal.classList.add('show');
    }

    setLastMove(from, to) {
        this.lastMoveFrom = from;
        this.lastMoveTo = to;
    }

    getSquareElement(row, col) {
        return this.boardElement.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Atualizar info dos jogadores
    updatePlayerInfo(engine, playerColor, capturedByPlayer, capturedByAI) {
        const topPlayer = document.getElementById('top-player');
        const bottomPlayer = document.getElementById('bottom-player');

        const isPlayerWhite = playerColor === 'w';

        // Bottom = jogador, Top = computador
        const playerName = isPlayerWhite ? 'Você (Brancas)' : 'Você (Pretas)';
        const aiName = isPlayerWhite ? 'Computador (Pretas)' : 'Computador (Brancas)';
        const playerIcon = isPlayerWhite ? '♔' : '♚';
        const aiIcon = isPlayerWhite ? '♚' : '♔';

        bottomPlayer.querySelector('.player-name').textContent = playerName;
        bottomPlayer.querySelector('.player-icon').textContent = playerIcon;
        bottomPlayer.querySelector('.captured-pieces').textContent = capturedByPlayer;

        topPlayer.querySelector('.player-name').textContent = aiName;
        topPlayer.querySelector('.player-icon').textContent = aiIcon;
        topPlayer.querySelector('.captured-pieces').textContent = capturedByAI;

        // Indicar turno ativo
        topPlayer.classList.toggle('active-player', engine.turn !== playerColor);
        bottomPlayer.classList.toggle('active-player', engine.turn === playerColor);
    }

    // Atualizar histórico de movimentos
    updateMoveHistory(moveHistory) {
        const container = document.getElementById('move-history');
        container.innerHTML = '';

        for (let i = 0; i < moveHistory.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const row = document.createElement('div');
            row.className = 'move-row';

            const numSpan = document.createElement('span');
            numSpan.className = 'move-number';
            numSpan.textContent = moveNum + '.';
            row.appendChild(numSpan);

            const whiteSpan = document.createElement('span');
            whiteSpan.className = 'move-white';
            whiteSpan.textContent = moveHistory[i].notation;
            if (i === moveHistory.length - 1) whiteSpan.classList.add('last-move');
            row.appendChild(whiteSpan);

            if (i + 1 < moveHistory.length) {
                const blackSpan = document.createElement('span');
                blackSpan.className = 'move-black';
                blackSpan.textContent = moveHistory[i + 1].notation;
                if (i + 1 === moveHistory.length - 1) blackSpan.classList.add('last-move');
                row.appendChild(blackSpan);
            }

            container.appendChild(row);
        }

        // Auto-scroll
        container.scrollTop = container.scrollHeight;
    }

    // Adicionar justificativa da IA
    addAIJustification(moveNotation, justification, moveNumber) {
        const container = document.getElementById('ai-justification');

        const entry = document.createElement('div');
        entry.className = 'justification-entry';

        const label = document.createElement('div');
        label.className = 'move-label';
        label.textContent = `Movimento ${moveNumber}: ${moveNotation}`;
        entry.appendChild(label);

        const reasons = document.createElement('div');
        reasons.className = 'reasons';
        // Processar markdown básico (negrito)
        reasons.innerHTML = justification.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        entry.appendChild(reasons);

        container.insertBefore(entry, container.firstChild);
    }

    setStatus(text, isThinking = false) {
        const statusBar = document.getElementById('status-bar');
        statusBar.textContent = text;
        statusBar.classList.toggle('thinking', isThinking);
    }
}

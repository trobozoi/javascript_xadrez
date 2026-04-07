// ============================================================
// Chess Logger - Geração de logs de partida em Markdown
// ============================================================

class ChessLogger {
    constructor() {
        this.gameLog = null;
        this.gameNumber = 1;
    }

    startNewGame(playerColor, gameNumber) {
        this.gameNumber = gameNumber;
        const now = new Date();
        const dateStr = this.formatDate(now);
        const timeStr = now.toLocaleTimeString('pt-BR');

        this.gameLog = {
            fileName: this.generateFileName(gameNumber, now),
            date: dateStr,
            time: timeStr,
            playerColor: playerColor,
            moves: [],
            startTime: now,
            result: null,
            resultText: null
        };
    }

    generateFileName(gameNumber, date) {
        const nn = String(gameNumber).padStart(2, '0');
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `jogo${nn}${yyyy}${mm}${dd}`;
    }

    formatDate(date) {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    logMove(moveRecord, boardText, aiJustification, engine) {
        if (!this.gameLog) return;

        this.gameLog.moves.push({
            number: this.gameLog.moves.length + 1,
            notation: moveRecord.notation,
            description: engine.getMoveDescription(moveRecord),
            piece: moveRecord.piece,
            captured: moveRecord.captured,
            boardAfter: boardText,
            aiJustification: aiJustification || null,
            fen: engine.getFEN(),
            timestamp: new Date().toLocaleTimeString('pt-BR')
        });
    }

    setResult(result, resultText) {
        if (!this.gameLog) return;
        this.gameLog.result = result;
        this.gameLog.resultText = resultText;
    }

    generateMarkdown(engine) {
        if (!this.gameLog) return '';

        const log = this.gameLog;
        const playerColorName = log.playerColor === 'w' ? 'Brancas' : 'Pretas';
        const aiColorName = log.playerColor === 'w' ? 'Pretas' : 'Brancas';
        const duration = this.getGameDuration();

        let md = '';

        // Cabeçalho
        md += `# ♟️ Registro de Partida - ${log.fileName}\n\n`;
        md += `## 📋 Informações da Partida\n\n`;
        md += `| Campo | Valor |\n`;
        md += `|-------|-------|\n`;
        md += `| **Data** | ${log.date} |\n`;
        md += `| **Hora de Início** | ${log.time} |\n`;
        md += `| **Duração** | ${duration} |\n`;
        md += `| **Jogador** | ${playerColorName} |\n`;
        md += `| **Computador** | ${aiColorName} (Nível Máximo - Profundidade 5) |\n`;
        md += `| **Resultado** | ${log.result || 'Em andamento'} |\n`;
        md += `| **Descrição** | ${log.resultText || '-'} |\n`;
        md += `| **Total de Movimentos** | ${Math.ceil(log.moves.length / 2)} |\n\n`;

        // Posição inicial
        md += `## 🏁 Posição Inicial\n\n`;
        md += this.getInitialBoardText() + '\n\n';

        // Resumo da partida em notação algébrica
        md += `## 📝 Notação Algébrica\n\n`;
        md += '```\n';
        for (let i = 0; i < log.moves.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            let line = `${moveNum}. ${log.moves[i].notation}`;
            if (i + 1 < log.moves.length) {
                line += ` ${log.moves[i + 1].notation}`;
            }
            md += line + '\n';
        }
        if (log.result) {
            md += `\nResultado: ${log.result}\n`;
        }
        md += '```\n\n';

        // FEN final
        md += `## 🔗 FEN Final\n\n`;
        md += '```\n';
        md += engine.getFEN() + '\n';
        md += '```\n\n';

        // Detalhamento jogada a jogada
        md += `## 📖 Detalhamento das Jogadas\n\n`;

        for (let i = 0; i < log.moves.length; i++) {
            const move = log.moves[i];
            const isWhiteMove = i % 2 === 0;
            const fullMoveNum = Math.floor(i / 2) + 1;
            const colorEmoji = isWhiteMove ? '⬜' : '⬛';
            const colorName = isWhiteMove ? 'Brancas' : 'Pretas';
            const isAI = (isWhiteMove && log.playerColor === 'b') || (!isWhiteMove && log.playerColor === 'w');
            const playerLabel = isAI ? '🤖 Computador' : '👤 Jogador';

            md += `### ${colorEmoji} Movimento ${fullMoveNum}${isWhiteMove ? '' : '...'} - ${colorName} (${playerLabel})\n\n`;
            md += `- **Notação**: \`${move.notation}\`\n`;
            md += `- **Descrição**: ${move.description}\n`;
            md += `- **Horário**: ${move.timestamp}\n`;
            md += `- **FEN**: \`${move.fen}\`\n`;

            if (move.captured) {
                const pieceNames = { 'K': 'Rei', 'Q': 'Dama', 'R': 'Torre', 'B': 'Bispo', 'N': 'Cavalo', 'P': 'Peão' };
                md += `- **Captura**: ${pieceNames[move.captured.type]}\n`;
            }

            if (move.aiJustification && isAI) {
                md += `\n**🧠 Justificativa da IA:**\n\n`;
                const lines = move.aiJustification.split('\n');
                for (const line of lines) {
                    md += `> ${line}\n`;
                }
                md += '\n';
            }

            md += `\n**Tabuleiro após o movimento:**\n\n`;
            md += move.boardAfter + '\n\n';
            md += `---\n\n`;
        }

        // Resultado final
        if (log.result) {
            md += `## 🏆 Resultado Final\n\n`;
            md += `**${log.result}** - ${log.resultText}\n\n`;

            // Tabuleiro final
            md += `### Posição Final\n\n`;
            if (log.moves.length > 0) {
                md += log.moves[log.moves.length - 1].boardAfter + '\n\n';
            }
        }

        // Estatísticas
        md += `## 📊 Estatísticas\n\n`;
        const playerMoves = log.moves.filter((_, i) =>
            (i % 2 === 0 && log.playerColor === 'w') || (i % 2 === 1 && log.playerColor === 'b')
        );
        const aiMoves = log.moves.filter((_, i) =>
            (i % 2 === 0 && log.playerColor === 'b') || (i % 2 === 1 && log.playerColor === 'w')
        );

        const playerCaptures = playerMoves.filter(m => m.captured).length;
        const aiCaptures = aiMoves.filter(m => m.captured).length;

        md += `| Estatística | Jogador | Computador |\n`;
        md += `|------------|---------|------------|\n`;
        md += `| Movimentos | ${playerMoves.length} | ${aiMoves.length} |\n`;
        md += `| Capturas | ${playerCaptures} | ${aiCaptures} |\n\n`;

        md += `---\n`;
        md += `*Log gerado automaticamente pelo Motor de Xadrez JavaScript*\n`;
        md += `*Data de geração: ${new Date().toLocaleString('pt-BR')}*\n`;

        return md;
    }

    getInitialBoardText() {
        return '```\n    a   b   c   d   e   f   g   h\n  ┌───┬───┬───┬───┬───┬───┬───┬───┐\n' +
            '8 │ ♜ │ ♞ │ ♝ │ ♛ │ ♚ │ ♝ │ ♞ │ ♜ │ 8\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '7 │ ♟ │ ♟ │ ♟ │ ♟ │ ♟ │ ♟ │ ♟ │ ♟ │ 7\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '6 │   │   │   │   │   │   │   │   │ 6\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '5 │   │   │   │   │   │   │   │   │ 5\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '4 │   │   │   │   │   │   │   │   │ 4\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '3 │   │   │   │   │   │   │   │   │ 3\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '2 │ ♙ │ ♙ │ ♙ │ ♙ │ ♙ │ ♙ │ ♙ │ ♙ │ 2\n' +
            '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n' +
            '1 │ ♖ │ ♘ │ ♗ │ ♕ │ ♔ │ ♗ │ ♘ │ ♖ │ 1\n' +
            '  └───┴───┴───┴───┴───┴───┴───┴───┘\n    a   b   c   d   e   f   g   h\n```';
    }

    getGameDuration() {
        if (!this.gameLog || !this.gameLog.startTime) return 'N/A';
        const now = new Date();
        const diff = now - this.gameLog.startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    downloadLog(engine) {
        const markdown = this.generateMarkdown(engine);
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.gameLog.fileName + '.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Obter número do próximo jogo baseado em localStorage
    getNextGameNumber() {
        const stored = localStorage.getItem('chess_game_count');
        const count = stored ? parseInt(stored) + 1 : 1;
        localStorage.setItem('chess_game_count', count.toString());
        return count;
    }
}

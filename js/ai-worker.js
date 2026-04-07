// ============================================================
// Chess AI Worker - Executa a IA em thread separada
// ============================================================

importScripts('engine.js', 'openingbook.js', 'ai.js');

const ai = new ChessAI();

self.onmessage = function(e) {
    const { type, engineState } = e.data;

    if (type === 'getBestMove') {
        // Reconstruir engine a partir do estado serializado
        const engine = new ChessEngine();
        engine.board = engineState.board.map(row =>
            row.map(p => p ? { type: p.type, color: p.color } : null)
        );
        engine.turn = engineState.turn;
        engine.castlingRights = { ...engineState.castlingRights };
        engine.enPassantTarget = engineState.enPassantTarget ? [...engineState.enPassantTarget] : null;
        engine.halfMoveClock = engineState.halfMoveClock;
        engine.fullMoveNumber = engineState.fullMoveNumber;
        engine.moveHistory = engineState.moveHistory || [];
        engine.positionHistory = engineState.positionHistory || [];
        engine.gameOver = engineState.gameOver;
        engine.gameResult = engineState.gameResult;

        const bestMove = ai.getBestMove(engine);

        self.postMessage({
            type: 'bestMove',
            move: bestMove,
            justification: ai.lastJustification,
            evaluation: ai.lastEvaluation,
            nodesSearched: ai.nodesSearched
        });
    }
};

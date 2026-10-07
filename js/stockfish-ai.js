// ============================================================
// Stockfish AI - Motor Stockfish 10 (protocolo UCI via Web Worker)
// Força muito acima de qualquer jogador humano
// ============================================================

class StockfishAI {
    constructor(moveTime = 4000) {
        this.moveTime = moveTime; // tempo de cálculo por lance (ms)
        this.pending = null;
        this.info = null;

        // WASM é bem mais rápido; asm.js é a alternativa para navegadores antigos
        const file = typeof WebAssembly === 'object'
            ? 'js/lib/stockfish/stockfish.wasm.js'
            : 'js/lib/stockfish/stockfish.js';
        this.worker = new Worker(file); // lança exceção em file://

        this.ready = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Stockfish não respondeu')), 15000);
            this.onReady = () => { clearTimeout(timer); resolve(); };
            this.onFail = (err) => { clearTimeout(timer); reject(err); };
        });

        this.worker.onmessage = (e) => this.handleLine(String(e.data));
        this.worker.onerror = (err) => this.fail(new Error(err.message || 'Erro no Stockfish'));

        this.send('uci');
        this.send('setoption name Hash value 64');
        this.send('isready');
    }

    send(cmd) {
        this.worker.postMessage(cmd);
    }

    fail(err) {
        this.onFail(err);
        if (this.pending) {
            this.pending.reject(err);
            this.pending = null;
        }
    }

    terminate() {
        this.pending = null;
        this.worker.terminate();
    }

    handleLine(line) {
        if (line === 'readyok') {
            this.onReady();
            return;
        }

        if (line.startsWith('info ') && this.info && line.includes(' pv ')) {
            const depth = line.match(/ depth (\d+)/);
            const cp = line.match(/ score cp (-?\d+)/);
            const mate = line.match(/ score mate (-?\d+)/);
            const nodes = line.match(/ nodes (\d+)/);
            if (depth) this.info.depth = parseInt(depth[1], 10);
            if (cp) { this.info.score = parseInt(cp[1], 10); this.info.mate = null; }
            if (mate) { this.info.mate = parseInt(mate[1], 10); }
            if (nodes) this.info.nodes = parseInt(nodes[1], 10);
            this.info.pv = line.split(' pv ')[1].trim().split(/\s+/);
            return;
        }

        if (line.startsWith('bestmove') && this.pending) {
            const uci = line.split(/\s+/)[1];
            const { resolve, reject } = this.pending;
            this.pending = null;
            if (!uci || uci === '(none)') {
                reject(new Error('Stockfish não retornou movimento'));
            } else {
                resolve({ move: StockfishAI.fromUci(uci), ...this.info });
            }
        }
    }

    // Calcular o melhor movimento para a posição atual do engine
    async getBestMove(engine) {
        await this.ready;
        // Enviar o histórico completo permite ao Stockfish detectar repetições
        const moves = engine.moveHistory.map(r => StockfishAI.toUci(r.move)).join(' ');
        return new Promise((resolve, reject) => {
            this.pending = { resolve, reject };
            this.info = { depth: 0, score: 0, mate: null, nodes: 0, pv: [] };
            this.send('position startpos' + (moves ? ' moves ' + moves : ''));
            this.send('go movetime ' + this.moveTime);
        });
    }

    static toUci(move) {
        const files = 'abcdefgh';
        const sq = ([r, c]) => files[c] + (8 - r);
        return sq(move.from) + sq(move.to) + (move.promotion ? move.promotion.toLowerCase() : '');
    }

    static fromUci(uci) {
        const files = 'abcdefgh';
        const move = {
            from: [8 - parseInt(uci[1], 10), files.indexOf(uci[0])],
            to: [8 - parseInt(uci[3], 10), files.indexOf(uci[2])]
        };
        if (uci.length > 4) move.promotion = uci[4].toUpperCase();
        return move;
    }
}

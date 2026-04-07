// ============================================================
// Opening Book - Livro de aberturas profissional
// Baseado em partidas de Grandes Mestres
// ============================================================

class OpeningBook {
    constructor() {
        // Formato: FEN simplificado (posição) -> array de {move, weight}
        // Movimentos no formato [fromRow, fromCol, toRow, toCol]
        // weight = frequência/força do movimento (quanto maior, melhor)
        this.book = this.buildBook();
    }

    // Procurar um movimento no livro de aberturas
    getBookMove(engine) {
        const key = this.positionKey(engine);
        const entries = this.book[key];
        if (!entries || entries.length === 0) return null;

        // Selecionar movimento ponderado pelo weight
        const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const entry of entries) {
            rand -= entry.weight;
            if (rand <= 0) {
                return {
                    from: [entry.move[0], entry.move[1]],
                    to: [entry.move[2], entry.move[3]],
                    promotion: entry.promotion || undefined
                };
            }
        }
        return {
            from: [entries[0].move[0], entries[0].move[1]],
            to: [entries[0].move[2], entries[0].move[3]]
        };
    }

    positionKey(engine) {
        let key = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = engine.board[r][c];
                if (p) key += (p.color === 'w' ? p.type : p.type.toLowerCase());
                else key += '.';
            }
        }
        return key + engine.turn;
    }

    // Atalho para definir movimentos
    m(fr, fc, tr, tc, w, promo) {
        const entry = { move: [fr, fc, tr, tc], weight: w || 10 };
        if (promo) entry.promotion = promo;
        return entry;
    }

    buildBook() {
        const B = {};
        const m = this.m.bind(this);

        // ========== POSIÇÃO INICIAL - BRANCAS ==========
        const startKey = 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNRw';
        B[startKey] = [
            m(6,4, 4,4, 30), // 1.e4 - mais popular
            m(6,3, 4,3, 25), // 1.d4 - segundo mais popular
            m(7,6, 5,5, 12), // 1.Nf3 - Reti
            m(6,2, 4,2, 10), // 1.c4 - Inglesa
        ];

        // ========== RESPOSTAS A 1.e4 (PRETAS) ==========
        // Após 1.e4
        const after_e4 = 'rnbqkbnrpppppppp......................P...........PPPP.PPPRNBQKBNRb';
        B[after_e4] = [
            m(1,4, 3,4, 30), // 1...e5 - Aberta
            m(1,2, 3,2, 25), // 1...c5 - Siciliana
            m(1,4, 2,4, 15), // 1...e6 - Francesa
            m(1,2, 2,2, 10), // 1...c6 - Caro-Kann
            m(1,3, 2,3, 5),  // 1...d6 - Pirc
        ];

        // ========== 1.e4 e5 (ABERTURAS ABERTAS) ==========
        // Após 1.e4 e5
        const after_e4_e5 = 'rnbqkbnrpppp.ppp............p.......P...........PPPP.PPPRNBQKBNRw';
        B[after_e4_e5] = [
            m(7,6, 5,5, 30), // 2.Nf3 - principal
            m(6,5, 4,5, 5),  // 2.f4 - Gambito do Rei
        ];

        // Após 1.e4 e5 2.Nf3
        const after_e4_e5_Nf3 = 'rnbqkbnrpppp.ppp............p.......P..........NPPPP.PPPRNBQKB.Rb';
        B[after_e4_e5_Nf3] = [
            m(0,1, 2,2, 25), // 2...Nc6 - principal
            m(0,6, 2,5, 10), // 2...Nf6 - Petroff
        ];

        // Após 1.e4 e5 2.Nf3 Nc6
        const after_e4_e5_Nf3_Nc6 = 'r.bqkbnrpppp.ppp..n.........p.......P..........NPPPP.PPPRNBQKB.Rw';
        B[after_e4_e5_Nf3_Nc6] = [
            m(7,5, 4,2, 25), // 3.Bb5 - Ruy Lopez
            m(7,5, 5,3, 15), // 3.Bc4 - Italiana
            m(6,3, 4,3, 5),  // 3.d4 - Escocesa
        ];

        // === RUY LOPEZ ===
        // Após 3.Bb5
        const after_ruylopez = 'r.bqkbnrpppp.ppp..n.........p...B...P..........NPPPP.PPPRNBQK..Rb';
        B[after_ruylopez] = [
            m(1,0, 2,0, 25), // 3...a6 - Morphy
            m(0,6, 2,5, 10), // 3...Nf6 - Berlin
        ];

        // Após 3.Bb5 a6
        const after_ruy_a6 = 'r.bqkbnr.ppp.ppp p.n.........p...B...P..........NPPPP.PPPRNBQK..Rw';
        B[after_ruy_a6] = [
            m(4,2, 3,0, 20), // 4.Ba4
            m(4,2, 2,4, 8),  // 4.Bxc6
        ];

        // === ITALIANA ===
        // Após 3.Bc4
        const after_italiana = 'r.bqkbnrpppp.ppp..n.........p.......P....B.....NPPPP.PPPRNBQK..Rb';
        B[after_italiana] = [
            m(0,5, 2,3, 20), // 3...Bc5 - Giuoco Piano
            m(0,6, 2,5, 15), // 3...Nf6 - Dois Cavalos
        ];

        // Após Giuoco Piano 3...Bc5
        const after_giuoco = 'r.bqk.nrpppp.ppp..n..b......p.......P....B.....NPPPP.PPPRNBQK..Rw';
        B[after_giuoco] = [
            m(6,2, 4,2, 20), // 4.c3
            m(6,3, 4,3, 10), // 4.d3
        ];

        // ========== SICILIANA ==========
        // Após 1.e4 c5
        const after_siciliana = 'rnbqkbnrpp.ppppp..........p.........P...........PPPP.PPPRNBQKBNRw';
        B[after_siciliana] = [
            m(7,6, 5,5, 25), // 2.Nf3
            m(6,3, 4,3, 8),  // 2.d4 (Smith-Morra)
            m(7,1, 5,2, 5),  // 2.Nc3 (Fechada)
        ];

        // Após 2.Nf3
        const after_sic_Nf3 = 'rnbqkbnrpp.ppppp..........p.........P..........NPPPP.PPPRNBQKB.Rb';
        B[after_sic_Nf3] = [
            m(1,3, 2,3, 25), // 2...d6 - principal
            m(0,1, 2,2, 15), // 2...Nc6
            m(1,4, 2,4, 10), // 2...e6
        ];

        // Após 2.Nf3 d6
        const after_sic_d6 = 'rnbqkbnrpp..pppp...p......p.........P..........NPPPP.PPPRNBQKB.Rw';
        B[after_sic_d6] = [
            m(6,3, 4,3, 30), // 3.d4 - Aberta
        ];

        // Após 3.d4
        const after_sic_d4 = 'rnbqkbnrpp..pppp...p......p....P....P..........NPPPP..PPRNBQKB.Rb';
        B[after_sic_d4] = [
            m(3,2, 4,3, 30), // 3...cxd4
        ];

        // Após 3...cxd4 4.Nxd4
        const after_sic_Nxd4 = 'rnbqkbnrpp..pppp...p..........N.....P...........PPP..PPPRNBQKBNRb';
        // Checar: após cxd4 Nxd4 a posição exata
        const sic_open_pos = 'rnbqkbnrpp..pppp...p...............NP...........PPP..PPRNBQKB.Rb';
        B[sic_open_pos] = [
            m(0,6, 2,5, 25), // 4...Nf6 - Najdorf/Dragon
            m(0,1, 2,2, 10), // 4...Nc6
        ];

        // ========== DEFESA FRANCESA ==========
        // Após 1.e4 e6
        const after_francesa = 'rnbqkbnrpppp.ppp....p...............P...........PPPP.PPPRNBQKBNRw';
        B[after_francesa] = [
            m(6,3, 4,3, 25), // 2.d4
            m(7,1, 5,2, 5),  // 2.Nc3
        ];

        // Após 2.d4
        const after_franc_d4 = 'rnbqkbnrpppp.ppp....p..........P....P...........PPP..PPPRNBQKBNRb';
        B[after_franc_d4] = [
            m(1,3, 3,3, 25), // 2...d5
        ];

        // Após 2...d5
        const after_franc_d5 = 'rnbqkbnrppp..ppp....p......p..P....P...........PPP..PPPRNBQKBNRw';
        B[after_franc_d5] = [
            m(7,1, 5,2, 15), // 3.Nc3 - principal
            m(4,4, 3,4, 10), // 3.e5 - Avançada
            m(4,4, 3,3, 5),  // 3.exd5 - Troca
        ];

        // ========== CARO-KANN ==========
        // Após 1.e4 c6
        const after_carokann = 'rnbqkbnrpp.ppppp..p...............P...........PPPP.PPPRNBQKBNRw';
        B[after_carokann] = [
            m(6,3, 4,3, 25), // 2.d4
        ];

        // Após 2.d4
        const after_ck_d4 = 'rnbqkbnrpp.ppppp..p............P....P...........PPP..PPPRNBQKBNRb';
        B[after_ck_d4] = [
            m(1,3, 3,3, 25), // 2...d5
        ];

        // ========== RESPOSTAS A 1.d4 (PRETAS) ==========
        // Após 1.d4
        const after_d4 = 'rnbqkbnrpppppppp...................P............PPP.PPPPRNBQKBNRb';
        B[after_d4] = [
            m(1,3, 3,3, 25), // 1...d5
            m(0,6, 2,5, 25), // 1...Nf6 - Índia
            m(1,4, 2,4, 5),  // 1...e6
        ];

        // Após 1.d4 d5
        const after_d4_d5 = 'rnbqkbnrppp.pppp...........p......P............PPP.PPPPRNBQKBNRw';
        B[after_d4_d5] = [
            m(6,2, 4,2, 25), // 2.c4 - Gambito da Dama
            m(7,6, 5,5, 10), // 2.Nf3
        ];

        // Após 2.c4 (Gambito da Dama)
        const after_qg = 'rnbqkbnrppp.pppp...........p......P....P.......PP..PPPPRNBQKBNRb';
        B[after_qg] = [
            m(1,4, 2,4, 25), // 2...e6 - QGD
            m(1,2, 3,2, 10), // 2...c6 - Slava
            m(3,3, 4,2, 8),  // 2...dxc4 - QGA
        ];

        // Após 1.d4 Nf6
        const after_d4_Nf6 = 'rnbqkb.rpppppppp.....n..............P............PPP.PPPPRNBQKBNRw';
        B[after_d4_Nf6] = [
            m(6,2, 4,2, 25), // 2.c4
            m(7,6, 5,5, 10), // 2.Nf3
        ];

        // Após 2.c4
        const after_d4_Nf6_c4 = 'rnbqkb.rpppppppp.....n..............P....P.......PP..PPPPRNBQKBNRb';
        B[after_d4_Nf6_c4] = [
            m(1,6, 2,6, 20), // 2...g6 - King's Indian
            m(1,4, 2,4, 20), // 2...e6 - Nimzo-Indian / QID
        ];

        // ========== 1.Nf3 ==========
        const after_Nf3 = 'rnbqkbnrpppppppp...............................NPPPPPPPPRNBQKB.Rb';
        B[after_Nf3] = [
            m(1,3, 3,3, 20), // 1...d5
            m(0,6, 2,5, 20), // 1...Nf6
            m(1,2, 3,2, 5),  // 1...c5
        ];

        // ========== 1.c4 (INGLESA) ==========
        const after_c4 = 'rnbqkbnrpppppppp....................P...........PP.PPPPPRNBQKBNRb';
        B[after_c4] = [
            m(1,4, 3,4, 20), // 1...e5
            m(0,6, 2,5, 15), // 1...Nf6
            m(1,2, 3,2, 10), // 1...c5 - Simétrica
        ];

        return B;
    }
}

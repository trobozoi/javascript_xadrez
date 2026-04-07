# ♟️ Xadrez — Jogue contra o Computador

🌐 **Jogue online:** [https://trobozoi.github.io/javascript_xadrez/](https://trobozoi.github.io/javascript_xadrez/)

Jogo de xadrez completo desenvolvido em **JavaScript puro** (sem frameworks), jogável no navegador com interface interativa e uma IA de altíssimo nível como oponente.

---

## 🎮 Funcionalidades

- **Jogue com Brancas ou Pretas** — escolha sua cor antes do início da partida
- **Interface interativa** — movimente peças com clique ou arraste (drag & drop)
- **IA avançada** — motor de xadrez com múltiplas técnicas de busca e avaliação
- **Justificativas em tempo real** — cada jogada do computador é explicada e justificada em português
- **Regras completas** — roque, en passant, promoção de peão, xeque, xeque-mate, empate, regra dos 50 movimentos, repetição tripla e material insuficiente
- **Log de partidas** — gere e baixe um relatório completo em Markdown com diagramas Unicode do tabuleiro
- **Orientação do tabuleiro** — o tabuleiro se adapta à cor escolhida (suas peças ficam na parte superior)
- **Web Worker** — a IA executa em thread separada, sem travar a interface

---

## 📂 Estrutura do Projeto

```
javascript_xadrez/
├── index.html            # Página principal (seleção de cor, tabuleiro, modais)
├── css/
│   └── style.css         # Estilização (tema escuro, tabuleiro verde/bege)
├── js/
│   ├── engine.js         # Motor de regras de xadrez (movimentos legais, validação)
│   ├── openingbook.js    # Livro de aberturas (~50 posições de Grandes Mestres)
│   ├── ai.js             # Motor de IA (busca, avaliação, justificativas)
│   ├── ai-worker.js      # Web Worker que roda a IA em thread separada
│   ├── ui.js             # Interface do tabuleiro (renderização, interação)
│   ├── logger.js         # Gerador de logs de partida em Markdown
│   └── app.js            # Controlador principal (conecta engine, IA, UI, logger)
└── README.md
```

---

## 🚀 Como Executar

O projeto é 100% front-end e não possui dependências externas. Basta servir os arquivos com qualquer servidor HTTP local.

### Opção 1 — npx serve (Node.js)
```bash
npx serve
```

### Opção 2 — Python
```bash
python -m http.server 8080
```

### Opção 3 — Extensão Live Server (VS Code)
Instale a extensão **Live Server** e clique em "Go Live" no canto inferior direito.

Depois, abra o navegador em `http://localhost:<porta>`.

> ⚠️ **Importante:** Não abra o `index.html` diretamente como arquivo (`file://`), pois Web Workers não funcionam nesse protocolo. É necessário um servidor HTTP.

---

## 🧠 Motor de IA — Detalhes Técnicos

O motor de IA implementa técnicas de nível profissional:

### Algoritmos de Busca
| Técnica | Descrição |
|---|---|
| **Minimax + Alpha-Beta** | Busca adversarial com poda alpha-beta |
| **Iterative Deepening** | Aprofundamento progressivo até profundidade 6 |
| **Aspiration Windows** | Janela estreita (±50 cp) a partir de depth 4 para busca mais eficiente |
| **Principal Variation Search (PVS)** | Busca com janela zero para movimentos não-PV |
| **Null Move Pruning** | Poda adaptativa (R=4 em depth ≥ 6, R=3 caso contrário) |
| **Late Move Reduction (LMR)** | Redução logarítmica para movimentos tardios |
| **Razoring** | Poda direta para quiescence em depth 1-2 com avaliação muito baixa |
| **Futility Pruning** | Poda de movimentos quietos que não podem elevar alpha |
| **Check Extensions** | Busca mais profunda quando há xeque |
| **Internal Iterative Deepening** | Busca reduzida quando não há TT move |
| **Quiescence Search** | Busca de capturas até depth 6 para evitar efeito horizonte |
| **Delta Pruning** | Poda na quiescence quando nem capturar a rainha alcança alpha |
| **Static Exchange Evaluation (SEE)** | Pula capturas perdedoras na quiescence |

### Ordenação de Movimentos
1. Melhor movimento da Tabela de Transposição (TT)
2. Capturas ordenadas por MVV-LVA (Most Valuable Victim — Least Valuable Attacker)
3. Promoções
4. Killer Moves (movimentos que causaram corte beta em ply anterior)
5. History Heuristic (movimentos historicamente bons)
6. Bônus de centralidade

### Função de Avaliação
- **Material** — valores clássicos (P=100, N=320, B=330, R=500, Q=900)
- **Piece-Square Tables (PST)** — tabelas de posição para cada peça
- **Fase de jogo** — interpolação entre meio-jogo e final de jogo
- **Par de bispos** — bônus (50 cp, maior no endgame)
- **Estrutura de peões** — penalidade para peões dobrados, isolados e atrasados
- **Peões passados** — bônus crescente conforme proximidade da promoção
- **Cavaleiros em outpost** — bônus para cavaleiros em casas avançadas protegidas
- **Torres em colunas abertas/semi-abertas** e na 7ª/8ª fila
- **Segurança do rei** — escudo de peões, colunas abertas adjacentes, ataques à zona do rei
- **Mobilidade** — estimativa rápida sem gerar movimentos legais completos
- **Vantagem de espaço** — peões avançados no centro
- **Peças presas** — penalidade para bispos/cavaleiros sem mobilidade
- **Bispo ruim** — penalidade quando muitos peões próprios estão na mesma cor de casa
- **Torres conectadas** — bônus por torres na mesma fila ou coluna

### Livro de Aberturas
~50 posições cobrindo as principais aberturas:
- Ruy Lopez, Italiana, Escocesa
- Siciliana (Aberta, Najdorf), Francesa, Caro-Kann
- Gambito da Dama (QGD, Slava, QGA)
- Defesa Indiana do Rei, Inglesa, Réti

### Tabela de Transposição
- Até **4 milhões** de entradas
- Preservada entre jogadas para reutilizar o conhecimento acumulado
- Armazena: score, depth, flag (exact/upper/lower), melhor movimento

---

## 🎨 Interface

- **Tema escuro** com tabuleiro em tons de **verde** (#7b9e57) e **bege** (#eedfcc)
- **Peças Unicode** com contorno (text-shadow) para alta visibilidade
- **Destaque de movimentos** — casas legais são destacadas ao selecionar uma peça
- **Painel de justificativas** — exibe a análise do computador a cada jogada
- **Modal de promoção** — escolha a peça ao promover um peão
- **Modal de fim de jogo** — exibe resultado (xeque-mate, empate, etc.)

---

## 📝 Logs de Partida

Ao final da partida, é possível baixar um arquivo Markdown contendo:
- Data e hora da partida
- Cor escolhida pelo jogador
- Lista completa de movimentos com justificativas da IA
- Diagramas Unicode do tabuleiro
- Resultado final e estatísticas

O arquivo segue o padrão de nomenclatura: `jogoNNYYYYMMDD.md`

---

## 🛠️ Tecnologias

- **HTML5** — estrutura semântica
- **CSS3** — flexbox, grid, variáveis CSS, animações
- **JavaScript ES6+** — classes, arrow functions, template literals, Web Workers
- **Zero dependências** — nenhuma biblioteca ou framework externo

---

## 📄 Licença

Este projeto é de uso pessoal e educacional.

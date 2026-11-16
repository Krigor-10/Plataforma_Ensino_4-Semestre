# Prompt: tela da avaliação — a questão fica espremida numa coluna fina (correção, só frontend web)

## Problema relatado pelo usuário (print de 2026-11-16)

Depois da rodada `docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-limpa.md`, na tela da avaliação (Admin e Coordenador; exemplo: "Apostila - Inteligência Artificial"), o cartão da questão ficou com ≈ 150px de largura ao lado da lista de questões:
- "QUESTÃO 1 · 1 PONTO · MÉDIA" quebra palavra por palavra;
- o enunciado fica com uma palavra por linha;
- o resto da largura fica vazio.

Não é erro de JavaScript, é layout.

## Causa (verificada pelo agente de arquitetura no CSS, não repetir a investigação)

Em `styles/workspace.css`, a partir de 768px, `.avaliacao-gestao__corpo` vira `flex-direction: row`, com o índice (180px fixos) e `.avaliacao-gestao__questao` lado a lado. O `.avaliacao-gestao__questao` (≈ linha 9527) tem:

```css
min-width: 0;
container-type: inline-size;
```

Ele **não tem `flex: 1`**. Com `container-type: inline-size`, o navegador passa a ignorar o conteúdo para calcular a largura própria do elemento: a largura "natural" dele vira 0. Num item flex sem `flex-grow`, a largura final fica perto do mínimo, e o item encolhe até a coluna fina do print.

A `container-type` foi adicionada nesta rodada (item 7, figura ao lado do texto), por isso o problema apareceu agora.

## Tarefa

1. Em `.avaliacao-gestao__questao`, adicionar `flex: 1 1 0;`, mantendo `min-width: 0` e `container-type: inline-size`. A questão passa a ocupar toda a largura que sobra ao lado do índice, e a figura ao lado volta a funcionar quando a área tiver ≥ 900px.
2. Abaixo de 768px (`.avaliacao-gestao__corpo` em coluna), conferir que a questão ocupa 100% da largura. Se precisar, `width: 100%` ou `align-self: stretch`.
3. Conferir o bloco dos KPIs (`.avaliacao-gestao__kpis-area`, `flex-shrink: 0; min-width: 16rem`): em 1366px com o menu aberto, os 4 cartões não podem passar da borda direita. Se não couberem ao lado do título, descem para baixo dele, porque o `header` já tem `flex-wrap: wrap`.

**Não alterar:**
- o resto da rodada da tela limpa: caminho no header, resumo numa linha, faixa sem participantes e lista "Questão N" igual;
- a tela do módulo e a prévia do Professor.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**:
- **"Apostila - Inteligência Artificial":** a questão ocupa toda a largura ao lado da lista, com o cabeçalho numa linha e o enunciado em linhas normais.
- **"Banco ENADE/CQA - Revisao":** com a figura, em 1920px, a figura fica à direita do texto. Em ≈ 1366px com o menu aberto, ela fica embaixo do enunciado.
- **Larguras:** em ≈ 900px e ≈ 390px, a questão fica com a largura toda, sem rolagem horizontal. Os KPIs não passam da borda em nenhuma largura.
- **Teste (vitest):** se der para testar, um teste que garanta a classe/estrutura do corpo, ou só um teste visual manual descrito no commit, já que o jsdom não calcula layout.
- `npm run lint` e `npm test` sem erros novos.

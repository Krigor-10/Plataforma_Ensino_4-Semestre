> **SUBSTITUÍDO em 2026-11-18** por `PROMPT-agente-tela-modulo-lista-e-janela.md` (o roteiro também foi substituído em 19/11): o layout da trilha muda para o "Roteiro da aula", e este corte deixa de existir. Não aplicar.

# Prompt: correção — trilha da tela do módulo cortada dos dois lados (frontend web, só CSS)

## Problema (print do usuário de 2026-11-18, professor em `/app/conteudos/1/modulos/1`)

Na trilha da esquerda (versão B, `PROMPT-agente-tela-modulo-trilha-versao-b.md`, aplicada no working tree), o **módulo aberto** aparece cortado:
- **à esquerda:** "S DO MÓDULO" no lugar de "ITENS DO MÓDULO", "údos" no lugar de "Conteúdos", "es do módulo" no lugar de "Quizzes do módulo", e os ícones dos conteúdos somem;
- **à direita:** "Selecior" no lugar de "Selecionar";
- aparece uma **barra de rolagem horizontal** embaixo da trilha.

## Causa (medida no app real pelo agente de arquitetura, Chrome, 2133px de largura)

- `.modulo-gestao__trilha-modulo` (`styles/workspace.css` ≈ linha 9618) tem `display: flex; align-items: center`. Isso serve para a linha do **módulo fechado** (número + título + seta).
- `.modulo-gestao__trilha-modulo--aberto` (≈ linha 9662) muda para `flex-direction: column`, **mas herda `align-items: center`**.
- Numa coluna centralizada, os filhos **não esticam**: cada um fica com a largura do próprio conteúdo. Os títulos têm `white-space: nowrap`, então `.modulo-gestao__trilha-itens` fica com **367px** dentro de um módulo com **298px** úteis (316px − 2 × 8px de padding).
- Como está **centralizado**, o excesso de cerca de 69px vaza **para os dois lados**: cerca de 34px somem à esquerda e 34px à direita.
- A `.modulo-gestao__trilha` tem `overflow-y: auto`, o que torna `overflow-x` automático também e faz aparecer a rolagem horizontal.

Medidas:

| Elemento | Medida |
|---|---|
| `.modulo-gestao__trilha` | `clientWidth` 320, `scrollWidth` 342 |
| `.modulo-gestao__trilha-modulo--aberto` | largura 316, `align-items` center |
| `.modulo-gestao__trilha-itens` | largura 367, começando 34px à esquerda do módulo |

## Tarefa (só CSS em `frontend/src/styles/workspace.css`)

1. Em `.modulo-gestao__trilha-modulo--aberto`, acrescentar **`align-items: stretch;`**. Com isso os filhos ocupam a largura do módulo, e os títulos passam a usar as reticências que já existem (`.modulo-gestao__trilha-item-titulo` já tem `min-width: 0` e `text-overflow: ellipsis`).
2. Em `.modulo-gestao__trilha` (a regra dentro de `@media (min-width: 768px)`), acrescentar **`overflow-x: hidden;`** como proteção, para nenhuma linha gerar rolagem horizontal.
3. **Conferir que os títulos ficam com reticências:**
   - o `title` da linha mostra o nome inteiro ao passar o mouse; se ainda não mostrar, acrescentar `title={titulo}` no botão do item;
   - os selos "Publicado/Rascunho" e o ⋮ ficam inteiros à direita.
4. **Não mudar** o módulo fechado (a linha continua centralizada na vertical), a largura da trilha (280/320px), a prévia nem o comportamento da tela do coordenador.
5. **Teste (vitest):**
   - o módulo aberto tem a classe que garante `align-items: stretch`;
   - ou, se o projeto já tiver um teste de estrutura da trilha, garantir que ele continua passando.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, como **professor** e como **coordenador**, em 1366px e 1920px, com a sidebar aberta e recolhida:

- **Títulos inteiros:** "ITENS DO MÓDULO", "Conteúdos 3" e "Quizzes do módulo 2" aparecem inteiros.
- **Linhas dos itens:** os ícones aparecem; títulos longos (por exemplo "ANALISE_DESENVOLV_SIST_TOMO_01") terminam em "…".
- **Botão e selos:** "Selecionar" aparece inteiro, e os selos e o ⋮ ficam alinhados à direita.
- **Sem rolagem horizontal na trilha:** no console, `document.querySelector('.modulo-gestao__trilha').scrollWidth === clientWidth`.
- `npm run lint` e `npm test` sem erros novos.

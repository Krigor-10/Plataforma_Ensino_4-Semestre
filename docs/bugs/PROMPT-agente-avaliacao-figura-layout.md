# Prompt: tela da avaliação — com figura, o texto começa embaixo da imagem (correção, só frontend web)

## Problema relatado pelo usuário (print de 2026-11-16)

Na tela da avaliação (Admin e Coordenador), na questão 1 de "Banco ENADE/CQA - Revisao", que tem figura:
- a figura fica no **canto de cima à direita** e, à esquerda dela, sobra um **espaço vazio enorme**;
- o cabeçalho "QUESTÃO 1 · 1 PONTO · MÉDIA" / "Resposta: B", o contexto e o enunciado só começam **abaixo da altura da figura**;
- a citação aparece **duas vezes**: "KUROSE, J. F.; ROSS…" está no fim do contexto e de novo numa lista de referências logo abaixo (KUROSE, SILBERSCHATZ, TANENBAUM…), que polui a questão.

O objetivo aprovado em `docs/fluxo-coordenador/avaliacao-tela-limpa.png` (marcador 6) é:
- o cabeçalho da questão numa linha inteira;
- embaixo dele, o texto à esquerda e a figura à direita, **começando na mesma altura**.

## Causa (verificada pelo agente de arquitetura, não repetir a investigação)

1. **Grade:** em `styles/workspace.css` (bloco `@container (min-width: 900px)`, ≈ linhas 9545–9566), a figura recebe `grid-row: 2 / -1`.
   - Em CSS Grid, o `-1` conta **só as linhas definidas em `grid-template-rows`**. Como não há nenhuma, `-1` é a linha 1, e `2 / -1` vira **linha 1**.
   - A figura vai para a 1ª linha da coluna 2, e o cabeçalho (`grid-column: 1 / -1`) não cabe mais na linha 1 e desce para a linha 2.
   - Tudo da coluna 1 começa depois da altura da figura.
   - Trocar por `span N` também não serve: o `gap` da questão vira `row-gap` e soma um espaço para cada linha vazia.
2. **Citação dupla:** em `components/GabaritoQuestoes.jsx`, com `mostrarFicha`, o bloco `.revisao-questao__contexto` mostra `questao.contexto` (que já traz a citação no fim, digitada pelo professor) **e** `questao.referenciasBibliograficas` (as referências do banco de questões).

## Tarefa

1. **Trocar o truque de grade por uma estrutura própria**, só quando `mostrarFicha` estiver ativo e a questão tiver anexo de imagem. Em `GabaritoQuestoes.jsx`:
   - o `header.revisao-questao__cabecalho` continua como 1º filho, ocupando a largura toda;
   - depois dele, um `<div className="revisao-questao__corpo-figura">` com dois filhos:
     - `<div className="revisao-questao__coluna-texto">`: contexto, enunciado, anexos de arquivo, afirmativas, alternativas e explicação, na ordem de hoje;
     - `<aside className="revisao-questao__coluna-figura">`: o `.quiz-anexos--imagens`.
   - Sem anexo de imagem, ou sem `mostrarFicha`, a marcação continua igual à de hoje: a tela do módulo e a prévia do Professor não mudam.
2. **CSS:**
   - **Com ≥ ≈ 900px de área** (o mesmo container query): `.revisao-questao__corpo-figura { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: var(--espaco-lg); align-items: start; }`. A coluna da figura fica `position: sticky; top: var(--espaco-md)`. **O texto e a figura começam na mesma altura, logo abaixo do cabeçalho.**
   - **Abaixo disso**, em uma coluna, a figura fica logo **depois do enunciado**, porque o enunciado fala "com base na figura". Por exemplo, `display: flex; flex-direction: column` no corpo, `display: contents` na coluna de texto e `order` na figura para ela ficar logo depois do enunciado, ou outra forma equivalente que não duplique a figura no DOM.
   - Remover as regras com `:has(.quiz-anexos--imagens)` e o `grid-row: 2 / -1`.
   - Manter o `max-height` ≈ 420px, o `object-fit: contain` e o "Clique para ampliar".
3. **Sem citação repetida:**
   - em `mostrarFicha`, o bloco de contexto mostra **só** `questao.contexto`;
   - `questao.referenciasBibliograficas` vira uma linha recolhida no fim da questão, depois da explicação: **"Referências bibliográficas"** com seta, fechada por padrão (`<details>`/`<summary>`), em `--cor-texto-mudo`, ≈ `0.75rem`. Aberta, mostra o texto como hoje.
4. **Contexto mais discreto**, como pedido na rodada da tela limpa: `--cor-texto-suave`, ≈ `0.8rem`, `line-height` ≈ 1.5, borda esquerda fina e sem itálico. Conferir se isso não ficou de fora.

**Não alterar:**
- a lista "Questão N", o topo da tela, a faixa sem participantes e a navegação entre questões e avaliações;
- a tela do módulo e a prévia do Professor.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**.

- **"Banco ENADE/CQA - Revisao", Questão 1, em 1920px:**
  - o cabeçalho "QUESTÃO 1 · …" e "Resposta: B" ficam na 1ª linha;
  - logo abaixo, o contexto à esquerda e a figura à direita, **alinhados no topo e sem espaço vazio**;
  - rolando, a figura acompanha.
- **Citação:**
  - a citação aparece uma vez só, no fim do contexto;
  - "Referências bibliográficas" fica fechado no fim da questão e abre ao clicar.
- **≈ 1366px com o menu aberto e ≈ 390px:**
  - a figura fica logo depois do enunciado e antes das alternativas;
  - sem rolagem horizontal.
- **Questões sem figura**, como em "Apostila - Inteligência Artificial": a questão fica igual, ocupando a largura toda.
- **Tela do módulo e prévia do Professor:** sem mudança.
- **Testes (vitest):**
  - com imagem + `mostrarFicha`, existem `.revisao-questao__corpo-figura` e as duas colunas;
  - sem imagem, não existem;
  - as referências ficam num `<details>` fechado;
  - o contexto não repete as referências.
- `npm run lint` e `npm test` sem erros novos.

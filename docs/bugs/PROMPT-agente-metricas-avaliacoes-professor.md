# Prompt — Ajuste: valores do card de avaliação centralizados e com ícones (Professor, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Pedido do usuário (print da tela Acadêmico › Avaliações do PROFESSOR, card aberto):**
- melhorar o espaçamento dos valores (Nota média, Questões, Tentativas permitidas, Tempo limite, Nota máxima), que hoje encostam na borda esquerda do card;
- centralizar esses valores;
- colocar um ícone de referência em cada um, usando ícones que já existem no projeto.

Imagem de referência nesta pasta: `avaliacoes-professor-metricas-proposta.png` (hoje em cima, proposta embaixo).

## O que o agente de arquitetura já verificou (não repetir)

- Tela: `frontend/src/pages/workspace/SecaoAvaliacoesProfessor.jsx`.
  - O card é `conteudos-modulo conteudos-modulo--cartao` (≈ linha 674).
  - O corpo aberto é um `motion.div` com `<dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">` (≈ linhas 749–779), **sem** `conteudos-modulo__corpo`. Por isso não há padding lateral e os valores encostam na borda.
  - Itens: "Tipo / Quiz - formativo, sem nota" (quiz, `tipoAvaliacao === 1`) **ou** "Nota media"; depois "Questoes", "Tentativas permitidas", "Tempo limite"; e "Nota maxima" quando não é quiz. São 5 itens (prova) ou 4 (quiz).
- `.lista-detalhes--inline` (`styles/workspace.css` ≈ linha 3318): grade `auto-fit` alinhada à esquerda. É compartilhada com outras telas (Progresso do professor, Coordenador, Alunos), então **não alterar a base**.
- **Ícones já usados no projeto para estes mesmos dados**, no modal "Antes de começar" do aluno (`SecoesAluno.jsx` ≈ linhas 894–918, `.quiz-confirmacao__resumo`, ícones de 14px em `--cor-marca-clara`):
  - Questões → `TbHelpCircle`;
  - Tempo limite → `TbClock`;
  - Nota máxima → `TbTarget`;
  - Tentativas → `TbRepeat`.
- Para os dois itens que o modal do aluno não tem:
  - Nota média → `TbAward`, já usado para "Media" na tela do curso do Coordenador (`PainelCursoGestao.jsx` ≈ linha 264) e em "Desempenho medio" (`IndicadoresDesempenhoCurso.jsx`);
  - Tipo (quiz) → `TbTrophy`, o ícone de quiz em todo o app.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Envolver a lista do card aberto em `<div className="conteudos-modulo__corpo">` (padding lateral e de baixo, como nas Avaliações do aluno).
2. Trocar o visual da lista **só nesta tela**, com um modificador novo, por exemplo `.lista-detalhes--metricas`, ou escopado em `.tela-avaliacoes-professor`:
   - uma coluna por item, de largura igual, ocupando a largura toda (5 colunas na prova, 4 no quiz);
   - cada item centralizado: ícone + rótulo numa linha (ícone 15px em `--cor-marca-clara`, rótulo como hoje) e o valor embaixo, maior e em negrito (≈ 1.15rem, fonte display);
   - divisória vertical fina (`--cor-borda`) entre os itens, sem divisória antes do primeiro;
   - respiro vertical de `var(--espaco-md)` acima e abaixo da linha de métricas.
3. Ícones conforme a lista acima. Importar de `react-icons/tb` e marcar com `aria-hidden="true"`.
4. Corrigir os acentos dos rótulos **desta lista**: "Nota média", "Questões", "Nota máxima". Os outros já estão certos.
5. **Responsivo:** em ≈ 400px, 2 colunas. A divisória vertical some no começo de cada linha, e entre as linhas entra uma divisória horizontal fina ou só espaço.
6. **Não alterar** o cabeçalho do card, o menu ⋮, a abertura e fechamento, nem `.lista-detalhes` / `.lista-detalhes--inline` nas outras telas.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Professor, em Avaliações, comparando com a imagem:

- Card de prova aberto: 5 métricas centralizadas, com ícone, rótulo e valor, divisórias entre elas e respiro nas laterais.
- Card de quiz aberto: 4 métricas ("Tipo" com troféu e sem "Nota máxima"), também centralizadas.
- Ícones iguais aos do modal "Antes de começar" do aluno para Questões, Tempo limite, Nota máxima e Tentativas.
- Em ≈ 400px, 2 colunas legíveis.
- Progresso do professor, tela do curso (Coordenador/Admin) e Avaliações do aluno sem mudança.
- `npm run lint` e `npm test` sem erros novos.

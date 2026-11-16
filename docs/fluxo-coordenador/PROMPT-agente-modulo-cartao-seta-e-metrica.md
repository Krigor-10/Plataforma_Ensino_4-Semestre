# Prompt: cartões da tela do módulo (Admin e Coordenador): seta no centro e sem a linha de concluintes (só frontend web)

## Contexto

Na tela do módulo (`pages/workspace/TelaModuloGestao.jsx`, commit `545a7cb`), a lista de conteúdos e quizzes está em cartões com relevo. O usuário viu no app real, como Coordenador, e pediu dois ajustes:

1. **A seta "›" deve ficar no centro vertical do cartão.** Hoje ela fica no alto, alinhada ao título.
2. **Tirar dos cartões de conteúdo a linha "1 aluno concluiu · 50%".** É repetida: os KPIs do topo do módulo (Progresso, Conclusão) já mostram essas métricas. **Tirar também a linha de participantes dos cartões de quiz.**

## O que o agente de arquitetura já verificou (não repetir)

- **Seta:**
  - o `<button className="atividades-curso__linha atividades-curso__linha--acionavel">` dos cartões (≈ linhas 269 e 305) usa `.atividades-curso__linha`, com `display: flex` e `align-items: flex-start` (`styles/workspace.css` ≈ linha 4902);
  - o `TbChevronRight` (`.atividades-curso__chevron`, ≈ linha 5035) herda o alinhamento ao topo;
  - `.atividades-curso__linha` é usada em outras telas: **não** mudar a regra geral.
- **Métrica:**
  - material: `<p className="atividades-curso__metrica modulo-gestao__item-metrica">{metricaMaterial(...)}</p>` (≈ linha 283), com a função `metricaMaterial` (≈ linha 71);
  - quiz: o mesmo `<p>` com `metricaQuiz(...)` (≈ linha 319);
  - o cabeçalho da leitura do quiz também usa `metricaQuiz` no `meta` (≈ linha 348).

## Tarefa

1. **Seta no centro vertical**, só nesta tela: `.modulo-gestao__item-cartao .atividades-curso__chevron { align-self: center; }`.
   - Ícone, título e textos ficam como estão.
   - Vale para os cartões de conteúdo e de quiz.
2. **Cartão de conteúdo sem a linha de concluintes:**
   - remover o `<p class="modulo-gestao__item-metrica">` dos materiais. O cartão fica com o título e o tipo ("Texto", "Vídeo", "Imagem");
   - remover a função `metricaMaterial` e o `useMemo` `metricaMaterialPorId`, se ficarem sem uso.
3. **Cartão de quiz também sem a linha de participantes** (decisão do usuário):
   - remover o `<p class="modulo-gestao__item-metrica">` do quiz; o cartão fica com o título e **"Quiz · 3 questões"**;
   - todos os cartões ficam com 2 linhas e a mesma altura;
   - o `meta` do cabeçalho da leitura do quiz (≈ linha 348, "Quiz · 3 questões · 1 participante") **continua igual**, então `metricaQuiz` continua em uso.
4. Remover a classe `.modulo-gestao__item-metrica` do CSS (≈ linha 8996), se ficar sem uso.

**Não alterar:**
- os KPIs do topo, a leitura à direita, a troca de item e de módulo, e o relevo dos cartões;
- a regra geral `.atividades-curso__linha`;
- as outras telas.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**, num módulo com conteúdos e quiz (por exemplo, "HTML e CSS" do curso "Desenvolvimento Web").

- A seta "›" fica no meio da altura de cada cartão, de conteúdo e de quiz.
- Os cartões de conteúdo mostram só o título e o tipo, sem "aluno concluiu".
- O cartão de quiz mostra só o título e "Quiz · 3 questões", sem participantes. A leitura do quiz, à direita, continua mostrando os participantes no cabeçalho.
- Todos os cartões ficam com a mesma altura.
- **Testes (vitest):**
  - remover ou ajustar os testes do texto "aluno(s) concluiu/concluíram" no cartão;
  - teste confirmando que o cartão de material não tem esse texto;
  - teste confirmando que o cartão de quiz não tem "participante".
- `npm run lint` e `npm test` sem erros novos.

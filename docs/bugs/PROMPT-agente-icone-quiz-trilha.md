# Prompt — Ajuste: ícone do quiz vinculado no mesmo estilo da tela do Coordenador (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Pedido do usuário (2 prints):** na tela Acadêmico › Conteúdos do PROFESSOR, o ícone dos quizzes vinculados a um conteúdo ("Quiz HTML E CSS", "Quiz do conteúdo") deve ficar no mesmo estilo do ícone de quiz da tela do curso do COORDENADOR: troféu dentro de uma caixa roxa com fundo e borda visíveis.

## O que o agente de arquitetura já verificou (não repetir)

- **Coordenador** (`components/DetalheModuloDesempenho.jsx` ≈ linha 61): `.atividades-curso__icone .atividades-curso__icone--quiz` com `<TbTrophy size="1.75rem" />`.
  - A caixa genérica tem 2.75rem (`.atividades-curso__icone`, `styles/workspace.css` ≈ linha 4686) e o troféu tem 1.75rem, ou seja, cerca de 64% da caixa.
  - Por isso a folga mostra o fundo `rgba(123,47,247,0.08)` e a borda `rgba(123,47,247,0.28)` (`.atividades-curso__icone--quiz`, ≈ linha 4792).
- **Professor**: quiz vinculado em `pages/workspace/SecaoConteudosProfessor.jsx` ≈ linha 1747, com a mesma classe e o mesmo `<TbTrophy size="1.75rem" />`.
  - Em `.trilha-conteudos .atividades-curso__quizzes .atividades-curso__icone--quiz` (≈ linha 4482), a caixa encolhe para `--quiz-vinculado-icone` = **1.75rem** (1.5rem em telas ≤ 30rem, ≈ linha 4110).
  - Caixa e troféu ficam do mesmo tamanho: o troféu cobre a caixa inteira, o fundo e a borda somem, e sobra só o desenho com um contorno quase invisível. É isso que aparece no print.
- **A mesma regra vale para a trilha do Aluno** (`SecoesAluno.jsx` ≈ linha 2192) e para a prévia "Visualizar como aluno", porque as três usam `.trilha-conteudos`. A correção deixa as três iguais.
- Os quizzes do módulo, fora de um conteúdo (Professor ≈ linhas 1818 e 1882), usam a caixa de `--coluna-icone-conteudo` (2.25rem) com troféu de 1.75rem. A borda já aparece, mas com pouca folga.
- O tamanho compacto do quiz vinculado (caixa de 1.75rem) foi decisão aprovada antes ("quiz vinculado e harmonia", item 1), e as linhas de ligação dependem dele (curva até `margin-left` e centro pela altura do `<li>`). **O tamanho da caixa não muda.**
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Só em CSS, escopado em `.trilha-conteudos`: deixar o troféu do quiz com cerca de 64% do tamanho da própria caixa, a mesma proporção do Coordenador, para o fundo e a borda roxos aparecerem.
   - Por exemplo, `.trilha-conteudos .atividades-curso__icone--quiz svg { width: 64%; height: 64%; }`. O CSS sobrepõe os atributos `width`/`height` que o `react-icons` grava a partir do `size`.
   - Vale para o quiz vinculado e para os quizzes do módulo.
2. Conferir se o raio da caixa do quiz é o mesmo da caixa do conteúdo e do Coordenador (`var(--raio-md)`). Se estiver diferente só na trilha, igualar.
3. **Não alterar** o tamanho das caixas (`--quiz-vinculado-icone`, `--coluna-icone-conteudo`), as cores, as linhas de ligação, os ícones verdes de conteúdo nem a tela do Coordenador.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- Conteúdos do Professor: cada quiz vinculado mostra o troféu dentro de uma caixa roxa com fundo e borda visíveis, como na tela do curso do Coordenador, só que menor.
- Os quizzes do módulo seguem o mesmo estilo.
- As linhas de ligação continuam saindo do conteúdo e entrando no meio da caixa do quiz, sem desalinhar.
- A trilha do Aluno e a prévia "Visualizar como aluno" ficam iguais à do Professor.
- Mesmo resultado em ≈ 400px, onde a caixa tem 1.5rem.
- Tela do Coordenador sem mudança.
- `npm run lint` e `npm test` sem erros novos.

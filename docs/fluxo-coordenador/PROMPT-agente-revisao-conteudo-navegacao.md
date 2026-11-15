> **SUBSTITUÍDO em 2026-11-15.** Este prompt foi aplicado no commit `b02021c`. Depois, o usuário aprovou outro fluxo, o módulo em tela própria com a leitura num painel ao lado (`fluxo-modulos-drilldown.png`), que tira o "Ver conteúdo". Usar `PROMPT-agente-modulo-tela-propria.md`.

# Prompt — "Ver conteúdo" (Admin/Coordenador): índice lateral e leitura de um item por vez (só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

A Parte 3 do fluxo do coordenador (commit `debade4`) criou o **"Ver conteúdo"** na tela do curso do Admin e do Coordenador: uma visão **só de leitura** do conteúdo publicado, com o gabarito dos quizzes.

**Problema relatado pelo usuário (print):** a janela mostra tudo numa rolagem única, um módulo empilhado sob o outro, sem recolher nem navegar. É difícil achar rápido um módulo ou um quiz.

**Decisão do usuário (Opção B, imagem `revisao-conteudo-opcao-b.png`, nesta pasta):** índice fixo à esquerda, um item por vez à direita, resumo do curso, filtro "só quizzes" e Anterior/Próximo. A Opção A (`revisao-conteudo-opcao-a.png`) foi descartada. Os números amarelos e o quadro lateral da imagem são só explicação.

## O que o agente de arquitetura já verificou (não repetir)

- `pages/workspace/PainelCursoGestao.jsx`:
  - carrega `GET /Cursos/{id}/revisao-conteudo` (≈ linha 195) e monta `estadoPreviaConteudo` com `modulosDoCurso`, `conteudosPorModuloId`, `quizzesPorModuloId`, `quizPorConteudoId` e `questoesPorAvaliacaoId`;
  - abre `PreviaTrilhaAluno` (≈ linha 659) com `permitirAbrirArquivo` e `seloSomenteLeitura`;
  - enquanto carrega, mostra um `Modal` "Ver conteúdo" com "Carregando…" ou o erro.
- `components/PreviaTrilhaAluno.jsx` (≈ linha 128):
  - é o mesmo componente da prévia **"Visualizar como aluno" do Professor** (`SecaoConteudosProfessor.jsx` ≈ linha 2000);
  - o título é fixo, "Visualizar como aluno", com a faixa "Pré-visualização estrutural…". Por isso o Coordenador hoje vê esse título, que não combina com o uso dele;
  - já tem `GabaritoQuestoes` (≈ linha 47), que mostra as questões com a correta.
- A tela real **foi vista pelo usuário** no print. O agente de arquitetura não conferiu logado.

## Tarefa

1. **Componente novo só para a revisão**, por exemplo `components/RevisaoConteudoCurso.jsx`, usado pelo `PainelCursoGestao.jsx` no lugar de `PreviaTrilhaAluno`.
   - Reaproveita os mesmos dados (`estadoPreviaConteudo`) e o `GabaritoQuestoes`, extraindo-o se precisar.
   - **Não alterar a prévia do Professor** ("Visualizar como aluno"), que continua com `PreviaTrilhaAluno` como está.
2. **Janela grande:** modal largo, quase a tela toda no desktop, por exemplo `min(1200px, 94vw)` por `88vh`.
   - Título: **"Revisar conteúdo · <título do curso>"**, com o selo "Somente leitura".
   - Sem a faixa "Pré-visualização estrutural…".
3. **Topo:**
   - **resumo** "N módulos · N conteúdos · N quizzes · N questões", contando só o publicado;
   - botão **"Mostrar só quizzes"**, que liga e desliga, com `aria-pressed`, e filtra o índice para mostrar só os quizzes, mantendo o nome do módulo de cada um.
4. **Coluna da esquerda (≈ 300px), o índice fixo:**
   - módulos em ordem ("01 Fundamentos"), cada um com seus materiais (ícone por tipo: PDF, vídeo, link, imagem, texto) e quizzes (troféu), com o número de questões à direita;
   - o quiz vinculado a um material aparece logo abaixo dele;
   - o item aberto fica **destacado**;
   - rolagem própria, independente da direita.
5. **Coluna da direita, a leitura do item escolhido:**
   - trilha "Módulo 01 · Fundamentos › Quiz" e o título do item;
   - **material:** tipo, descrição e botão "Abrir arquivo" ou "Abrir link", como hoje com `permitirAbrirArquivo`;
   - **quiz:** todas as questões com as alternativas e a **correta destacada em verde** (`GabaritoQuestoes`);
   - **rodapé fixo** com **"← Anterior: <título>"** e **"Próximo: <título> →"**, seguindo a ordem do índice e respeitando o filtro "só quizzes". Os botões são desativados no primeiro e no último item.
   - Ao abrir a janela, o primeiro item fica selecionado.
6. **Teclado e acessibilidade:**
   - o índice é uma lista navegável (setas para cima e para baixo trocam o item, Enter abre);
   - o item atual tem `aria-current`;
   - Esc fecha a janela, pelo próprio `Modal`.
7. **Tela estreita (≈ 400px):** o índice vira uma lista de seleção no topo ("Item: Quiz · Fundamentos ▾"), e a leitura e o Anterior/Próximo ficam embaixo.
8. **Estado vazio:** curso sem conteúdo publicado mostra "Este curso ainda não tem conteúdo publicado."

**Não alterar:** a rota `/Cursos/{id}/revisao-conteudo`, as permissões, a prévia do Professor, a tela do curso além da troca do componente e o restante da tela de Cursos.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como **Coordenador** (num curso que coordena) e como **Admin**, comparando com `revisao-conteudo-opcao-b.png`:

- "Ver conteúdo" abre a janela grande "Revisar conteúdo · <curso>", com o resumo certo.
- O índice mostra todos os módulos, materiais e quizzes publicados, com o número de questões. Um clique abre o item à direita, destacado no índice.
- Material com "Abrir arquivo" funcionando. Quiz com todas as questões e a correta em verde.
- "Mostrar só quizzes" filtra o índice, e Anterior/Próximo passam só pelos quizzes.
- Anterior/Próximo seguem a ordem e ficam desativados nas pontas.
- Teclado: setas no índice e Esc fecha.
- Em ≈ 400px, o índice vira uma lista no topo.
- O "Visualizar como aluno" do Professor continua igual.
- Testes (vitest): resumo, filtro, Anterior/Próximo e destaque do item atual. `npm run lint` e `npm test` sem erros novos.

# Prompt: tela própria do módulo para Admin e Coordenador, com conteúdos, quizzes e leitura ao lado (só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

Hoje, na tela do curso do Admin e do Coordenador (`/app/cursos/:id`, `pages/workspace/PainelCursoGestao.jsx`):
- **aba Módulos:** cada módulo abre embaixo dele mesmo (accordion), com o desempenho dos conteúdos e quizzes;
- **botão "Ver conteúdo":** abre a janela "Revisar conteúdo" (`components/RevisaoConteudoCurso.jsx`, commit `b02021c`). É a leitura do curso inteiro, com índice lateral e gabarito.

São dois caminhos para a mesma coisa, e a lista fica comprida.

**Decisão do usuário (imagem `fluxo-modulos-drilldown.png`, nesta pasta, APROVADA em 2026-11-15):**

1. Selecionar o curso.
2. Listar os módulos na tela atual, cada um com uma seta "›" à direita.
3. Clicar no módulo abre **uma tela só do módulo**, com todos os conteúdos e quizzes dele.
4. Clicar num item abre a leitura **num painel ao lado** (material com "Abrir arquivo", quiz com gabarito), só leitura.

Outras decisões do usuário:
- o item abre em **painel ao lado** na tela do módulo, não numa tela própria;
- o **"Ver conteúdo" sai** e a janela "Revisar conteúdo" é substituída por este fluxo. O prompt `PROMPT-agente-revisao-conteudo-navegacao.md` está marcado como SUBSTITUÍDO.

Os números amarelos e os quadros de legenda e permissões da imagem são só explicação.

## O que o agente de arquitetura já verificou (não repetir)

- `lib/router.js`, `readRoute`:
  - para `/app/...`, devolve só `section` (`segments[1]`) e `param` (`segments[2]`);
  - `/app/cursos/12/modulos/34` hoje **ignora** o resto do caminho.
- `pages/WorkspaceScreen.jsx` passa `cursoIdSelecionado={route.param ? Number(route.param) : null}` para a `SecaoCursos` (≈ linhas 664–775, vários perfis).
- `pages/workspace/SecaoCursos.jsx` (≈ linhas 254–274) controla o curso aberto pela rota. Se o id não existir na lista, volta para `/app/cursos` com `replace`.
- `pages/workspace/PainelCursoGestao.jsx` (842 linhas):
  - `GET /Cursos/{id}/desempenho` → `desempenho`;
  - `modulosComQuizFiltrado` (≈ linha 160) separa por módulo: `materiais` (com `conteudoDidaticoId`) e `avaliacoes`, só quiz não arquivado (com `avaliacaoId`, `totalParticipantes`, `mediaNota`);
  - lista de módulos (≈ linhas 466–560): `moduloAbertoId`, `alternarModulo`, `TbChevronDown`, `AnimatePresence` com `DetalheModuloDesempenho contextoCoordenador separarGrupos`;
  - menu ⋮ do módulo: Editar e Excluir (`modais.abrirEdicaoModulo`, `abrirExclusaoModulo`);
  - botão "Ver conteúdo" (≈ linha 389), `abrirPreviaConteudo` → `GET /Cursos/{id}/revisao-conteudo` (≈ linha 195, só o que está Publicado), `estadoPreviaConteudo` (mapas por módulo) e `RevisaoConteudoCurso` (≈ linha 659).
- `components/RevisaoConteudoCurso.jsx`:
  - já tem `RevisaoMaterial` ("Abrir arquivo"/"Abrir link") e `RevisaoQuiz` (com `GabaritoQuestoes`);
  - usa `montarModulosPublicados` e `tituloQuizEhGenerico` de `lib/trilhaConteudos.js` (quiz vinculado a um material vira "Quiz do conteúdo").
- `components/DetalheModuloDesempenho.jsx` mostra Progresso, Conclusão e Desempenho médio do módulo, e as métricas de cada item.
- `components/PreviaTrilhaAluno.jsx` é a prévia **"Visualizar como aluno" do Professor** e não deve ser alterada.

## Tarefa

### 1. Rota do módulo

- Estender `readRoute` para que `/app/cursos/:id/modulos/:moduloId` também traga o módulo, por exemplo `subsecao: "modulos"` e `subparam: "34"`. **Todas as outras rotas continuam iguais.**
- Repassar `moduloIdSelecionado` de `WorkspaceScreen` → `SecaoCursos` → `PainelCursoGestao`, só nos perfis Admin e Coordenador.
- O voltar do navegador, da tela do módulo, volta para a lista de módulos do curso.
- `moduloId` que não pertence ao curso, ou não existe: volta para `/app/cursos/:id` com `replace`, como já acontece com o curso.

### 2. Tela 1, a lista de módulos da aba Módulos

- **Mantém o visual atual:** número, nome, contagem, barra de progresso e o menu ⋮ com Editar/Excluir, que continua como hoje.
- **O clique no módulo** navega para `/app/cursos/:id/modulos/:moduloId` em vez de abrir o accordion.
  - Trocar `TbChevronDown` por **`TbChevronRight`** ("›").
  - Remover `moduloAbertoId`/`alternarModulo` e o `AnimatePresence` do módulo, **só na aba Módulos**.
  - O clique no ⋮ não pode navegar.
- **Remover o botão "Ver conteúdo"** do topo, e com ele `abrirPreviaConteudo`, o `Modal` de carregamento e o uso de `RevisaoConteudoCurso`.
- A aba **Avaliações do curso não muda**.

### 3. Tela 2, a tela do módulo (nova)

Criar um componente próprio, por exemplo `pages/workspace/TelaModuloGestao.jsx`, mostrado pelo `PainelCursoGestao` quando houver `moduloIdSelecionado`, no lugar do conteúdo normal do curso.

- **Migalha:** "← Cursos › <curso> › Módulo 01". "Cursos" e o curso são clicáveis, e o "←" volta para a lista de módulos.
- **Título:** `NumeroModulo` mais o nome do módulo.
- **KPIs do módulo:** Progresso, Conclusão e Desempenho médio, os mesmos números que `DetalheModuloDesempenho` mostra hoje para esse módulo.
- **Seção "Conteúdos (N)"** e **seção "Quizzes (N)"**, separadas:
  - cada item tem ícone por tipo (troféu no quiz), título, tipo ("PDF", "Quiz · 3 questões"), a **métrica** à direita e a seta "›";
  - métrica do material: "1 aluno concluiu · 25%"; métrica do quiz: "1 participante · Média 7,8", no mesmo formato de hoje;
  - o quiz vinculado a um material aparece na seção Quizzes, com o título tratado por `tituloQuizEhGenerico`, como na revisão atual.
- **Fonte dos dados:**
  - a **lista** de itens vem de `GET /Cursos/{id}/revisao-conteudo`, só o publicado, que também traz as questões para o gabarito. Carregar ao entrar no módulo e reaproveitar enquanto o curso estiver aberto;
  - as **métricas** vêm de `desempenho`, que o `PainelCursoGestao` já carrega, ligadas por id: `conteudoDidaticoId` = id do conteúdo, `avaliacaoId` = id do quiz. Item sem métrica mostra "—";
  - se `desempenho` tiver itens que não aparecem em `revisao-conteudo` (rascunho, por exemplo), **não mostrar na Tela 2 e citar no relatório**. Não mudar a contagem da Tela 1 sem avisar.
- **Rodapé:** "← Módulo anterior" e "Próximo módulo: <nome> →", trocando a rota e desativados nas pontas.
- **Estados:**
  - carregando: "Carregando módulo…";
  - erro, com "Tentar de novo";
  - módulo sem nada publicado: "Este módulo ainda não tem conteúdo publicado.";
  - 401 chama `onSessionExpired`, como no resto da tela.

### 4. Painel do item aberto, ao lado, na Tela 2

- **Desktop:**
  - lista à esquerda e painel à direita, os dois com rolagem própria;
  - antes de escolher, o painel mostra "Escolha um conteúdo ou quiz para ver aqui.";
  - o item aberto fica destacado na lista, com `aria-current`.
- **Conteúdo do painel:**
  - trilha "Módulo 01 › Quiz" (ou "› PDF"), título e selo **"Somente leitura"** (`Insignia`);
  - material: tipo, descrição e "Abrir arquivo" ou "Abrir link";
  - quiz: todas as questões com a **correta em verde** (`GabaritoQuestoes`).
  - **Reaproveitar `RevisaoMaterial` e `RevisaoQuiz`**, extraindo para um componente compartilhado, por exemplo `components/LeituraItemConteudo.jsx`.
- **Rodapé do painel:**
  - "← Item anterior" e "Próximo item →", na ordem da lista (conteúdos, depois quizzes), **dentro do módulo**, desativados nas pontas;
  - botão fechar (×), e Esc também fecha o painel.
- O item aberto fica **só no estado da tela**, sem rota própria. Trocar de módulo fecha o painel.
- **Tela estreita (≈ 400–900px):** a lista ocupa a tela. Ao abrir um item, o painel ocupa a tela toda, com "← Voltar ao módulo" no topo.

### 5. Limpeza

- Se, depois da extração, `RevisaoConteudoCurso.jsx` não for usado por mais nada, remover o componente, o teste dele e o CSS `revisao-conteudo__*` que ficar sem uso.
- Não mexer em `PreviaTrilhaAluno` nem no "Visualizar como aluno" do Professor.

## Permissões (nada novo é liberado)

| Ação | Admin | Coordenador |
|---|---|---|
| Ver módulos, conteúdos e quizzes (com gabarito) | Sim | Só cursos que coordena |
| Abrir arquivo/link do material | Sim | Só cursos que coordena |
| Ver desempenho do módulo e de cada item | Sim | Só cursos que coordena |
| Editar/excluir módulo (⋮ na Tela 1) | Como hoje | Como hoje |
| Criar, editar, publicar ou excluir conteúdo e quiz | **Não** | **Não** |

- A Tela 2 e o painel **não têm** lápis, lixeira, publicar nem "Novo conteúdo".
- Criar e editar conteúdo e quiz continua só com o Professor, na tela de Conteúdos dele.
- **Não mudar o backend:** as rotas `/Cursos/{id}/desempenho` e `/Cursos/{id}/revisao-conteudo` já restringem o Coordenador aos cursos que coordena. Se o agente notar o contrário, para e avisa, sem corrigir por conta.

**Não alterar:**
- backend, app mobile e `demoApi` (salvo se um teste existente quebrar);
- a aba Avaliações do curso, o topo do curso (exceto a saída do "Ver conteúdo"), a grade de Cursos;
- a tela do Professor.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador** (num curso que coordena), comparando com `fluxo-modulos-drilldown.png`:

**Tela 1:**
- Cada módulo tem "›" e não abre mais embaixo. O clique leva a `/app/cursos/:id/modulos/:moduloId`.
- O ⋮ continua com Editar/Excluir e não navega.
- O botão "Ver conteúdo" não existe mais.

**Tela 2:**
- Migalha, KPIs, "Conteúdos (N)" e "Quizzes (N)" com as métricas certas (conferir contra o que o accordion mostrava antes).
- Recarregar a página na URL do módulo abre o mesmo módulo.
- O voltar do navegador volta para a lista.
- Um `moduloId` inválido volta para o curso.
- Módulo anterior/próximo funcionam e ficam desativados nas pontas.

**Painel:**
- Clicar num material abre o painel com "Abrir arquivo" funcionando.
- Clicar num quiz mostra as questões com a correta em verde e o selo "Somente leitura".
- Item anterior/próximo andam só dentro do módulo. × e Esc fecham.
- Nenhum botão de editar, excluir ou publicar conteúdo ou quiz, para nenhum dos dois perfis.
- Em ≈ 400px, o painel ocupa a tela, com "← Voltar ao módulo".

**Regressão:**
- O "Visualizar como aluno" do Professor continua igual.
- A aba Avaliações do curso continua igual.

**Testes (vitest):**
- `readRoute` com e sem `/modulos/:id`;
- clique no módulo navega;
- Tela 2 com seções e métricas;
- painel abre, anterior/próximo e fechar;
- ausência de ações de edição para Admin e Coordenador.
- `npm run lint` e `npm test` sem erros novos.

No relatório final, citar: os arquivos alterados, se `RevisaoConteudoCurso.jsx` foi removido, e se apareceu diferença entre os itens de `desempenho` e de `revisao-conteudo`.

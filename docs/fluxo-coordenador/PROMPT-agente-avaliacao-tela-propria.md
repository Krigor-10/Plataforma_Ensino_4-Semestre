# Prompt: avaliações do curso abrem em tela própria para Admin e Coordenador (só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

Na tela do curso do Admin e do Coordenador (`pages/workspace/PainelCursoGestao.jsx`, rota `/app/cursos/:id`), a aba **"Avaliações do curso"** lista as provas e exercícios. Cada cartão abre **para baixo** (acordeão, `TbChevronDown`) e mostra só números: Participantes, Nota média, Nota máxima, Conclusão e Aproveitamento. O Coordenador não consegue ver a avaliação que o professor publicou.

**O usuário pediu o mesmo fluxo dos módulos** (`TelaModuloGestao.jsx`): seta "›" no cartão e, ao clicar, uma tela própria com a avaliação completa.

**Proposta APROVADA em 2026-11-15:** imagem `avaliacao-tela-propria.png`, nesta pasta.
- Quadros "1" (aba) e "2" (topo da tela).
- **Opção B** para as questões: índice à esquerda e uma questão por vez. A Opção A da imagem foi descartada.
- As questões e os valores da ficha na imagem são exemplos. Os números amarelos e a legenda são só explicação.

**Decisões do usuário:**
- a tela mostra a **prova completa com gabarito + os números gerais da prova**;
- **não** mostra a lista de alunos com a nota de cada um.

## O que o agente de arquitetura já verificou (não repetir)

- **Aba hoje:** `PainelCursoGestao.jsx` ≈ linhas 523–610.
  - `avaliacoesDoCurso` (≈ linha 164) junta `desempenho.avaliacoesSemModulo` com as avaliações não-quiz ligadas a módulo.
  - Cada item tem `avaliacaoId`, `titulo`, `tipoAvaliacao`, `totalParticipantes`, `mediaNota`, `notaMaxima`, `percentualConclusao` e `percentualAproveitamento`.
  - O acordeão usa `avaliacaoAbertaId` / `alternarAvaliacaoDoCurso`.
- **Questões com gabarito: os dados já existem, sem mudar o backend.** `GET /Cursos/{id}/revisao-conteudo` (`CursoRevisaoConteudoService`, Admin e Coordenador) devolve **todas as avaliações publicadas** do curso.
  - Elas vêm em `modulos[].avaliacoes` e em `avaliacoesSemModulo`, cada uma `{ avaliacao, questoes }`.
  - `avaliacao` (`AvaliacaoResponseDto`) traz: `descricao`, `notaMaxima`, `tempoLimiteMinutos`, `tentativasPermitidas`, `dataAbertura`, `dataFechamento`, `moduloId`, `moduloTitulo` e `totalQuestoes`.
  - `questoes` (`QuestaoAvaliacaoResponseDto`) traz: `ordem`, `enunciado`, `contexto`, `pontos`, `dificuldade`, `explicacao`, `alternativas` (com a correta), `afirmativas` e `anexos`.
  - O `PainelCursoGestao` já carrega essa rota para a tela do módulo (`revisaoConteudo`, `carregarRevisaoConteudo`, ≈ linha 215).
- **Componentes para reaproveitar:**
  - `components/GabaritoQuestoes.jsx` (correta em verde com "Correta");
  - `components/LeituraItemConteudo.jsx`;
  - `components/BotaoVoltar.jsx`;
  - o caminho e o padrão de tela de `TelaModuloGestao.jsx`.
- **Rota:**
  - `lib/router.js` já devolve `subsecao`/`subparam`.
  - O `WorkspaceScreen.jsx` (≈ linha 138) **só preserva** `subsecao === "modulos"` no caminho canônico. **Sem ajustar isso, a nova rota volta sozinha para `/app/cursos/:id`**: foi o bug do commit `edda3a7`.
  - O `WorkspaceScreen` (≈ linha 716) passa `moduloIdSelecionado`.

## Tarefa (comparar com `avaliacao-tela-propria.png`)

### 1. Rota

- Nova rota `/app/cursos/:id/avaliacoes/:avaliacaoId`.
- No `WorkspaceScreen.jsx`:
  - preservar também `subsecao === "avaliacoes"` com `subparam` no caminho canônico, só para a seção `cursos` com `param`; o resto continua cortado como hoje;
  - passar `avaliacaoIdSelecionada` até o `PainelCursoGestao`, como já é feito com `moduloIdSelecionado`.
- `avaliacaoId` que não existe na lista do curso volta para `/app/cursos/:id` com `replace`, como o módulo faz.

### 2. Aba "Avaliações do curso" (marcador 1)

- Trocar o `TbChevronDown` por `TbChevronRight` à direita da métrica.
- O cartão inteiro vira um botão que navega para a rota nova, **sem acordeão**: remover `avaliacaoAbertaId`, `alternarAvaliacaoDoCurso`, o `AnimatePresence` e o `dl` de métricas da aba. Os números passam para a tela nova.
- Hover e foco visíveis, iguais aos dos cartões de módulo.
- A métrica do cartão ("Prova · 1 participante") continua igual.
- **Ao voltar da tela da avaliação**, pelo "← Voltar", pelo caminho ou pelo voltar do navegador, a aba **"Avaliações do curso" fica selecionada**, e não "Módulos". Isso vale também depois de um F5 na tela da avaliação.

### 3. Tela da avaliação: novo `pages/workspace/TelaAvaliacaoGestao.jsx`

O `PainelCursoGestao` renderiza essa tela quando há `avaliacaoIdSelecionada`, como faz com `TelaModuloGestao`. Ela usa os mesmos números de `avaliacoesDoCurso` e as questões de `revisaoConteudo`.

**Topo (marcadores 2 a 5):**
- `<BotaoVoltar destino="Avaliações" … />` como primeiro elemento: vai para a margem esquerda em tela larga e fica acima com "← Voltar para Avaliações" quando não há margem.
- **Caminho** no mesmo estilo do caminho do módulo (ver `PROMPT-agente-modulo-caminho-e-voltar.md`): "Cursos › {curso} › Avaliações › Avaliação 01".
  - "Avaliações" volta para a aba;
  - o atual em negrito com `aria-current`;
  - curso longo com "…".
- **Título** = título da avaliação, com o selo "Somente leitura". Linha de resumo: "Prova · 10 questões · avaliação 1 de 10". O tipo usa `normalizeTipoAvaliacao`, e o número de questões vem de `questoes.length`.
- **4 números numa linha**, com `CartaoEstatistica` no estilo dos KPIs do módulo:
  - Participantes;
  - Nota média;
  - Conclusão;
  - Aproveitamento.

  Em tela menor, os 4 descem para baixo do título, em 2×2 ou 4 colunas compactas.
- **Ficha** em pílulas:
  - "Nota máxima N";
  - "Tempo N min" ou "Sem limite de tempo";
  - "N tentativa(s)";
  - "Aberta de dd/mm a dd/mm", ou só a data que existir, ou nenhuma pílula se não houver datas;
  - "Módulo: {moduloTitulo}" só quando a avaliação é ligada a um módulo.
- Embaixo da ficha, a `descricao`, se houver.

**Questões, Opção B (marcador 6):**
- **Índice à esquerda** (≈ 160–200px), com "Questão 1" … "Questão N" em cartões pequenos com os tokens de relevo. A questão aberta fica com contorno roxo e `aria-current`. Ordem por `ordem`.
- **À direita, uma questão por vez:**
  - cabeçalho "QUESTÃO N" com "N ponto(s) · fácil/média/difícil";
  - contexto e anexos, se houver;
  - enunciado;
  - alternativas ou afirmativas, com a correta em verde e "Correta";
  - a explicação do professor, se houver.
  - Reaproveitar `GabaritoQuestoes`, passando só a questão atual, ou extrair dele o pedaço de uma questão. Não duplicar a renderização. Conferir que afirmativas e anexos aparecem como na prévia do Professor.
- **Pé da questão:** "← Questão N-1", "Questão 2 de 10" no meio e "Questão N+1 →", desativados nas pontas.
- **Teclado:** setas ←/→ trocam de questão quando o foco está na área da questão.
- Ao entrar na tela e ao trocar de avaliação, a **Questão 1** abre.
- Em tela larga, o índice e a questão podem ter rolagem própria (como o módulo), com o topo sempre visível. Se isso complicar, a página rolando normalmente também é aceitável, desde que o pé da questão fique visível sem rolar muito.

**Trocar de avaliação (marcador 7):** "← Avaliação anterior / Próxima avaliação: <título> →" no pé da tela, na ordem de `avaliacoesDoCurso`, desativado nas pontas. Troca a URL.

**Estados:**
- carregando: esqueleto, ou o "Carregando…" que o módulo já usa;
- erro na revisão: a mensagem com "Tentar novamente" que já existe;
- **avaliação que está na lista mas não veio na revisão** (rascunho, por exemplo): mostrar o topo e os números, e no lugar das questões "Esta avaliação ainda não foi publicada. As questões aparecem aqui depois da publicação.";
- avaliação sem questões: "Esta avaliação não tem questões.".

**Celular (< 768px):**
- o índice vira uma linha rolável na horizontal com "1 2 3 …", ou um seletor "Questão 2 de 10 ▾", acima da questão;
- uma questão por vez, com o pé anterior/próxima;
- sem rolagem horizontal na página;
- os números em 2×2.

**Não alterar:**
- backend, permissões e dados;
- a aba Módulos, a tela do módulo e a tela do Professor;
- a contagem da aba ("Avaliações do curso 10").

Nenhum botão de editar, excluir, publicar ou arquivar, para Admin e Coordenador.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador** (num curso que coordena), comparando com `avaliacao-tela-propria.png`. Usar, por exemplo, o curso "Desenvolvimento Web Full Stack", que tem 10 avaliações.

- **Aba:**
  - cartões com "›" e sem abrir para baixo;
  - clicar abre a tela, e a URL fica em `/app/cursos/:id/avaliacoes/:avaliacaoId` **sem voltar sozinha**.
- **Navegação:**
  - F5 na URL abre a mesma avaliação;
  - o voltar do navegador, o "← Voltar" e "Avaliações" no caminho voltam para a aba **Avaliações do curso** selecionada;
  - um `avaliacaoId` inválido volta para o curso.
- **Topo:**
  - "← Voltar" na margem em 1920px;
  - caminho, título com "Somente leitura" e o resumo;
  - os 4 números com os mesmos valores que o acordeão mostrava antes;
  - a ficha com os dados reais da prova.
- **Questões:**
  - índice com a questão aberta destacada e a Questão 1 aberta ao entrar;
  - anterior/próxima e "Questão X de Y";
  - correta em verde, explicação, e afirmativas e anexos (testar "Teste ENADE - Afirmativas combinadas" e "teste avaliação img").
- **Trocar de avaliação:** anterior/próxima trocam a URL e abrem a Questão 1.
- **Rascunho/sem questões:** as mensagens dos estados acima.
- **≈ 900px e ≈ 390px:** sem rolagem horizontal, com o índice adaptado e o "← Voltar para Avaliações" acima.
- **Tema claro:** relevo, destaque e verde da correta visíveis.
- **Testes (vitest):**
  - rota preservada pelo `WorkspaceScreen` com `/avaliacoes/:id`, testada pelo caminho real, como no teste de regressão do `edda3a7`;
  - cartão navega;
  - aba Avaliações selecionada ao voltar;
  - índice e anterior/próxima de questão;
  - "Questão X de Y";
  - estado "ainda não foi publicada";
  - ausência de ações de edição.
- `npm run lint` e `npm test` sem erros novos.

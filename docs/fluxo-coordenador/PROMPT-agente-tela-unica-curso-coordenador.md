# Prompt — Fluxo do coordenador: tela única do curso (web)

## Contexto

Projeto CodeRyse Academy, frontend web em `frontend/` (React + Vite) e backend ASP.NET Core na raiz.

**Relato do usuário:** ao abrir um curso, o coordenador só vê detalhes, e toda ação manda para outra aba da sidebar. O fluxo deveria ser uma ação só: Cursos → selecionar o curso → módulos com detalhes de cada um → progresso.

**Medição:** no vídeo de 63 s, o mesmo curso foi escolhido 7 vezes. Fluxo atual e pontos de atrito: `docs/fluxo-coordenador/MAPA-fluxo-atual.md`.

**Referência visual:** `docs/fluxo-coordenador/modelo-a-pagina-unica.png`. Os percentuais por módulo e os nomes de conteúdos da imagem são ilustrativos.

## Decisões do usuário

Proposta aprovada pelo usuário em 2026-11-07.

1. **Modelo A, página única.** Módulos, progresso, avaliações e professores ficam na mesma página, sem abas.
2. **Modulos e Progresso saem do menu do coordenador.** A sidebar fica com Dashboard, Gestão > Professores e Acadêmico > Cursos.
3. **Números só com matrículas aprovadas.** A contagem de alunos e os percentuais usam só `StatusMatricula.Aprovada`, com ajuste no backend. O Progresso do Professor muda junto, e isso foi aceito.
4. **Professores: ver, vincular e desvincular dentro do curso.**

## O que o agente de arquitetura já verificou (não repetir)

As referências são do commit `e9f8005`. Confirme as linhas antes de editar. A tela logada não foi aberta por este agente; o comportamento na tela vem do vídeo do usuário.

**Navegação**

- Cada seção guarda o curso em estado local: `SecaoCursos.jsx:47`, `SecaoModulos.jsx:34`, `SecaoDesempenhoCoordenador.jsx:21`.
- `parseRoute` já devolve `route.param` para `/app/secao/:param` (`lib/router.js:32-36`). Professor e Aluno usam isso em Conteúdos e Avaliações (`WorkspaceScreen.jsx:728`).
- O `ErrorBoundary` tem `key` com seção e parâmetro (`WorkspaceScreen.jsx:598`), então mudar o parâmetro remonta a seção.
- Em `onRefresh`, os filhos continuam montados quando `hasData` é verdadeiro (`WorkspaceScreen.jsx:597`).
- A seção `turmas` tem o rótulo "Progresso" para Coordenador (`WorkspaceScreen.jsx:69`) e renderiza `SecaoDesempenhoCoordenador` (`:816`). Para Admin renderiza `SecaoProfessoresCurso` (`:824`).
- A aba de grupo e o item agrupado no menu móvel só aparecem com 2 ou mais filhos (`NavGrupo.jsx:34-39`, `BarraNavMobile.jsx:36`). Com um só filho, somem sem código novo.
- Não há links para `/app/turmas` ou `/app/modulos` no backend. No frontend, o de módulos está em `BarraTopo.jsx:206`, e a seção `turmas` é aberta por `DashboardCoordenador.jsx:120`.

**Dados**

- `GET /Cursos/{id}/desempenho` já existe para Coordenador, mas nenhum código do frontend o usa (`CursosController.cs:268`). Curso de outro coordenador resulta em `KeyNotFoundException` (`CursoDesempenhoService.cs:33`).
- `demoApi.js` só trata `/Cursos/desempenho` (linha 43).
- O DTO traz `modulos[].moduloId`, `progressoMedio`, `percentualConclusao`, `desempenhoMedio`, `materiais[]` e `avaliacoes[]`, além de `avaliacoesSemModulo[]` (`CursoDesempenhoResponseDto.cs`).
- O backend ordena módulos por título (`CursoDesempenhoService.cs:197`). `SecaoModulos.jsx:138-143` ordena por data de criação, que define a numeração atual "Módulo 01".
- No frontend, `/Cursos/desempenho` é consumido por `SecaoDesempenhoCoordenador`, `SecaoTurmasProfessor` e `SecaoAvaliacoesProfessor` (linha 55). A busca não achou esse endpoint em `mobile/`, `desktop/` ou `shared/`.

**Permissões**

- Vincular e desvincular aceitam Coordenador e checam se o curso é dele (`CursosController.cs:116-140`, `PodeGerenciarCursoAsync`).
- `snapshot.professores` vem de `/Professores` (`lib/dashboard.js:21`).

**Causas de defeitos**

- "Sem professor vinculado" pisca porque a lista começa vazia e não há carregamento (`SecaoCursos.jsx:160` e `:681`).
- "O curso fica travado" é falso: `SelectSimples` não tem `disabled`, e o PUT só envia o título (`SecaoModulos.jsx:371` e `:229-232`).
- "10 avaliacaooes" vem do sufixo `"oes"` em `PainelModulosDesempenho.jsx:62`.
- `LayoutWorkspace` recebe `snapshot.cursos` e `snapshot.modulos` (`WorkspaceScreen.jsx:560-561`), então a busca do coordenador não usa só os cursos dele.

## Tarefa

### 1. Rota do curso

1. Para Coordenador, o curso aberto passa a ser `/app/cursos/:cursoId`, e não mais estado local. Admin continua como está.
2. Em `WorkspaceScreen`, passe `route.param` numérico e `onNavigate` para `SecaoCursos`.
3. Ao clicar no card, navegue para a rota. "Voltar para Cursos" e o `Cursos` do breadcrumb voltam para `/app/cursos`.
4. Se o id for inválido ou não estiver em `coordenadorCursos`, depois de os dados carregarem, use `replace` para `/app/cursos`.

### 2. Nova tela do curso

Crie `frontend/src/pages/workspace/PainelCursoCoordenador.jsx` e renderize esse painel em `SecaoCursos` quando `ehCoordenador` e houver curso aberto. Os modais de editar curso continuam em `modaisComuns`.

Ordem da página:

1. **Voltar para Cursos.**
2. **Cabeçalho:** título, código, descrição e a `Insignia` de curso Acompanhado.
3. **Ações:** Editar curso, e Encerrar ou Reabrir com as regras atuais (`SecaoCursos.jsx:712-721`). Os botões "Ver modulos" e "Ver professores" não existem nesta tela.
4. **Indicadores, 4 cartões:** Alunos matriculados (`totalAlunos`), Progresso médio (`progressoMedio`), Concluíram o curso (`percentualConclusao`) e Média geral (`desempenhoMedio`). Enquanto carrega, mostre `—`. Professor não é um cartão.
5. **Módulos:** título com total e botão "+ Novo módulo".
6. **Avaliações do curso:** bloco recolhido abaixo dos módulos, só quando `avaliacoesSemModulo` tiver itens.
7. **Professores:** último bloco.

**Dados**

- Busque `GET /Cursos/${id}/desempenho` ao abrir o curso, com carregamento e erro próprios. Se falhar, mostre `InlineMessage` e mantenha os módulos e suas ações, com `—` nos percentuais.
- Use os módulos do snapshot na ordem de `SecaoModulos.jsx:138-143` e junte o desempenho por `moduloId`. Não use a ordem do DTO.
- Recarregue o desempenho depois de criar, editar ou excluir módulo.

**Linha do módulo** (mantenha um aberto por vez, como hoje)

- Mostre rótulo "MÓDULO 01", título, "N conteúdos · N avaliações", barra de progresso, percentual, seta e menu ⋮ com Editar e Excluir.
- Depois de carregar, as contagens usam `materiais.length` e `avaliacoes.length`, para bater com a lista aberta. Antes, use `totalConteudos` e `totalAvaliacoes`.
- Reaproveite as classes `conteudos-modulo*` e a barra de `GradeCursosProfessor`, se servir.

**Módulo aberto**

- Extraia de `PainelModulosDesempenho.jsx:146-214` um componente de detalhe, usado pela tela do Professor e pela nova tela.
- Mostre Progresso, Conclusão e Desempenho médio.
- Na tela do coordenador, separe os grupos com os títulos "Conteúdos" e "Avaliações".
- Na tela do Professor, o visual não muda.

**Módulos: criar, editar e excluir**

- Extraia os modais de `SecaoModulos.jsx:331-400` para um componente compartilhado.
- Quando o curso já é conhecido, não mostre seletor de curso. O curso vem fixo.
- Ao editar, o curso nunca é alterável. Isso também corrige o modal em `SecaoModulos`, que Admin continua usando.

**Professores**

- Extraia de `SecaoProfessoresCurso.jsx` um bloco compartilhado com carregamento, lista, vincular e desvincular.
- `/Cursos/{id}/professores` é a única fonte da tela.
- Enquanto carrega, mostre "Carregando professores...". "Nenhum professor vinculado" só aparece depois da resposta.
- "+ Vincular professor" abre o seletor de professor.
- No coordenador, "Desvincular" pede confirmação em `Modal`. A tela do Admin não muda.

### 3. Navegação do coordenador

1. Em `data/appConfig.js`, tire `"Coordenador"` de `modulos` e `turmas`.
2. Em `WorkspaceScreen.jsx`, remova o rótulo do Coordenador (linha 69) e o ramo das linhas 816-822.
3. Apague `SecaoDesempenhoCoordenador.jsx`, que fica sem uso.
4. Coordenador em `/app/modulos` ou `/app/turmas` vai para `/app/cursos` com `replace`. Trate isso antes do fallback para o Dashboard (`WorkspaceScreen.jsx:82-84` e `:108-116`).
5. No Dashboard, "Ver todos" vai para `cursos`, e cada item de "Cursos acompanhados" abre `/app/cursos/:id`.
6. Na busca global do coordenador, curso abre `/app/cursos/:id`, e módulo abre `/app/cursos/:cursoId`. Módulos devem continuar aparecendo na busca mesmo sem a seção `modulos`.
7. Para Coordenador, passe ao `LayoutWorkspace` só os cursos e módulos dele: `cursosDaSecaoCursos` e `modulosDaSecaoModulos`.
8. Com curso aberto, o breadcrumb mostra `CodeRyse Academy › Cursos › Título do curso`.

### 4. Backend: só matrículas aprovadas

Em `Services/CursoDesempenhoService.cs`:

1. Filtre a consulta das linhas 91-94 por `StatusMatricula.Aprovada`.
2. Filtre `tentativasCorrigidas` (linhas 153-156) também por `matriculaIds`.
3. Mantenha o contrato do DTO. `TotalAlunos` e `AlunosAtivos` passam a ter o mesmo valor.

Os demais agregados já partem de `matriculaIds` ou `matriculasDoCurso`. Confirme isso, em especial `AlunosConcluiram` e `progressosComMedia`.

### 5. Ajustes e limpeza

1. Corrija o sufixo em `PainelModulosDesempenho.jsx:62` para `"es"`.
2. Em `components/IndicadoresDesempenhoCurso.jsx`, atualize o comentário sobre "qualquer status". Sem o coordenador, só `SecaoTurmasProfessor` usa o componente, e sempre com `ocultarAlunosAprovados`. Remova essa prop e o cartão "Alunos aprovados".
3. Em `demoApi.js`, adicione `GET /Cursos/{id}/desempenho` e cubra no smoke test, para o modo demo não quebrar. A verificação continua no app real.

### 6. Testes

- **Novo teste em `PlataformaEnsino.Tests/CursoDesempenhoServiceTests.cs`:** um curso com matrículas Aprovada, Pendente, Rejeitada e Cancelada conta só a aprovada em alunos, progresso, conclusão, materiais e participantes. Os testes atuais já aprovam a matrícula no helper de criação (linha 128).
- **Frontend:** cubra a junção por `moduloId` mantendo a ordem de criação, o estado de carregamento de professores e o desempenho com erro.

## Não fazer

- Não alterar o fluxo do Admin, além da correção do seletor no modal de módulo.
- Não alterar a tela do Professor, além dos números decididos.
- Não criar endpoint novo nem mudar o contrato do DTO.
- Não alterar `mobile/` e `desktop/`.
- Não criar telas de conteúdo, avaliação ou aluno para o coordenador.
- Não alterar `CodeRyse-Diagramas-Sequencia.asta`. Os diagramas ficam com o agente de arquitetura depois da entrega.
- Não usar `VITE_DEMO_MODE` para verificar.

## Critérios de aceite

Verifique no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como coordenador.

**Fluxo**

- [ ] O menu mostra Dashboard, Gestão > Professores e Acadêmico > Cursos. A barra de abas Cursos › Modulos › Progresso não aparece.
- [ ] Escolher um curso uma vez mostra indicadores, módulos, avaliações do curso e professores na mesma página.
- [ ] Abrir um módulo mostra progresso, conclusão, desempenho, conteúdos e avaliações.
- [ ] Criar, editar e excluir módulo funciona sem sair da página, e os números são atualizados.
- [ ] Vincular e desvincular professor funciona na página, e desvincular pede confirmação.
- [ ] Os módulos seguem a ordem atual: Fundamentos da Web Moderna é o Módulo 01 em Desenvolvimento Web Full Stack.
- [ ] Em curso Acompanhado, Encerrar e Reabrir seguem as regras atuais.

**Rotas e atalhos**

- [ ] A URL fica `/app/cursos/:id`. F5 mantém o curso, e voltar do navegador retorna à grade.
- [ ] Curso inexistente ou de outro coordenador volta para `/app/cursos`.
- [ ] `/app/modulos` e `/app/turmas` levam para `/app/cursos`.
- [ ] Item de "Cursos acompanhados" e resultado de curso ou módulo na busca abrem o curso certo.
- [ ] A busca do coordenador não lista cursos de outro coordenador.

**Dados e defeitos**

- [ ] Em Desenvolvimento Web Full Stack, a contagem de alunos é a mesma na grade e na tela do curso, só com matrículas aprovadas.
- [ ] "Sem professor vinculado" não pisca ao abrir um curso com professor.
- [ ] O nome do professor aparece inteiro.
- [ ] "avaliacaooes" não aparece mais.

**Sem regressão**

- [ ] Admin: Cursos, "Ver modulos", "Ver professores", Modulos e Professores por curso funcionam como antes, e o curso fica travado ao editar módulo.
- [ ] Professor: Progresso e as médias em Avaliações abrem normalmente, com os números só de matrículas aprovadas.
- [ ] Tema claro e tema escuro legíveis, sem rolagem horizontal em 375 px.
- [ ] `npm run lint`, `npm test` e `dotnet test` sem erros novos.

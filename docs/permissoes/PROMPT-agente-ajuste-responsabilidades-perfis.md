# Prompt — Ajuste de responsabilidades entre perfis (criar curso, módulos, professores)

## Contexto

Projeto CodeRyse Academy: backend ASP.NET (raiz do repositório) e frontend web (`frontend/`, React + Vite).

O agente de arquitetura levantou as permissões de cada perfil (`docs/permissoes/CodeRyse-permissoes-por-perfil-com-resumo.xlsx`). O usuário aprovou corrigir **3 conflitos de responsabilidade**:

1. **Criar curso:** só o **Admin**. Hoje a API também aceita o Coordenador, mas a tela já só mostra o botão para o Admin.
2. **Módulos:** o **Professor** do curso passa a **editar e excluir** os módulos, não só criar. O Coordenador continua editando e excluindo nos cursos dele. O Admin **deixa de ter o botão "Novo módulo"**: a trilha fica com o Professor.
3. **Professores:** **cadastrar, editar, inativar/reativar e excluir** professor fica só com o **Admin**, como já é com alunos e coordenadores. O Coordenador fica só com **vincular e desvincular** professores nos cursos dele, pela tela do curso, como já funciona hoje.

## O que o agente de arquitetura já verificou (não repetir)

### 1. Criar curso
- `Controllers/CursosController.cs` ≈ linhas 35–36: `[HttpPost]` com `[Authorize(Roles = "Admin,Coordenador")]`.
- Frontend: o único `POST /Cursos` está em `pages/workspace/SecaoCursos.jsx` ≈ linha 350. O botão "Novo curso" (≈ linha 655) já está dentro de `ehAdmin`.

### 2. Módulos
**Backend:**
- `Controllers/ModulosController.cs`:
  - `POST` usa `PodeCriarModuloAsync` (≈ linha 87);
  - `PUT` e `DELETE` usam `PodeGerenciarModuloAsync` (≈ linhas 111 e 124) com `[Authorize(Roles = "Admin,Coordenador")]`.
- `Services/CursoAutorizacaoService.cs`:
  - `PodeGerenciarModuloAsync` (≈ linha 43): Admin sempre; depois delega a `PodeGerenciarCursoAsync`, que só aceita o coordenador dono do curso. Módulo inexistente devolve `true`, para o serviço reportar 404;
  - `PodeCriarModuloAsync` (≈ linha 64) já tem a regra "Professor vinculado ao curso" via `ProfessoresCursos`. Reaproveitar.
- A exclusão já é segura: `Services/ModuloService.cs` ≈ linha 100 bloqueia módulo com dependências acadêmicas ("Nao e possivel excluir o modulo porque ele ja possui dependencias academicas.").
- Testes existentes: `PlataformaEnsino.Tests/CursoAutorizacaoServiceTests.cs` ≈ linhas 135–210 (gerenciar e criar módulo por perfil).

**Frontend:**
- `hooks/useModaisModulo.js` já expõe `abrirEdicaoModulo` e `abrirExclusaoModulo` (≈ linhas 27 e 91).
- Em `SecaoConteudosProfessor.jsx`, o hook é instanciado (≈ linha 991) e os modais de editar e excluir **já são renderizados** (props ≈ linhas 1938–1949). Mas só `abrirFormularioNovoModulo` é usado (≈ linha 1397), ou seja, falta só o ponto de entrada.
- O cabeçalho de cada módulo do Professor tem o menu "Mais ações" (`itensMaisAcoes`, ≈ linhas 1442–1470, renderizado ≈ linha 1551), hoje só com ações em lote sobre os itens selecionados.
- Admin: botão "Novo modulo" em `PainelCursoGestao.jsx` ≈ linhas 307–312, dentro de `ehAdmin`. O menu ⋮ Editar/Excluir de cada módulo (≈ linha 339) continua para Admin e Coordenador.

### 3. Professores
- `Controllers/ProfessoresController.cs` ≈ linha 11: `[Authorize(Roles = "Admin,Coordenador")]` na classe vale para GET, POST (≈ 30), PUT (≈ 38) e DELETE (≈ 46).
- O `GET /Professores` **precisa continuar** aceitando o Coordenador:
  - `lib/dashboard.js` ≈ linha 21 carrega a lista para os perfis de gestão;
  - o modal "Professores (N)" da tela do curso usa essa lista para vincular.
- Frontend:
  - menu `professores` em `data/appConfig.js` ≈ linha 6, com `roles: ["Admin", "Coordenador"]`;
  - tela `pages/workspace/SecaoProfessores.jsx`: cadastro, edição, inativação, exclusão e ações em lote;
  - o atalho para Professores no Dashboard existe só no Dashboard do Admin (`DashboardAdmin.jsx` ≈ linha 60).
- Mobile (React Native) só tem telas de Aluno: fora do escopo.

## Tarefa

### 1. Criar curso só pelo Admin
- `POST /Cursos`: `[Authorize(Roles = "Admin")]`.
- Ajustar ou adicionar teste de integração: Coordenador recebe 403 ao criar curso, Admin cria normalmente.

### 2. Módulos
**Backend:**
- `PUT /Modulos/{id}` e `DELETE /Modulos/{id}` passam a aceitar `Professor` em `[Authorize(Roles = "Admin,Coordenador,Professor")]`.
- `PodeGerenciarModuloAsync` passa a liberar também o **Professor vinculado ao curso do módulo**, com a mesma regra de `PodeCriarModuloAsync`, sem duplicar a consulta. Manter Admin sempre, Coordenador dono do curso e o comportamento de módulo inexistente.
- Atualizar o comentário de `ICursoAutorizacaoService`.
- Testes em `CursoAutorizacaoServiceTests`: Professor vinculado pode gerenciar; Professor sem vínculo não pode; os casos de Coordenador continuam iguais.

**Frontend, Professor:** no menu "Mais ações" do cabeçalho de cada módulo, acrescentar **"Editar módulo"** e **"Excluir módulo"** (perigo), separados das ações em lote, chamando `modaisModulo.abrirEdicaoModulo(modulo)` e `modaisModulo.abrirExclusaoModulo(modulo)`.
- Os dois ficam sempre habilitados, sem depender de seleção.
- Se a exclusão for bloqueada por dependências, mostrar a mensagem do backend no modal, como já faz `mensagemExclusao`.

**Frontend, Admin:** remover o botão "Novo modulo" de `PainelCursoGestao.jsx`.
- O `POST /Modulos` continua aceitando Admin na API, como suporte.
- Atualizar o comentário do topo do arquivo, ≈ linha 57.

### 3. Professores só com o Admin
**Backend:**
- `ProfessoresController`: **GET** continua `Admin,Coordenador`; **POST, PUT e DELETE** passam para `[Authorize(Roles = "Admin")]`.
- Teste: Coordenador recebe 403 nesses três e continua com 200 no GET.

**Frontend:**
- Menu `professores` em `appConfig.js` só com `roles: ["Admin"]`.
- O Coordenador continua vinculando e desvinculando professores pelo modal "Professores (N)" da tela do curso. Conferir que o modal e a lista carregada em `dashboard.js` continuam funcionando para ele.
- Se o Coordenador acessar a seção `professores` por URL direta, deve cair no comportamento padrão de seção sem permissão do app, igual às outras seções fora do perfil.

**Não alterar** a ação de vincular e desvincular professor (`/Cursos/{id}/professores`), a edição de curso pelo Coordenador (título e descrição), a tela de Coordenadores nem os demais perfis.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- **Admin:**
  - cria curso normalmente;
  - na tela do curso, **não** vê "Novo módulo", mas edita e exclui módulos pelo ⋮;
  - a tela Professores continua completa.
- **Coordenador:**
  - não tem o item "Professores" no menu;
  - vincula e desvincula professor pelo modal da tela do curso;
  - edita e exclui módulos dos cursos dele;
  - criar curso pela API devolve 403.
- **Professor:**
  - em Conteúdos, "Mais ações" do módulo tem "Editar módulo" e "Excluir módulo";
  - edita o título e salva;
  - excluir um módulo vazio funciona;
  - excluir um módulo com conteúdo mostra a mensagem de bloqueio;
  - em curso sem vínculo, a API devolve 403.
- `dotnet test` e, no frontend, `npm run lint` e `npm test` sem erros novos.

Depois de aplicado, avisar o agente de arquitetura para atualizar a planilha de permissões e os diagramas de casos de uso de Admin, Coordenador e Professor.

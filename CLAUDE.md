# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PlataformaEnsino** is an EdTech platform with a .NET 10 ASP.NET Core Web API backend and a React (Vite) frontend served as static files. The backend uses Entity Framework Core with SQL Server (LocalDB in development). The solution is named "Sistema Academico Integrado".

Namespace root: `PlataformaEnsino.API`

## Commands

### Backend (.NET)

```powershell
# Run API (serves frontend too at http://localhost:5000)
dotnet run

# Build
dotnet build

# Apply pending EF Core migrations
dotnet ef database update

# Create a new migration
dotnet ef migrations add <NomeDaMigracao>

# Remove the last migration (before applying it)
dotnet ef migrations remove
```

### Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev    # dev server at http://localhost:5173
npm run build  # production build (output served by ASP.NET)
```

In development the Vite server at `:5173` proxies `/api` to the Express gateway at `:4000` (see `frontend/vite.config.js`), which in turn forwards to the ASP.NET API at `:5000`. The ASP.NET CORS policy allows `http://localhost:5173`.

### Gateway (Node/Express)

`gateway/` is a thin Express reverse proxy in front of the ASP.NET API. It exists so future web, mobile (React Native), and desktop (Electron, wraps the same React web app) clients share one integrated entry point without duplicating business logic — the gateway has no business logic of its own, it only forwards `/api/*` (including the `Authorization` header) to the .NET API.

```powershell
cd gateway
npm install       # first time only
cp .env.example .env   # first time only
npm start          # listens on :4000, forwards to DOTNET_API_URL (default http://localhost:5000)
```

Run order for local dev: `dotnet run` (backend, `:5000`) → `gateway` (`npm start`, `:4000`) → `frontend` (`npm run dev`, `:5173`, proxies through the gateway).

### Mobile (Expo / React Native)

`mobile/` is a React Native app (Expo, bare "blank" template, no Expo Router) that talks directly to the gateway — same JWT flow as the web frontend, minimal UI (Login + a Cursos list) proving the integration works end to end.

```powershell
cd mobile
npm install       # first time only
npm run web        # runs in the browser via react-native-web, http://localhost:8081
npm run android     # requires an Android emulator/device
npm run ios         # requires macOS
```

`src/lib/config.js` resolves the gateway URL per platform: `10.0.2.2:4000` on the Android emulator (it can't see the host's `localhost`), `127.0.0.1:4000` everywhere else (iOS simulator, web). For a physical device, change it to the host machine's LAN IP. The gateway's `CORS_ORIGINS` (`gateway/.env`) must include whatever origin the mobile web target runs on (`http://localhost:8081` by default).

Run order: same as web, but start `mobile` (`npm run web`) instead of `frontend`.

### Development seeding

On startup in the `Development` environment, `DevelopmentDataSeeder` auto-seeds the database with:
- Admin: `admin@edtech.local` / `Edtech@123`
- Coordenador: `coordenacao@edtech.local` / `Edtech@123`
- Professor: `professor@edtech.local` / `Edtech@123`
- Aluno: `aluno@edtech.local` / `Edtech@123`

## Architecture

### Backend layers

```
Controllers/   → HTTP layer, minimal logic, delegates to services
Services/      → Business logic, one service per domain area
Repositories/  → EF Core data access; GenericRepository<T> is the base
Interfaces/    → Contracts for all services and repositories (DI-registered in Program.cs)
Models/        → Domain entities
DTOs/          → Request/response contracts
Data/          → PlataformaContext (DbContext) + DevelopmentDataSeeder
Common/        → ApiExceptionMiddleware (global error handler)
Migrations/    → EF Core migration history
```

### User hierarchy (TPT via EF Core)

`Usuario` is an abstract base class holding the shared columns (`Nome`, `Email`, `Cpf`, `SenhaHash`, `TipoUsuario`, etc.) in the `Usuarios` table. Each concrete type is mapped to its own satellite table via `.ToTable(...)` (Table Per Type, not Table Per Hierarchy) — `Alunos`, `Professores`, `Coordenadores`, `Admins`, each holding only the FK (`Id`, 1:1 with `Usuarios.Id`) plus the type-specific columns:

- `Aluno` — `Matricula` (string), `Matriculas` (navigation to enrollment records)
- `Professor` — `CodigoRegistro`, `Especialidade`, plus navigation to `QuestoesBanco`/`ConteudosDidaticos`/`AvaliacoesPublicadas`/`LancamentosNota` authored by them (assignment to a `Turma` is on `Turma.ProfessorId`, not on `Professor`)
- `Coordenador` — `CodigoRegistro` (no longer tied to a single "responsible" `Curso` — a coordinator can be linked to multiple `Cursos` via `Curso.CoordenadorId`)
- `Admin` — platform administrator, no extra columns

`TipoUsuario` (string) is set via `ConfigurarAcesso()` and used for JWT claims and role-based authorization. Passwords are hashed with BCrypt.

### Course / enrollment data model

```
Curso → Modulo[] → ConteudoDidatico[]
     ↘ Turma[]
Matricula (Aluno + Curso + Turma?) with StatusMatricula enum: Pendente | Aprovada | Rejeitada | Cancelada
```

Progress tracking uses: `ProgressoConteudoAluno`, `ProgressoModuloAluno`, `ProgressoCursoAluno`. (`MarcoProgressoAluno` existed in the schema but was never written to anywhere — removed in migration `RemoverMarcoProgressoAluno`, 2026-09-04, after a full database audit confirmed it was dead.)

Assessment system: `QuestaoBanco → QuestaoPublicada → Avaliacao → TentativaAvaliacao → RespostaAluno`. Bank questions can have file attachments (`AnexoQuestaoBanco` — image/PDF/video, reuses `IArmazenamentoArquivoService`, stored under `Storage/Uploads/questoes/`), managed via `POST/DELETE /api/v1/avaliacoes/questoes-banco/{questaoBancoId}/anexos` and surfaced in `QuestaoAvaliacaoResponseDto.Anexos` — only the owning Professor (`QuestaoBanco.ProfessorAutorId`) can manage them.

`FeedbackAcademico` (a note/observation about a student) can be written by a Professor about a student enrolled in one of their own turmas (`POST /api/v1/usuarios/{alunoId}/feedbacks`), read by that student or by the Professor who wrote it (`GET .../feedbacks`), and marked read by the student (`PUT .../feedbacks/{id}/lido`). Backend only so far — no frontend screen yet.

### Authentication

`POST /api/v1/auth/login` validates credentials and issues a JWT (HS256). The token contains claims for `usuarioId`, `ClaimTypes.Role` (TipoUsuario), and standard JWT fields. Token expiry defaults to 20 minutes (short-lived on purpose — a deactivated account or role change takes effect quickly; the refresh token, valid 30 days, silently renews it). Frontend stores token in `localStorage` and attaches it as `Authorization: Bearer <token>`.

### Frontend architecture

Single-page React app with a custom lightweight router (`frontend/src/lib/router.js`). Three top-level screens: `PublicHome`, `LoginScreen` / `CadastroScreen`, and `WorkspaceScreen`. The workspace renders different section components based on `APP_SECTIONS` in `appConfig.js`, filtered by the logged-in user's `tipoUsuario`.

**Demo mode** (`frontend/src/lib/demoMode.js`): enabled via `VITE_DEMO_MODE=true` env var or `localStorage`. When active, all API calls are intercepted by `demoApi.js` and return hardcoded data — no backend needed. Demo accounts: `coordenacao@demo.edtech`, `professor@demo.edtech`, `aluno@demo.edtech` (password: `demo123`).

API calls go through `frontend/src/lib/api.js` (`apiRequest`), which injects the Bearer token and translates non-2xx responses to `ApiError`.

### Global error handling

`ApiExceptionMiddleware` catches unhandled exceptions and maps them to HTTP status codes:
- `KeyNotFoundException` → 404
- `ArgumentException` → 400
- `InvalidOperationException` → 422

Services throw these standard exception types directly; controllers do not catch exceptions.

### API docs

Swagger/OpenAPI is available at `/swagger` and Scalar UI at `/scalar/v1` in development.

## Regras obrigatórias de desenvolvimento

Estas regras devem ser seguidas em todas as implementações, alterações e novos componentes do projeto.

### 1. Nomenclatura semântica e clara

- Utilizar nomes claros, descritivos e semânticos para: funções, variáveis, constantes, classes CSS, componentes, arquivos, propriedades e métodos.
- Evitar nomes genéricos ou sem significado (`data`, `item`, `value`, `temp`, `test`, `func`, `div1`, `box1`, etc.) quando existir uma alternativa mais descritiva.
- Os nomes devem representar claramente a responsabilidade ou finalidade do elemento.

### 2. Código organizado e sustentável

- Priorizar código limpo, legível e de fácil manutenção.
- Evitar duplicação de lógica e código desnecessário; reutilizar componentes, funções e estruturas existentes sempre que possível.
- Manter responsabilidades bem definidas.
- Não realizar alterações desnecessárias em funcionalidades que não fazem parte da solicitação.

### 3. HTML e estrutura semântica

- Utilizar elementos HTML semânticos sempre que apropriado (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `button`, `form`, `label`).
- Evitar o uso excessivo de `div` quando existir uma tag semântica mais adequada.

### 4. Responsividade multiplataforma

Toda interface deve ser desenvolvida e validada para funcionar corretamente em Web/Desktop, notebook, tablet e mobile, considerando diferentes resoluções e tamanhos de tela. Garantir que:

- Nenhum conteúdo seja cortado.
- Não existam rolagens horizontais desnecessárias.
- Textos permaneçam legíveis.
- Botões e elementos interativos sejam adequados para toque em dispositivos móveis.
- Cards, tabelas, menus e demais componentes se adaptem corretamente.
- A navegação continue funcional em todas as plataformas.

### 5. Mobile First e adaptação responsiva

Sempre que apropriado, utilizar uma abordagem responsiva consistente, preferencialmente Mobile First, com layouts flexíveis, Grid ou Flexbox, unidades responsivas e media queries quando necessárias. Evitar dimensões fixas que possam quebrar o layout em diferentes dispositivos.

### 6. SEO

Todas as páginas públicas devem seguir boas práticas de SEO, quando aplicável:

- Título (`title`) adequado para cada página e meta description.
- Estrutura correta de headings (`h1`, `h2`, `h3`, ...), com apenas um `h1` principal por página.
- HTML semântico e URLs amigáveis.
- Textos alternativos (`alt`) descritivos para imagens relevantes, com carregamento otimizado.
- Evitar conteúdo duplicado; manter estrutura adequada para mecanismos de busca.

### 7. Acessibilidade

Sempre que possível, seguir boas práticas de acessibilidade:

- Utilizar HTML semântico e garantir contraste adequado.
- Adicionar `alt` significativo em imagens e usar `label` corretamente em campos de formulário.
- Garantir navegação por teclado e feedback adequado para ações e erros.
- Utilizar atributos ARIA somente quando realmente necessários.

### 8. Validação antes de finalizar

Antes de considerar uma tarefa concluída, verificar:

1. Se a implementação funciona corretamente.
2. Se não houve regressão em funcionalidades existentes.
3. A responsividade em mobile, tablet e desktop.
4. A organização e nomenclatura do código.
5. A semântica do HTML.
6. Boas práticas de SEO nas páginas públicas.
7. Códigos duplicados ou desnecessários, corrigindo quando encontrados.

### Regra final

Priorizar sempre: **código limpo + nomenclatura semântica + reutilização + responsividade multiplataforma + acessibilidade + SEO + facilidade de manutenção.**

Não implementar soluções rápidas que comprometam a organização, escalabilidade, responsividade ou manutenção futura do projeto.

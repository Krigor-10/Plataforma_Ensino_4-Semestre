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

### User hierarchy (TPH via EF Core)

`Usuario` is an abstract base class stored in a single `Usuarios` table (Table Per Hierarchy). Concrete types:

- `Aluno` — has `Matriculas`, `TurmaAtual`
- `Professor` — speciality field, assigned to `Turma`
- `Coordenador` — responsible for a `Curso`
- `Admin` — platform administrator

`TipoUsuario` (string) is set via `ConfigurarAcesso()` and used for JWT claims and role-based authorization. Passwords are hashed with BCrypt.

### Course / enrollment data model

```
Curso → Modulo[] → ConteudoDidatico[]
     ↘ Turma[]
Matricula (Aluno + Curso + Turma?) with StatusMatricula enum: Pendente | Aprovada | Rejeitada | Cancelada
```

Progress tracking uses: `ProgressoConteudoAluno`, `ProgressoModuloAluno`, `ProgressoCursoAluno`, `MarcoProgressoAluno`.

Assessment system: `QuestaoBanco → QuestaoPublicada → Avaliacao → TentativaAvaliacao → RespostaAluno`.

### Authentication

`POST /api/auth/login` validates credentials and issues a JWT (HS256). The token contains claims for `usuarioId`, `ClaimTypes.Role` (TipoUsuario), and standard JWT fields. Token expiry defaults to 120 minutes. Frontend stores token in `localStorage` and attaches it as `Authorization: Bearer <token>`.

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

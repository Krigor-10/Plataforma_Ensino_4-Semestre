# Desenvolvimento da Solução Web

Etapa 4 do PIM IV (disciplina Desenvolvimento Web com .Net). Substitui/complementa a antiga seção "4. Desenvolvimento Web Responsivo" do PIM III, que descrevia um **protótipo estático** de frontend — esta seção descreve a **API REST real** que hoje sustenta o sistema.

## 4.1 Arquitetura da Aplicação

Backend em ASP.NET Core Web API (.NET 10), organizado em camadas:

```
Controllers/   → HTTP: recebe requisição, delega, devolve resposta
Services/      → regra de negócio, um serviço por domínio (CursoService, AuthService, ...)
Repositories/  → acesso a dados via EF Core (GenericRepository<T> como base)
Interfaces/    → contrato de todo Service/Repository, injetado por DI
Models/        → entidades de domínio (Usuario, Curso, Matricula, ...)
DTOs/          → contrato de entrada/saída — nunca expõe a entidade direto
Data/          → PlataformaContext (DbContext)
Common/        → ApiExceptionMiddleware (tratamento global de erro)
```

Cada camada só conhece a interface da camada abaixo, nunca a implementação concreta — é o mesmo desenho detalhado na Etapa 6 (`especificacaoUML-Desktop-CSharp.md`, seção 5).

O frontend é uma SPA em React (Vite), servida como arquivo estático pelo próprio ASP.NET (`wwwroot`) — `dotnet run` sobe API e frontend na mesma porta. Um Gateway em Node/Express fica na frente, repassando `/api` e `/uploads` pra API, dando um ponto de entrada único também pro Mobile e pro Desktop (Electron).

## 4.2 APIs REST

Rotas versionadas em `api/v1/[controller]` (ex.: `api/v1/auth`, `api/v1/cursos`), seguindo convenção de recurso — cada Controller expõe operações sobre um agregado de domínio (`CursosController`, `AvaliacoesController`, `MatriculasController` etc.), delegando toda regra de negócio pro Service correspondente via injeção de dependência.

Documentação gerada automaticamente pelo OpenAPI nativo do ASP.NET Core (sem Swashbuckle): JSON em `/openapi/v1.json`, interface interativa em `/scalar/v1` (ambiente de desenvolvimento).

## 4.3 Autenticação

`POST /api/v1/auth/login` valida e-mail/senha (hash BCrypt) e emite um JWT (HS256) com claims de `usuarioId` e `ClaimTypes.Role` (o `TipoUsuario` do usuário). O token expira em **20 minutos** — deliberadamente curto, pra que uma desativação de conta ou troca de papel surta efeito rápido — e é renovado silenciosamente por um **refresh token** válido por 30 dias, com rotação a cada uso (`POST /api/v1/auth/refresh`).

O frontend guarda o token em `localStorage` e o anexa como `Authorization: Bearer <token>` em toda chamada (`frontend/src/lib/api.js`).

## 4.4 Segurança

- Senhas hasheadas com **BCrypt**, nunca em texto plano.
- Rate limiting nos endpoints de autenticação (`[EnableRateLimiting("auth")]` em `AuthController`), contra força bruta.
- **CORS restrito** a origens conhecidas (`http://localhost:5173` em dev).
- `ApiExceptionMiddleware` centraliza tratamento de erro: `KeyNotFoundException`→404, `ArgumentException`→400, `InvalidOperationException`→422 — os Services lançam exceções padrão, os Controllers não fazem `try/catch` espalhado.
- Segredos (chave JWT, connection string) ficam fora do controle de versão sensível — `appsettings.example.json` é o único versionado com placeholders.

## 4.5 Estrutura Administrativa

Quatro papéis com autorização baseada em Role (`[Authorize(Roles = "Admin,Coordenador")]` etc.): **Aluno**, **Professor**, **Coordenador**, **Admin** — cada um com seções próprias no painel (gestão de usuários e cursos pro Admin, aprovação de matrícula e desempenho pro Coordenador, banco de questões e correção pro Professor). Em desenvolvimento, o `DevelopmentDataSeeder` cria uma conta de cada papel automaticamente.

## 4.6 Integração Entre Módulos

O domínio pedagógico é encadeado (`Curso → Modulo → ConteudoDidatico`, `Curso → Turma → Matricula`) e o sistema de avaliação se conecta a ele via `Avaliacao.ModuloId`/`ConteudoDidaticoId` opcionais — uma avaliação pode estar amarrada a um módulo inteiro ou a um conteúdo específico. O frontend reflete essa integração num roteador único (`frontend/src/lib/router.js`) que filtra as seções visíveis (`APP_SECTIONS`) pelo papel do usuário logado, sem duplicar tela por perfil.

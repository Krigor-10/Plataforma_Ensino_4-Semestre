# CodeRyse Academy - Projeto Integrado Multidisciplinar (PIM 4°Semestre)

Plataforma educacional multiplataforma desenvolvida como requisito acadêmico para o Projeto Integrado Multidisciplinar (PIM) do 3º semestre do curso de Análise e Desenvolvimento de Sistemas da UNIP.

## 🚀 Sobre o Projeto

A CodeRyse Academy é um sistema focado na gestão educacional que oferece fluxos dedicados para diferentes tipos de usuários. A aplicação conta com um backend robusto e um banco de dados relacional normalizado para garantir a integridade e escalabilidade do acesso acadêmico.

## 👥 Equipe

* **Krigor de Sousa** - Desenvolvedor
* **Maria Izabel** - Desenvolvedor
* **Heitor Nadir** - Product Owner
* **Nicolas Pimentel** - Scrum Master

## 🛠 Tecnologias e Arquitetura

O projeto foi construído do zero utilizando o ecossistema Microsoft e foca em boas práticas de separação de responsabilidades.

* **Linguagem / Plataforma:** C# e .NET
* **Banco de Dados:** SQL Server
* **Arquitetura de Software:** Padrão em camadas sendo implementando e arquitetado `Controllers`, `Services`, `Repositories` e `DTOs`.
* **Modelagem de Dados:** Estrutura normalizada de usuários, dividindo as entidades em perfis específicos (`Admin`, `Coordenador`, `Professor`, `Aluno`) ao invés de uma tabela única genérica.

## 🧩 Componentes do sistema

| Pasta | O que é | Porta padrão |
|---|---|---|
| raiz (`Program.cs`) | API ASP.NET Core (.NET 10) + serve o frontend buildado em `wwwroot/` | `5000` (http) / `5001` (https) |
| `frontend/` | SPA em React + Vite | `5173` (dev) |
| `gateway/` | Proxy Express, ponto de entrada único para web/mobile/desktop | `4000` |
| `mobile/` | App React Native (Expo) | `8081` (web) |
| `desktop/` | Empacota o mesmo frontend via Electron | — |

Em produção, `dotnet run` sozinho já serve tudo (API + frontend buildado). O `gateway` só é necessário para o fluxo de desenvolvimento local com hot-reload do frontend/mobile — ver [Executando localmente](#-executando-localmente).

---

## ✅ Requisitos

* [.NET SDK 10.0.400](https://dotnet.microsoft.com/download) ou superior dentro da mesma feature band (a versão exata é fixada em `global.json`)
* SQL Server LocalDB (**Windows apenas** — vem com a carga de trabalho "Desenvolvimento para desktop com .NET" do Visual Studio, ou pelo instalador standalone do SQL Server Express) — ver [Banco de dados em outro sistema operacional](#banco-de-dados-em-outro-sistema-operacional) se você não estiver no Windows
* Node.js `>= 20.19` (necessário só se você for mexer no `frontend/`, `gateway/`, `mobile/` ou `desktop/` — o backend sozinho não depende de Node)
* Visual Studio 2022+ (opcional — o projeto roda 100% via `dotnet` CLI também)

## 📥 Clone

```bash
git clone <url-do-repositorio>
cd <pasta-do-projeto>
```

## ⚙️ Configuração

O projeto usa o sistema de configuração em camadas do ASP.NET Core:

1. `appsettings.json` — valores não sensíveis, iguais em qualquer ambiente (issuer/audience do JWT, SMTP vazio, logging).
2. `appsettings.Development.json` — connection string LocalDB e origens CORS locais. **Já vem pronto no repositório**, então na maioria dos casos você não precisa mexer em nada aqui para rodar localmente.
3. `appsettings.Production.json` — os mesmos campos, vazios de propósito. Um deploy real deve preenchê-los via **variáveis de ambiente** (nunca editando este arquivo com valores reais), no formato `Seção__Chave`, por exemplo:
   ```bash
   ConnectionStrings__DefaultConnection="Server=...;Database=...;..."
   Jwt__Key="uma-chave-aleatoria-com-no-minimo-32-caracteres"
   Cors__AllowedOrigins__0="https://seu-dominio.com"
   Frontend__BaseUrl="https://seu-dominio.com"
   ```
4. `appsettings.example.json` — modelo de referência com todas as chaves existentes e exemplos de connection string alternativas (Docker, servidor remoto). Não é carregado pela aplicação, é só um gabarito.

### A chave JWT (`Jwt:Key`)

O valor versionado (`SET_VIA_DOTNET_USER-SECRETS_OU_VARIAVEL_DE_AMBIENTE`) é só um marcador — **não é uma chave válida para produção**. Em qualquer ambiente que não seja `Development`, a aplicação recusa subir se essa chave não for substituída por um valor real de pelo menos 32 caracteres (checagem em `Program.cs`).

Em desenvolvimento, para não deixar nem o marcador em texto plano no seu ambiente, use o [User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) do .NET (o projeto já tem `UserSecretsId` configurado no `.csproj`):

```bash
dotnet user-secrets set "Jwt:Key" "gere-uma-chave-aleatoria-de-32-ou-mais-caracteres"
```

Isso nunca vai para o Git — fica fora do repositório, em `%APPDATA%\Microsoft\UserSecrets\` (Windows) ou `~/.microsoft/usersecrets/` (Linux/macOS).

## 🗄️ Banco de dados

O banco é 100% reproduzível a partir do código: `Código + EF Core Migrations + Seed controlado = Banco reproduzível`. Não existe dependência de um `.bak`/dump externo.

```bash
dotnet ef database update
```

Isso cria o banco `PlataformaEnsinoDB` na instância LocalDB configurada em `appsettings.Development.json`, aplicando as ~33 migrations existentes em ordem. Ao rodar a aplicação em `Development` (`dotnet run`), ela também roda `dotnet ef database update` e o seed automaticamente na inicialização — o comando manual acima é útil se você quiser aplicar as migrations sem subir a API, ou fora do ambiente `Development`.

**Seed automático (só em `Development`):** o `DevelopmentDataSeeder` cria usuários de teste toda vez que a API sobe em ambiente de desenvolvimento — não roda em `Production`.

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@edtech.local` | `Edtech@123` |
| Coordenador | `coordenacao@edtech.local` | `Edtech@123` |
| Professor | `professor@edtech.local` | `Edtech@123` |
| Aluno | `aluno@edtech.local` | `Edtech@123` |

⚠️ São contas de desenvolvimento, criadas automaticamente a cada subida em `Development`. Elas **nunca** são criadas em `Production` (o seeder é condicionado a `app.Environment.IsDevelopment()`). Se algum dia precisar de dados de teste fora de `Development`, crie um seeder separado — nunca reative este em produção.

### Criando uma migration nova

```bash
dotnet ef migrations add NomeDaMigracao
dotnet ef migrations remove   # desfaz a última, antes de aplicá-la
```

### Banco de dados em outro sistema operacional

LocalDB é exclusivo do Windows. Em Linux/macOS, aponte a connection string para um SQL Server de verdade — a forma mais simples é via Docker:

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=SuaSenhaForte123!" \
  -p 1433:1433 --name sqlserver-edtech -d mcr.microsoft.com/mssql/server:2022-latest
```

E então configure (via `dotnet user-secrets` ou variável de ambiente `ConnectionStrings__DefaultConnection`, exemplo em `appsettings.example.json`):

```
Server=localhost,1433;Database=PlataformaEnsinoDB;User Id=sa;Password=SuaSenhaForte123!;TrustServerCertificate=True;
```

O projeto não inclui um `docker-compose.yml` hoje (não é necessário no Windows, onde LocalDB já resolve) — mas a arquitetura já está pronta pra isso, já que tudo passa pela connection string configurada, sem nenhuma dependência de LocalDB no código.

## ▶️ Executando localmente

### Só o backend (API + frontend já buildado)

```bash
dotnet restore
dotnet build
dotnet ef database update
dotnet run
```

Acesse `http://localhost:5000`. O `wwwroot/` já vem com uma build do frontend versionada no repositório — você consegue rodar o sistema completo sem instalar Node.

### Backend + frontend com hot-reload (para desenvolver o frontend)

Ordem de inicialização, em 3 terminais:

```bash
# 1) Backend (.NET) - porta 5000
dotnet run

# 2) Gateway (Node/Express) - porta 4000, repassa /api e /uploads pro backend
cd gateway
npm install          # só na primeira vez
cp .env.example .env # só na primeira vez
npm start

# 3) Frontend (React/Vite) - porta 5173, com proxy pro gateway
cd frontend
npm install   # só na primeira vez
npm run dev
```

Acesse `http://localhost:5173`. Depois de terminar de mexer no frontend, gere a build final que fica versionada em `wwwroot/`:

```bash
cd frontend
npm run build
```

> Se você rodar `npm run build` só para testar e não fez nenhuma mudança de verdade em `frontend/src`, descarte o resultado (`git checkout -- wwwroot`) em vez de commitar um hash novo à toa.

### Mobile (Expo)

```bash
cd mobile
npm install
npm run web   # http://localhost:8081, via react-native-web
```

Precisa do backend + gateway rodando (mesma ordem acima). `src/lib/config.js` já resolve a URL do gateway certa por plataforma (`10.0.2.2` no emulador Android, `127.0.0.1` no resto); para dispositivo físico, troque pelo IP da máquina na rede local. Lembre de incluir a origem do mobile web (`http://localhost:8081` por padrão) em `gateway/.env` → `CORS_ORIGINS`.

### Desktop (Electron)

```bash
cd desktop
npm install
npm start
```

Abre uma janela carregando `http://localhost:5000` (o mesmo backend, sem gateway). Para apontar pra outra URL: `DESKTOP_APP_URL=https://sua-url npm start`.

## 🖥️ Abrindo no Visual Studio

Abra `Sistema Academico Integrado.sln`. O projeto de start é `Sistema Academico Integrado` (perfil `http` ou `https` em `Properties/launchSettings.json`); `PlataformaEnsino.Tests` é o projeto de testes (xUnit + EF Core InMemory, não precisa de banco real). F5 já aplica migrations e seed automaticamente (ambiente `Development` por padrão nos dois profiles).

## 📖 Swagger / Scalar

Disponíveis só em `Development`:

* Scalar (padrão): `http://localhost:5000/scalar/v1`
* OpenAPI JSON cru: `http://localhost:5000/openapi/v1.json`

Nenhum dos dois fica exposto em `Production`.

## 🗂️ Estrutura do projeto

```
Controllers/    HTTP - minimal logic, delega pra Services
Services/       Regra de negócio, um service por área
Repositories/   Acesso a dados via EF Core (GenericRepository<T> como base)
Interfaces/     Contratos, registrados via DI em Program.cs
Models/         Entidades de domínio (Usuario é TPH: Admin/Coordenador/Professor/Aluno)
DTOs/           Contratos de request/response
Data/           PlataformaContext + DevelopmentDataSeeder
Common/         Middleware de erro global, logging de requisição
Migrations/     Histórico de migrations do EF Core
Storage/Uploads/  Arquivos enviados por usuários (fora do wwwroot, fora do Git)
wwwroot/        Frontend já buildado, servido como estático pelo próprio backend
frontend/       Código-fonte React/Vite (gera o conteúdo de wwwroot/)
gateway/        Proxy Express (dev local + integração multiplataforma)
mobile/         App Expo/React Native
desktop/        Empacotamento Electron
shared/         Código JS compartilhado entre frontend e mobile (cliente de API, sessão)
PlataformaEnsino.Tests/  Testes automatizados (xUnit)
```

## 🧪 Testes

```bash
dotnet test
```

Usa EF Core InMemory — não precisa de SQL Server/LocalDB configurado pra rodar os testes.

## 🔧 Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `Cannot open database "PlataformaEnsinoDB"` | Migrations não aplicadas ainda | `dotnet ef database update` |
| `A network-related or instance-specific error...` / LocalDB não conecta | LocalDB não instalado, ou instância não criada | Instale a carga "Desenvolvimento para desktop com .NET" do VS Installer, ou rode `sqllocaldb create mssqllocaldb` |
| Erro de certificado HTTPS no primeiro `dotnet run` (perfil `https`) | Certificado de desenvolvimento do .NET não confiado no SO | `dotnet dev-certs https --trust` |
| `Address already in use` / porta ocupada | Outro processo já ocupa 5000/4000/5173/8081 | Feche o processo anterior, ou troque a porta em `launchSettings.json` (backend), `gateway/.env` (`PORT`) ou `vite.config.js` (frontend) |
| `Unhandled exception: Jwt:Key nao foi configurada...` | Rodando fora de `Development` sem uma chave JWT real | Configure `Jwt__Key` (env var) ou `dotnet user-secrets set "Jwt:Key" "..."` — ver [seção de configuração](#a-chave-jwt-jwtkey) |
| CORS bloqueando o frontend | Origem não está em `Cors:AllowedOrigins` do ambiente ativo | Adicione a origem em `appsettings.Development.json` (dev) ou na variável `Cors__AllowedOrigins__N` (produção) |
| Frontend mostra tela/dados antigos depois de mexer no código | `wwwroot/` só é atualizado quando você builda o frontend | `cd frontend && npm run build` |
| `dotnet ef` reclamando de SDK/versão | SDK instalada diferente da fixada em `global.json` | Instale a versão indicada, ou ajuste `global.json` se souber que a sua é compatível |
| Upload de arquivo falha silenciosamente | Pastas de upload não existem ainda | Normal na primeira execução — `Program.cs` já cria `Storage/Uploads/conteudos` e `Storage/Uploads/cursos` automaticamente ao subir |

## ☑️ Checklist para rodar numa máquina nova

- [ ] Instalar .NET SDK (versão de `global.json`)
- [ ] Instalar SQL Server LocalDB (Windows) ou subir um SQL Server via Docker (outros SOs)
- [ ] Clonar o repositório
- [ ] (Opcional, dev) `dotnet user-secrets set "Jwt:Key" "..."` — sem isso, o placeholder versionado já funciona em `Development`
- [ ] `dotnet restore`
- [ ] `dotnet ef database update`
- [ ] `dotnet run`
- [ ] Validar login com uma das contas seed (tabela acima)
- [ ] Validar API em `/scalar/v1`
- [ ] Validar frontend em `http://localhost:5000`
- [ ] (Se for mexer no frontend) `cd frontend && npm install && npm run dev`, acessar via gateway

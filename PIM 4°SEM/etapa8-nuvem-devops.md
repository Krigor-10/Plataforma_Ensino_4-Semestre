# Infraestrutura em Nuvem e DevOps

Etapa 8 do PIM IV (disciplina EAD — Cloud Computing e DevOps). A etapa pede um **plano de execução**, não infraestrutura já implantada — por isso este documento descreve a arquitetura de nuvem proposta e traz, como prova de conceito, os artefatos de containerização (`Dockerfile`, `docker-compose.yml`) já criados no repositório. O deploy real na Azure segue adiado (decisão já registrada anteriormente), mas o caminho até lá está todo mapeado abaixo.

## 8.1 Arquitetura em Nuvem

Provedor escolhido: **Microsoft Azure** (coerente com a stack .NET/SQL Server já usada em desenvolvimento).

```
                 ┌────────────────────────────┐
Web / Mobile /   │   Azure App Service (Node)   │
Desktop  ───────▶│   Gateway — :4000            │──────┐
                 └────────────────────────────┘      │
                                                        ▼
                                         ┌────────────────────────────┐
                                         │  Azure App Service (Linux)  │
                                         │  API .NET + SPA (wwwroot)   │
                                         └──────────────┬─────────────┘
                                                          ▼
                                         ┌────────────────────────────┐
                                         │      Azure SQL Database     │
                                         └────────────────────────────┘
                                                          │
                                         ┌────────────────────────────┐
                                         │   Azure Blob Storage        │
                                         │   (Storage/Uploads)         │
                                         └────────────────────────────┘
```

- **Azure App Service (Linux, .NET 10)** hospeda a API — o mesmo binário que hoje serve a API e o `wwwroot` (SPA React) em `dotnet run` local, sem mudança de código.
- **Azure App Service (Node 22)** hospeda o Gateway, mantendo o papel descrito no `CLAUDE.md`: ponto de entrada único pra Mobile, Desktop e futuros clientes, repassando `/api` e `/uploads` pra API.
- **Azure SQL Database** substitui o LocalDB de desenvolvimento — só troca a `ConnectionStrings:DefaultConnection` (já é lida de configuração/variável de ambiente em `Program.cs`, com o LocalDB como fallback apenas de dev), nenhuma mudança de código é necessária.
- **Azure Blob Storage** substitui o disco local de `Storage/Uploads` — como o projeto já isola esse acesso atrás de `IArmazenamentoArquivoService`, basta uma nova implementação da interface; controllers e services não mudam.

## 8.2 Serviços Utilizados

| Serviço Azure | Papel |
|---|---|
| App Service (Linux) ×2 | hospeda API .NET e Gateway Node |
| Azure SQL Database | banco de produção |
| Azure Blob Storage | arquivos enviados (fotos, PDFs, vídeos de conteúdo/questões) |
| Azure Key Vault | segredos (chave JWT, connection string, credenciais de storage) |
| Application Insights | telemetria, exceções, latência (ver 8.5) |
| GitHub Actions | pipeline de CI/CD (já em uso pro CI, ver 8.4) |

## 8.3 Containers

Artefatos já criados no repositório (não são hipotéticos):

- `Dockerfile` (raiz) — build multi-stage da API .NET 10: `sdk:10.0` pra restaurar/compilar/publicar, `aspnet:10.0` como runtime final, expõe porta 8080.
- `gateway/Dockerfile` — imagem `node:22-alpine`, instala só dependências de produção (`npm ci --omit=dev`), expõe porta 4000.
- `docker-compose.yml` (raiz) — orquestra os três serviços localmente: `sqlserver` (imagem oficial `mssql/server:2022-latest`, substitui o LocalDB), `api` (build do `Dockerfile` da raiz, plugado no SQL Server do compose) e `gateway` (build do `gateway/Dockerfile`, apontando `DOTNET_API_URL` pro serviço `api`). Sobe tudo com `docker compose up --build`, com `DB_SA_PASSWORD` definido num `.env` local.
- `.dockerignore` (raiz e `gateway/`) — evita empacotar `node_modules`, `bin/obj`, o projeto de testes e uploads locais dentro da imagem.

Esse compose já reproduz em containers a mesma topologia da produção proposta (App Service ↔ App Service ↔ SQL Database), só trocando "App Service" por "container local" — o que facilita validar o plano antes de qualquer gasto real na Azure.

## 8.4 Pipeline CI/CD

**Estado atual:** `.github/workflows/ci.yml` já roda **CI** completo a cada push/PR pra `main` — build + testes de backend (.NET), frontend (React, com lint), mobile (Expo) e um smoke test do gateway (sobe o processo e confere `/health`). Isso já existia antes desta etapa.

**Extensão proposta (CD)** — ainda não ativada no repositório porque depende de recursos Azure e segredos que não existem ainda; fica documentada aqui como o job a adicionar quando a hospedagem for de fato criada:

```yaml
  deploy:
    name: Deploy (Azure App Service)
    needs: [backend, frontend, gateway]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publicar API
        run: dotnet publish "Sistema Academico Integrado.csproj" -c Release -o ./publish

      - name: Deploy API no App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: plataformaensino-api
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_API }}
          package: ./publish

      - name: Deploy Gateway no App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: plataformaensino-gateway
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_GATEWAY }}
          package: ./gateway
```

Gatilho: só em push pra `main`, e só depois que os jobs de CI (`backend`, `frontend`, `gateway`) passarem — nunca em PR, nunca com testes quebrados.

## 8.5 Monitoramento

- **Application Insights** (SDK `Microsoft.ApplicationInsights.AspNetCore`) na API — captura requisições, exceções não tratadas (que já passam pelo `ApiExceptionMiddleware` centralizado) e chamadas ao banco, sem precisar instrumentar cada controller manualmente.
- Alertas configuráveis por taxa de erro (ex.: >5% de respostas 5xx em 5 min) e latência (p95 acima de um limiar).
- Gateway: hoje loga com `morgan("dev")` (texto simples); em produção, trocar pro formato `combined`/JSON e encaminhar pro **Log Analytics Workspace** da Azure, unificando os logs dos dois serviços num só lugar de consulta.

## 8.6 Escalabilidade

- A API já é **stateless** — autenticação via JWT sem sessão de servidor (só o refresh token fica persistido no banco) — então escalar horizontalmente (mais instâncias do App Service) é seguro sem sticky sessions.
- **Autoscale do App Service**: regra simples de CPU (>70% por 5 min → soma uma instância, min 1 / max a definir conforme orçamento).
- **Azure SQL Database**: começa num tier básico (DTU/vCore baixo) com upgrade vertical conforme o uso real — não há motivo pra superdimensionar antes de ter tráfego.
- O **rate limiting já implementado** nos endpoints de autenticação (`[EnableRateLimiting("auth")]` em `AuthController`) já protege contra abuso mesmo antes de qualquer scale-out — é comportamento existente, não uma proposta nova.

## 8.7 Segurança

- HTTPS obrigatório — certificado gerenciado gratuito do App Service.
- Segredos (chave de assinatura JWT, connection string, credenciais de storage) via **Azure Key Vault** ou App Service Application Settings — nunca commitados; o repositório já segue esse padrão hoje com `appsettings.example.json` versionado e `appsettings.Development.json`/`appsettings.Production.json` fora do controle de versão sensível.
- **JWT de curta duração (20 min) + refresh token com rotação**, já implementado no backend — reduz a janela de exposição de um token vazado.
- **CORS restrito** a origens conhecidas (já implementado na API e no Gateway via `CORS_ORIGINS`).
- Gateway isolado do banco de dados — só a API tem a connection string; o Gateway nunca fala diretamente com o SQL Server.

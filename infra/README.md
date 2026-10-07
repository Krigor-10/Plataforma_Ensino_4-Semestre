# Deploy na Azure

Infra: `main.bicep` provisiona um App Service (deploy de código, sem
container), um Azure SQL Server + Database e uma Storage Account (container
`uploads`, usado por `ArmazenamentoArquivoBlobService`). O pipeline
`.github/workflows/deploy-azure.yml` builda o frontend a partir do código
(nunca do `wwwroot/` commitado), aplica as migrations pendentes e publica no
App Service, só depois que o workflow `CI` passa na `main`.

Esse é o alvo de deploy escolhido para este projeto: **só a API** (ela serve
a SPA web e os endpoints); o `gateway/` fica restrito ao fluxo de
desenvolvimento local e não é implantado na Azure. Se o app mobile for
usado em produção, aponte `EXPO_PUBLIC_API_URL` (em `mobile/eas.json`)
direto para a URL do App Service — ver passo 5.

## 1. Provisionar a infraestrutura (uma vez)

Pré-requisito: Azure CLI instalado e logado (`az login`), com a subscription
e o resource group já criados.

```bash
az deployment group create \
  --resource-group <seu-resource-group> \
  --template-file infra/main.bicep \
  --parameters appName=plataforma-ensino \
               sqlAdminLogin=appadmin \
               sqlAdminPassword='<senha-forte-gerada-agora>' \
               jwtKey='<chave-aleatoria-com-32-ou-mais-caracteres>' \
               corsAllowedOrigin='https://app-plataforma-ensino.azurewebsites.net'
```

`appName` precisa ser único o bastante para gerar um nome de App Service e
de Storage Account globalmente únicos — se o deployment falhar por nome
duplicado, mude `appName` e rode de novo. Guarde a senha do SQL e a chave
JWT usadas aqui (não ficam em lugar nenhum além do que você guardar).

Anote os outputs do comando (`webAppName`, `webAppDefaultHostName`,
`sqlServerFqdn`, `storageAccountName`) — são usados nos próximos passos.

## 2. Criar a identidade de deploy do GitHub Actions (uma vez)

O workflow usa login OIDC (sem secret de senha de longa duração). Crie um
app registration e vincule a uma federated credential do seu repositório:

```bash
az ad app create --display-name "github-deploy-plataforma-ensino"
# anote o appId retornado -> é o AZURE_CLIENT_ID

az ad sp create-for-rbac --id <appId-do-passo-anterior> --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<seu-resource-group>

az ad app federated-credential create --id <appId> --parameters '{
  "name": "github-main-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<seu-usuario-ou-org>/<seu-repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

## 3. Configurar o GitHub (uma vez)

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Nome | Valor |
|---|---|
| `AZURE_CLIENT_ID` | `appId` do passo 2 |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |
| `AZURE_SQL_CONNECTION_STRING` | `Server=tcp:<sqlServerFqdn>,1433;Database=PlataformaEnsinoDB;User ID=<sqlAdminLogin>;Password=<sqlAdminPassword>;Encrypt=True;TrustServerCertificate=False;` |

**Variables** (mesma tela, aba "Variables"):

| Nome | Valor |
|---|---|
| `AZURE_RESOURCE_GROUP` | o resource group usado no passo 1 |
| `AZURE_SQL_SERVER_NAME` | `sql-plataforma-ensino` (sem o `.database.windows.net`) |
| `AZURE_WEBAPP_NAME` | `webAppName` do passo 1 (`app-plataforma-ensino`) |

Opcional, mas recomendado: crie um Environment chamado `production`
(Settings → Environments) com uma regra de aprovação manual — o workflow já
referencia `environment: production`, então isso passa a exigir um clique
de aprovação antes de cada deploy real.

## 4. Deploy

Qualquer push na `main` que passe no workflow `CI` dispara o deploy
automaticamente. Pra forçar um deploy manual (ex.: redisparar sem commit
novo), use a aba Actions → "Deploy to Azure" → "Run workflow".

## 5. Depois do primeiro deploy

- A API fica em `https://<webAppDefaultHostName>`. Se o domínio final for
  diferente do que foi usado em `corsAllowedOrigin` no passo 1, atualize o
  App Setting `Cors__AllowedOrigins__0`/`Frontend__BaseUrl` direto no Portal
  (ou rode o `az deployment group create` de novo com o valor certo).
- Mobile: edite `mobile/eas.json`, no profile `production`, o valor de
  `EXPO_PUBLIC_API_URL` para `https://<webAppDefaultHostName>` antes de
  gerar o build com EAS (ver seção correspondente no README principal).
- **Não habilite `RunMigrationsOnStartup`** neste App Service — as
  migrations já são aplicadas pelo passo dedicado do workflow. Rodar as
  duas coisas junto é redundante e dobra o tempo de boot.

## O que este setup não cobre (de propósito)

- **Key Vault**: os segredos (chave JWT, senha do SQL, connection string do
  Storage) ficam como App Settings do App Service — já são criptografados
  em repouso pela Azure e não aparecem em lugar nenhum do código-fonte, mas
  não têm rotação automática nem audit log dedicado. Para esse nível de
  controle, mover `Jwt__Key`/connection strings para o Key Vault e
  referenciá-los via `@Microsoft.KeyVault(...)` nos App Settings é o próximo
  passo natural, não incluído aqui para manter a infra inicial simples.
- **Application Insights / observabilidade**: não provisionado; o `/health`
  já exposto pela API cobre um health probe básico do App Service.

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

### Geração de avaliações por IA (opcional)

`iaProvedor` (`Anthropic` ou `Gemini`, default `Anthropic`), `iaApiKey` e
`geminiApiKey` são parâmetros opcionais (default vazio) — sem eles, a
geração de avaliações por IA fica indisponível de forma graciosa (o app
sobe normalmente, só essa feature fica fora do ar). Se quiser habilitar,
adicione ao comando acima, ex.: `iaApiKey='<chave-anthropic>'`.

**Atenção**: `appSettings` é substituído por inteiro a cada `az deployment
group create` desse template — rodar o comando de novo sem reinformar
`iaApiKey`/`geminiApiKey` apaga qualquer chave setada manualmente depois
via `az webapp config appsettings set` (mesma pegadinha já documentada
para a connection string do SQL). Pra trocar só a chave de IA sem
reprovisionar o resto:
```bash
az webapp config appsettings set --resource-group <seu-resource-group> \
  --name <webAppName> --settings IA__ApiKey='<chave-anthropic>'
```

Anote os outputs do comando (`webAppName`, `webAppDefaultHostName`,
`sqlServerFqdn`, `storageAccountName`) — são usados nos próximos passos.

## 2. Autenticação do GitHub Actions: publish profile

O desenho original usava login OIDC (Service Principal + federated
credential, sem secret de senha de longa duração). **Isso exige permissão
para criar App Registrations no tenant do Azure AD** — em tenants
institucionais (ex.: UNIP, usado neste projeto) contas de estudante
normalmente não têm essa permissão (`az ad app create` falha com
"Insufficient privileges to complete the operation"), e não há como um
usuário comum contornar isso sem o TI do tenant liberar.

Alternativa usada aqui, que não precisa de nenhuma permissão de Azure AD —
só do seu próprio acesso (Contributor) ao recurso: **publish profile**, a
credencial própria do App Service (usuário/senha do Kudu/SCM):

```bash
az webapp deployment list-publishing-profiles \
  --name <webAppName-do-passo-1> \
  --resource-group <seu-resource-group> \
  --xml
```

Guarde a saída XML inteira — é o valor do secret `AZURE_WEBAPP_PUBLISH_PROFILE`
no passo 3.

**Trade-off aceito**: sem login no `az` CLI dentro do runner, o workflow não
abre/fecha mais o firewall do Azure SQL nem aplica migrations sozinho. Depois
de qualquer alteração de schema (nova migration), rode manualmente contra o
banco de produção:

```bash
az sql server firewall-rule create \
  --resource-group <seu-resource-group> --server <sqlServerName> \
  --name temp-meu-ip --start-ip-address <seu-ip-publico> --end-ip-address <seu-ip-publico>

dotnet ef database update --project "Sistema Academico Integrado.csproj" \
  --connection "Server=tcp:<sqlServerFqdn>,1433;Database=PlataformaEnsinoDB;User ID=<sqlAdminLogin>;Password=<sqlAdminPassword>;Encrypt=True;TrustServerCertificate=False;"

az sql server firewall-rule delete \
  --resource-group <seu-resource-group> --server <sqlServerName> --name temp-meu-ip
```

Se o tenant permitir App Registrations no seu caso, o fluxo OIDC original
(Service Principal + federated credential + `azure/login` no workflow) é a
opção mais robusta — preferível caso disponível.

## 3. Configurar o GitHub (uma vez)

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Nome | Valor |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | saída XML do comando do passo 2 |

**Variables** (mesma tela, aba "Variables"):

| Nome | Valor |
|---|---|
| `AZURE_WEBAPP_NAME` | `webAppName` do passo 1 |

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

// Infraestrutura minima para rodar a PlataformaEnsino API na Azure:
// App Service (deploy de codigo, sem container), Azure SQL (server + database)
// e uma Storage Account com o container de blobs usado pelos uploads
// (ver AzureStorage:ConnectionString em appsettings.example.json e
// Services/ArmazenamentoArquivoBlobService.cs).
//
// Uso (depois de `az login` e `az account set --subscription <id>`):
//
//   az group create --name rg-plataforma-ensino --location brazilsouth
//   az deployment group create \
//     --resource-group rg-plataforma-ensino \
//     --template-file infra/main.bicep \
//     --parameters appName=plataforma-ensino sqlAdminLogin=appadmin \
//                  sqlAdminPassword='<senha-forte>' jwtKey='<chave-com-32+caracteres>' \
//                  corsAllowedOrigin='https://plataforma-ensino.azurewebsites.net'
//
// Ver infra/README.md para o passo a passo completo (inclusive o que nao
// cabe em IaC: criar o service principal de deploy do GitHub Actions).

@description('Prefixo usado para nomear os recursos (vira parte do nome do App Service, entao precisa ser globalmente unico).')
param appName string

@description('Regiao Azure dos recursos.')
param location string = resourceGroup().location

@description('Tier do App Service Plan. B1 e o menor tier pago com "Always On"; F1 (free) nao suporta Always On e dorme sem trafego.')
param appServicePlanSku string = 'B1'

@description('Tier do Azure SQL Database.')
param sqlDatabaseSku string = 'Basic'

@description('Login do administrador do Azure SQL Server.')
param sqlAdminLogin string

@secure()
@description('Senha do administrador do Azure SQL Server.')
param sqlAdminPassword string

@secure()
@description('Chave de assinatura JWT (minimo 32 caracteres) - gere uma vez e reaproveite entre deploys, trocar invalida sessoes ativas.')
param jwtKey string

@description('Origem (https://dominio) de onde o frontend/app mobile vai chamar a API - usado em Cors:AllowedOrigins e Frontend:BaseUrl.')
param corsAllowedOrigin string

var appServicePlanName = 'plan-${appName}'
var webAppName = 'app-${appName}'
var sqlServerName = 'sql-${appName}'
var sqlDatabaseName = 'PlataformaEnsinoDB'
var storageAccountName = replace('st${appName}', '-', '')
var uploadsContainerName = 'uploads'

resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: sqlDatabaseSku
  }
}

// Valor magico que o Azure SQL reconhece como "permitir servicos Azure"
// (App Service incluso) - nao e um IP real.
resource sqlFirewallAllowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: uploadsContainerName
  properties: {
    publicAccess: 'None'
  }
}

var sqlConnectionString = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${sqlDatabaseName};User ID=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

resource webApp 'Microsoft.Web/sites@2024-04-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: appServicePlanSku != 'F1'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
        { name: 'Jwt__Key', value: jwtKey }
        { name: 'Jwt__Issuer', value: 'PlataformaEnsino.API' }
        { name: 'Jwt__Audience', value: 'PlataformaEnsino.Frontend' }
        { name: 'Cors__AllowedOrigins__0', value: corsAllowedOrigin }
        { name: 'Frontend__BaseUrl', value: corsAllowedOrigin }
        // Setado como App Setting comum (convencao __  -> :), e nao como
        // "Connection String" do App Service: esse recurso injeta a env var
        // com prefixo por tipo (SQLAZURECONNSTR_...) que o provider padrao
        // de configuracao do ASP.NET Core nao mapeia pra ConnectionStrings:*
        // sem configuracao extra - mais simples manter um unico mecanismo.
        { name: 'ConnectionStrings__DefaultConnection', value: sqlConnectionString }
        { name: 'AzureStorage__ConnectionString', value: storageConnectionString }
        { name: 'AzureStorage__ContainerName', value: uploadsContainerName }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
      ]
    }
  }
}

output webAppName string = webApp.name
output webAppDefaultHostName string = webApp.properties.defaultHostName
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabaseName
output storageAccountName string = storageAccount.name

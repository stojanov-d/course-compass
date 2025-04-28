@description('Base name for the App Service Plan')
param functionPlanBaseName string

@description('Base name for the Function App')
param functionAppBaseName string

@description('Azure region for all resources')
param location string

@description('Storage account name for Function App')
param storageAccountName string

@description('Name of the Key Vault')
param keyVaultName string

@description('Direct storage connection string')
param storageConnectionString string = ''

@description('Whether to use Key Vault for connection string')
param useKeyVaultReference bool = false

@description('Managed identity type for Key Vault reference')
@allowed(['SystemAssigned', 'UserAssigned'])
param keyVaultReferenceIdentity string = 'SystemAssigned'

@description('Runtime stack for Function App')
param linuxFxVersion string = 'NODE|20'

@description('Creates the App Service Plan (Consumption)')
resource functionPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: functionPlanBaseName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true // Required for Linux
  }
}

@description('Creates the Function App')
resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppBaseName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: keyVaultReferenceIdentity
  }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: useKeyVaultReference
            ? '@Microsoft.KeyVault(SecretUri=https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/StorageConnectionString/)'
            : storageConnectionString
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: useKeyVaultReference
            ? '@Microsoft.KeyVault(SecretUri=https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/StorageConnectionString/)'
            : storageConnectionString
        }
        { name: 'WEBSITE_CONTENTSHARE', value: toLower(functionAppBaseName) }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'StorageAccountName', value: storageAccountName }
      ]
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
    clientAffinityEnabled: false
  }
}

output name string = functionApp.name
output id string = functionApp.id
output defaultHostName string = functionApp.properties.defaultHostName
output principalId string = functionApp.identity.principalId

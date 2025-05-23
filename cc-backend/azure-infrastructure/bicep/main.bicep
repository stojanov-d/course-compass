@description('Base name for all resources')
param baseName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, prod)')
@allowed([
  'dev'
  'prod'
])
param environment string = 'dev'

@description('Object ID of user or service principal to grant Key Vault admin access')
param administratorObjectId string = ''

var storageAccountName = '${replace(toLower(baseName), '-', '')}${environment}'
var functionAppName = '${toLower(baseName)}-func-${environment}'
var functionPlanName = '${toLower(baseName)}-plan-${environment}'
var keyVaultName = '${toLower(baseName)}-kv2-${environment}'

module storage './modules/storageAccount.bicep' = {
  name: 'storageDeployment'
  params: {
    storageAccountName: storageAccountName
    location: location
  }
}

module keyVault './modules/keyVault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    keyVaultName: keyVaultName
    location: location
    tenantId: subscription().tenantId
    administratorObjectId: administratorObjectId
  }
}

module storageConnectionStringSecret './modules/keyVaultSecret.bicep' = {
  name: 'storageSecretDeployment'
  params: {
    keyVaultName: keyVault.outputs.name
    secretName: 'StorageConnectionString'
    secretValue: 'DefaultEndpointsProtocol=https;AccountName=${storage.outputs.storageAccountName};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${listKeys(resourceId('Microsoft.Storage/storageAccounts', storageAccountName), '2022-09-01').keys[0].value}'
  }
}

module functionApp './modules/functionApp.bicep' = {
  name: 'functionAppDeployment'
  params: {
    functionPlanBaseName: functionPlanName
    functionAppBaseName: functionAppName
    location: location
    storageAccountName: storage.outputs.storageAccountName
    keyVaultName: keyVaultName
    keyVaultReferenceIdentity: 'SystemAssigned'
    linuxFxVersion: 'NODE|20'
    useKeyVaultReference: true
    storageConnectionString: 'DefaultEndpointsProtocol=https;AccountName=${storage.outputs.storageAccountName};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${listKeys(resourceId('Microsoft.Storage/storageAccounts', storageAccountName), '2022-09-01').keys[0].value}'
  }
  dependsOn: [
    storageConnectionStringSecret
  ]
}

module storageTable './modules/storageTable.bicep' = {
  name: 'tablesDeployment'
  params: {
    storageAccountName: storage.outputs.storageAccountName
  }
}

module keyVaultAccess './modules/keyVaultAccess.bicep' = {
  name: 'keyVaultAccessDeployment'
  params: {
    keyVaultName: keyVault.outputs.name
    principalId: functionApp.outputs.principalId
  }
}

output functionAppName string = functionApp.outputs.name
output functionAppHostName string = functionApp.outputs.defaultHostName
output storageAccountName string = storage.outputs.storageAccountName
output keyVaultName string = keyVault.outputs.name

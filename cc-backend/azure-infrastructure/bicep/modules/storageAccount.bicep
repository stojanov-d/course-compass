@description('Name for the storage account')
param storageAccountName string

@description('Azure region for the storage account')
param location string

@description('Storage account SKU')
param storageAccountType string = 'Standard_LRS'

@description('Creates the Azure Storage Account')
resource storageAccount 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: storageAccountType
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id

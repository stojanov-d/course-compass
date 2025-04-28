@description('Name of the storage account')
param storageAccountName string

@description('Name of the table to create')
param tableName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2024-01-01' existing = {
  name: storageAccountName
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2024-01-01' = {
  name: 'default'
  parent: storageAccount
}

resource table 'Microsoft.Storage/storageAccounts/tableServices/tables@2024-01-01' = {
  name: tableName
  parent: tableService
}

output tableName string = table.name

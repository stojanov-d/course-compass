@description('Name of the storage account')
param storageAccountName string

@description('List of table names to create')
param tableNames array = [
  'users'
  'courses'
  'professors'
  'reviews'
  'comments'
]

resource storageAccount 'Microsoft.Storage/storageAccounts@2024-01-01' existing = {
  name: storageAccountName
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2024-01-01' = {
  name: 'default'
  parent: storageAccount
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2024-01-01' = [
  for tableName in tableNames: {
    name: tableName
    parent: tableService
  }
]

output tableNames array = [for (tableName, i) in tableNames: tables[i].name]

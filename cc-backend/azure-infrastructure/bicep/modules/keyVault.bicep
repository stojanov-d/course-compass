@description('Name for the Key Vault')
param keyVaultName string

@description('Azure region for the Key Vault')
param location string

@description('Azure AD tenant ID')
param tenantId string

@description('Object ID of user or service principal to grant admin access to Key Vault')
param administratorObjectId string = ''

@description('Soft delete retention period in days')
@minValue(7)
@maxValue(90)
param softDeleteRetentionInDays int = 7
resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: softDeleteRetentionInDays
  }
}

resource keyVaultAdminRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(administratorObjectId)) {
  name: guid(keyVault.id, administratorObjectId, 'KeyVaultAdministrator')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '00482a5a-887f-4fb3-b363-3b7fe8e74483'
    ) // Key Vault Administrator
    principalId: administratorObjectId
    principalType: 'User'
  }
}

output name string = keyVault.name
output id string = keyVault.id

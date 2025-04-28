@description('Name of the Key Vault')
param keyVaultName string

@description('Name of the secret')
param secretName string

@description('Value of the secret')
@secure()
param secretValue string

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' existing = {
  name: keyVaultName
}

resource secret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: secretName
  properties: {
    value: secretValue
  }
}

output secretUri string = secret.properties.secretUri

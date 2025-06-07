global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DISCORD_CLIENT_ID = 'test-discord-client-id';
process.env.DISCORD_CLIENT_SECRET = 'test-discord-client-secret';
process.env.DISCORD_REDIRECT_URI = 'http://localhost:7071/api/auth/callback';

jest.mock('@azure/data-tables', () => {
  const mockTableClient = {
    createEntity: jest.fn().mockResolvedValue({}),
    getEntity: jest.fn(),
    updateEntity: jest.fn().mockResolvedValue({}),
    deleteEntity: jest.fn().mockResolvedValue({}),
    listEntities: jest.fn(),
  };

  const mockTableServiceClient = {
    createTable: jest.fn().mockResolvedValue({}),
    deleteTable: jest.fn().mockResolvedValue({}),
  };

  return {
    TableClient: {
      fromConnectionString: jest.fn().mockReturnValue(mockTableClient),
    },
    TableServiceClient: {
      fromConnectionString: jest.fn().mockReturnValue(mockTableServiceClient),
    },
  };
});

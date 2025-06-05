export const AUTH_CONFIG = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '',
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'http://localhost:7071/api/auth/callback',
  JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-key',
  JWT_EXPIRES_IN: '7d',
  
  DISCORD_AUTH_URL: 'https://discord.com/api/oauth2/authorize',
  DISCORD_TOKEN_URL: 'https://discord.com/api/oauth2/token',
  DISCORD_USER_URL: 'https://discord.com/api/users/@me',
  
  DISCORD_SCOPES: ['identify', 'email'].join(' '),
} as const;
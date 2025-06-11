import {
  DiscordAuthService,
  DiscordUser,
  DiscordTokenResponse,
} from '../../services/DiscordAuthService';
import { AUTH_CONFIG } from '../../config/auth';

global.fetch = jest.fn();

describe('DiscordAuthService', () => {
  let discordService: DiscordAuthService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    discordService = new DiscordAuthService();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateAuthUrl', () => {
    it('should generate correct Discord OAuth URL without state', () => {
      const authUrl = discordService.generateAuthUrl();

      expect(authUrl).toContain(AUTH_CONFIG.DISCORD_AUTH_URL);
      expect(authUrl).toContain(`client_id=${AUTH_CONFIG.DISCORD_CLIENT_ID}`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(AUTH_CONFIG.DISCORD_REDIRECT_URI)}`
      );
      // URLSearchParams encodes spaces as + instead of %20
      expect(authUrl).toContain(`scope=identify+email`);
      expect(authUrl).toContain('response_type=code');
    });

    it('should generate correct Discord OAuth URL with state', () => {
      const state = 'test-state-123';
      const authUrl = discordService.generateAuthUrl(state);

      expect(authUrl).toContain(`state=${state}`);
    });

    it('should include all required OAuth parameters', () => {
      const authUrl = discordService.generateAuthUrl();
      const url = new URL(authUrl);

      expect(url.searchParams.get('client_id')).toBe(
        AUTH_CONFIG.DISCORD_CLIENT_ID
      );
      expect(url.searchParams.get('redirect_uri')).toBe(
        AUTH_CONFIG.DISCORD_REDIRECT_URI
      );
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe(AUTH_CONFIG.DISCORD_SCOPES);
    });
  });

  describe('exchangeCodeForToken', () => {
    const mockTokenResponse: DiscordTokenResponse = {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      scope: 'identify email',
    };

    it('should exchange code for token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      const result = await discordService.exchangeCodeForToken('test-code');

      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        AUTH_CONFIG.DISCORD_TOKEN_URL,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('grant_type=authorization_code'),
        })
      );
    });

    it('should include correct form data in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      } as any);

      await discordService.exchangeCodeForToken('test-code');

      const call = mockFetch.mock.calls[0];
      const body = call[1]?.body as string;

      expect(body).toContain('client_id=' + AUTH_CONFIG.DISCORD_CLIENT_ID);
      expect(body).toContain(
        'client_secret=' + AUTH_CONFIG.DISCORD_CLIENT_SECRET
      );
      expect(body).toContain('code=test-code');
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain(
        'redirect_uri=' + encodeURIComponent(AUTH_CONFIG.DISCORD_REDIRECT_URI)
      );
    });
    it('should throw error when Discord API returns error', async () => {
      const errorText = 'Invalid authorization code';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue(errorText),
      } as any);

      await expect(
        discordService.exchangeCodeForToken('invalid-code')
      ).rejects.toThrow(`Discord token exchange failed: ${errorText}`);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        discordService.exchangeCodeForToken('test-code')
      ).rejects.toThrow('Network error');
    });
  });

  describe('getDiscordUser', () => {
    const mockDiscordUser: DiscordUser = {
      id: '123456789',
      username: 'testuser',
      email: 'test@example.com',
      avatar: 'avatar123',
      discriminator: '1234',
      global_name: 'Test User',
    };

    it('should fetch Discord user successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDiscordUser),
      } as any);

      const result = await discordService.getDiscordUser('valid-access-token');

      expect(result).toEqual(mockDiscordUser);
      expect(mockFetch).toHaveBeenCalledWith(AUTH_CONFIG.DISCORD_USER_URL, {
        headers: {
          Authorization: 'Bearer valid-access-token',
        },
      });
    });

    it('should throw error when Discord API returns error', async () => {
      const errorText = 'Invalid access token';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue(errorText),
      } as any);

      await expect(
        discordService.getDiscordUser('invalid-token')
      ).rejects.toThrow(`Failed to get Discord user: ${errorText}`);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        discordService.getDiscordUser('valid-token')
      ).rejects.toThrow('Network error');
    });

    it('should use correct authorization header format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDiscordUser),
      } as any);

      await discordService.getDiscordUser('test-token-123');

      const call = mockFetch.mock.calls[0];
      const headers = call[1]?.headers as Record<string, string>;

      expect(headers.Authorization).toBe('Bearer test-token-123');
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON responses in exchangeCodeForToken', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      await expect(
        discordService.exchangeCodeForToken('test-code')
      ).rejects.toThrow('Invalid JSON');
    });

    it('should handle malformed JSON responses in getDiscordUser', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      await expect(discordService.getDiscordUser('test-token')).rejects.toThrow(
        'Invalid JSON'
      );
    });
  });

  describe('configuration validation', () => {
    it('should use correct Discord API URLs', () => {
      const authUrl = discordService.generateAuthUrl();

      expect(authUrl).toContain('https://discord.com/api/oauth2/authorize');
    });

    it('should include required scopes', () => {
      const authUrl = discordService.generateAuthUrl();

      expect(authUrl).toContain('identify');
      expect(authUrl).toContain('email');
    });
  });
});

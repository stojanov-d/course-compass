import { AUTH_CONFIG } from '../config/auth';

export interface DiscordUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export class DiscordAuthService {
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: AUTH_CONFIG.DISCORD_CLIENT_ID,
      redirect_uri: AUTH_CONFIG.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: AUTH_CONFIG.DISCORD_SCOPES,
    });

    if (state) {
      params.append('state', state);
    }

    return `${AUTH_CONFIG.DISCORD_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: AUTH_CONFIG.DISCORD_CLIENT_ID,
      client_secret: AUTH_CONFIG.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: AUTH_CONFIG.DISCORD_REDIRECT_URI,
    });

    const response = await fetch(AUTH_CONFIG.DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord token exchange failed: ${errorText}`);
    }

    return await response.json();
  }

  async getDiscordUser(accessToken: string): Promise<DiscordUser> {
    const response = await fetch(AUTH_CONFIG.DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Discord user: ${errorText}`);
    }

    return await response.json();
  }

  async refreshDiscordToken(
    refreshToken: string
  ): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: AUTH_CONFIG.DISCORD_CLIENT_ID,
      client_secret: AUTH_CONFIG.DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(AUTH_CONFIG.DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord token refresh failed: ${errorText}`);
    }

    return await response.json();
  }
}

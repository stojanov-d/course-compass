import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { DiscordAuthService } from '../../services/DiscordAuthService';
import { UserService } from '../../services/UserService';
import { JwtService } from '../../services/JwtService';
import { UserRole } from '../../entities/UserEntity';

export async function AuthCallback(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Processing Discord OAuth2 callback');

  try {
    const code = request.query.get('code');

    if (!code) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing authorization code',
        },
      };
    }

    const discordService = new DiscordAuthService();
    const userService = new UserService();
    const jwtService = new JwtService();

    context.log('Exchanging code for Discord token');
    const tokenResponse = await discordService.exchangeCodeForToken(code);

    context.log('Fetching Discord user information');
    const discordUser = await discordService.getDiscordUser(
      tokenResponse.access_token
    );

    context.log('Creating/updating user in database');
    const user = await userService.createOrUpdateUser(discordUser);

    context.log('Storing Discord refresh token');
    await userService.updateRefreshToken(
      user.userId,
      tokenResponse.refresh_token
    );

    context.log('Generating JWT token');
    const jwtToken = jwtService.generateToken({
      userId: user.userId,
      discordId: user.discordId,
      email: user.email,
      role: user.role,
    });

    // Calculate expiration time (30 days from now)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    return {
      status: 200,
      jsonBody: {
        success: true,
        token: jwtToken,
        expiresAt: expiresAt,
        user: {
          id: user.userId,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isAdmin: user.role === UserRole.ADMIN,
        },
      },
    };
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Authentication failed',
      },
    };
  }
}

app.http('AuthCallback', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/callback',
  handler: AuthCallback,
});

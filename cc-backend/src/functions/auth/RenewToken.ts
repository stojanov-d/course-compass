import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { UserService } from '../../services/UserService';
import { JwtService } from '../../services/JwtService';
import { DiscordAuthService } from '../../services/DiscordAuthService';
import { UserRole } from '../../entities/UserEntity';

export async function RenewToken(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Processing token renewal request');

  try {
    const body = (await request.json()) as { userId: string };
    const { userId } = body;

    if (!userId) {
      return {
        status: 400,
        jsonBody: {
          error: 'User ID is required',
        },
      };
    }

    const userService = new UserService();
    const user = await userService.getUserById(userId);

    if (!user || !user.isActive) {
      return {
        status: 401,
        jsonBody: {
          error: 'User not found or inactive',
        },
      };
    }

    if (!user.refreshToken || !user.refreshTokenExpiresAt) {
      return {
        status: 401,
        jsonBody: {
          error: 'No valid refresh token available. Please re-authenticate.',
        },
      };
    }

    // Check if Discord refresh token is still valid
    if (user.refreshTokenExpiresAt < new Date()) {
      return {
        status: 401,
        jsonBody: {
          error: 'Refresh token expired. Please re-authenticate.',
        },
      };
    }

    const discordService = new DiscordAuthService();
    const jwtService = new JwtService();

    context.log('Refreshing Discord token');
    let newTokenResponse;
    try {
      newTokenResponse = await discordService.refreshDiscordToken(
        user.refreshToken
      );
    } catch (error: any) {
      context.log('Discord token refresh failed:', error.message);

      // If Discord refresh token is invalid, clear it and require re-authentication
      if (error.message.includes('invalid_grant')) {
        context.log('Discord refresh token expired, clearing stored token');
        await userService.updateRefreshToken(user.userId, ''); // Clear the invalid token

        return {
          status: 401,
          jsonBody: {
            error: 'Discord refresh token expired. Please re-authenticate.',
            requiresReauth: true,
          },
        };
      }

      // For other errors, rethrow
      throw error;
    }

    context.log('Updating stored refresh token');
    await userService.updateRefreshToken(
      user.userId,
      newTokenResponse.refresh_token
    );

    context.log('Generating new JWT token');
    const newJwtToken = jwtService.generateToken({
      userId: user.userId,
      discordId: user.discordId,
      email: user.email,
      role: user.role,
    });

    // Calculate new expiration time (30 days from now)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    return {
      status: 200,
      jsonBody: {
        success: true,
        token: newJwtToken,
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
    context.log('Token renewal error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Token renewal failed',
      },
    };
  }
}

app.http('RenewToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/renew',
  handler: RenewToken,
});

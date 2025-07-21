import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { UserService } from '../../services/UserService';
import { JwtService } from '../../services/JwtService';
import { UserRole } from '../../entities/UserEntity';

export async function RefreshToken(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as { refreshToken: string };
    const { refreshToken } = body;

    if (!refreshToken) {
      return {
        status: 400,
        jsonBody: { error: 'Refresh token is required' },
      };
    }

    const userService = new UserService();
    const user = await userService.getUserByRefreshToken(refreshToken);

    if (!user || !user.isActive) {
      return {
        status: 401,
        jsonBody: { error: 'Invalid or expired refresh token' },
      };
    }

    const jwtService = new JwtService();
    const newJwtToken = jwtService.generateToken({
      userId: user.userId,
      discordId: user.discordId,
      email: user.email,
      role: user.role,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        token: newJwtToken,
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
    console.error('Refresh token error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('RefreshToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh',
  handler: RefreshToken,
});

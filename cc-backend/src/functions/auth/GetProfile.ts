import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requireAuth } from '../../middleware/authMiddleware';
import { UserService } from '../../services/UserService';
import { UserRole } from '../../entities/UserEntity';

export async function GetProfile(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const authResult = await requireAuth(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 401,
      jsonBody: {
        error: authResult.error || 'Unauthorized',
      },
    };
  }

  try {
    const userService = new UserService();
    const user = await userService.getUserById(authResult.user.userId);

    if (!user) {
      return {
        status: 404,
        jsonBody: {
          error: 'User not found',
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        id: user.userId,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isAdmin: user.role === UserRole.ADMIN,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    };
  } catch (error: any) {
    console.error('Get profile error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

app.http('GetProfile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/profile',
  handler: GetProfile,
});

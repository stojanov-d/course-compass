import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { requireAdmin } from '../middleware/authMiddleware';
import { UserService } from '../services/UserService';
import { UserRole } from '../entities/UserEntity';

export async function GetAllUsers(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const userService = new UserService();
    const searchTerm = request.query.get('search') || '';

    const users = await userService.searchUsers(searchTerm);

    const sanitizedUsers = users.map((user) => ({
      id: user.userId,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      avatarUrl: user.avatarUrl,
    }));

    return {
      status: 200,
      jsonBody: {
        users: sanitizedUsers,
        total: sanitizedUsers.length,
        adminId: authResult.user.userId,
      },
    };
  } catch (error: any) {
    context.error('Get users error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function UpdateUserRole(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const userId = request.params.userId;
    const body = (await request.json()) as { role: UserRole };

    if (!userId) {
      return {
        status: 400,
        jsonBody: {
          error: 'User ID is required',
        },
      };
    }

    if (!body.role || !Object.values(UserRole).includes(body.role)) {
      return {
        status: 400,
        jsonBody: {
          error: 'Valid role is required',
          allowedRoles: Object.values(UserRole),
        },
      };
    }

    // Prevent admins from removing their own admin role
    if (userId === authResult.user.userId && body.role !== UserRole.ADMIN) {
      return {
        status: 400,
        jsonBody: {
          error: 'Cannot remove admin role from yourself',
        },
      };
    }

    const userService = new UserService();
    const updatedUser = await userService.updateUserRole(userId, body.role);

    if (!updatedUser) {
      return {
        status: 404,
        jsonBody: {
          error: 'User not found',
        },
      };
    }

    context.log(
      `Admin ${authResult.user.userId} updated user ${userId} role to ${body.role}`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: `User role updated to ${body.role}`,
        user: {
          id: updatedUser.userId,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
        },
      },
    };
  } catch (error: any) {
    context.error('Update user role error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function ToggleUserStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const userId = request.params.userId;

    if (!userId) {
      return {
        status: 400,
        jsonBody: {
          error: 'User ID is required',
        },
      };
    }

    // Prevent admins from deactivating themselves
    if (userId === authResult.user.userId) {
      return {
        status: 400,
        jsonBody: {
          error: 'Cannot deactivate yourself',
        },
      };
    }

    const userService = new UserService();
    const updatedUser = await userService.toggleUserActiveStatus(userId);

    if (!updatedUser) {
      return {
        status: 404,
        jsonBody: {
          error: 'User not found',
        },
      };
    }

    const action = updatedUser.isActive ? 'activated' : 'deactivated';
    context.log(`Admin ${authResult.user.userId} ${action} user ${userId}`);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: `User ${action} successfully`,
        user: {
          id: updatedUser.userId,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
        },
      },
    };
  } catch (error: any) {
    context.error('Toggle user status error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function GetUserDetails(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const userId = request.params.userId;

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
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (error: any) {
    context.error('Get user details error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

app.http('GetAllUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user-management/users',
  handler: GetAllUsers,
});

app.http('UpdateUserRole', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'user-management/users/{userId}/role',
  handler: UpdateUserRole,
});

app.http('ToggleUserStatus', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'user-management/users/{userId}/status',
  handler: ToggleUserStatus,
});

app.http('GetUserDetails', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user-management/users/{userId}',
  handler: GetUserDetails,
});

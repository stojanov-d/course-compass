import { HttpRequest } from '@azure/functions';
import { JwtService } from '../services/JwtService';
import { UserService } from '../services/UserService';

export interface AuthUser {
  userId: string;
  discordId: string;
  email: string;
}

export interface AuthResult {
  isValid: boolean;
  error?: string;
  user?: AuthUser;
}

export async function requireAuth(request: HttpRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Missing or invalid authorization header',
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const jwtService = new JwtService();
    const payload = jwtService.verifyToken(token);

    if (!payload) {
      return { isValid: false, error: 'Invalid or expired token' };
    }

    const userService = new UserService();
    const user = await userService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      return { isValid: false, error: 'User not found or inactive' };
    }

    return {
      isValid: true,
      user: {
        userId: payload.userId,
        discordId: payload.discordId,
        email: payload.email,
      },
    };
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return { isValid: false, error: 'Authentication failed' };
  }
}

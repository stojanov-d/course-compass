import { HttpRequest } from '@azure/functions';
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireAnyRole,
} from '../../middleware/authMiddleware';
import { UserRole } from '../../entities/UserEntity';
import { JwtService } from '../../services/JwtService';
import { UserService } from '../../services/UserService';

// Mock the services
jest.mock('../../services/JwtService');
jest.mock('../../services/UserService');

describe('AuthMiddleware', () => {
  let mockJwtService: jest.Mocked<JwtService>;
  let mockUserService: jest.Mocked<UserService>;

  const mockUser = {
    userId: 'user123',
    discordId: 'discord123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayload = {
    userId: 'user123',
    discordId: 'discord123',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const createMockRequest = (authHeader?: string | null): HttpRequest => {
    const mockHeaders = {
      get: jest.fn().mockImplementation((name: string) => {
        if (name === 'authorization') {
          return authHeader;
        }
        return null;
      }),
    };

    return {
      headers: mockHeaders,
    } as unknown as HttpRequest;
  };

  beforeEach(() => {
    mockJwtService = new JwtService() as jest.Mocked<JwtService>;
    mockUserService = new UserService() as jest.Mocked<UserService>;

    (JwtService as jest.Mock).mockImplementation(() => mockJwtService);
    (UserService as jest.Mock).mockImplementation(() => mockUserService);

    mockJwtService.verifyToken.mockReturnValue(mockPayload);
    mockUserService.getUserById.mockResolvedValue(mockUser as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return valid result for valid token and active user', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual({
        userId: mockPayload.userId,
        discordId: mockPayload.discordId,
        email: mockPayload.email,
        role: mockUser.role,
      });
      expect(mockJwtService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockUserService.getUserById).toHaveBeenCalledWith(
        mockPayload.userId
      );
    });

    it('should return invalid result when authorization header is missing', async () => {
      const mockRequest = createMockRequest(null);

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing or invalid authorization header');
      expect(result.user).toBeUndefined();
    });

    it('should return invalid result when authorization header is malformed', async () => {
      const mockRequest = createMockRequest('InvalidHeader token');

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing or invalid authorization header');
    });

    it('should return invalid result when token is invalid', async () => {
      const mockRequest = createMockRequest('Bearer invalid-token');
      mockJwtService.verifyToken.mockReturnValue(null);

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should return invalid result when user is not found', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      mockUserService.getUserById.mockResolvedValue(null);

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('User not found or inactive');
    });

    it('should return invalid result when user is inactive', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserService.getUserById.mockResolvedValue(inactiveUser as any);

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('User not found or inactive');
    });

    it('should handle JWT service errors gracefully', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      mockJwtService.verifyToken.mockImplementation(() => {
        throw new Error('JWT error');
      });

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle user service errors gracefully', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      mockUserService.getUserById.mockRejectedValue(
        new Error('Database error')
      );

      const result = await requireAuth(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('requireRole', () => {
    it('should return valid result when user has required role', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUserService.getUserById.mockResolvedValue(adminUser as any);
      const adminPayload = { ...mockPayload, role: UserRole.ADMIN };
      mockJwtService.verifyToken.mockReturnValue(adminPayload);

      const result = await requireRole(mockRequest, UserRole.ADMIN);

      expect(result.isValid).toBe(true);
      expect(result.user?.role).toBe(UserRole.ADMIN);
    });

    it('should return invalid result when user does not have required role', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');

      const result = await requireRole(mockRequest, UserRole.ADMIN);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Access denied. Required role: admin');
    });

    it('should return invalid result when auth fails', async () => {
      const mockRequest = createMockRequest('Bearer invalid-token');
      mockJwtService.verifyToken.mockReturnValue(null);

      const result = await requireRole(mockRequest, UserRole.ADMIN);

      expect(result.isValid).toBe(false);
    });
  });

  describe('requireAdmin', () => {
    it('should return valid result for admin user', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUserService.getUserById.mockResolvedValue(adminUser as any);
      const adminPayload = { ...mockPayload, role: UserRole.ADMIN };
      mockJwtService.verifyToken.mockReturnValue(adminPayload);

      const result = await requireAdmin(mockRequest);

      expect(result.isValid).toBe(true);
      expect(result.user?.role).toBe(UserRole.ADMIN);
    });

    it('should return invalid result for non-admin user', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');

      const result = await requireAdmin(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Access denied. Required role: admin');
    });
  });

  describe('requireAnyRole', () => {
    it('should return valid result when user has one of the allowed roles', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      const allowedRoles = [UserRole.USER, UserRole.ADMIN];

      const result = await requireAnyRole(mockRequest, allowedRoles);

      expect(result.isValid).toBe(true);
      expect(result.user?.role).toBe(UserRole.USER);
    });

    it('should return invalid result when user does not have any allowed role', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      // Mock a hypothetical role that's not in the allowed list
      const customUser = { ...mockUser, role: 'MODERATOR' as UserRole };
      mockUserService.getUserById.mockResolvedValue(customUser as any);
      const customPayload = { ...mockPayload, role: 'MODERATOR' as UserRole };
      mockJwtService.verifyToken.mockReturnValue(customPayload);

      const allowedRoles = [UserRole.ADMIN];
      const result = await requireAnyRole(mockRequest, allowedRoles);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Access denied. Required roles: admin');
    });

    it('should handle multiple allowed roles in error message', async () => {
      const mockRequest = createMockRequest('Bearer valid-token');
      const customUser = { ...mockUser, role: 'GUEST' as UserRole };
      mockUserService.getUserById.mockResolvedValue(customUser as any);
      const customPayload = { ...mockPayload, role: 'GUEST' as UserRole };
      mockJwtService.verifyToken.mockReturnValue(customPayload);

      const allowedRoles = [UserRole.USER, UserRole.ADMIN];
      const result = await requireAnyRole(mockRequest, allowedRoles);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Access denied. Required roles: user, admin');
    });

    it('should return invalid result when auth fails', async () => {
      const mockRequest = createMockRequest('Bearer invalid-token');
      mockJwtService.verifyToken.mockReturnValue(null);

      const allowedRoles = [UserRole.USER, UserRole.ADMIN];
      const result = await requireAnyRole(mockRequest, allowedRoles);

      expect(result.isValid).toBe(false);
    });
  });
});

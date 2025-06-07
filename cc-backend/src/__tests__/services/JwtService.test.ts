import { JwtService, JwtPayload } from '../../services/JwtService';
import { UserRole } from '../../entities/UserEntity';

describe('JwtService', () => {
  let jwtService: JwtService;
  const mockPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: 'test-user-id',
    discordId: 'test-discord-id',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  beforeEach(() => {
    jwtService = new JwtService();
    jest.spyOn(Date, 'now').mockReturnValue(1749254400000); // 2022-01-01 00:00:00 UTC
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = jwtService.generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should include all payload data in generated token', () => {
      const token = jwtService.generateToken(mockPayload);
      const verifiedPayload = jwtService.verifyToken(token);

      expect(verifiedPayload).toMatchObject(mockPayload);
      expect(verifiedPayload?.iat).toBeDefined();
      expect(verifiedPayload?.exp).toBeDefined();
    });

    it('should set expiration to 7 days from now', () => {
      const token = jwtService.generateToken(mockPayload);
      const verifiedPayload = jwtService.verifyToken(token);

      const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      expect(verifiedPayload?.exp).toBe(expectedExp);
    });

    it('should set issued at time correctly', () => {
      const token = jwtService.generateToken(mockPayload);
      const verifiedPayload = jwtService.verifyToken(token);

      const expectedIat = Math.floor(Date.now() / 1000);
      expect(verifiedPayload?.iat).toBe(expectedIat);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwtService.generateToken(mockPayload);
      const verifiedPayload = jwtService.verifyToken(token);

      expect(verifiedPayload).not.toBeNull();
      expect(verifiedPayload).toMatchObject(mockPayload);
    });

    it('should return null for malformed tokens', () => {
      const invalidTokens = [
        'invalid.token',
        'invalid.token.signature.extra',
        'notajwttoken',
        '',
        'a.b',
      ];

      invalidTokens.forEach((token) => {
        expect(jwtService.verifyToken(token)).toBeNull();
      });
    });
    it('should return null for expired tokens', () => {
      const pastTime = 1000000000; // January 9, 2001
      jest.spyOn(Date, 'now').mockReturnValue(pastTime);
      const expiredToken = jwtService.generateToken(mockPayload);

      const currentTime = pastTime + 8 * 24 * 60 * 60 * 1000; // 8 days later (token expires in 7 days)
      jest.spyOn(Date, 'now').mockReturnValue(currentTime);

      expect(jwtService.verifyToken(expiredToken)).toBeNull();
    });

    it('should return null for tampered tokens', () => {
      const validToken = jwtService.generateToken(mockPayload);
      const parts = validToken.split('.');

      const tamperedPayload = Buffer.from('{"userId":"hacker"}')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(jwtService.verifyToken(tamperedToken)).toBeNull();
    });

    it('should handle different user roles correctly', () => {
      const adminPayload = { ...mockPayload, role: UserRole.ADMIN };
      const adminToken = jwtService.generateToken(adminPayload);
      const verifiedAdminPayload = jwtService.verifyToken(adminToken);

      expect(verifiedAdminPayload?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('token round-trip', () => {
    it('should maintain data integrity through generate -> verify cycle', () => {
      const originalPayload = {
        userId: 'user-123',
        discordId: 'discord-456',
        email: 'user@test.com',
        role: UserRole.ADMIN,
      };

      const token = jwtService.generateToken(originalPayload);
      const verifiedPayload = jwtService.verifyToken(token);

      expect(verifiedPayload?.userId).toBe(originalPayload.userId);
      expect(verifiedPayload?.discordId).toBe(originalPayload.discordId);
      expect(verifiedPayload?.email).toBe(originalPayload.email);
      expect(verifiedPayload?.role).toBe(originalPayload.role);
    });
  });

  describe('security tests', () => {
    it('should use consistent signature for same payload', () => {
      const token1 = jwtService.generateToken(mockPayload);
      const token2 = jwtService.generateToken(mockPayload);

      expect(token1).toBe(token2);
    });

    it('should produce different signatures for different payloads', () => {
      const payload1 = { ...mockPayload, userId: 'user1' };
      const payload2 = { ...mockPayload, userId: 'user2' };

      const token1 = jwtService.generateToken(payload1);
      const token2 = jwtService.generateToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });
});

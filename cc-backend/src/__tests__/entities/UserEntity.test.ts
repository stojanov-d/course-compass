import {
  UserEntity,
  UserRole,
  UserDiscordLookupEntity,
} from '../../entities/UserEntity';

describe('UserEntity', () => {
  const mockUserData = {
    discordId: 'discord123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('constructor', () => {
    it('should create a UserEntity with provided data', () => {
      const user = new UserEntity(mockUserData);

      expect(user.discordId).toBe(mockUserData.discordId);
      expect(user.username).toBe(mockUserData.username);
      expect(user.email).toBe(mockUserData.email);
      expect(user.displayName).toBe(mockUserData.displayName);
      expect(user.role).toBe(mockUserData.role);
      expect(user.isActive).toBe(mockUserData.isActive);
      expect(user.createdAt).toBe(mockUserData.createdAt);
      expect(user.updatedAt).toBe(mockUserData.updatedAt);
    });

    it('should generate a UUID for userId if not provided', () => {
      const user = new UserEntity(mockUserData);

      expect(user.userId).toBeDefined();
      expect(typeof user.userId).toBe('string');
      expect(user.userId.length).toBeGreaterThan(0);
    });

    it('should use provided userId if given', () => {
      const customUserId = 'custom-user-id';
      const user = new UserEntity({ ...mockUserData, userId: customUserId });

      expect(user.userId).toBe(customUserId);
    });

    it('should set default role to USER if not provided', () => {
      const { ...dataWithoutRole } = mockUserData;
      const user = new UserEntity(dataWithoutRole as any);

      expect(user.role).toBe(UserRole.USER);
    });

    it('should set partition key and row key correctly', () => {
      const user = new UserEntity(mockUserData);

      expect(user.partitionKey).toBe('USER');
      expect(user.rowKey).toBe(user.userId);
    });

    it('should handle optional fields correctly', () => {
      const userWithOptionals = new UserEntity({
        ...mockUserData,
        avatarUrl: 'https://example.com/avatar.jpg',
        lastLoginAt: new Date('2024-01-02'),
      });

      expect(userWithOptionals.avatarUrl).toBe(
        'https://example.com/avatar.jpg'
      );
      expect(userWithOptionals.lastLoginAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('toDiscordLookupEntity', () => {
    it('should create a UserDiscordLookupEntity correctly', () => {
      const user = new UserEntity(mockUserData);
      const lookup = user.toDiscordLookupEntity();

      expect(lookup).toBeInstanceOf(UserDiscordLookupEntity);
      expect(lookup.partitionKey).toBe('USER_DISCORD');
      expect(lookup.rowKey).toBe(user.discordId);
      expect(lookup.userId).toBe(user.userId);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', () => {
      const adminUser = new UserEntity({
        ...mockUserData,
        role: UserRole.ADMIN,
      });

      expect(adminUser.isAdmin()).toBe(true);
    });

    it('should return false for non-admin users', () => {
      const regularUser = new UserEntity({
        ...mockUserData,
        role: UserRole.USER,
      });

      expect(regularUser.isAdmin()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const user = new UserEntity({ ...mockUserData, role: UserRole.USER });

      expect(user.hasRole(UserRole.USER)).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      const user = new UserEntity({ ...mockUserData, role: UserRole.USER });

      expect(user.hasRole(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('role validation', () => {
    it('should accept valid USER role', () => {
      const user = new UserEntity({ ...mockUserData, role: UserRole.USER });

      expect(user.role).toBe(UserRole.USER);
    });

    it('should accept valid ADMIN role', () => {
      const user = new UserEntity({ ...mockUserData, role: UserRole.ADMIN });

      expect(user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('data integrity', () => {
    it('should maintain data integrity after creation', () => {
      const user = new UserEntity(mockUserData);

      mockUserData.username = 'modified';

      expect(user.username).toBe('testuser');
    });

    it('should handle date objects correctly', () => {
      const now = new Date();
      const user = new UserEntity({
        ...mockUserData,
        createdAt: now,
        updatedAt: now,
      });

      expect(user.createdAt).toBe(now);
      expect(user.updatedAt).toBe(now);
    });
  });
});

describe('UserDiscordLookupEntity', () => {
  it('should create lookup entity with correct partition and row keys', () => {
    const discordId = 'discord123';
    const userId = 'user123';

    const lookup = new UserDiscordLookupEntity(discordId, userId);

    expect(lookup.partitionKey).toBe('USER_DISCORD');
    expect(lookup.rowKey).toBe(discordId);
    expect(lookup.userId).toBe(userId);
  });

  it('should store userId correctly', () => {
    const discordId = 'discord456';
    const userId = 'user456';

    const lookup = new UserDiscordLookupEntity(discordId, userId);

    expect(lookup.userId).toBe(userId);
  });
});

describe('UserRole enum', () => {
  it('should have correct USER value', () => {
    expect(UserRole.USER).toBe('user');
  });

  it('should have correct ADMIN value', () => {
    expect(UserRole.ADMIN).toBe('admin');
  });

  it('should have exactly two roles defined', () => {
    const roleValues = Object.values(UserRole);
    expect(roleValues).toHaveLength(2);
    expect(roleValues).toContain('user');
    expect(roleValues).toContain('admin');
  });
});

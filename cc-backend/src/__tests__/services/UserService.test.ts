import { UserService } from '../../services/UserService';
import { UserEntity, UserRole } from '../../entities/UserEntity';
import { DiscordUser } from '../../services/DiscordAuthService';
import { TableClient } from '@azure/data-tables';

jest.mock('../../services/TableService');

describe('UserService', () => {
  let userService: UserService;
  let mockTableClient: jest.Mocked<TableClient>;

  const mockDiscordUser: DiscordUser = {
    id: 'discord123',
    username: 'testuser',
    email: 'test@example.com',
    avatar: 'avatar123',
    discriminator: '1234',
    global_name: 'Test User',
  };

  const mockUserEntity = new UserEntity({
    discordId: 'discord123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });

  beforeEach(() => {
    userService = new UserService();

    mockTableClient = {
      createEntity: jest.fn().mockResolvedValue({}),
      getEntity: jest.fn(),
      updateEntity: jest.fn().mockResolvedValue({}),
      deleteEntity: jest.fn().mockResolvedValue({}),
      listEntities: jest.fn(),
    } as any;

    (userService as any).tableService = {
      getTableClient: jest.fn().mockReturnValue(mockTableClient),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserByDiscordId', () => {
    it('should find user by Discord ID when both lookup and user entities exist', async () => {
      const mockLookupEntity = { userId: 'user123' };
      const mockUserData = {
        userId: 'user123',
        discordId: 'discord123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockTableClient.getEntity
        .mockResolvedValueOnce(mockLookupEntity as any) // First call for lookup
        .mockResolvedValueOnce(mockUserData as any); // Second call for user

      const result = await userService.findUserByDiscordId('discord123');

      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.discordId).toBe('discord123');
      expect(result?.username).toBe('testuser');
      expect(mockTableClient.getEntity).toHaveBeenCalledTimes(2);
      expect(mockTableClient.getEntity).toHaveBeenNthCalledWith(
        1,
        'USER_DISCORD',
        'discord123'
      );
      expect(mockTableClient.getEntity).toHaveBeenNthCalledWith(
        2,
        'USER',
        'user123'
      );
    });

    it('should return null when lookup entity does not exist', async () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;
      mockTableClient.getEntity.mockRejectedValueOnce(error);

      const result = await userService.findUserByDiscordId('nonexistent');

      expect(result).toBeNull();
      expect(mockTableClient.getEntity).toHaveBeenCalledWith(
        'USER_DISCORD',
        'nonexistent'
      );
    });

    it('should return null when user entity does not exist', async () => {
      const mockLookupEntity = { userId: 'user123' };
      const error = new Error('Not found');
      (error as any).statusCode = 404;

      mockTableClient.getEntity
        .mockResolvedValueOnce(mockLookupEntity as any)
        .mockRejectedValueOnce(error);

      const result = await userService.findUserByDiscordId('discord123');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const error = new Error('Database error');
      (error as any).statusCode = 500;
      mockTableClient.getEntity.mockRejectedValueOnce(error);

      await expect(
        userService.findUserByDiscordId('discord123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('createOrUpdateUser', () => {
    it('should create new user when user does not exist', async () => {
      jest
        .spyOn(userService, 'findUserByDiscordId')
        .mockResolvedValueOnce(null);

      const result = await userService.createOrUpdateUser(mockDiscordUser);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.discordId).toBe(mockDiscordUser.id);
      expect(result.username).toBe(mockDiscordUser.username);
      expect(result.email).toBe(mockDiscordUser.email);
      expect(result.displayName).toBe(mockDiscordUser.global_name);
      expect(result.role).toBe(UserRole.USER);
      expect(result.isActive).toBe(true);
      expect(mockTableClient.createEntity).toHaveBeenCalledTimes(2); // User entity + lookup entity
    });

    it('should update existing user when user exists', async () => {
      const existingUser = new UserEntity({
        userId: 'existing123',
        discordId: mockDiscordUser.id,
        username: 'oldusername',
        email: 'old@example.com',
        displayName: 'Old Name',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      });

      jest
        .spyOn(userService, 'findUserByDiscordId')
        .mockResolvedValueOnce(existingUser);

      const result = await userService.createOrUpdateUser(mockDiscordUser);

      expect(result.userId).toBe(existingUser.userId);
      expect(result.username).toBe(mockDiscordUser.username);
      expect(result.email).toBe(mockDiscordUser.email);
      expect(result.displayName).toBe(mockDiscordUser.global_name);
      expect(result.lastLoginAt).toBeDefined();
      expect(mockTableClient.updateEntity).toHaveBeenCalledWith(
        result,
        'Merge'
      );
    });

    it('should handle Discord user without avatar', async () => {
      const discordUserNoAvatar = { ...mockDiscordUser, avatar: null };
      jest
        .spyOn(userService, 'findUserByDiscordId')
        .mockResolvedValueOnce(null);

      const result = await userService.createOrUpdateUser(discordUserNoAvatar);

      expect(result.avatarUrl).toBeUndefined();
    });

    it('should use username as display name when global_name is null', async () => {
      const discordUserNoGlobalName = { ...mockDiscordUser, global_name: null };
      jest
        .spyOn(userService, 'findUserByDiscordId')
        .mockResolvedValueOnce(null);

      const result = await userService.createOrUpdateUser(
        discordUserNoGlobalName
      );

      expect(result.displayName).toBe(mockDiscordUser.username);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUserData = {
        userId: 'user123',
        discordId: 'discord123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockTableClient.getEntity.mockResolvedValueOnce(mockUserData as any);

      const result = await userService.getUserById('user123');

      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.userId).toBe('user123');
      expect(mockTableClient.getEntity).toHaveBeenCalledWith('USER', 'user123');
    });

    it('should return null when user not found', async () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;
      mockTableClient.getEntity.mockRejectedValueOnce(error);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const error = new Error('Database error');
      (error as any).statusCode = 500;
      mockTableClient.getEntity.mockRejectedValueOnce(error);

      await expect(userService.getUserById('user123')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      jest
        .spyOn(userService, 'getUserById')
        .mockResolvedValueOnce(mockUserEntity);

      const result = await userService.updateUserRole(
        'user123',
        UserRole.ADMIN
      );

      expect(result).not.toBeNull();
      expect(result?.role).toBe(UserRole.ADMIN);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(mockTableClient.updateEntity).toHaveBeenCalledWith(
        result,
        'Merge'
      );
    });

    it('should return null when user not found', async () => {
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(null);

      const result = await userService.updateUserRole(
        'nonexistent',
        UserRole.ADMIN
      );

      expect(result).toBeNull();
      expect(mockTableClient.updateEntity).not.toHaveBeenCalled();
    });
  });

  describe('toggleUserActiveStatus', () => {
    it('should toggle active user to inactive', async () => {
      const activeUser = new UserEntity({
        ...mockUserEntity,
        isActive: true,
      });
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(activeUser);

      const result = await userService.toggleUserActiveStatus('user123');

      expect(result?.isActive).toBe(false);
      expect(mockTableClient.updateEntity).toHaveBeenCalledWith(
        result,
        'Merge'
      );
    });

    it('should toggle inactive user to active', async () => {
      const inactiveUser = new UserEntity({
        ...mockUserEntity,
        isActive: false,
      });
      jest
        .spyOn(userService, 'getUserById')
        .mockResolvedValueOnce(inactiveUser);

      const result = await userService.toggleUserActiveStatus('user123');

      expect(result?.isActive).toBe(true);
    });

    it('should return null when user not found', async () => {
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(null);

      const result = await userService.toggleUserActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          userId: 'user1',
          discordId: 'discord1',
          username: 'user1',
          email: 'user1@test.com',
          displayName: 'User 1',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: 'user2',
          discordId: 'discord2',
          username: 'user2',
          email: 'user2@test.com',
          displayName: 'User 2',
          role: UserRole.ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest
            .fn()
            .mockResolvedValueOnce({ value: mockUsers[0], done: false })
            .mockResolvedValueOnce({ value: mockUsers[1], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };

      mockTableClient.listEntities.mockReturnValueOnce(
        mockAsyncIterator as any
      );

      const result = await userService.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserEntity);
      expect(result[1]).toBeInstanceOf(UserEntity);
      expect(mockTableClient.listEntities).toHaveBeenCalledWith({
        queryOptions: { filter: "PartitionKey eq 'USER'" },
      });
    });
  });

  describe('searchUsers', () => {
    it('should return all users when no search term provided', async () => {
      const mockUsers = [mockUserEntity];
      jest.spyOn(userService, 'getAllUsers').mockResolvedValueOnce(mockUsers);

      const result = await userService.searchUsers('');

      expect(result).toEqual(mockUsers);
    });

    it('should filter users by username', async () => {
      const users = [
        new UserEntity({ ...mockUserEntity, username: 'john_doe' }),
        new UserEntity({ ...mockUserEntity, username: 'jane_smith' }),
      ];
      jest.spyOn(userService, 'getAllUsers').mockResolvedValueOnce(users);

      const result = await userService.searchUsers('john');

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('john_doe');
    });

    it('should filter users by display name', async () => {
      const users = [
        new UserEntity({ ...mockUserEntity, displayName: 'John Doe' }),
        new UserEntity({ ...mockUserEntity, displayName: 'Jane Smith' }),
      ];
      jest.spyOn(userService, 'getAllUsers').mockResolvedValueOnce(users);

      const result = await userService.searchUsers('jane');

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Jane Smith');
    });

    it('should filter users by email', async () => {
      const users = [
        new UserEntity({ ...mockUserEntity, email: 'john@example.com' }),
        new UserEntity({ ...mockUserEntity, email: 'jane@example.com' }),
      ];
      jest.spyOn(userService, 'getAllUsers').mockResolvedValueOnce(users);

      const result = await userService.searchUsers('john@');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
    });

    it('should be case insensitive', async () => {
      const users = [
        new UserEntity({ ...mockUserEntity, username: 'TestUser' }),
      ];
      jest.spyOn(userService, 'getAllUsers').mockResolvedValueOnce(users);

      const result = await userService.searchUsers('testuser');

      expect(result).toHaveLength(1);
    });
  });
});

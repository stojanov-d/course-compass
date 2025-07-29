import { TableService } from './TableService';
import { TABLE_NAMES } from '../config/tableStorage';
import {
  UserEntity,
  UserDiscordLookupEntity,
  UserRole,
} from '../entities/UserEntity';
import { DiscordUser } from './DiscordAuthService';

export class UserService {
  private tableService: TableService;

  constructor() {
    this.tableService = new TableService();
  }

  async findUserByDiscordId(discordId: string): Promise<UserEntity | null> {
    try {
      const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);

      const lookupEntity = await usersTable.getEntity<UserDiscordLookupEntity>(
        'USER_DISCORD',
        discordId
      );

      if (!lookupEntity) {
        return null;
      }

      const userEntity = await usersTable.getEntity<UserEntity>(
        'USER',
        lookupEntity.userId
      );

      if (!userEntity) {
        return null;
      }

      return new UserEntity({
        userId: userEntity.userId,
        discordId: userEntity.discordId,
        username: userEntity.username,
        email: userEntity.email,
        displayName: userEntity.displayName,
        avatarUrl: userEntity.avatarUrl,
        role: userEntity.role,
        isActive: userEntity.isActive,
        createdAt: userEntity.createdAt,
        updatedAt: userEntity.updatedAt,
        lastLoginAt: userEntity.lastLoginAt,
        refreshToken: userEntity.refreshToken,
        refreshTokenExpiresAt: userEntity.refreshTokenExpiresAt,
      });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async createOrUpdateUser(discordUser: DiscordUser): Promise<UserEntity> {
    const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);

    const existingUser = await this.findUserByDiscordId(discordUser.id);

    if (existingUser) {
      existingUser.username = discordUser.username;
      existingUser.email = discordUser.email;
      existingUser.displayName =
        discordUser.global_name || discordUser.username;
      existingUser.avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : undefined;
      existingUser.updatedAt = new Date();
      existingUser.lastLoginAt = new Date();

      await usersTable.updateEntity(existingUser, 'Merge');
      return existingUser;
    } else {
      const newUser = new UserEntity({
        discordId: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        displayName: discordUser.global_name || discordUser.username,
        avatarUrl: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : undefined,
        role: UserRole.USER, // Default role for new users
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      });

      await usersTable.createEntity(newUser);

      const lookupEntity = newUser.toDiscordLookupEntity();
      await usersTable.createEntity(lookupEntity);

      return newUser;
    }
  }

  async getUserById(userId: string): Promise<UserEntity | null> {
    try {
      const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
      const userEntity = await usersTable.getEntity<UserEntity>('USER', userId);

      if (!userEntity) {
        return null;
      }

      const user = new UserEntity({
        userId: userEntity.userId,
        discordId: userEntity.discordId,
        username: userEntity.username,
        email: userEntity.email,
        displayName: userEntity.displayName,
        avatarUrl: userEntity.avatarUrl,
        role: userEntity.role,
        isActive: userEntity.isActive,
        createdAt: userEntity.createdAt,
        updatedAt: userEntity.updatedAt,
        lastLoginAt: userEntity.lastLoginAt,
        refreshToken: userEntity.refreshToken,
        refreshTokenExpiresAt: userEntity.refreshTokenExpiresAt,
      });

      return user;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateUserRole(
    userId: string,
    role: UserRole
  ): Promise<UserEntity | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return null;
      }

      user.role = role;
      user.updatedAt = new Date();

      const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
      await usersTable.updateEntity(user, 'Merge');

      return user;
    } catch (error: any) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<UserEntity[]> {
    try {
      const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
      const entities = usersTable.listEntities<UserEntity>({
        queryOptions: { filter: "PartitionKey eq 'USER'" },
      });

      const users: UserEntity[] = [];
      for await (const entity of entities) {
        const userEntity = new UserEntity({
          userId: entity.userId,
          discordId: entity.discordId,
          username: entity.username,
          email: entity.email,
          displayName: entity.displayName,
          avatarUrl: entity.avatarUrl,
          role: entity.role,
          isActive: entity.isActive,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          lastLoginAt: entity.lastLoginAt,
          refreshToken: entity.refreshToken,
          refreshTokenExpiresAt: entity.refreshTokenExpiresAt,
        });
        users.push(userEntity);
      }

      return users;
    } catch (error: any) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async toggleUserActiveStatus(userId: string): Promise<UserEntity | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return null;
      }

      user.isActive = !user.isActive;
      user.updatedAt = new Date();

      const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
      await usersTable.updateEntity(user, 'Merge');

      return user;
    } catch (error: any) {
      console.error('Error toggling user active status:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm: string): Promise<UserEntity[]> {
    try {
      const allUsers = await this.getAllUsers();

      if (!searchTerm) {
        return allUsers;
      }

      const searchLower = searchTerm.toLowerCase();
      return allUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(searchLower) ||
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    } catch (error: any) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
    const user = await this.getUserById(userId);

    if (user) {
      user.refreshToken = refreshToken;
      user.refreshTokenExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ); // 30 days
      user.updatedAt = new Date();

      await usersTable.updateEntity(user, 'Merge');
    }
  }

  async getUserByRefreshToken(
    refreshToken: string
  ): Promise<UserEntity | null> {
    const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);

    try {
      const sanitizedRefreshToken = this.escapeFilterValue(refreshToken);
      const entities = usersTable.listEntities<UserEntity>({
        queryOptions: {
          filter: `refreshToken eq '${sanitizedRefreshToken}' and refreshTokenExpiresAt gt datetime'${new Date().toISOString()}'`,
        },
      });

      for await (const entity of entities) {
        return new UserEntity({
          userId: entity.userId,
          discordId: entity.discordId,
          username: entity.username,
          email: entity.email,
          displayName: entity.displayName,
          avatarUrl: entity.avatarUrl,
          role: entity.role,
          isActive: entity.isActive,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          lastLoginAt: entity.lastLoginAt,
          refreshToken: entity.refreshToken,
          refreshTokenExpiresAt: entity.refreshTokenExpiresAt,
        });
      }

      return null;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateLastLoginTime(userId: string): Promise<void> {
    try {
      const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
      const user = await this.getUserById(userId);

      if (user) {
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();

        await usersTable.updateEntity(user, 'Merge');
      }
    } catch (error: any) {
      console.error('Error updating last login time:', error);
      throw error;
    }
  }
}

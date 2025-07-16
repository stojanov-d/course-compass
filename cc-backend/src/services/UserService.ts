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
}

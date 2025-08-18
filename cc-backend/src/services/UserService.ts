import { TableService } from './TableService';
import { UserEntity, UserRole } from '../entities/UserEntity';
import { DiscordUser } from './DiscordAuthService';
import { UserTableRepository } from '../repositories/azure/UserTableRepository';
import type IUserRepository from '../repositories/interfaces/IUserRepository';

export class UserService {
  private tableService: TableService;
  private repo: IUserRepository;

  constructor(repo?: IUserRepository) {
    this.tableService = new TableService();
    this.repo = repo || new UserTableRepository(this.tableService);
  }

  async findUserByDiscordId(discordId: string): Promise<UserEntity | null> {
    try {
      return await this.repo.getByDiscordId(discordId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async createOrUpdateUser(discordUser: DiscordUser): Promise<UserEntity> {
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

      await this.repo.update(existingUser);
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

      await this.repo.create(newUser);
      const lookupEntity = newUser.toDiscordLookupEntity();
      await this.repo.upsertDiscordLookup(lookupEntity.rowKey!, newUser.userId);

      return newUser;
    }
  }

  async getUserById(userId: string): Promise<UserEntity | null> {
    try {
      return await this.repo.getById(userId);
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

      await this.repo.update(user);

      return user;
    } catch (error: any) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<UserEntity[]> {
    try {
      return await this.repo.listAll();
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

      await this.repo.update(user);

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
    const user = await this.getUserById(userId);

    if (user) {
      user.refreshToken = refreshToken;
      user.refreshTokenExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ); // 30 days
      user.updatedAt = new Date();

      await this.repo.update(user);
    }
  }

  async getUserByRefreshToken(
    refreshToken: string
  ): Promise<UserEntity | null> {
    try {
      return await this.repo.findByRefreshToken(refreshToken);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async updateLastLoginTime(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);

      if (user) {
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();

        await this.repo.update(user);
      }
    } catch (error: any) {
      console.error('Error updating last login time:', error);
      throw error;
    }
  }
}

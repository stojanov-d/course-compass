import { TableService } from './TableService';
import { TABLE_NAMES } from '../config/tableStorage';
import { UserEntity, UserDiscordLookupEntity } from '../entities/UserEntity';
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

      return userEntity || null;
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
      return userEntity || null;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}

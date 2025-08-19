import { TableClient } from '@azure/data-tables';
import { TABLE_NAMES } from '../../config/tableStorage';
import { TableService } from '../../services/TableService';
import { UserDiscordLookupEntity, UserEntity } from '../../entities/UserEntity';
import IUserRepository from '../interfaces/IUserRepository';

export class UserTableRepository implements IUserRepository {
  private usersTable: TableClient;

  constructor(private readonly tableService = new TableService()) {
    this.usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);
  }

  async getById(userId: string): Promise<UserEntity | null> {
    try {
      const e = await this.usersTable.getEntity('USER', userId);
      return this.map(e);
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async getByDiscordId(discordId: string): Promise<UserEntity | null> {
    try {
      const lookup = (await this.usersTable.getEntity(
        'USER_DISCORD',
        discordId
      )) as any as UserDiscordLookupEntity;
      const user = await this.usersTable.getEntity('USER', lookup.userId);
      return this.map(user);
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async create(user: UserEntity): Promise<void> {
    await this.usersTable.createEntity(user as any);
  }

  async upsertDiscordLookup(discordId: string, userId: string): Promise<void> {
    const lookup = new UserDiscordLookupEntity(discordId, userId) as any;
    try {
      await this.usersTable.upsertEntity(lookup, 'Merge');
    } catch {
      await this.usersTable.createEntity(lookup);
    }
  }

  async update(user: UserEntity): Promise<void> {
    await this.usersTable.updateEntity(user as any, 'Merge');
  }

  async listAll(): Promise<UserEntity[]> {
    const entities = this.usersTable.listEntities({
      queryOptions: { filter: "PartitionKey eq 'USER'" },
    });
    const users: UserEntity[] = [];
    for await (const e of entities) users.push(this.map(e));
    return users;
  }

  async findByRefreshToken(refreshToken: string): Promise<UserEntity | null> {
    const nowIso = new Date().toISOString();
    const entities = this.usersTable.listEntities({
      queryOptions: {
        filter: `refreshToken eq '${refreshToken}' and refreshTokenExpiresAt gt datetime'${nowIso}'`,
      },
    });
    for await (const e of entities) return this.map(e);
    return null;
  }

  private map(e: any): UserEntity {
    return new UserEntity({
      userId: e.rowKey,
      discordId: e.discordId,
      username: e.username,
      email: e.email,
      displayName: e.displayName,
      avatarUrl: e.avatarUrl,
      role: e.role,
      isActive: e.isActive,
      createdAt: new Date(e.createdAt),
      updatedAt: new Date(e.updatedAt),
      lastLoginAt: e.lastLoginAt ? new Date(e.lastLoginAt) : undefined,
      refreshToken: e.refreshToken,
      refreshTokenExpiresAt: e.refreshTokenExpiresAt
        ? new Date(e.refreshTokenExpiresAt)
        : undefined,
    });
  }
}

export default UserTableRepository;

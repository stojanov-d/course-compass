import { BaseTableEntity } from './BaseEntity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface IUserEntity {
  userId: string;
  discordId: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
}

export class UserEntity extends BaseTableEntity implements IUserEntity {
  public userId: string;
  public discordId: string;
  public username: string;
  public email: string;
  public displayName: string;
  public avatarUrl?: string;
  public role: UserRole;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public lastLoginAt?: Date;
  public refreshToken?: string;
  public refreshTokenExpiresAt?: Date;

  constructor(data: Omit<IUserEntity, 'userId'> & { userId?: string }) {
    const userId = data.userId || crypto.randomUUID();
    super('USER', userId);

    this.userId = userId;
    this.discordId = data.discordId;
    this.username = data.username;
    this.email = data.email;
    this.displayName = data.displayName;
    this.avatarUrl = data.avatarUrl;
    this.role = data.role || UserRole.USER;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastLoginAt = data.lastLoginAt;
    this.refreshToken = data.refreshToken;
    this.refreshTokenExpiresAt = data.refreshTokenExpiresAt;
  }

  public toDiscordLookupEntity(): UserDiscordLookupEntity {
    return new UserDiscordLookupEntity(this.discordId, this.userId);
  }

  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public hasRole(role: UserRole): boolean {
    return this.role === role;
  }
}

export class UserDiscordLookupEntity extends BaseTableEntity {
  public userId: string;

  constructor(discordId: string, userId: string) {
    super('USER_DISCORD', discordId);
    this.userId = userId;
  }
}

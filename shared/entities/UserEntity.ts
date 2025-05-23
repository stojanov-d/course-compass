import { BaseTableEntity } from "./BaseEntity";

export interface IUserEntity {
  userId: string;
  discordId: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export class UserEntity extends BaseTableEntity implements IUserEntity {
  public userId: string;
  public discordId: string;
  public username: string;
  public email: string;
  public displayName: string;
  public avatarUrl?: string;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public lastLoginAt?: Date;

  constructor(data: Omit<IUserEntity, "userId"> & { userId?: string }) {
    const userId = data.userId || crypto.randomUUID();
    super("USER", userId);

    this.userId = userId;
    this.discordId = data.discordId;
    this.username = data.username;
    this.email = data.email;
    this.displayName = data.displayName;
    this.avatarUrl = data.avatarUrl;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastLoginAt = data.lastLoginAt;
  }

  public toDiscordLookupEntity(): UserDiscordLookupEntity {
    return new UserDiscordLookupEntity(this.discordId, this.userId);
  }
}

export class UserDiscordLookupEntity extends BaseTableEntity {
  public userId: string;

  constructor(discordId: string, userId: string) {
    super("USER_DISCORD", discordId);
    this.userId = userId;
  }
}

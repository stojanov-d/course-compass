import { UserEntity } from '../../entities/UserEntity';

export interface IUserRepository {
  getById(userId: string): Promise<UserEntity | null>;
  getByDiscordId(discordId: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<void>;
  upsertDiscordLookup(discordId: string, userId: string): Promise<void>;
  update(user: UserEntity): Promise<void>;
  listAll(): Promise<UserEntity[]>;
  findByRefreshToken(refreshToken: string): Promise<UserEntity | null>;
}

export default IUserRepository;

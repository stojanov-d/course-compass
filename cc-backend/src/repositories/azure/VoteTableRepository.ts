import { TableClient } from '@azure/data-tables';
import { TABLE_NAMES } from '../../config/tableStorage';
import { TableService } from '../../services/TableService';
import { VoteEntity } from '../../entities/VoteEntity';
import IVoteRepository, {
  VoteResult,
  VoteTarget,
} from '../interfaces/IVoteRepository';

export class VoteTableRepository implements IVoteRepository {
  private votesTable: TableClient;

  constructor(private readonly tableService = new TableService()) {
    this.votesTable = this.tableService.getTableClient(TABLE_NAMES.VOTES);
  }

  private partition(targetType: VoteTarget, targetId: string) {
    return `VOTE_${targetType.toUpperCase()}_${targetId}`;
  }

  async getUserVote(
    userId: string,
    targetType: VoteTarget,
    targetId: string
  ): Promise<VoteEntity | null> {
    try {
      const entity = await this.votesTable.getEntity(
        this.partition(targetType, targetId),
        userId
      );
      return this.map(entity);
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async processVote(
    userId: string,
    targetType: VoteTarget,
    targetId: string,
    voteType: 'upvote' | 'downvote'
  ): Promise<VoteResult> {
    const partitionKey = this.partition(targetType, targetId);

    try {
      const existing = await this.votesTable.getEntity(partitionKey, userId);
      const existingVote = this.map(existing);

      if (existingVote.voteType === voteType) {
        await this.votesTable.deleteEntity(partitionKey, userId);

        const counts = await this.countVotes(targetType, targetId);
        return {
          success: true,
          action: 'removed',
          previousVote: existingVote.voteType,
          currentVote: null,
          ...counts,
        };
      }

      const updated = new VoteEntity({
        targetType,
        targetId,
        voteType,
        userId,
        createdAt: existingVote.createdAt,
        updatedAt: new Date(),
      });

      const etag = (existing as any).etag;
      let attempts = 0;
      while (true) {
        try {
          await this.votesTable.updateEntity(updated as any, 'Replace', {
            etag,
          });
          break;
        } catch (e: any) {
          if (e.statusCode === 412 && attempts < 2) {
            await new Promise((r) => setTimeout(r, 50 * (attempts + 1)));
            const fresh = await this.votesTable.getEntity(partitionKey, userId);
            const freshVote = this.map(fresh);
            updated.createdAt = freshVote.createdAt;
            (updated as any).etag = (fresh as any).etag;
            attempts++;
            continue;
          }
          throw e;
        }
      }
      const counts = await this.countVotes(targetType, targetId);
      return {
        success: true,
        action: 'updated',
        previousVote: existingVote.voteType,
        currentVote: voteType,
        ...counts,
      };
    } catch (err: any) {
      if (err.statusCode !== 404) throw err;
      const created = new VoteEntity({
        targetType,
        targetId,
        voteType,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.votesTable.createEntity(created as any);
      const counts = await this.countVotes(targetType, targetId);
      return {
        success: true,
        action: 'created',
        previousVote: null,
        currentVote: voteType,
        ...counts,
      };
    }
  }

  async countVotes(
    targetType: VoteTarget,
    targetId: string
  ): Promise<{ upvotes: number; downvotes: number }> {
    const partitionKey = this.partition(targetType, targetId);
    const entities = this.votesTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });
    let up = 0,
      down = 0;
    for await (const e of entities) {
      if (e.voteType === 'upvote') up++;
      else if (e.voteType === 'downvote') down++;
    }
    return { upvotes: up, downvotes: down };
  }

  private map(entity: any): VoteEntity {
    const mapped = new VoteEntity({
      targetType: entity.targetType,
      targetId: entity.targetId,
      voteType: entity.voteType,
      userId: entity.userId,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    });
    (mapped as any).etag = entity.etag;
    return mapped;
  }
}

export default VoteTableRepository;

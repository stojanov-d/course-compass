import { TableClient } from '@azure/data-tables';
import { TABLE_NAMES } from '../../config/tableStorage';
import { TableService } from '../../services/TableService';
import { CommentEntity } from '../../entities/CommentEntity';
import ICommentRepository from '../interfaces/ICommentRepository';

export class CommentTableRepository implements ICommentRepository {
  private commentsTable: TableClient;

  constructor(private readonly tableService = new TableService()) {
    this.commentsTable = this.tableService.getTableClient(TABLE_NAMES.COMMENTS);
  }

  async create(comment: CommentEntity): Promise<void> {
    await this.commentsTable.createEntity(comment as any);
  }

  async listByReview(reviewId: string, limit = 50): Promise<CommentEntity[]> {
    const partitionKey = `COMMENT_${reviewId}`;
    const entities = this.commentsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });
    const results: CommentEntity[] = [];
    for await (const e of entities) {
      results.push(this.map(e));
      if (results.length >= limit) break;
    }
    results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return results;
  }

  async getById(
    reviewId: string,
    commentId: string
  ): Promise<CommentEntity | null> {
    try {
      const entity = await this.commentsTable.getEntity(
        `COMMENT_${reviewId}`,
        commentId
      );
      return this.map(entity);
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async update(comment: CommentEntity): Promise<void> {
    const etag = (comment as any).etag;
    await this.commentsTable.updateEntity(comment as any, 'Replace', { etag });
  }

  async delete(reviewId: string, commentId: string): Promise<void> {
    await this.commentsTable.deleteEntity(`COMMENT_${reviewId}`, commentId);
  }

  async deleteAllForReview(reviewId: string): Promise<void> {
    const partitionKey = `COMMENT_${reviewId}`;
    const entities = this.commentsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });

    const ops: any[] = [];
    for await (const e of entities) {
      ops.push(['delete', e]);
      if (ops.length === 100) {
        await this.commentsTable.submitTransaction(ops);
        ops.length = 0;
      }
    }
    if (ops.length) {
      await this.commentsTable.submitTransaction(ops);
    }
  }

  async countByReview(reviewId: string): Promise<number> {
    const partitionKey = `COMMENT_${reviewId}`;
    const entities = this.commentsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });
    let count = 0;
    for await (const _ of entities) {
      count++;
    }
    return count;
  }

  private map(entity: any): CommentEntity {
    const mapped = new CommentEntity({
      commentId: entity.rowKey,
      reviewId: entity.reviewId,
      userId: entity.userId,
      parentCommentId: entity.parentCommentId,
      commentText: entity.commentText,
      isAnonymous: entity.isAnonymous,
      isApproved: entity.isApproved,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      upvotes: entity.upvotes || 0,
      downvotes: entity.downvotes || 0,
    });
    (mapped as any).etag = entity.etag;
    return mapped;
  }
}

export default CommentTableRepository;

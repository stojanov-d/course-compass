import { TableClient } from '@azure/data-tables';
import { TABLE_NAMES } from '../../config/tableStorage';
import { TableService } from '../../services/TableService';
import { ReviewEntity, UserReviewEntity } from '../../entities/ReviewEntity';
import IReviewRepository from '../interfaces/IReviewRepository';

export class ReviewTableRepository implements IReviewRepository {
  private reviewsTable: TableClient;

  constructor(private readonly tableService = new TableService()) {
    this.reviewsTable = this.tableService.getTableClient(TABLE_NAMES.REVIEWS);
  }

  async create(
    review: ReviewEntity,
    userReview: UserReviewEntity
  ): Promise<void> {
    try {
      await this.reviewsTable.submitTransaction([
        ['create', review as any],
        ['create', userReview as any],
      ]);
    } catch {
      // Fallback to sequential
      await this.reviewsTable.createEntity(review as any);
      await this.reviewsTable.createEntity(userReview as any);
    }
  }

  async getById(
    reviewId: string,
    courseId: string
  ): Promise<ReviewEntity | null> {
    try {
      const partitionKey = `REVIEW_${courseId}`;
      const entity = await this.reviewsTable.getEntity(partitionKey, reviewId);
      return this.map(entity);
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async listByCourse(courseId: string, limit = 20): Promise<ReviewEntity[]> {
    const partitionKey = `REVIEW_${courseId}`;
    const entities = this.reviewsTable.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${partitionKey}'`,
      },
    });
    const results: ReviewEntity[] = [];
    for await (const e of entities) {
      if (
        typeof e.rowKey === 'string' &&
        (e.rowKey.startsWith('USER_REVIEWS_') ||
          e.partitionKey?.toString().startsWith('USER_REVIEWS_'))
      ) {
        continue;
      }
      results.push(this.map(e));
      if (results.length >= limit) break;
    }
    results.sort((a, b) => {
      const d = b.createdAt.getTime() - a.createdAt.getTime();
      if (d !== 0) return d;
      return b.upvotes - a.upvotes;
    });
    return results;
  }

  async listByCourseWithToken(
    courseId: string,
    limit = 20,
    continuationToken?: string
  ): Promise<{ reviews: ReviewEntity[]; continuationToken?: string }> {
    const offset = continuationToken ? parseInt(continuationToken, 10) || 0 : 0;
    const all = await this.listByCourse(courseId, Number.MAX_SAFE_INTEGER);
    const slice = all.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const nextToken = nextOffset < all.length ? String(nextOffset) : undefined;
    return { reviews: slice, continuationToken: nextToken };
  }

  async listByUser(userId: string, limit = 20): Promise<ReviewEntity[]> {
    const partitionKey = `USER_REVIEWS_${userId}`;
    const entities = this.reviewsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });
    const results: ReviewEntity[] = [];
    for await (const e of entities) {
      const reviewId = e.rowKey as string;
      const courseId = (e as any).courseId as string;
      const review = await this.getById(reviewId, courseId);
      if (review) results.push(review);
      if (results.length >= limit) break;
    }
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results;
  }

  async getUserReviewForCourse(
    userId: string,
    courseId: string
  ): Promise<ReviewEntity | null> {
    const partitionKey = `USER_REVIEWS_${userId}`;
    const entities = this.reviewsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });
    for await (const e of entities) {
      const userReview = e as any as UserReviewEntity;
      if (userReview.courseId === courseId) {
        return await this.getById(e.rowKey as string, courseId);
      }
    }
    return null;
  }

  async update(review: ReviewEntity): Promise<void> {
    const etag = (review as any).etag;
    await this.reviewsTable.updateEntity(review as any, 'Replace', { etag });
  }

  async delete(
    reviewId: string,
    courseId: string,
    userId: string
  ): Promise<void> {
    const ops: any[] = [];
    ops.push([
      'delete',
      { partitionKey: `REVIEW_${courseId}`, rowKey: reviewId },
    ]);
    ops.push([
      'delete',
      { partitionKey: `USER_REVIEWS_${userId}`, rowKey: reviewId },
    ]);
    try {
      await this.reviewsTable.submitTransaction(ops);
    } catch {
      await this.reviewsTable.deleteEntity(`REVIEW_${courseId}`, reviewId);
      await this.reviewsTable.deleteEntity(`USER_REVIEWS_${userId}`, reviewId);
    }
  }

  async adminDelete(
    reviewId: string,
    courseId: string,
    userId: string
  ): Promise<void> {
    await this.delete(reviewId, courseId, userId);
  }

  private map(entity: any): ReviewEntity {
    const mapped = new ReviewEntity({
      reviewId: entity.rowKey,
      userId: entity.userId,
      courseId: entity.courseId,
      professorId: entity.professorId,
      rating: entity.rating,
      difficulty: entity.difficulty,
      workload: entity.workload,
      recommendsCourse: entity.recommendsCourse,
      reviewText: entity.reviewText,
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

export default ReviewTableRepository;

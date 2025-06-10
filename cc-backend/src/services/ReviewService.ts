import { TableClient } from '@azure/data-tables';
import { ReviewEntity, UserReviewEntity } from '../entities/ReviewEntity';
import { CommentEntity } from '../entities/CommentEntity';
import { TableService } from './TableService';
import { TABLE_NAMES } from '../config/tableStorage';

export interface ReviewCreateData {
  userId: string;
  courseId: string;
  professorId?: string;
  rating: number; // 1-5
  difficulty: number; // 1-5
  workload: number; // 1-5
  recommendsCourse: boolean;
  reviewText: string;
  isAnonymous: boolean;
}

export interface CommentCreateData {
  reviewId: string;
  userId: string;
  parentCommentId?: string;
  commentText: string;
  isAnonymous: boolean;
}

export interface VoteData {
  userId: string;
  voteType: 'upvote' | 'downvote';
}

export interface ReviewListOptions {
  courseId?: string;
  userId?: string;
  limit?: number;
  continuationToken?: string;
}

export interface CommentListOptions {
  reviewId: string;
  limit?: number;
  continuationToken?: string;
}

export class ReviewService {
  private tableService: TableService;
  private reviewsTable: TableClient;
  private commentsTable: TableClient;

  constructor() {
    this.tableService = new TableService();
    this.reviewsTable = this.tableService.getTableClient(TABLE_NAMES.REVIEWS);
    this.commentsTable = this.tableService.getTableClient(TABLE_NAMES.COMMENTS);
  }

  async createReview(data: ReviewCreateData): Promise<ReviewEntity> {
    try {
      this.validateRatings(data.rating, data.difficulty, data.workload);

      const existingReview = await this.getUserReviewForCourse(
        data.userId,
        data.courseId
      );
      if (existingReview) {
        throw new Error('User has already reviewed this course');
      }

      const review = new ReviewEntity({
        ...data,
        isApproved: true, // Auto-approve for now, can add moderation later
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      });

      await this.reviewsTable.createEntity(review);

      const userReviewEntity = review.toUserReviewEntity();
      await this.reviewsTable.createEntity(userReviewEntity);

      return review;
    } catch (error: any) {
      console.error('Error creating review:', error);
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  async getReviewById(
    reviewId: string,
    courseId: string
  ): Promise<ReviewEntity | null> {
    try {
      const partitionKey = `REVIEW_${courseId}`;
      const entity = await this.reviewsTable.getEntity(partitionKey, reviewId);

      if (!entity) return null;

      return this.mapEntityToReview(entity);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      console.error('Error getting review:', error);
      throw new Error(`Failed to get review: ${error.message}`);
    }
  }

  async getReviewsForCourse(
    courseId: string,
    options: ReviewListOptions = {}
  ): Promise<{
    reviews: ReviewEntity[];
    continuationToken?: string;
  }> {
    try {
      const { limit = 20 } = options;
      const partitionKey = `REVIEW_${courseId}`;

      const entities = this.reviewsTable.listEntities();
      const reviews: ReviewEntity[] = [];

      for await (const entity of entities) {
        if (
          entity.partitionKey === partitionKey &&
          !entity.rowKey?.toString().startsWith('USER_REVIEWS_')
        ) {
          reviews.push(this.mapEntityToReview(entity));

          if (limit && reviews.length >= limit) {
            break;
          }
        }
      }

      // Sort by creation date (newest first) and then by upvotes
      reviews.sort((a, b) => {
        const dateCompare = b.createdAt.getTime() - a.createdAt.getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.upvotes - a.upvotes;
      });

      return { reviews };
    } catch (error: any) {
      console.error('Error getting reviews for course:', error);
      throw new Error(`Failed to get reviews: ${error.message}`);
    }
  }

  async getUserReviewForCourse(
    userId: string,
    courseId: string
  ): Promise<ReviewEntity | null> {
    try {
      const partitionKey = `USER_REVIEWS_${userId}`;
      const entities = this.reviewsTable.listEntities();

      for await (const entity of entities) {
        if (entity.partitionKey === partitionKey) {
          const userReview = entity as unknown as UserReviewEntity;
          if (userReview.courseId === courseId) {
            return await this.getReviewById(entity.rowKey as string, courseId);
          }
        }
      }

      return null;
    } catch (error: any) {
      console.error('Error getting user review:', error);
      throw new Error(`Failed to get user review: ${error.message}`);
    }
  }

  async updateReview(
    reviewId: string,
    courseId: string,
    userId: string,
    updateData: Partial<ReviewCreateData>
  ): Promise<ReviewEntity> {
    try {
      const review = await this.getReviewById(reviewId, courseId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.userId !== userId) {
        throw new Error('Unauthorized: Can only update your own reviews');
      }

      if (
        updateData.rating !== undefined ||
        updateData.difficulty !== undefined ||
        updateData.workload !== undefined
      ) {
        this.validateRatings(
          updateData.rating ?? review.rating,
          updateData.difficulty ?? review.difficulty,
          updateData.workload ?? review.workload
        );
      }

      const updatedReview = {
        ...review,
        ...updateData,
        updatedAt: new Date(),
      };

      await this.reviewsTable.updateEntity(updatedReview, 'Replace');
      return this.mapEntityToReview(updatedReview);
    } catch (error: any) {
      console.error('Error updating review:', error);
      throw new Error(`Failed to update review: ${error.message}`);
    }
  }

  async deleteReview(
    reviewId: string,
    courseId: string,
    userId: string
  ): Promise<void> {
    try {
      const review = await this.getReviewById(reviewId, courseId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.userId !== userId) {
        throw new Error('Unauthorized: Can only delete your own reviews');
      }

      const partitionKey = `REVIEW_${courseId}`;
      await this.reviewsTable.deleteEntity(partitionKey, reviewId);

      const userPartitionKey = `USER_REVIEWS_${userId}`;
      await this.reviewsTable.deleteEntity(userPartitionKey, reviewId);

      await this.deleteCommentsForReview(reviewId);
    } catch (error: any) {
      console.error('Error deleting review:', error);
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }

  async createComment(data: CommentCreateData): Promise<CommentEntity> {
    try {
      const comment = new CommentEntity({
        ...data,
        isApproved: true, // Auto-approve for now
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      });

      await this.commentsTable.createEntity(comment);
      return comment;
    } catch (error: any) {
      console.error('Error creating comment:', error);
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  async getCommentsForReview(
    reviewId: string,
    options: Omit<CommentListOptions, 'reviewId'> = {}
  ): Promise<{
    comments: CommentEntity[];
    continuationToken?: string;
  }> {
    try {
      const { limit = 50 } = options;
      const partitionKey = `COMMENT_${reviewId}`;

      const entities = this.commentsTable.listEntities();
      const comments: CommentEntity[] = [];

      for await (const entity of entities) {
        if (entity.partitionKey === partitionKey) {
          comments.push(this.mapEntityToComment(entity));

          if (limit && comments.length >= limit) {
            break;
          }
        }
      }

      // Sort by creation date (oldest first for comment threads)
      comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return { comments };
    } catch (error: any) {
      console.error('Error getting comments:', error);
      throw new Error(`Failed to get comments: ${error.message}`);
    }
  }

  async updateComment(
    commentId: string,
    reviewId: string,
    userId: string,
    commentText: string
  ): Promise<CommentEntity> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      const entity = await this.commentsTable.getEntity(
        partitionKey,
        commentId
      );

      if (!entity) {
        throw new Error('Comment not found');
      }

      const comment = this.mapEntityToComment(entity);
      if (comment.userId !== userId) {
        throw new Error('Unauthorized: Can only update your own comments');
      }

      const updatedComment = {
        ...comment,
        commentText,
        updatedAt: new Date(),
      };

      await this.commentsTable.updateEntity(updatedComment, 'Replace');
      return this.mapEntityToComment(updatedComment);
    } catch (error: any) {
      console.error('Error updating comment:', error);
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  async deleteComment(
    commentId: string,
    reviewId: string,
    userId: string
  ): Promise<void> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      const entity = await this.commentsTable.getEntity(
        partitionKey,
        commentId
      );

      if (!entity) {
        throw new Error('Comment not found');
      }

      const comment = this.mapEntityToComment(entity);
      if (comment.userId !== userId) {
        throw new Error('Unauthorized: Can only delete your own comments');
      }

      await this.commentsTable.deleteEntity(partitionKey, commentId);
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  async voteOnReview(
    reviewId: string,
    courseId: string,
    voteData: VoteData
  ): Promise<ReviewEntity> {
    try {
      const review = await this.getReviewById(reviewId, courseId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.userId === voteData.userId) {
        throw new Error('Cannot vote on your own review');
      }

      // TODO: Implement logic to prevent multiple votes from the same user
      const updatedReview = { ...review };

      if (voteData.voteType === 'upvote') {
        updatedReview.upvotes += 1;
      } else {
        updatedReview.downvotes += 1;
      }

      updatedReview.updatedAt = new Date();

      await this.reviewsTable.updateEntity(updatedReview, 'Replace');
      return this.mapEntityToReview(updatedReview);
    } catch (error: any) {
      console.error('Error voting on review:', error);
      throw new Error(`Failed to vote on review: ${error.message}`);
    }
  }

  async voteOnComment(
    commentId: string,
    reviewId: string,
    voteData: VoteData
  ): Promise<CommentEntity> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      const entity = await this.commentsTable.getEntity(
        partitionKey,
        commentId
      );

      if (!entity) {
        throw new Error('Comment not found');
      }

      const comment = this.mapEntityToComment(entity);
      if (comment.userId === voteData.userId) {
        throw new Error('Cannot vote on your own comment');
      }

      const updatedComment = { ...comment };

      if (voteData.voteType === 'upvote') {
        updatedComment.upvotes += 1;
      } else {
        updatedComment.downvotes += 1;
      }

      updatedComment.updatedAt = new Date();

      await this.commentsTable.updateEntity(updatedComment, 'Replace');
      return this.mapEntityToComment(updatedComment);
    } catch (error: any) {
      console.error('Error voting on comment:', error);
      throw new Error(`Failed to vote on comment: ${error.message}`);
    }
  }

  private validateRatings(
    rating: number,
    difficulty: number,
    workload: number
  ): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (difficulty < 1 || difficulty > 5) {
      throw new Error('Difficulty must be between 1 and 5');
    }
    if (workload < 1 || workload > 5) {
      throw new Error('Workload must be between 1 and 5');
    }
  }

  private async deleteCommentsForReview(reviewId: string): Promise<void> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      const entities = this.commentsTable.listEntities();

      for await (const entity of entities) {
        if (entity.partitionKey === partitionKey) {
          await this.commentsTable.deleteEntity(
            partitionKey,
            entity.rowKey as string
          );
        }
      }
    } catch (error: any) {
      console.error('Error deleting comments for review:', error);
    }
  }

  private mapEntityToReview(entity: any): ReviewEntity {
    return new ReviewEntity({
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
  }

  private mapEntityToComment(entity: any): CommentEntity {
    return new CommentEntity({
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
  }
}

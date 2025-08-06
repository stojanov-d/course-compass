import { TableClient } from '@azure/data-tables';
import { ReviewEntity, UserReviewEntity } from '../entities/ReviewEntity';
import { CommentEntity } from '../entities/CommentEntity';
import {
  VoteEntity,
  VoteTrackingData,
  VoteResult,
} from '../entities/VoteEntity';
import { TableService } from './TableService';
import { UserService } from './UserService';
import { CourseService } from './CourseService';
import { TABLE_NAMES } from '../config/tableStorage';
import { inputSanitizationService } from './InputSanitizationService';
import { rateLimitService } from './RateLimitService';
import { cacheService } from './CacheService';

class ReviewServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'ReviewServiceError';
  }
}

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

export interface ReviewWithUser {
  reviewId: string;
  courseId: string;
  authorId: string; // Always present - the actual user ID who wrote the review
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  } | null;
  rating: number;
  difficulty: number;
  workload: number;
  recommendsCourse: boolean;
  reviewText: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  commentsCount: number;
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
  private votesTable: TableClient;
  private userService: UserService;
  private courseService: CourseService;

  constructor() {
    this.tableService = new TableService();
    this.reviewsTable = this.tableService.getTableClient(TABLE_NAMES.REVIEWS);
    this.commentsTable = this.tableService.getTableClient(TABLE_NAMES.COMMENTS);
    this.votesTable = this.tableService.getTableClient(TABLE_NAMES.VOTES);
    this.userService = new UserService();
    this.courseService = new CourseService();
  }

  private handleError(operation: string, error: any): never {
    console.error(`Error in ${operation}:`, error);

    if (error.statusCode === 404) {
      throw new ReviewServiceError(
        `Resource not found during ${operation}`,
        'NOT_FOUND',
        404
      );
    }

    if (error.statusCode === 409) {
      throw new ReviewServiceError(
        `Conflict during ${operation}`,
        'CONFLICT',
        409
      );
    }

    throw new ReviewServiceError(
      `Failed to ${operation}: ${error.message}`,
      'INTERNAL_ERROR',
      500
    );
  }

  async createReview(data: ReviewCreateData): Promise<ReviewEntity> {
    try {
      // Validate and sanitize input
      inputSanitizationService.validateRating(data.rating);
      inputSanitizationService.validateRating(data.difficulty);
      inputSanitizationService.validateRating(data.workload);

      const sanitizedReviewText = inputSanitizationService.sanitizeReview(
        data.reviewText
      );

      const existingReview = await this.getUserReviewForCourse(
        data.userId,
        data.courseId
      );
      if (existingReview) {
        throw new Error('User has already reviewed this course');
      }

      const review = new ReviewEntity({
        ...data,
        reviewText: sanitizedReviewText,
        isApproved: true, // Auto-approve for now, can add moderation later
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      });

      await this.reviewsTable.createEntity(review);

      const userReviewEntity = review.toUserReviewEntity();
      await this.reviewsTable.createEntity(userReviewEntity);

      await this.updateCourseStatistics(data.courseId);

      return review;
    } catch (error: any) {
      this.handleError('create review', error);
    }
  }

  async getReviewById(
    reviewId: string,
    courseId: string
  ): Promise<ReviewEntity | null> {
    try {
      const cacheKey = `review:${courseId}:${reviewId}`;
      const cachedReview = await cacheService.get<ReviewEntity>(cacheKey);
      if (cachedReview) {
        return cachedReview;
      }

      const partitionKey = `REVIEW_${courseId}`;
      const entity = await this.reviewsTable.getEntity(partitionKey, reviewId);

      if (!entity) return null;

      const review = this.mapEntityToReview(entity);

      await cacheService.set(cacheKey, review, 300000);

      return review;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      this.handleError('get review by id', error);
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

  async getReviewsForCourseWithUsers(
    courseId: string,
    options: ReviewListOptions = {}
  ): Promise<{
    reviews: ReviewWithUser[];
    continuationToken?: string;
  }> {
    const result = await this.getReviewsForCourse(courseId, options);
    const reviewsWithUsers = await this.populateUserDataInReviews(
      result.reviews
    );

    return {
      reviews: reviewsWithUsers,
      continuationToken: result.continuationToken,
    };
  }

  async getUserReviewForCourse(
    userId: string,
    courseId: string
  ): Promise<ReviewEntity | null> {
    try {
      const cacheKey = `user-review:${userId}:${courseId}`;
      const cachedReview = await cacheService.get<ReviewEntity>(cacheKey);
      if (cachedReview) {
        return cachedReview;
      }

      const partitionKey = `USER_REVIEWS_${userId}`;
      const entities = this.reviewsTable.listEntities();

      for await (const entity of entities) {
        if (entity.partitionKey === partitionKey) {
          const userReview = entity as unknown as UserReviewEntity;
          if (userReview.courseId === courseId) {
            const review = await this.getReviewById(
              entity.rowKey as string,
              courseId
            );

            if (review) {
              await cacheService.set(cacheKey, review, 300000);
            }

            return review;
          }
        }
      }

      return null;
    } catch (error: any) {
      this.handleError('get user review for course', error);
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
        if (updateData.rating !== undefined) {
          inputSanitizationService.validateRating(updateData.rating);
        }
        if (updateData.difficulty !== undefined) {
          inputSanitizationService.validateRating(updateData.difficulty);
        }
        if (updateData.workload !== undefined) {
          inputSanitizationService.validateRating(updateData.workload);
        }
      }

      const updatedReview = {
        ...review,
        ...updateData,
        updatedAt: new Date(),
      };

      await this.reviewsTable.updateEntity(updatedReview, 'Replace');

      if (updateData.rating !== undefined) {
        await this.updateCourseStatistics(courseId);
      }

      const cacheKey = `review:${courseId}:${reviewId}`;
      const userCacheKey = `user-review:${userId}:${courseId}`;
      await cacheService.delete(cacheKey);
      await cacheService.delete(userCacheKey);

      return this.mapEntityToReview(updatedReview);
    } catch (error: any) {
      this.handleError('update review', error);
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

      await this.updateCourseStatistics(courseId);

      const cacheKey = `review:${courseId}:${reviewId}`;
      const userCacheKey = `user-review:${userId}:${courseId}`;
      await cacheService.delete(cacheKey);
      await cacheService.delete(userCacheKey);
    } catch (error: any) {
      this.handleError('delete review', error);
    }
  }

  async adminDeleteReview(reviewId: string, courseId: string): Promise<void> {
    try {
      const review = await this.getReviewById(reviewId, courseId);
      if (!review) {
        throw new Error('Review not found');
      }

      const partitionKey = `REVIEW_${courseId}`;
      await this.reviewsTable.deleteEntity(partitionKey, reviewId);

      const userPartitionKey = `USER_REVIEWS_${review.userId}`;
      await this.reviewsTable.deleteEntity(userPartitionKey, reviewId);

      await this.deleteCommentsForReview(reviewId);

      await this.updateCourseStatistics(courseId);

      const cacheKey = `review:${courseId}:${reviewId}`;
      const userCacheKey = `user-review:${review.userId}:${courseId}`;
      await cacheService.delete(cacheKey);
      await cacheService.delete(userCacheKey);
    } catch (error: any) {
      this.handleError('admin delete review', error);
    }
  }

  async createComment(data: CommentCreateData): Promise<CommentEntity> {
    try {
      if (!rateLimitService.checkRateLimit(data.userId, 'comment')) {
        throw new Error('Rate limit exceeded for comments');
      }

      const sanitizedCommentText = inputSanitizationService.sanitizeComment(
        data.commentText
      );

      const comment = new CommentEntity({
        ...data,
        commentText: sanitizedCommentText,
        isApproved: true, // Auto-approve for now
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      });

      await this.commentsTable.createEntity(comment);
      return comment;
    } catch (error: any) {
      this.handleError('create comment', error);
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

  async adminDeleteComment(commentId: string, reviewId: string): Promise<void> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      const entity = await this.commentsTable.getEntity(
        partitionKey,
        commentId
      );

      if (!entity) {
        throw new Error('Comment not found');
      }

      await this.commentsTable.deleteEntity(partitionKey, commentId);
    } catch (error: any) {
      console.error('Error deleting comment (admin):', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  async voteOnReview(
    reviewId: string,
    courseId: string,
    voteData: VoteData
  ): Promise<{ review: ReviewEntity; voteResult: VoteResult }> {
    try {
      if (!rateLimitService.checkRateLimit(voteData.userId, 'vote')) {
        throw new Error('Rate limit exceeded for voting');
      }

      const review = await this.getReviewById(reviewId, courseId);
      if (!review) {
        throw new Error('Review not found');
      }

      const voteTrackingData: VoteTrackingData = {
        userId: voteData.userId,
        voteType: voteData.voteType,
        targetType: 'review',
        targetId: reviewId,
      };

      const voteResult = await this.processVote(voteTrackingData);

      const updatedReview = await this.updateReviewVoteCounts(
        reviewId,
        courseId
      );

      return {
        review: updatedReview,
        voteResult: voteResult,
      };
    } catch (error: any) {
      console.error('Error voting on review:', error);
      throw new Error(`Failed to vote on review: ${error.message}`);
    }
  }

  async voteOnComment(
    commentId: string,
    reviewId: string,
    voteData: VoteData
  ): Promise<{ comment: CommentEntity; voteResult: VoteResult }> {
    try {
      // Check rate limit
      if (!rateLimitService.checkRateLimit(voteData.userId, 'vote')) {
        throw new Error('Rate limit exceeded for voting');
      }

      const partitionKey = `COMMENT_${reviewId}`;
      const entity = await this.commentsTable.getEntity(
        partitionKey,
        commentId
      );

      if (!entity) {
        throw new Error('Comment not found');
      }

      const voteTrackingData: VoteTrackingData = {
        userId: voteData.userId,
        voteType: voteData.voteType,
        targetType: 'comment',
        targetId: commentId,
      };

      const voteResult = await this.processVote(voteTrackingData);

      const updatedComment = await this.updateCommentVoteCounts(
        commentId,
        reviewId
      );

      return {
        comment: updatedComment,
        voteResult: voteResult,
      };
    } catch (error: any) {
      console.error('Error voting on comment:', error);
      throw new Error(`Failed to vote on comment: ${error.message}`);
    }
  }

  private async updateCourseStatistics(courseId: string): Promise<void> {
    try {
      let course = await this.courseService.getCourseById(courseId);

      if (!course) {
        course = await this.courseService.getCourseByCode(courseId);
        if (!course) {
          console.error(`Course not found with ID or code: ${courseId}`);
          return;
        }
      }

      const reviews = await this.getReviewsForCourse(courseId);

      if (reviews.reviews.length === 0) {
        await this.courseService.updateCourseRating(course.courseId, 0, 0);
        return;
      }

      const totalRating = reviews.reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating = totalRating / reviews.reviews.length;

      await this.courseService.updateCourseRating(
        course.courseId,
        averageRating,
        reviews.reviews.length
      );

      console.log(
        `Updated course ${course.courseCode} (${course.courseId}) statistics: ${averageRating.toFixed(2)} avg rating, ${reviews.reviews.length} total reviews`
      );
    } catch (error: any) {
      console.error(`Error updating course statistics for ${courseId}:`, error);
    }
  }

  async recalculateCourseStatistics(courseId: string): Promise<{
    averageRating: number;
    totalReviews: number;
  }> {
    await this.updateCourseStatistics(courseId);

    // Return the calculated stats
    const reviews = await this.getReviewsForCourse(courseId);
    if (reviews.reviews.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const totalRating = reviews.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = totalRating / reviews.reviews.length;

    return {
      averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
      totalReviews: reviews.reviews.length,
    };
  }

  private async processVote(voteData: VoteTrackingData): Promise<VoteResult> {
    const partitionKey = `VOTE_${voteData.targetType.toUpperCase()}_${voteData.targetId}`;
    const rowKey = voteData.userId;

    try {
      const existingVote = await this.votesTable.getEntity(
        partitionKey,
        rowKey
      );
      const existingVoteEntity = this.mapEntityToVote(existingVote);

      if (existingVoteEntity.voteType === voteData.voteType) {
        await this.votesTable.deleteEntity(partitionKey, rowKey);

        const votes = await this.getVotesByPartitionKey(partitionKey);
        const upvotes = votes.filter(
          (vote) => vote.voteType === 'upvote'
        ).length;
        const downvotes = votes.filter(
          (vote) => vote.voteType === 'downvote'
        ).length;

        return {
          success: true,
          action: 'removed',
          previousVote: existingVoteEntity.voteType,
          currentVote: null,
          upvotes,
          downvotes,
        };
      } else {
        const updatedVote = new VoteEntity({
          targetType: voteData.targetType,
          targetId: voteData.targetId,
          voteType: voteData.voteType,
          userId: voteData.userId,
          createdAt: existingVoteEntity.createdAt,
          updatedAt: new Date(),
        });

        await this.votesTable.updateEntity(updatedVote, 'Replace');

        const votes = await this.getVotesByPartitionKey(partitionKey);
        const upvotes = votes.filter(
          (vote) => vote.voteType === 'upvote'
        ).length;
        const downvotes = votes.filter(
          (vote) => vote.voteType === 'downvote'
        ).length;

        return {
          success: true,
          action: 'updated',
          previousVote: existingVoteEntity.voteType,
          currentVote: voteData.voteType,
          upvotes,
          downvotes,
        };
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        const newVote = new VoteEntity({
          targetType: voteData.targetType,
          targetId: voteData.targetId,
          voteType: voteData.voteType,
          userId: voteData.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await this.votesTable.createEntity(newVote);

        const votes = await this.getVotesByPartitionKey(partitionKey);
        const upvotes = votes.filter(
          (vote) => vote.voteType === 'upvote'
        ).length;
        const downvotes = votes.filter(
          (vote) => vote.voteType === 'downvote'
        ).length;

        return {
          success: true,
          action: 'created',
          previousVote: null,
          currentVote: voteData.voteType,
          upvotes,
          downvotes,
        };
      }
      throw error;
    }
  }

  private async updateReviewVoteCounts(
    reviewId: string,
    courseId: string
  ): Promise<ReviewEntity> {
    const partitionKey = `VOTE_REVIEW_${reviewId}`;

    const votes = await this.getVotesByPartitionKey(partitionKey);
    const upvotes = votes.filter((vote) => vote.voteType === 'upvote').length;
    const downvotes = votes.filter(
      (vote) => vote.voteType === 'downvote'
    ).length;

    const review = await this.getReviewById(reviewId, courseId);
    if (!review) {
      throw new Error('Review not found');
    }

    const updatedReview = {
      ...review,
      upvotes,
      downvotes,
      updatedAt: new Date(),
    };

    await this.reviewsTable.updateEntity(updatedReview, 'Replace');
    return this.mapEntityToReview(updatedReview);
  }

  private async updateCommentVoteCounts(
    commentId: string,
    reviewId: string
  ): Promise<CommentEntity> {
    const partitionKey = `VOTE_COMMENT_${commentId}`;

    const votes = await this.getVotesByPartitionKey(partitionKey);
    const upvotes = votes.filter((vote) => vote.voteType === 'upvote').length;
    const downvotes = votes.filter(
      (vote) => vote.voteType === 'downvote'
    ).length;

    const commentPartitionKey = `COMMENT_${reviewId}`;
    const entity = await this.commentsTable.getEntity(
      commentPartitionKey,
      commentId
    );
    const comment = this.mapEntityToComment(entity);

    const updatedComment = {
      ...comment,
      upvotes,
      downvotes,
      updatedAt: new Date(),
    };

    await this.commentsTable.updateEntity(updatedComment, 'Replace');
    return this.mapEntityToComment(updatedComment);
  }

  private async getVotesByPartitionKey(
    partitionKey: string
  ): Promise<VoteEntity[]> {
    const votes: VoteEntity[] = [];
    const entities = this.votesTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });

    for await (const entity of entities) {
      votes.push(this.mapEntityToVote(entity));
    }

    return votes;
  }

  private mapEntityToVote(entity: any): VoteEntity {
    return new VoteEntity({
      targetType: entity.targetType,
      targetId: entity.targetId,
      voteType: entity.voteType,
      userId: entity.userId,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    });
  }

  async getUserVote(
    userId: string,
    targetType: 'review' | 'comment',
    targetId: string
  ): Promise<VoteEntity | null> {
    try {
      const partitionKey = `VOTE_${targetType.toUpperCase()}_${targetId}`;
      const entity = await this.votesTable.getEntity(partitionKey, userId);
      return this.mapEntityToVote(entity);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async deleteCommentsForReview(reviewId: string): Promise<void> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      // Use batch operations instead of individual deletes
      const entities = this.commentsTable.listEntities({
        queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
      });

      const deleteOperations: any[] = [];
      for await (const entity of entities) {
        deleteOperations.push(['delete', entity]);

        // Process in batches of 100 (Azure Table Storage limit)
        if (deleteOperations.length === 100) {
          await this.commentsTable.submitTransaction(deleteOperations);
          deleteOperations.length = 0;
        }
      }

      // Process remaining operations
      if (deleteOperations.length > 0) {
        await this.commentsTable.submitTransaction(deleteOperations);
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

  async populateUserDataInReviews(
    reviews: ReviewEntity[]
  ): Promise<ReviewWithUser[]> {
    const populatedReviews: ReviewWithUser[] = [];

    for (const review of reviews) {
      const populatedReview = await this.populateUserDataInReview(review);
      populatedReviews.push(populatedReview);
    }

    return populatedReviews;
  }

  private async getCommentsCountForReview(reviewId: string): Promise<number> {
    try {
      const partitionKey = `COMMENT_${reviewId}`;
      const entities = this.commentsTable.listEntities({
        queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
      });

      let count = 0;
      for await (const _entity of entities) {
        count++;
      }

      return count;
    } catch (error: any) {
      console.error('Error counting comments for review:', error);
      return 0;
    }
  }

  async populateUserDataInReview(
    review: ReviewEntity
  ): Promise<ReviewWithUser> {
    let user = null;

    if (!review.isAnonymous) {
      const userEntity = await this.userService.getUserById(review.userId);
      if (userEntity) {
        user = {
          id: userEntity.userId,
          displayName: userEntity.displayName,
          avatarUrl: userEntity.avatarUrl,
        };
      }
    }

    const commentsCount = await this.getCommentsCountForReview(review.reviewId);

    return {
      reviewId: review.reviewId,
      courseId: review.courseId,
      authorId: review.userId, // Always include the actual user ID
      user: user,
      rating: review.rating,
      difficulty: review.difficulty,
      workload: review.workload,
      recommendsCourse: review.recommendsCourse,
      reviewText: review.reviewText,
      isAnonymous: review.isAnonymous,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      upvotes: review.upvotes,
      downvotes: review.downvotes,
      commentsCount: commentsCount,
    };
  }
}

import { ReviewEntity } from '../entities/ReviewEntity';
import { CommentEntity } from '../entities/CommentEntity';
import {
  VoteEntity,
  VoteTrackingData,
  VoteResult,
} from '../entities/VoteEntity';
import { TableService } from './TableService';
import { UserService } from './UserService';
import { CourseService } from './CourseService';
import { inputSanitizationService } from './InputSanitizationService';
import ReviewTableRepository from '../repositories/azure/ReviewTableRepository';
import CommentTableRepository from '../repositories/azure/CommentTableRepository';
import VoteTableRepository from '../repositories/azure/VoteTableRepository';
import type IReviewRepository from '../repositories/interfaces/IReviewRepository';
import type ICommentRepository from '../repositories/interfaces/ICommentRepository';
import type IVoteRepository from '../repositories/interfaces/IVoteRepository';

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
  private userService: UserService;
  private courseService: CourseService;
  private reviewRepo: IReviewRepository;
  private commentRepo: ICommentRepository;
  private voteRepo: IVoteRepository;

  constructor(
    reviewRepo?: IReviewRepository,
    commentRepo?: ICommentRepository,
    voteRepo?: IVoteRepository
  ) {
    this.tableService = new TableService();
    this.userService = new UserService();
    this.courseService = new CourseService();
    this.reviewRepo =
      reviewRepo || new ReviewTableRepository(this.tableService);
    this.commentRepo =
      commentRepo || new CommentTableRepository(this.tableService);
    this.voteRepo = voteRepo || new VoteTableRepository(this.tableService);
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

      const userReviewEntity = review.toUserReviewEntity();
      await this.reviewRepo.create(review, userReviewEntity);

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
      const review = await this.reviewRepo.getById(reviewId, courseId);
      if (!review) return null;
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
      const { limit = 20, continuationToken } = options;
      const result = await this.reviewRepo.listByCourseWithToken(
        courseId,
        limit,
        continuationToken
      );
      return result;
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
      const review = await this.reviewRepo.getUserReviewForCourse(
        userId,
        courseId
      );
      return review;
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

      const updatedReview = new ReviewEntity({
        ...review,
        ...updateData,
        updatedAt: new Date(),
      });

      await this.reviewRepo.update(updatedReview as any);

      if (updateData.rating !== undefined) {
        await this.updateCourseStatistics(courseId);
      }

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

      await this.reviewRepo.delete(reviewId, courseId, userId);

      await this.deleteCommentsForReview(reviewId);

      await this.updateCourseStatistics(courseId);
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

      await this.reviewRepo.adminDelete(reviewId, courseId, review.userId);
      await this.deleteCommentsForReview(reviewId);
      await this.updateCourseStatistics(courseId);
    } catch (error: any) {
      this.handleError('admin delete review', error);
    }
  }

  async createComment(data: CommentCreateData): Promise<CommentEntity> {
    try {
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

      await this.commentRepo.create(comment);
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
      const comments = await this.commentRepo.listByReview(reviewId, limit);
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
      const entity = await this.commentRepo.getById(reviewId, commentId);
      if (!entity) {
        throw new Error('Comment not found');
      }
      const comment = entity;
      if (comment.userId !== userId) {
        throw new Error('Unauthorized: Can only update your own comments');
      }

      const updatedComment = {
        ...comment,
        commentText,
        updatedAt: new Date(),
      };

      await this.commentRepo.update(updatedComment as any);
      return updatedComment as any;
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
      const entity = await this.commentRepo.getById(reviewId, commentId);
      if (!entity) {
        throw new Error('Comment not found');
      }
      const comment = entity;
      if (comment.userId !== userId) {
        throw new Error('Unauthorized: Can only delete your own comments');
      }
      await this.commentRepo.delete(reviewId, commentId);
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  async adminDeleteComment(commentId: string, reviewId: string): Promise<void> {
    try {
      const entity = await this.commentRepo.getById(reviewId, commentId);
      if (!entity) {
        throw new Error('Comment not found');
      }
      await this.commentRepo.delete(reviewId, commentId);
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

      const voteResult = await this.voteRepo.processVote(
        voteData.userId,
        voteTrackingData.targetType,
        voteTrackingData.targetId,
        voteData.voteType
      );

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
      const entity = await this.commentRepo.getById(reviewId, commentId);
      if (!entity) {
        throw new Error('Comment not found');
      }

      const voteTrackingData: VoteTrackingData = {
        userId: voteData.userId,
        voteType: voteData.voteType,
        targetType: 'comment',
        targetId: commentId,
      };

      const voteResult = await this.voteRepo.processVote(
        voteData.userId,
        voteTrackingData.targetType,
        voteTrackingData.targetId,
        voteData.voteType
      );

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
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews: reviews.reviews.length,
    };
  }

  private async processVote(voteData: VoteTrackingData): Promise<VoteResult> {
    return await this.voteRepo.processVote(
      voteData.userId,
      voteData.targetType,
      voteData.targetId,
      voteData.voteType
    );
  }

  private async updateReviewVoteCounts(
    reviewId: string,
    courseId: string
  ): Promise<ReviewEntity> {
    const { upvotes, downvotes } = await this.voteRepo.countVotes(
      'review',
      reviewId
    );

    const review = await this.getReviewById(reviewId, courseId);
    if (!review) {
      throw new Error('Review not found');
    }

    const updatedReview = new ReviewEntity({
      reviewId: review.reviewId,
      userId: review.userId,
      courseId: review.courseId,
      professorId: review.professorId,
      rating: review.rating,
      difficulty: review.difficulty,
      workload: review.workload,
      recommendsCourse: review.recommendsCourse,
      reviewText: review.reviewText,
      isAnonymous: review.isAnonymous,
      isApproved: review.isApproved,
      createdAt: review.createdAt,
      updatedAt: new Date(),
      upvotes,
      downvotes,
    });

    await this.reviewRepo.update(updatedReview);
    return updatedReview;
  }

  private async updateCommentVoteCounts(
    commentId: string,
    reviewId: string
  ): Promise<CommentEntity> {
    const { upvotes, downvotes } = await this.voteRepo.countVotes(
      'comment',
      commentId
    );

    const entity = await this.commentRepo.getById(reviewId, commentId);
    if (!entity) {
      throw new Error('Comment not found');
    }
    const updatedComment = {
      ...entity,
      upvotes,
      downvotes,
      updatedAt: new Date(),
    } as CommentEntity;
    await this.commentRepo.update(updatedComment);
    return updatedComment;
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
      const vote = await this.voteRepo.getUserVote(
        userId,
        targetType,
        targetId
      );
      return vote;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async deleteCommentsForReview(reviewId: string): Promise<void> {
    try {
      await this.commentRepo.deleteAllForReview(reviewId);
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
      return await this.commentRepo.countByReview(reviewId);
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

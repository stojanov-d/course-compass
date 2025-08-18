import { ReviewEntity, UserReviewEntity } from '../../entities/ReviewEntity';

export interface ReviewListOptions {
  courseId?: string;
  userId?: string;
  limit?: number;
  continuationToken?: string;
}

export interface IReviewRepository {
  create(review: ReviewEntity, userReview: UserReviewEntity): Promise<void>;
  getById(reviewId: string, courseId: string): Promise<ReviewEntity | null>;
  listByCourse(courseId: string, limit?: number): Promise<ReviewEntity[]>;
  listByCourseWithToken(
    courseId: string,
    limit?: number,
    continuationToken?: string
  ): Promise<{ reviews: ReviewEntity[]; continuationToken?: string }>;
  listByUser(userId: string, limit?: number): Promise<ReviewEntity[]>;
  getUserReviewForCourse(
    userId: string,
    courseId: string
  ): Promise<ReviewEntity | null>;
  update(review: ReviewEntity): Promise<void>;
  delete(reviewId: string, courseId: string, userId: string): Promise<void>;
  adminDelete(
    reviewId: string,
    courseId: string,
    userId: string
  ): Promise<void>;
}

export default IReviewRepository;

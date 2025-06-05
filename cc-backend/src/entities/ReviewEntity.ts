import { BaseTableEntity } from './BaseEntity';

export interface IReviewEntity {
  reviewId: string;
  userId: string;
  courseId: string;
  professorId?: string;
  rating: number; // 1-5
  difficulty: number; // 1-5
  workload: number; // 1-5
  recommendsCourse: boolean;
  reviewText: string;
  isAnonymous: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  downvotes: number;
}

export class ReviewEntity extends BaseTableEntity implements IReviewEntity {
  public reviewId: string;
  public userId: string;
  public courseId: string;
  public professorId?: string;
  public rating: number;
  public difficulty: number;
  public workload: number;
  public recommendsCourse: boolean;
  public reviewText: string;
  public isAnonymous: boolean;
  public isApproved: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public upvotes: number;
  public downvotes: number;

  constructor(data: Omit<IReviewEntity, 'reviewId'> & { reviewId?: string }) {
    const reviewId = data.reviewId || crypto.randomUUID();
    // Partition by course for efficient querying of course reviews
    super(`REVIEW_${data.courseId}`, reviewId);

    this.reviewId = reviewId;
    this.userId = data.userId;
    this.courseId = data.courseId;
    this.professorId = data.professorId;
    this.rating = data.rating;
    this.difficulty = data.difficulty;
    this.workload = data.workload;
    this.recommendsCourse = data.recommendsCourse;
    this.reviewText = data.reviewText;
    this.isAnonymous = data.isAnonymous;
    this.isApproved = data.isApproved;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.upvotes = data.upvotes;
    this.downvotes = data.downvotes;
  }

  public toUserReviewEntity(): UserReviewEntity {
    return new UserReviewEntity(
      this.userId,
      this.reviewId,
      this.courseId,
      this.createdAt
    );
  }
}

export class UserReviewEntity extends BaseTableEntity {
  public courseId: string;
  public createdAt: Date;

  constructor(
    userId: string,
    reviewId: string,
    courseId: string,
    createdAt: Date
  ) {
    super(`USER_REVIEWS_${userId}`, reviewId);
    this.courseId = courseId;
    this.createdAt = createdAt;
  }
}

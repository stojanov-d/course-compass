import { BaseTableEntity } from './BaseEntity';

export interface ICommentEntity {
  commentId: string;
  reviewId: string;
  userId: string;
  parentCommentId?: string; // For nested comments
  commentText: string;
  isAnonymous: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  downvotes: number;
}

export class CommentEntity extends BaseTableEntity implements ICommentEntity {
  public commentId: string;
  public reviewId: string;
  public userId: string;
  public parentCommentId?: string;
  public commentText: string;
  public isAnonymous: boolean;
  public isApproved: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public upvotes: number;
  public downvotes: number;

  constructor(
    data: Omit<ICommentEntity, 'commentId'> & { commentId?: string }
  ) {
    const commentId = data.commentId || crypto.randomUUID();
    super(`COMMENT_${data.reviewId}`, commentId);

    this.commentId = commentId;
    this.reviewId = data.reviewId;
    this.userId = data.userId;
    this.parentCommentId = data.parentCommentId;
    this.commentText = data.commentText;
    this.isAnonymous = data.isAnonymous;
    this.isApproved = data.isApproved;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.upvotes = data.upvotes;
    this.downvotes = data.downvotes;
  }
}

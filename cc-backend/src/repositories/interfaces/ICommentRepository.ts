import { CommentEntity } from '../../entities/CommentEntity';

export interface ICommentRepository {
  create(comment: CommentEntity): Promise<void>;
  listByReview(reviewId: string, limit?: number): Promise<CommentEntity[]>;
  getById(reviewId: string, commentId: string): Promise<CommentEntity | null>;
  update(comment: CommentEntity): Promise<void>;
  delete(reviewId: string, commentId: string): Promise<void>;
  deleteAllForReview(reviewId: string): Promise<void>;
  countByReview(reviewId: string): Promise<number>;
}

export default ICommentRepository;

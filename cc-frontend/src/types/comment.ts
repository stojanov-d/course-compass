import { User } from './user';

export interface Comment {
  commentId: string;
  reviewId: string;
  userId: string;
  parentCommentId?: string;
  commentText: string;
  isAnonymous: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  user?: Pick<User, 'id' | 'displayName' | 'avatarUrl'> | null;
}

export interface CreateCommentData {
  reviewId: string;
  commentText: string;
  isAnonymous: boolean;
}

export interface UpdateCommentData {
  commentText: string;
}

export interface CommentResponse {
  success: boolean;
  data: Comment;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
  continuationToken?: string;
}

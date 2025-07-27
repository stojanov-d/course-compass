import apiClient from './apiClient';
import {
  CreateCommentData,
  UpdateCommentData,
  CommentResponse,
  CommentsResponse,
} from '../types/comment';

export const getCommentsForReview = async (
  reviewId: string,
  limit?: number,
  continuationToken?: string
): Promise<CommentsResponse> => {
  const params = new URLSearchParams();
  if (limit) {
    params.append('limit', limit.toString());
  }
  if (continuationToken) {
    params.append('continuationToken', continuationToken);
  }

  const response = await apiClient.get(
    `/comments/${reviewId}?${params.toString()}`
  );
  return response.data;
};

export const createComment = async (
  commentData: CreateCommentData
): Promise<CommentResponse> => {
  const response = await apiClient.post('/comments', commentData);
  return response.data;
};

export const updateComment = async (
  reviewId: string,
  commentId: string,
  commentData: UpdateCommentData
): Promise<CommentResponse> => {
  const response = await apiClient.put(
    `/comments/${reviewId}/${commentId}`,
    commentData
  );
  return response.data;
};

export const deleteComment = async (
  reviewId: string,
  commentId: string
): Promise<void> => {
  await apiClient.delete(`/comments/${reviewId}/${commentId}`);
};

export const voteOnComment = async (
  reviewId: string,
  commentId: string,
  voteType: 'upvote' | 'downvote'
): Promise<{
  success: boolean;
  data: { commentId: string; upvotes: number; downvotes: number };
}> => {
  const response = await apiClient.post(
    `/vote/comment/${reviewId}/${commentId}`,
    { voteType }
  );
  return response.data;
};

export interface VoteStatusResponse {
  success: boolean;
  data: {
    hasVoted: boolean;
    voteType: 'upvote' | 'downvote' | null;
    votedAt: string | null;
  };
}

export const getUserVoteStatus = async (
  targetType: 'review' | 'comment',
  targetId: string
): Promise<VoteStatusResponse> => {
  const response = await apiClient.get(
    `/vote-status/${targetType}/${targetId}`
  );
  return response.data;
};

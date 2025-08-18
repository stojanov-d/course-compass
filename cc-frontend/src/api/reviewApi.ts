import apiClient from './apiClient';
import { Review } from '../types/review';

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  continuationToken?: string;
}

export interface VoteResponse {
  success: boolean;
  message: string;
  data: {
    reviewId: string;
    upvotes: number;
    downvotes: number;
    voteResult: {
      success: boolean;
      action: 'created' | 'updated' | 'removed';
      previousVote?: 'upvote' | 'downvote' | null;
      currentVote?: 'upvote' | 'downvote' | null;
      upvotes: number;
      downvotes: number;
    };
  };
}

export interface CreateReviewData {
  courseId: string;
  rating: number;
  difficulty: number;
  workload: number;
  reviewText: string;
  recommendsCourse: boolean;
  isAnonymous: boolean;
}

export interface UpdateReviewData {
  rating: number;
  difficulty: number;
  workload: number;
  reviewText: string;
  recommendsCourse: boolean;
  isAnonymous: boolean;
}

export const getReviewsForCourse = async (
  courseId: string,
  continuationToken?: string,
  limit?: number
): Promise<ReviewsResponse> => {
  const params = new URLSearchParams();
  if (continuationToken) params.append('continuationToken', continuationToken);
  if (limit && Number.isFinite(limit)) params.append('limit', String(limit));

  const qs = params.toString();
  const url = qs ? `/reviews/${courseId}?${qs}` : `/reviews/${courseId}`;
  const response = await apiClient.get(url);

  return {
    reviews: response.data?.data || [],
    total: (response.data?.data && response.data.data.length) || 0,
    continuationToken: response.data?.continuationToken,
  };
};

export const createReview = async (
  reviewData: CreateReviewData
): Promise<Review> => {
  const response = await apiClient.post('/reviews', reviewData);
  return response.data.data;
};

export const updateReview = async (
  courseId: string,
  reviewId: string,
  reviewData: UpdateReviewData
): Promise<Review> => {
  const response = await apiClient.put(
    `/reviews/${courseId}/${reviewId}`,
    reviewData
  );
  return response.data.data;
};

export const deleteReview = async (
  courseId: string,
  reviewId: string
): Promise<void> => {
  await apiClient.delete(`/reviews/${courseId}/${reviewId}`);
};

export const getUserReviewForCourse = async (
  courseId: string
): Promise<Review | null> => {
  try {
    const response = await apiClient.get(`/user-reviews/course/${courseId}`);
    return response.data.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 404) {
      return null; // User hasn't reviewed this course yet
    }
    throw error;
  }
};

export const voteOnReview = async (
  courseId: string,
  reviewId: string,
  voteType: 'upvote' | 'downvote'
): Promise<VoteResponse> => {
  const response = await apiClient.post(
    `/vote/review/${courseId}/${reviewId}`,
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

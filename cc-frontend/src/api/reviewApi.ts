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
  };
}

export const getReviewsForCourse = async (
  courseId: string,
  continuationToken?: string
): Promise<ReviewsResponse> => {
  const params = new URLSearchParams();
  if (continuationToken) {
    params.append('continuationToken', continuationToken);
  }

  const response = await apiClient.get(
    `/reviews/${courseId}?${params.toString()}`
  );
  return response.data;
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

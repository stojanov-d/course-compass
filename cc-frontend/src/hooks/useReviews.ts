/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { Review } from '../types/review';
import { getReviewsForCourse, voteOnReview } from '../api/reviewApi';

export const useReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setContinuationToken] = useState<string | undefined>();

  const fetchReviews = useCallback(async (courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReviewsForCourse(courseId);
      setReviews(response.reviews);
      setContinuationToken(response.continuationToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVote = useCallback(
    async (
      reviewId: string,
      courseId: string,
      voteType: 'upvote' | 'downvote'
    ) => {
      try {
        const { data } = await voteOnReview(courseId, reviewId, voteType);
        setReviews((currentReviews) =>
          currentReviews.map((review) =>
            review.reviewId === reviewId
              ? {
                  ...review,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                }
              : review
          )
        );
      } catch (error: any) {
        console.error('Failed to vote:', error);
        //TODO: Handle error more gracefully in UI
        setError(error.response?.data?.error || 'Failed to cast vote');
      }
    },
    []
  );

  return { reviews, loading, error, fetchReviews, handleVote };
};

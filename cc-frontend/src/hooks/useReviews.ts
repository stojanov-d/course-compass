/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { Review } from '../types/review';
import {
  getReviewsForCourse,
  voteOnReview,
  createReview,
  updateReview,
  deleteReview,
  getUserReviewForCourse,
  CreateReviewData,
  UpdateReviewData,
} from '../api/reviewApi';

export const useReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setContinuationToken] = useState<string | undefined>();

  const fetchReviews = useCallback(async (courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReviewsForCourse(courseId);
      setReviews(response.reviews || []);
      setContinuationToken(response.continuationToken);
    } catch (err: any) {
      console.error('Failed to fetch reviews:', err);
      setError(err.response?.data?.error || 'Failed to fetch reviews');
      setReviews([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserReview = useCallback(async (courseId: string) => {
    try {
      const review = await getUserReviewForCourse(courseId);
      setUserReview(review);
    } catch (err: any) {
      console.error('Failed to fetch user review:', err);
    }
  }, []);

  const addReview = useCallback(async (reviewData: CreateReviewData) => {
    try {
      const newReview = await createReview(reviewData);
      setReviews((prevReviews) => {
        const currentReviews = Array.isArray(prevReviews) ? prevReviews : [];
        return [newReview, ...currentReviews];
      });
      setUserReview(newReview);
      return newReview;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || 'Failed to create review';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const editReview = useCallback(
    async (
      courseId: string,
      reviewId: string,
      reviewData: UpdateReviewData
    ) => {
      try {
        const updatedReview = await updateReview(
          courseId,
          reviewId,
          reviewData
        );
        setReviews((prevReviews) => {
          const currentReviews = Array.isArray(prevReviews) ? prevReviews : [];
          return currentReviews.map((review) =>
            review.reviewId === reviewId ? updatedReview : review
          );
        });
        setUserReview(updatedReview);
        return updatedReview;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || 'Failed to update review';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const removeReview = useCallback(
    async (courseId: string, reviewId: string) => {
      try {
        await deleteReview(courseId, reviewId);
        setReviews((prevReviews) => {
          const currentReviews = Array.isArray(prevReviews) ? prevReviews : [];
          return currentReviews.filter(
            (review) => review.reviewId !== reviewId
          );
        });
        setUserReview(null);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || 'Failed to delete review';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const handleVote = useCallback(
    async (
      reviewId: string,
      courseId: string,
      voteType: 'upvote' | 'downvote'
    ) => {
      try {
        const { data } = await voteOnReview(courseId, reviewId, voteType);
        setReviews((currentReviews) => {
          const reviews = Array.isArray(currentReviews) ? currentReviews : [];
          return reviews.map((review) =>
            review.reviewId === reviewId
              ? {
                  ...review,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                }
              : review
          );
        });
      } catch (error: any) {
        console.error('Failed to vote:', error);
        //TODO: Handle error more gracefully in UI
        setError(error.response?.data?.error || 'Failed to cast vote');
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setReviews([]);
    setUserReview(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    reviews,
    userReview,
    loading,
    error,
    fetchReviews,
    fetchUserReview,
    addReview,
    editReview,
    removeReview,
    handleVote,
    clearError,
    resetState,
  };
};

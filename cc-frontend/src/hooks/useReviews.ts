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
  getUserVoteStatus,
  CreateReviewData,
  UpdateReviewData,
} from '../api/reviewApi';
import { adminApi } from '../api/adminApi';

export const useReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continuationToken, setContinuationToken] = useState<
    string | undefined
  >();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userVotes, setUserVotes] = useState<
    Record<string, 'upvote' | 'downvote' | null>
  >({});
  const [votingLoading, setVotingLoading] = useState<Record<string, boolean>>(
    {}
  );

  const fetchReviews = useCallback(async (courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReviewsForCourse(courseId, undefined, 20);
      const list = Array.isArray(response.reviews) ? response.reviews : [];
      setReviews(list);
      setContinuationToken(response.continuationToken);
      setHasMore(Boolean(response.continuationToken));
    } catch (err: any) {
      console.error('Failed to fetch reviews:', err);
      setError(err.response?.data?.error || 'Failed to fetch reviews');
      setReviews([]); // Reset to empty array on error
      setContinuationToken(undefined);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreReviews = useCallback(
    async (courseId: string) => {
      if (!continuationToken) return;
      setLoadingMore(true);
      try {
        const response = await getReviewsForCourse(
          courseId,
          continuationToken,
          20
        );
        const list = Array.isArray(response.reviews) ? response.reviews : [];
        setReviews((prev) => [...(Array.isArray(prev) ? prev : []), ...list]);
        setContinuationToken(response.continuationToken);
        setHasMore(Boolean(response.continuationToken));
      } catch (err: any) {
        console.error('Failed to load more reviews:', err);
        setError(err.response?.data?.error || 'Failed to load more reviews');
      } finally {
        setLoadingMore(false);
      }
    },
    [continuationToken]
  );

  const fetchUserVoteStatuses = useCallback(async (reviewIds: string[]) => {
    try {
      const voteStatuses = await Promise.all(
        reviewIds.map(async (reviewId) => {
          try {
            const response = await getUserVoteStatus('review', reviewId);
            return { reviewId, voteType: response.data.voteType };
          } catch {
            return { reviewId, voteType: null };
          }
        })
      );

      const votesMap = voteStatuses.reduce(
        (acc, { reviewId, voteType }) => {
          acc[reviewId] = voteType;
          return acc;
        },
        {} as Record<string, 'upvote' | 'downvote' | null>
      );

      setUserVotes(votesMap);
    } catch (err: any) {
      console.error('Failed to fetch user vote statuses:', err);
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

  const adminRemoveReview = useCallback(
    async (courseId: string, reviewId: string) => {
      try {
        await adminApi.deleteReview(courseId, reviewId);
        setReviews((prevReviews) => {
          const currentReviews = Array.isArray(prevReviews) ? prevReviews : [];
          return currentReviews.filter(
            (review) => review.reviewId !== reviewId
          );
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || 'Failed to delete review (admin)';
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
      setVotingLoading((prev) => ({ ...prev, [reviewId]: true }));
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

        setUserVotes((prev) => ({
          ...prev,
          [reviewId]: data.voteResult?.currentVote || null,
        }));
      } catch (error: any) {
        console.error('Failed to vote:', error);
        setError(error.response?.data?.error || 'Failed to cast vote');
      } finally {
        setVotingLoading((prev) => ({ ...prev, [reviewId]: false }));
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
    setUserVotes({});
    setVotingLoading({});
    setContinuationToken(undefined);
    setHasMore(false);
    setLoadingMore(false);
  }, []);

  return {
    reviews,
    userReview,
    loading,
    error,
    userVotes,
    votingLoading,
    fetchReviews,
    fetchUserReview,
    loadMoreReviews,
    fetchUserVoteStatuses,
    addReview,
    editReview,
    removeReview,
    adminRemoveReview,
    handleVote,
    clearError,
    resetState,
    hasMore,
    loadingMore,
  };
};

import { useState, useCallback } from 'react';
import {
  Comment,
  CreateCommentData,
  UpdateCommentData,
} from '../types/comment';
import * as commentApi from '../api/commentApi';
import { useAuth } from './useAuth';

export const useComments = (reviewId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<
    Record<string, 'upvote' | 'downvote' | null>
  >({});
  const [votingLoading, setVotingLoading] = useState<Record<string, boolean>>(
    {}
  );
  const { user } = useAuth();

  const fetchComments = useCallback(async () => {
    if (!reviewId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await commentApi.getCommentsForReview(reviewId);
      const enhancedComments = response.data.map((comment) => ({
        ...comment,
        user: comment.isAnonymous
          ? null
          : user && comment.userId === user.id
            ? {
                id: user.id,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
              }
            : {
                id: comment.userId,
                displayName: 'User',
                avatarUrl: '',
              },
      }));
      setComments(enhancedComments);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(errorMessage);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [reviewId, user]);

  const fetchUserVoteStatuses = useCallback(async (commentIds: string[]) => {
    try {
      const voteStatuses = await Promise.all(
        commentIds.map(async (commentId) => {
          try {
            const response = await commentApi.getUserVoteStatus(
              'comment',
              commentId
            );
            return { commentId, voteType: response.data.voteType };
          } catch {
            return { commentId, voteType: null };
          }
        })
      );

      const votesMap = voteStatuses.reduce(
        (acc, { commentId, voteType }) => {
          acc[commentId] = voteType;
          return acc;
        },
        {} as Record<string, 'upvote' | 'downvote' | null>
      );

      setUserVotes(votesMap);
    } catch (err: unknown) {
      console.error('Failed to fetch user vote statuses for comments:', err);
    }
  }, []);

  const createComment = useCallback(
    async (commentData: CreateCommentData) => {
      setError(null);
      try {
        const response = await commentApi.createComment(commentData);
        const enhancedComment = {
          ...response.data,
          user: response.data.isAnonymous
            ? null
            : user
              ? {
                  id: user.id,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                }
              : null,
        };
        setComments((prev) => [...prev, enhancedComment]);
        return enhancedComment;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create comment';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  const updateComment = useCallback(
    async (commentId: string, commentData: UpdateCommentData) => {
      setError(null);
      try {
        const response = await commentApi.updateComment(
          reviewId,
          commentId,
          commentData
        );
        setComments((prev) =>
          prev.map((comment) =>
            comment.commentId === commentId ? response.data : comment
          )
        );
        return response.data;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update comment';
        setError(errorMessage);
        throw err;
      }
    },
    [reviewId]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      setError(null);
      try {
        await commentApi.deleteComment(reviewId, commentId);
        setComments((prev) =>
          prev.filter((comment) => comment.commentId !== commentId)
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete comment'
        );
        throw err;
      }
    },
    [reviewId]
  );

  const voteOnComment = useCallback(
    async (commentId: string, voteType: 'upvote' | 'downvote') => {
      setVotingLoading((prev) => ({ ...prev, [commentId]: true }));
      setError(null);
      try {
        const response = await commentApi.voteOnComment(
          reviewId,
          commentId,
          voteType
        );

        // Update comment vote counts
        setComments((prev) =>
          prev.map((comment) =>
            comment.commentId === commentId
              ? {
                  ...comment,
                  upvotes: response.data.upvotes,
                  downvotes: response.data.downvotes,
                }
              : comment
          )
        );

        setUserVotes((prev) => ({
          ...prev,
          [commentId]: voteType,
        }));
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to vote on comment'
        );
        throw err;
      } finally {
        setVotingLoading((prev) => ({ ...prev, [commentId]: false }));
      }
    },
    [reviewId]
  );

  const canEditComment = useCallback(
    (comment: Comment) => {
      return user?.id === comment.userId;
    },
    [user]
  );

  return {
    comments,
    loading,
    error,
    userVotes,
    votingLoading,
    fetchComments,
    fetchUserVoteStatuses,
    createComment,
    updateComment,
    deleteComment,
    voteOnComment,
    canEditComment,
  };
};

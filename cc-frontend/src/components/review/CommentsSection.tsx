import {
  Box,
  Typography,
  Stack,
  Collapse,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Comment as CommentIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { Comment } from '../../types/comment';
import { CommentCard } from './CommentCard';
import { CommentForm } from './CommentForm';
import { useComments } from '../../hooks/useComments';
import { useAuth } from '../../hooks/useAuth';

interface CommentsSectionProps {
  reviewId: string;
  commentsCount: number;
  onCommentsCountChange?: (count: number) => void;
}

export const CommentsSection = ({
  reviewId,
  commentsCount,
  onCommentsCountChange,
}: CommentsSectionProps) => {
  const [showComments, setShowComments] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [currentCommentsCount, setCurrentCommentsCount] =
    useState(commentsCount);

  const { user } = useAuth();
  const {
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
    adminDeleteComment,
    voteOnComment,
    canEditComment,
  } = useComments(reviewId);

  useEffect(() => {
    if (showComments && !commentsLoaded) {
      fetchComments().then(() => setCommentsLoaded(true));
    }
  }, [showComments, commentsLoaded, fetchComments]);

  useEffect(() => {
    if (commentsLoaded) {
      setCurrentCommentsCount(comments.length);
      onCommentsCountChange?.(comments.length);
    }
  }, [commentsLoaded, comments.length, onCommentsCountChange]);

  // Fetch user vote statuses when comments are loaded and user is available
  useEffect(() => {
    if (user && comments && comments.length > 0) {
      const commentIds = comments.map((comment) => comment.commentId);
      fetchUserVoteStatuses(commentIds);
    }
  }, [user, comments, fetchUserVoteStatuses]);

  const handleToggleComments = () => {
    setShowComments(!showComments);
    setShowCommentForm(false);
    setEditingComment(null);
  };

  const handleShowCommentForm = () => {
    setShowCommentForm(true);
    setEditingComment(null);
  };

  const handleCancelCommentForm = () => {
    setShowCommentForm(false);
    setEditingComment(null);
  };

  const handleCreateComment = async (
    commentText: string,
    isAnonymous: boolean
  ) => {
    setIsSubmitting(true);
    try {
      await createComment({
        reviewId,
        commentText,
        isAnonymous,
      });
      setShowCommentForm(false);
      if (!commentsLoaded) {
        setCommentsLoaded(true);
      }
      // Update the current count
      setCurrentCommentsCount((prev) => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setShowCommentForm(true);
  };

  const handleUpdateComment = async (commentText: string) => {
    if (!editingComment) return;

    setIsSubmitting(true);
    try {
      await updateComment(editingComment.commentId, {
        commentText,
      });
      setEditingComment(null);
      setShowCommentForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setCurrentCommentsCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // Error is handled by the hook
    }
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    try {
      await adminDeleteComment(commentId);
      setCurrentCommentsCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // Error is handled by the hook
    }
  };

  const handleVoteOnComment = async (
    commentId: string,
    voteType: 'upvote' | 'downvote'
  ) => {
    try {
      await voteOnComment(commentId, voteType);
    } catch {
      // Error is handled by the hook
    }
  };

  const displayCommentsCount = commentsLoaded
    ? comments.length
    : currentCommentsCount;

  return (
    <Box>
      <Button
        startIcon={<CommentIcon />}
        size="small"
        variant="text"
        color="secondary"
        onClick={handleToggleComments}
        sx={{ mb: showComments ? 2 : 0 }}
      >
        {displayCommentsCount > 0
          ? `${displayCommentsCount} Comment${displayCommentsCount !== 1 ? 's' : ''}`
          : 'Comment'}
      </Button>

      <Collapse in={showComments} timeout="auto" unmountOnExit>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          {loading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!loading && comments.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              py={2}
            >
              No comments yet. Be the first to comment!
            </Typography>
          )}

          {comments.map((comment) => (
            <CommentCard
              key={comment.commentId}
              comment={comment}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              onAdminDelete={handleAdminDeleteComment}
              onVote={handleVoteOnComment}
              canEdit={canEditComment(comment)}
              canAdminDelete={user?.isAdmin && comment.userId !== user?.id}
              isVotingDisabled={!user}
              userVote={userVotes[comment.commentId] || null}
              isVotingLoading={votingLoading[comment.commentId] || false}
            />
          ))}

          {user && !showCommentForm && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleShowCommentForm}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add Comment
            </Button>
          )}

          {showCommentForm && (
            <CommentForm
              onSubmit={
                editingComment
                  ? (commentText) => handleUpdateComment(commentText)
                  : handleCreateComment
              }
              onCancel={handleCancelCommentForm}
              editingComment={editingComment || undefined}
              loading={isSubmitting}
              placeholder={
                editingComment ? 'Edit your comment...' : 'Write a comment...'
              }
            />
          )}

          {!user && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              py={1}
            >
              Please sign in to comment
            </Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

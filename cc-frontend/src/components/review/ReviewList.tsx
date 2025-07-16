import { Box, CircularProgress, Alert, Typography, Stack } from '@mui/material';
import { Review } from '../../types/review';
import { ReviewCard } from './Review';

interface ReviewListProps {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  onVote: (reviewId: string, voteType: 'upvote' | 'downvote') => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  isVotingDisabled: boolean;
  currentUserId?: string;
}

export const ReviewList = ({
  reviews = [],
  loading,
  error,
  onVote,
  onEdit,
  onDelete,
  isVotingDisabled,
  currentUserId,
}: ReviewListProps) => {
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (safeReviews.length === 0) {
    return (
      <Box textAlign="center" py={5}>
        <Typography variant="h6" color="text.secondary">
          No reviews yet.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Be the first to share your experience!
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {safeReviews.map((review) => (
        <ReviewCard
          key={review.reviewId}
          review={review}
          onVote={onVote}
          onEdit={onEdit}
          onDelete={onDelete}
          isVotingDisabled={isVotingDisabled}
          canEdit={Boolean(currentUserId && review.authorId === currentUserId)}
        />
      ))}
    </Stack>
  );
};

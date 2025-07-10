import { Box, CircularProgress, Alert, Typography, Stack } from '@mui/material';
import { Review } from '../../types/review';
import { ReviewCard } from './Review';

interface ReviewListProps {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  onVote: (reviewId: string, voteType: 'upvote' | 'downvote') => void;
  isVotingDisabled: boolean;
}

export const ReviewList = ({
  reviews = [],
  loading,
  error,
  onVote,
  isVotingDisabled,
}: ReviewListProps) => {
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

  if (reviews.length === 0) {
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
      {reviews.map((review) => (
        <ReviewCard
          key={review.reviewId}
          review={review}
          onVote={onVote}
          isVotingDisabled={isVotingDisabled}
        />
      ))}
    </Stack>
  );
};

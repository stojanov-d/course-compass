import {
  Paper,
  Box,
  Typography,
  Avatar,
  Rating,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import { Comment, CheckCircle } from '@mui/icons-material';
import { Review } from '../../types/review';
import { VoteButtons } from '../common/VoteButtons';

interface ReviewCardProps {
  review: Review;
  onVote: (reviewId: string, voteType: 'upvote' | 'downvote') => void;
  isVotingDisabled: boolean;
}

export const ReviewCard = ({
  review,
  onVote,
  isVotingDisabled,
}: ReviewCardProps) => {
  const userDisplay = review.isAnonymous
    ? { displayName: 'Anonymous', avatarUrl: null }
    : review.user;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Stack spacing={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            src={userDisplay.avatarUrl || undefined}
            alt={userDisplay.displayName}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {userDisplay.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(review.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={500}>
              Rating:
            </Typography>
            <Rating
              value={review.rating}
              readOnly
              precision={0.5}
              size="small"
            />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={500}>
              Difficulty:
            </Typography>
            <Rating
              value={review.difficulty}
              readOnly
              precision={0.5}
              size="small"
            />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={500}>
              Workload:
            </Typography>
            <Rating
              value={review.workload}
              readOnly
              precision={0.5}
              size="small"
            />
          </Box>
        </Stack>

        <Typography variant="body1" sx={{ py: 1, whiteSpace: 'pre-wrap' }}>
          {review.reviewText}
        </Typography>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <VoteButtons
              upvotes={review.upvotes}
              downvotes={review.downvotes}
              onUpvote={() => onVote(review.reviewId, 'upvote')}
              onDownvote={() => onVote(review.reviewId, 'downvote')}
              disabled={isVotingDisabled}
            />
            <Button
              startIcon={<Comment />}
              size="small"
              variant="text"
              color="secondary"
            >
              {review.commentsCount > 0
                ? `${review.commentsCount} Comments`
                : 'Comment'}
            </Button>
          </Stack>
          {review.recommendsCourse && (
            <Chip
              icon={<CheckCircle />}
              label="Recommends"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

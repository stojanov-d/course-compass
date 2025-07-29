import { IconButton, Typography, Stack, Tooltip } from '@mui/material';
import {
  ThumbUpAltOutlined as ThumbUpOutlinedIcon,
  ThumbDownAltOutlined as ThumbDownOutlinedIcon,
  ThumbUpAlt as ThumbUpFilledIcon,
  ThumbDownAlt as ThumbDownFilledIcon,
} from '@mui/icons-material';

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  onUpvote: () => void;
  onDownvote: () => void;
  disabled?: boolean;
  userVote?: 'upvote' | 'downvote' | null;
  loading?: boolean;
}

export const VoteButtons = ({
  upvotes,
  downvotes,
  onUpvote,
  onDownvote,
  disabled = false,
  userVote = null,
  loading = false,
}: VoteButtonsProps) => {
  const score = upvotes - downvotes;
  const isUpvoted = userVote === 'upvote';
  const isDownvoted = userVote === 'downvote';

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title={isUpvoted ? 'Remove upvote' : 'Upvote'}>
        <span>
          <IconButton
            size="small"
            onClick={onUpvote}
            disabled={disabled || loading}
            sx={{
              color: isUpvoted ? 'primary.main' : 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'primary.action.hover',
              },
            }}
          >
            {isUpvoted ? (
              <ThumbUpFilledIcon fontSize="small" />
            ) : (
              <ThumbUpOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{
          minWidth: 24,
          textAlign: 'center',
          color:
            score > 0
              ? 'success.main'
              : score < 0
                ? 'error.main'
                : 'text.secondary',
        }}
      >
        {score}
      </Typography>
      <Tooltip title={isDownvoted ? 'Remove downvote' : 'Downvote'}>
        <span>
          <IconButton
            size="small"
            onClick={onDownvote}
            disabled={disabled || loading}
            sx={{
              color: isDownvoted ? 'error.main' : 'text.secondary',
              '&:hover': {
                color: 'error.main',
                backgroundColor: 'error.action.hover',
              },
            }}
          >
            {isDownvoted ? (
              <ThumbDownFilledIcon fontSize="small" />
            ) : (
              <ThumbDownOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

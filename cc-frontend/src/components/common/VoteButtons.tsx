import { IconButton, Typography, Stack, Tooltip } from '@mui/material';
import {
  ThumbUpAltOutlined as ThumbUpIcon,
  ThumbDownAltOutlined as ThumbDownIcon,
} from '@mui/icons-material';

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  onUpvote: () => void;
  onDownvote: () => void;
  disabled?: boolean;
}

export const VoteButtons = ({
  upvotes,
  downvotes,
  onUpvote,
  onDownvote,
  disabled = false,
}: VoteButtonsProps) => {
  const score = upvotes - downvotes;

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title="Upvote">
        <span>
          <IconButton size="small" onClick={onUpvote} disabled={disabled}>
            <ThumbUpIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{ minWidth: 24, textAlign: 'center' }}
      >
        {score}
      </Typography>
      <Tooltip title="Downvote">
        <span>
          <IconButton size="small" onClick={onDownvote} disabled={disabled}>
            <ThumbDownIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

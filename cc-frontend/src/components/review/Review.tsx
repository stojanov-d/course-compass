import {
  Paper,
  Box,
  Typography,
  Avatar,
  Rating,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { CheckCircle, MoreVert, Edit, Delete } from '@mui/icons-material';
import { useState } from 'react';
import { Review } from '../../types/review';
import { VoteButtons, ConfirmationModal } from '../common';
import { CommentsSection } from './CommentsSection';

interface ReviewCardProps {
  review: Review;
  onVote: (reviewId: string, voteType: 'upvote' | 'downvote') => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  isVotingDisabled: boolean;
  canEdit?: boolean;
  userVote?: 'upvote' | 'downvote' | null;
  isVotingLoading?: boolean;
}

export const ReviewCard = ({
  review,
  onVote,
  onEdit,
  onDelete,
  isVotingDisabled,
  canEdit = false,
  userVote = null,
  isVotingLoading = false,
}: ReviewCardProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const open = Boolean(anchorEl);

  const userDisplay = review.isAnonymous
    ? { displayName: 'Anonymous', avatarUrl: null }
    : review.user
      ? {
          displayName: review.user.displayName,
          avatarUrl: review.user.avatarUrl,
        }
      : { displayName: 'Unknown User', avatarUrl: null };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.(review);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete?.(review.reviewId);
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
  };

  return (
    <>
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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
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

            {canEdit && (onEdit || onDelete) && (
              <Box>
                <IconButton
                  onClick={handleMenuOpen}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <MoreVert />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  {onEdit && (
                    <MenuItem onClick={handleEdit}>
                      <ListItemIcon>
                        <Edit fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Edit Review</ListItemText>
                    </MenuItem>
                  )}
                  {onDelete && (
                    <MenuItem
                      onClick={handleDeleteClick}
                      sx={{ color: 'error.main' }}
                    >
                      <ListItemIcon>
                        <Delete fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText>Delete Review</ListItemText>
                    </MenuItem>
                  )}
                </Menu>
              </Box>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={3}
            alignItems="center"
            flexWrap="wrap"
          >
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
            <VoteButtons
              upvotes={review.upvotes}
              downvotes={review.downvotes}
              onUpvote={() => onVote(review.reviewId, 'upvote')}
              onDownvote={() => onVote(review.reviewId, 'downvote')}
              disabled={isVotingDisabled}
              userVote={userVote}
              loading={isVotingLoading}
            />
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

          <CommentsSection
            reviewId={review.reviewId}
            commentsCount={review.commentsCount}
          />
        </Stack>
      </Paper>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone and will permanently remove your review and all associated data."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
        showIcon={true}
      />
    </>
  );
};

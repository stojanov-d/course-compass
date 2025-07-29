import {
  Box,
  Typography,
  Avatar,
  Paper,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { MoreVert, Edit, Delete } from '@mui/icons-material';
import { useState } from 'react';
import { Comment } from '../../types/comment';
import { VoteButtons, ConfirmationModal } from '../common';

interface CommentCardProps {
  comment: Comment;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
  onAdminDelete?: (commentId: string) => void;
  onVote: (commentId: string, voteType: 'upvote' | 'downvote') => void;
  canEdit: boolean;
  canAdminDelete?: boolean;
  isVotingDisabled: boolean;
  userVote?: 'upvote' | 'downvote' | null;
  isVotingLoading?: boolean;
}

export const CommentCard = ({
  comment,
  onEdit,
  onDelete,
  onAdminDelete,
  onVote,
  canEdit,
  canAdminDelete = false,
  isVotingDisabled,
  userVote = null,
  isVotingLoading = false,
}: CommentCardProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminDeleteModalOpen, setAdminDeleteModalOpen] = useState(false);
  const open = Boolean(anchorEl);

  const userDisplay = comment.isAnonymous
    ? { displayName: 'Anonymous', avatarUrl: null }
    : comment.user
      ? {
          displayName: comment.user.displayName,
          avatarUrl: comment.user.avatarUrl,
        }
      : { displayName: 'User', avatarUrl: null };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.(comment);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteModalOpen(true);
  };

  const handleAdminDeleteClick = () => {
    handleMenuClose();
    setAdminDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete?.(comment.commentId);
    setDeleteModalOpen(false);
  };

  const handleAdminDeleteConfirm = () => {
    onAdminDelete?.(comment.commentId);
    setAdminDeleteModalOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
  };

  const handleAdminDeleteCancel = () => {
    setAdminDeleteModalOpen(false);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'grey.50',
        }}
      >
        <Stack spacing={1}>
          <Box
            display="flex"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar
                src={userDisplay.avatarUrl || undefined}
                sx={{ width: 32, height: 32 }}
              >
                {userDisplay.displayName.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="medium">
                  {userDisplay.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            {(canEdit || canAdminDelete) && (
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{ opacity: 0.7 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            )}
          </Box>

          <Typography variant="body2" sx={{ pl: 5, whiteSpace: 'pre-wrap' }}>
            {comment.commentText}
          </Typography>

          <Box sx={{ pl: 5 }}>
            <VoteButtons
              upvotes={comment.upvotes}
              downvotes={comment.downvotes}
              onUpvote={() => onVote(comment.commentId, 'upvote')}
              onDownvote={() => onVote(comment.commentId, 'downvote')}
              disabled={isVotingDisabled}
              userVote={userVote}
              loading={isVotingLoading}
            />
          </Box>
        </Stack>
      </Paper>

      {/* Comment Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {canEdit && onEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Comment</ListItemText>
          </MenuItem>
        )}
        {canEdit && onDelete && (
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Comment</ListItemText>
          </MenuItem>
        )}
        {canAdminDelete && onAdminDelete && (
          <MenuItem onClick={handleAdminDeleteClick}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Comment (Admin)</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
        showIcon={true}
      />

      {/* Admin Delete Confirmation Modal */}
      <ConfirmationModal
        open={adminDeleteModalOpen}
        onClose={handleAdminDeleteCancel}
        onConfirm={handleAdminDeleteConfirm}
        title="Delete Comment (Admin)"
        message="Are you sure you want to delete this comment as an admin? This action cannot be undone."
        confirmText="Delete as Admin"
        cancelText="Cancel"
        confirmColor="error"
        showIcon={true}
      />
    </>
  );
};

import {
  Box,
  TextField,
  Button,
  Stack,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { Comment } from '../../types/comment';

interface CommentFormProps {
  onSubmit: (commentText: string, isAnonymous: boolean) => Promise<void>;
  onCancel: () => void;
  editingComment?: Comment;
  loading?: boolean;
  placeholder?: string;
}

export const CommentForm = ({
  onSubmit,
  onCancel,
  editingComment,
  loading = false,
  placeholder = 'Write a comment...',
}: CommentFormProps) => {
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState<{ commentText?: string }>({});

  useEffect(() => {
    if (editingComment) {
      setCommentText(editingComment.commentText);
      setIsAnonymous(editingComment.isAnonymous);
    } else {
      setCommentText('');
      setIsAnonymous(false);
    }
  }, [editingComment]);

  const validateForm = () => {
    const newErrors: { commentText?: string } = {};

    if (!commentText.trim()) {
      newErrors.commentText = 'Comment text is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(commentText.trim(), isAnonymous);
      if (!editingComment) {
        setCommentText('');
        setIsAnonymous(false);
      }
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleCancel = () => {
    setCommentText(editingComment?.commentText || '');
    setIsAnonymous(editingComment?.isAnonymous || false);
    setErrors({});
    onCancel();
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        <TextField
          multiline
          rows={3}
          placeholder={placeholder}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          error={!!errors.commentText}
          helperText={errors.commentText}
          fullWidth
          variant="outlined"
          size="small"
        />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Post anonymously
              </Typography>
            }
          />

          <Stack direction="row" spacing={1}>
            <Button
              type="button"
              onClick={handleCancel}
              size="small"
              variant="outlined"
              color="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="small"
              variant="contained"
              disabled={loading || !commentText.trim()}
            >
              {loading
                ? 'Posting...'
                : editingComment
                  ? 'Update'
                  : 'Post Comment'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

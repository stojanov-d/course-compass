import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Rating,
  FormControlLabel,
  Switch,
  Stack,
  Paper,
  Alert,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { CreateReviewData, UpdateReviewData } from '../../api/reviewApi';
import { Review } from '../../types/review';

interface AddReviewFormProps {
  courseId: string;
  existingReview?: Review | null;
  onSubmit: (data: CreateReviewData | UpdateReviewData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const AddReviewForm = ({
  courseId,
  existingReview,
  onSubmit,
  onCancel,
  loading = false,
}: AddReviewFormProps) => {
  const isEditing = Boolean(existingReview);

  const [formData, setFormData] = useState({
    rating: existingReview?.rating || 3,
    difficulty: existingReview?.difficulty || 3,
    workload: existingReview?.workload || 3,
    reviewText: existingReview?.reviewText || '',
    recommendsCourse: existingReview?.recommendsCourse || false,
    isAnonymous: existingReview?.isAnonymous || false,
  });

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.reviewText.trim()) {
      errors.reviewText = 'Review text is required';
    } else if (formData.reviewText.length < 10) {
      errors.reviewText = 'Review must be at least 10 characters long';
    } else if (formData.reviewText.length > 2000) {
      errors.reviewText = 'Review must be less than 2000 characters';
    }

    if (formData.rating < 1 || formData.rating > 5) {
      errors.rating = 'Rating must be between 1 and 5';
    }

    if (formData.difficulty < 1 || formData.difficulty > 5) {
      errors.difficulty = 'Difficulty must be between 1 and 5';
    }

    if (formData.workload < 1 || formData.workload > 5) {
      errors.workload = 'Workload must be between 1 and 5';
    }

    return errors;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      if (isEditing) {
        await onSubmit(formData as UpdateReviewData);
      } else {
        await onSubmit({ ...formData, courseId } as CreateReviewData);
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Failed to save review';
      setError(errorMessage);
    }
  };

  const handleRatingChange =
    (field: 'rating' | 'difficulty' | 'workload') =>
    (_event: React.SyntheticEvent, newValue: number | null) => {
      if (newValue !== null) {
        setFormData((prev) => ({ ...prev, [field]: newValue }));
      }
    };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box display="flex" alignItems="center" gap={1}>
            {isEditing ? (
              <EditIcon color="primary" />
            ) : (
              <AddIcon color="primary" />
            )}
            <Typography variant="h6" fontWeight={600}>
              {isEditing ? 'Edit Your Review' : 'Write a Review'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Divider />

          {/* Ratings */}
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                Overall Rating *
              </Typography>
              <Rating
                value={formData.rating}
                onChange={handleRatingChange('rating')}
                precision={0.5}
                size="large"
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                Difficulty *
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                How challenging was this course?
              </Typography>
              <Rating
                value={formData.difficulty}
                onChange={handleRatingChange('difficulty')}
                precision={0.5}
                size="large"
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                Workload *
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                How much work was required?
              </Typography>
              <Rating
                value={formData.workload}
                onChange={handleRatingChange('workload')}
                precision={0.5}
                size="large"
              />
            </Box>
          </Stack>

          <Divider />

          {/* Review Text */}
          <Box>
            <Typography variant="subtitle1" fontWeight={500} gutterBottom>
              Your Review *
            </Typography>
            <TextField
              multiline
              rows={6}
              fullWidth
              placeholder="Share your experience with this course. What did you like? What was challenging? Any tips for future students?"
              value={formData.reviewText}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reviewText: e.target.value }))
              }
              variant="outlined"
              error={!!validationErrors.reviewText}
              helperText={validationErrors.reviewText}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>

          <Divider />

          {/* Switches */}
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.recommendsCourse}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recommendsCourse: e.target.checked,
                    }))
                  }
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    I recommend this course
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Would you suggest this course to other students?
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isAnonymous}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isAnonymous: e.target.checked,
                    }))
                  }
                  color="secondary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Post anonymously
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your name will not be shown with this review
                  </Typography>
                </Box>
              }
            />
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
                size="large"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="large"
              startIcon={isEditing ? <EditIcon /> : <AddIcon />}
            >
              {loading
                ? isEditing
                  ? 'Updating...'
                  : 'Submitting...'
                : isEditing
                  ? 'Update Review'
                  : 'Submit Review'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
};

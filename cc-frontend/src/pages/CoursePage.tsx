import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Stack,
  Divider,
  Button,
  Collapse,
  Snackbar,
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useCourse } from '../hooks/useCourses';
import { useReviews } from '../hooks/useReviews';
import { ReviewList } from '../components/review/ReviewList';
import { AddReviewForm } from '../components/review/AddReviewForm';
import { useAuth } from '../hooks/useAuth';
import { Review } from '../types/review';
import { CreateReviewData, UpdateReviewData } from '../api/reviewApi';

const CourseDetailPage = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { course, loading, error, fetchCourseByCode } = useCourse();
  const {
    reviews,
    userReview,
    loading: reviewsLoading,
    error: reviewsError,
    userVotes,
    votingLoading,
    fetchReviews,
    loadMoreReviews,
    fetchUserReview,
    fetchUserVoteStatuses,
    addReview,
    editReview,
    removeReview,
    adminRemoveReview,
    handleVote,
    clearError,
    resetState,
    hasMore,
    loadingMore,
  } = useReviews();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastCourseCode, setLastCourseCode] = useState<string | null>(null);

  useEffect(() => {
    if (courseCode) {
      if (lastCourseCode !== courseCode) {
        resetState();
        setLastCourseCode(courseCode);
      }

      fetchCourseByCode(courseCode);
      fetchReviews(courseCode);
      if (user) {
        fetchUserReview(courseCode);
      }
    }
  }, [
    courseCode,
    user,
    fetchCourseByCode,
    fetchReviews,
    fetchUserReview,
    resetState,
    lastCourseCode,
  ]);

  useEffect(() => {
    if (user && reviews && reviews.length > 0) {
      const reviewIds = reviews.map((review) => review.reviewId);
      fetchUserVoteStatuses(reviewIds);
    }
  }, [user, reviews, fetchUserVoteStatuses]);

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const handleAddReview = async (data: CreateReviewData | UpdateReviewData) => {
    setSubmitting(true);
    try {
      await addReview(data as CreateReviewData);
      setShowReviewForm(false);
      setSuccessMessage('Review submitted successfully!');
    } catch {
      // Error is handled in the useReviews hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = async (
    data: CreateReviewData | UpdateReviewData
  ) => {
    if (!editingReview || !courseCode) return;

    setSubmitting(true);
    try {
      await editReview(
        courseCode,
        editingReview.reviewId,
        data as UpdateReviewData
      );
      setEditingReview(null);
      setSuccessMessage('Review updated successfully!');
    } catch {
      // Error is handled in the useReviews hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!courseCode) return;

    try {
      await removeReview(courseCode, reviewId);
      setSuccessMessage('Review deleted successfully!');
    } catch {
      // Error is handled in the useReviews hook
    }
  };

  const handleAdminDeleteReview = async (reviewId: string) => {
    if (!courseCode) return;

    try {
      await adminRemoveReview(courseCode, reviewId);
      setSuccessMessage('Review deleted successfully by admin!');
    } catch {
      // Error is handled in the useReviews hook
    }
  };

  const handleStartEdit = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(false);
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
  };

  const handleCancelAdd = () => {
    setShowReviewForm(false);
    clearError();
  };

  const canWriteReview = user && !userReview && !editingReview;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Box mb={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            const state = location.state as { courseListPage?: number } | null;
            const page = state?.courseListPage;
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/', { state: { courseListPage: page ?? 1 } });
            }
          }}
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back to Courses
        </Button>
      </Box>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 4 }}>
        {/* Course Header */}
        <Box mb={3}>
          <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
            {course.courseName}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={course.courseCode}
              color="primary"
              variant="outlined"
            />
            <Chip icon={<SchoolIcon />} label={`Semester ${course.semester}`} />
            <Chip label={`${course.credits} Credits`} />
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Course Description */}
        <Box mb={4}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            About this course
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            {course.description || 'No description available.'}
          </Typography>
        </Box>
        {/* Professors */}
        <Box mb={4}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Professors
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {course.professors && course.professors.length > 0 ? (
              course.professors.map((prof) => (
                <Chip
                  key={prof}
                  icon={<PersonIcon />}
                  label={prof}
                  variant="outlined"
                />
              ))
            ) : (
              <Typography color="text.secondary">
                Professor information not available.
              </Typography>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Reviews Section */}
      <Box mt={5}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" fontWeight={600}>
            Reviews
          </Typography>

          {canWriteReview && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowReviewForm(true)}
              size="large"
            >
              Write a Review
            </Button>
          )}
        </Box>

        {/* Add Review Form */}
        <Collapse in={showReviewForm} unmountOnExit>
          <Box mb={4}>
            <AddReviewForm
              courseId={courseCode!}
              onSubmit={handleAddReview}
              onCancel={handleCancelAdd}
              loading={submitting}
            />
          </Box>
        </Collapse>

        {/* Edit Review Form */}
        <Collapse in={Boolean(editingReview)} unmountOnExit>
          <Box mb={4}>
            <AddReviewForm
              courseId={courseCode!}
              existingReview={editingReview}
              onSubmit={handleEditReview}
              onCancel={handleCancelEdit}
              loading={submitting}
            />
          </Box>
        </Collapse>

        {/* Error Display */}
        {reviewsError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {reviewsError}
          </Alert>
        )}

        {/* Reviews List */}
        <ReviewList
          reviews={reviews}
          loading={reviewsLoading}
          error={null} // We show errors above
          onVote={(reviewId, voteType) => {
            if (courseCode) {
              handleVote(reviewId, courseCode, voteType);
            }
          }}
          onEdit={handleStartEdit}
          onDelete={handleDeleteReview}
          onAdminDelete={handleAdminDeleteReview}
          isVotingDisabled={!user}
          currentUserId={user?.id}
          isAdmin={user?.isAdmin}
          userVotes={userVotes}
          votingLoading={votingLoading}
        />
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />

      {/* Load more reviews */}
      {hasMore && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Button
            variant="outlined"
            disabled={loadingMore}
            onClick={() => courseCode && loadMoreReviews(courseCode)}
          >
            {loadingMore ? 'Loading...' : 'Load more reviews'}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default CourseDetailPage;

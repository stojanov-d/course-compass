import { useEffect } from 'react';
import { useParams } from 'react-router';
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
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useCourse } from '../hooks/useCourses';
import { useReviews } from '../hooks/useReviews';
import { ReviewList } from '../components/review/ReviewList';
import { useAuth } from '../hooks/useAuth';

const CourseDetailPage = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const { user } = useAuth();
  const { course, loading, error, fetchCourseByCode } = useCourse();
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    fetchReviews,
    handleVote,
  } = useReviews();

  useEffect(() => {
    if (courseCode) {
      fetchCourseByCode(courseCode);
      fetchReviews(courseCode);
    }
  }, [courseCode, fetchCourseByCode, fetchReviews]);

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
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Reviews
        </Typography>
        <ReviewList
          reviews={reviews}
          loading={reviewsLoading}
          error={reviewsError}
          onVote={(reviewId, voteType) => {
            if (courseCode) {
              handleVote(reviewId, courseCode, voteType);
            }
          }}
          isVotingDisabled={!user}
        />
      </Box>
    </Container>
  );
};

export default CourseDetailPage;

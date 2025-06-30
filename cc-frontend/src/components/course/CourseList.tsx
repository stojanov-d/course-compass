import { useState, useRef, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Course } from '../../types/course';
import { CourseCard } from './CourseCard';

interface CourseListProps {
  courses: Course[];
  loading: boolean;
  error: string | null;
  total: number;
  onCourseClick: (courseId: string) => void;
  activeStudyProgram?: string;
}

const COURSES_PER_PAGE = 12;

export const CourseList = ({
  courses,
  loading,
  error,
  total,
  onCourseClick,
  activeStudyProgram,
}: CourseListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const courseListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [courses]);

  const totalPages = Math.ceil(courses.length / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const currentCourses = courses.slice(startIndex, endIndex);

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);

    if (courseListRef.current) {
      const headerOffset = 100;
      const elementPosition = courseListRef.current.offsetTop;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 4 }}>
        {error}
      </Alert>
    );
  }

  if (courses.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No courses found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search criteria or filters
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={courseListRef}>
      {' '}
      {/* Add ref to the main container */}
      {/* Results count */}
      <Box mb={3}>
        <Typography variant="body1" color="text.secondary">
          Showing {startIndex + 1}-{Math.min(endIndex, courses.length)} of{' '}
          {total} courses
        </Typography>
      </Box>
      {/* Course grid */}
      <Grid container spacing={3} mb={4}>
        {currentCourses.map((course, index) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 4 }}
            key={course.courseId || `course-${index}`}
          >
            <CourseCard
              course={course}
              onClick={onCourseClick}
              activeStudyProgram={activeStudyProgram}
            />
          </Grid>
        ))}
      </Grid>
      {/* Pagination */}
      {totalPages > 1 && (
        <Stack spacing={2} alignItems="center">
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: '1rem',
              },
            }}
          />
          <Typography variant="body2" color="text.secondary">
            Page {currentPage} of {totalPages}
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

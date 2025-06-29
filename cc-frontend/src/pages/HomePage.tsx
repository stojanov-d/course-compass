import { useCallback } from 'react';
import { Box, Container, Typography, Stack, Button, Fade } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { CourseFilters } from '../components/course/CourseFilters';
import { CourseList } from '../components/course/CourseList';
import { useCourses } from '../hooks/useCourses';
import { useAuth } from '../hooks/useAuth';
import { CourseFilters as FilterType } from '../types/course';

const HomePage = () => {
  const { user, isLoading, authRedirect } = useAuth(); // Add authRedirect
  const {
    courses,
    loading,
    error,
    total,
    filters,
    fetchCourses,
    clearFilters,
  } = useCourses();

  const handleFiltersChange = useCallback(
    (newFilters: FilterType) => {
      fetchCourses(newFilters);
    },
    [fetchCourses]
  );

  const handleCourseClick = useCallback((courseId: string) => {
    console.log('Navigate to course:', courseId);
  }, []);

  const handleDiscordLogin = useCallback(async () => {
    try {
      await authRedirect();
    } catch (error) {
      console.error('Failed to initiate Discord login:', error);
    }
  }, [authRedirect]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 6, md: 8 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
            }}
          >
            <Fade in timeout={1000}>
              <Box>
                <SchoolIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                <Typography
                  variant="h2"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    mb: 2,
                  }}
                >
                  Course Compass
                </Typography>
                <Typography
                  variant="h5"
                  component="p"
                  sx={{
                    opacity: 0.9,
                    maxWidth: 600,
                    mx: 'auto',
                    mb: 4,
                    fontSize: { xs: '1.1rem', md: '1.3rem' },
                  }}
                >
                  Navigate your academic journey with confidence. Discover
                  courses, read reviews, and make informed decisions.
                </Typography>
              </Box>
            </Fade>

            {!user && (
              <Fade in timeout={1500}>
                <Box sx={{ mt: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleDiscordLogin} // Add the onClick handler
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      borderRadius: 3,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Login with Discord
                  </Button>
                </Box>
              </Fade>
            )}
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Filters */}
          <CourseFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={clearFilters}
            loading={loading}
          />

          {/* Course List */}
          <CourseList
            courses={courses}
            loading={loading}
            error={error}
            total={total}
            onCourseClick={handleCourseClick}
          />
        </Stack>
      </Container>
    </Box>
  );
};

export default HomePage;

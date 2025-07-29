import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Box, Container, Typography, Stack, Button, Fade } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { CourseFilters } from '../components/course/CourseFilters';
import { CourseList } from '../components/course/CourseList';
import { useCourses } from '../hooks/useCourses';
import { useAuth } from '../hooks/useAuth';
import { CourseFilters as FilterType } from '../types/course';
import { SearchBar } from '../components/common/SearchBar';
import { UserProfileMenu } from '../components/common/UserProfileMenu';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isLoading, login, logout } = useAuth();
  const {
    courses,
    loading,
    error,
    total,
    filters,
    studyPrograms,
    fetchCourses,
    clearFilters,
    searchCourses,
  } = useCourses();

  const handleFiltersChange = useCallback(
    (newFilters: FilterType) => {
      fetchCourses(newFilters);
    },
    [fetchCourses]
  );

  const handleSearch = useCallback(
    (searchTerm: string) => {
      searchCourses(searchTerm);
    },
    [searchCourses]
  );

  const handleCourseClick = useCallback(
    (courseCode: string) => {
      navigate(`/course/${courseCode}`);
    },
    [navigate]
  );

  const handleDiscordLogin = useCallback(async () => {
    try {
      await login();
    } catch (error) {
      console.error('Failed to initiate Discord login:', error);
    }
  }, [login]);

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
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
            mb={8}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <SchoolIcon sx={{ fontSize: 32, opacity: 0.9 }} />
              <Typography
                variant="h5"
                component="div"
                fontWeight={700}
                sx={{ letterSpacing: '0.5px' }}
              >
                Course Compass
              </Typography>
            </Box>
            {user ? (
              <UserProfileMenu user={user} onLogout={logout} />
            ) : (
              <Button
                variant="outlined"
                onClick={handleDiscordLogin}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Login with Discord
              </Button>
            )}
          </Box>
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
            }}
          >
            <Fade in timeout={1000}>
              <Box>
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
                  Navigate Your Academic Journey
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
                  Discover courses, read reviews, and make informed decisions
                  with confidence.
                </Typography>
                <SearchBar onSearch={handleSearch} />
              </Box>
            </Fade>
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
            studyPrograms={studyPrograms}
            loading={loading}
          />

          {/* Course List */}
          <Fade in={!loading}>
            <Box>
              <CourseList
                courses={courses}
                loading={loading}
                error={error}
                total={total}
                onCourseClick={handleCourseClick}
                activeStudyProgram={filters.studyProgram}
              />
            </Box>
          </Fade>
        </Stack>
      </Container>
    </Box>
  );
};

export default HomePage;

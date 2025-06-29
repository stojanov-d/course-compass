import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Rating,
  Stack,
} from '@mui/material';
import { School as SchoolIcon, Star as StarIcon } from '@mui/icons-material';
import { Course } from '../../types/course';

interface CourseCardProps {
  course: Course;
  onClick: (courseId: string) => void;
}

export const CourseCard = ({ course, onClick }: CourseCardProps) => {
  const handleClick = () => {
    onClick(course.courseId);
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'L1':
        return { color: '#10b981', bg: '#ecfdf5', border: '#10b981' };
      case 'L2':
        return { color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' };
      case 'L3':
        return { color: '#ef4444', bg: '#fef2f2', border: '#ef4444' };
      default:
        return { color: '#64748b', bg: '#f1f5f9', border: '#64748b' };
    }
  };

  const levelStyle = getLevelColor(course.level);

  return (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
          borderColor: 'primary.main',
        },
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ height: '100%' }}>
        <CardContent
          sx={{
            p: 3,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box mb={2}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              mb={1}
            >
              <Typography
                variant="body2"
                color="primary.main"
                fontWeight={700}
                sx={{
                  fontSize: '0.8rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {course.courseCode}
              </Typography>
              {course.level && (
                <Chip
                  label={course.level}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: levelStyle.color,
                    backgroundColor: levelStyle.bg,
                    border: `1px solid ${levelStyle.border}30`,
                    '&:hover': {
                      backgroundColor: levelStyle.color,
                      color: 'white',
                    },
                  }}
                />
              )}
            </Box>
            <Typography
              variant="h6"
              component="h3"
              fontWeight={600}
              lineHeight={1.3}
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.6em',
                fontSize: '1.1rem',
              }}
            >
              {course.courseName}
            </Typography>
          </Box>

          {/* Tags */}
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Semester ${course.semester}`}
              size="small"
              variant="outlined"
              color="primary"
              sx={{
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            />
            <Chip
              label={course.isRequired ? 'Required' : 'Elective'}
              size="small"
              color={course.isRequired ? 'error' : 'success'}
              variant="filled"
              sx={{
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            />
            <Chip
              icon={<SchoolIcon sx={{ fontSize: 14 }} />}
              label={`${course.credits} Credits`}
              size="small"
              variant="outlined"
              color="secondary"
              sx={{
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            />
          </Stack>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
              mb: 2,
              lineHeight: 1.5,
            }}
          >
            {course.description}
          </Typography>

          {/* Footer */}
          <Box mt="auto">
            {course.averageRating && course.totalReviews ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Rating
                  value={course.averageRating}
                  precision={0.1}
                  readOnly
                  size="small"
                  icon={<StarIcon fontSize="inherit" />}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: '#fbbf24',
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {course.averageRating.toFixed(1)} ({course.totalReviews}{' '}
                  reviews)
                </Typography>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                fontStyle="italic"
              >
                No reviews yet
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { CourseFilters as FilterType } from '../../types/course';

interface CourseFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const CourseFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  loading = false,
}: CourseFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);

  const handleFilterChange = useCallback(
    (newFilters: Partial<FilterType>) => {
      const updatedFilters = { ...localFilters, ...newFilters };
      setLocalFilters(updatedFilters);
      onFiltersChange(updatedFilters);
    },
    [localFilters, onFiltersChange]
  );

  const handleClear = useCallback(() => {
    const clearedFilters = { isActive: true };
    setLocalFilters(clearedFilters);
    onClearFilters();
  }, [onClearFilters]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.semester) count++;
    if (localFilters.isRequired !== undefined) count++;
    if (localFilters.level) count++;
    if (localFilters.minRating) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const semesterOptions = [
    { value: 1, label: 'Semester 1' },
    { value: 2, label: 'Semester 2' },
    { value: 3, label: 'Semester 3' },
    { value: 4, label: 'Semester 4' },
    { value: 5, label: 'Semester 5' },
    { value: 6, label: 'Semester 6' },
    { value: 7, label: 'Semester 7' },
    { value: 8, label: 'Semester 8' },
  ];

  const levelOptions = [
    { value: 'L1', label: 'Level 1', color: '#10b981' },
    { value: 'L2', label: 'Level 2', color: '#f59e0b' },
    { value: 'L3', label: 'Level 3', color: '#ef4444' },
  ];

  const courseTypeOptions = [
    { value: true, label: 'Required', color: '#ef4444' },
    { value: false, label: 'Elective', color: '#059669' },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: 'background.paper',
        position: 'relative',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Loading overlay for initial load only */}
      {loading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="rgba(255, 255, 255, 0.8)"
          borderRadius={3}
          zIndex={1}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading courses...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <FilterIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={600}>
            Filters & Sorting
          </Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} active`}
              size="small"
              color="primary"
              variant="filled"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            />
          )}
        </Box>
        {activeFiltersCount > 0 && (
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClear}
            size="small"
            variant="outlined"
            color="secondary"
            sx={{ borderRadius: 2 }}
            disabled={loading}
          >
            Clear All
          </Button>
        )}
      </Box>

      <Stack spacing={4}>
        {/* Semester Filter */}
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            mb={2}
            color="text.primary"
          >
            Semester
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {semesterOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                variant={
                  localFilters.semester === option.value ? 'filled' : 'outlined'
                }
                color={
                  localFilters.semester === option.value ? 'primary' : 'default'
                }
                clickable
                disabled={loading}
                onClick={() =>
                  handleFilterChange({
                    semester:
                      localFilters.semester === option.value
                        ? undefined
                        : option.value,
                  })
                }
                sx={{
                  borderRadius: 6,
                  px: 2,
                  py: 0.5,
                  height: 40,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Level Filter */}
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            mb={2}
            color="text.primary"
          >
            Course Level
          </Typography>
          <Stack direction="row" spacing={1.5}>
            {levelOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                variant={
                  localFilters.level === option.value ? 'filled' : 'outlined'
                }
                clickable
                disabled={loading}
                onClick={() =>
                  handleFilterChange({
                    level:
                      localFilters.level === option.value
                        ? undefined
                        : option.value,
                  })
                }
                sx={{
                  borderRadius: 6,
                  px: 2.5,
                  py: 0.5,
                  height: 40,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderColor: option.color,
                  color:
                    localFilters.level === option.value
                      ? 'white'
                      : option.color,
                  backgroundColor:
                    localFilters.level === option.value
                      ? option.color
                      : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: option.color,
                    color: 'white',
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${option.color}40`,
                  },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Course Type Filter */}
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            mb={2}
            color="text.primary"
          >
            Course Type
          </Typography>
          <Stack direction="row" spacing={1.5}>
            {courseTypeOptions.map((option) => (
              <Chip
                key={option.value.toString()}
                label={option.label}
                variant={
                  localFilters.isRequired === option.value
                    ? 'filled'
                    : 'outlined'
                }
                clickable
                disabled={loading}
                onClick={() =>
                  handleFilterChange({
                    isRequired:
                      localFilters.isRequired === option.value
                        ? undefined
                        : option.value,
                  })
                }
                sx={{
                  borderRadius: 6,
                  px: 2.5,
                  py: 0.5,
                  height: 40,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderColor: option.color,
                  color:
                    localFilters.isRequired === option.value
                      ? 'white'
                      : option.color,
                  backgroundColor:
                    localFilters.isRequired === option.value
                      ? option.color
                      : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: option.color,
                    color: 'white',
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${option.color}40`,
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

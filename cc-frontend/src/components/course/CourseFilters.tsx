import { useState, useCallback } from 'react';
import {
  Paper,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { CourseFilters as FilterType } from '../../types/course';

interface CourseFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onClearFilters: () => void;
  studyPrograms: string[];
  loading?: boolean;
}

export const CourseFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  studyPrograms,
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
    const clearedFilters: FilterType = { isActive: true };
    setLocalFilters(clearedFilters);
    onClearFilters();
  }, [onClearFilters]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.semester) count++;
    if (localFilters.isRequired !== undefined) count++;
    if (localFilters.level) count++;
    if (localFilters.minRating) count++;
    if (localFilters.studyProgram) count++;
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
    { value: true, label: 'Required' },
    { value: false, label: 'Elective' },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: 'background.paper',
        position: 'sticky',
        top: 20,
        zIndex: 10,
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="study-program-select-label">
              Study Program
            </InputLabel>
            <Select
              labelId="study-program-select-label"
              value={localFilters.studyProgram || ''}
              label="Study Program"
              onChange={(e) =>
                handleFilterChange({
                  studyProgram: e.target.value || undefined,
                })
              }
              disabled={loading}
            >
              <MenuItem value="">
                <em>All Programs</em>
              </MenuItem>
              {studyPrograms.map((program) => (
                <MenuItem key={program} value={program}>
                  {program}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="semester-select-label">Semester</InputLabel>
              <Select
                labelId="semester-select-label"
                value={localFilters.semester || ''}
                label="Semester"
                onChange={(e) =>
                  handleFilterChange({
                    semester: (e.target.value as number) || undefined,
                  })
                }
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Any</em>
                </MenuItem>
                {semesterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="level-select-label">Level</InputLabel>
              <Select
                labelId="level-select-label"
                value={localFilters.level || ''}
                label="Level"
                onChange={(e) =>
                  handleFilterChange({
                    level: (e.target.value as string) || undefined,
                  })
                }
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Any</em>
                </MenuItem>
                {levelOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size="small"
              sx={{ minWidth: 120 }}
              disabled={!localFilters.studyProgram}
            >
              <InputLabel id="type-select-label">Type</InputLabel>
              <Select
                labelId="type-select-label"
                value={
                  localFilters.isRequired === undefined
                    ? ''
                    : String(localFilters.isRequired)
                }
                label="Type"
                onChange={(e) =>
                  handleFilterChange({
                    isRequired:
                      e.target.value === ''
                        ? undefined
                        : e.target.value === 'true',
                  })
                }
              >
                <MenuItem value="">
                  <em>Any</em>
                </MenuItem>
                {courseTypeOptions.map((option) => (
                  <MenuItem
                    key={String(option.value)}
                    value={String(option.value)}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {activeFiltersCount > 0 && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClear}
                size="small"
                variant="text"
                color="secondary"
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

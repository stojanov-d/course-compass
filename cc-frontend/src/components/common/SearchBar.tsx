import {
  Autocomplete,
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Paper,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import { useState, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  initialValue?: string;
  suggestions?: string[];
}

export const SearchBar = ({
  onSearch,
  placeholder = 'Search courses...',
  initialValue = '',
  suggestions = [],
}: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearch = useDebounce((term: string) => onSearch(term), 500);

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: any, newValue: string | null) => {
      setSearchTerm(newValue || '');
      debouncedSearch(newValue || '');
    },
    [debouncedSearch]
  );

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          p: 1,
          border: '2px solid',
          borderColor: 'rgba(255,255,255,0.2)',
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.4)',
            backgroundColor: 'rgba(255,255,255,0.2)',
          },
          '&:focus-within': {
            borderColor: 'rgba(255,255,255,0.6)',
            backgroundColor: 'rgba(255,255,255,0.25)',
            boxShadow: '0 0 0 4px rgba(255,255,255,0.1)',
          },
        }}
      >
        <Autocomplete
          freeSolo
          options={suggestions}
          value={searchTerm}
          onInputChange={(_, value) => {
            setSearchTerm(value);
            debouncedSearch(value);
          }}
          onChange={handleChange}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={placeholder}
              variant="standard"
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 24 }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClear}
                      edge="end"
                      size="small"
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& input': {
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  color: 'white',
                  padding: '16px 8px',
                  '&::placeholder': {
                    color: 'rgba(255,255,255,0.7)',
                    opacity: 1,
                  },
                },
              }}
            />
          )}
        />
      </Paper>
    </Box>
  );
};

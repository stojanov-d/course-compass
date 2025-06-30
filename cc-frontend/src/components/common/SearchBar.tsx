import { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Paper,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export const SearchBar = ({
  onSearch,
  placeholder = 'Search courses...',
  initialValue = '',
}: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  const debouncedSearch = useDebounce((term: string) => {
    onSearch(term);
  }, 500);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchTerm(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onSearch('');
  }, [onSearch]);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        onSearch(searchTerm);
      }
    },
    [onSearch, searchTerm]
  );

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
        <TextField
          fullWidth
          variant="standard"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          InputProps={{
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
                  aria-label="clear search"
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
      </Paper>
    </Box>
  );
};

import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useState } from 'react';

interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalUsers: number;
}

export const UserFilters = ({
  searchTerm,
  onSearchChange,
  totalUsers,
}: UserFiltersProps) => {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  const activeFiltersCount = [
    roleFilter !== 'all',
    statusFilter !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length;

  return (
    <Box sx={{ mb: 3 }}>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{ flexGrow: 1, minWidth: 250 }}
        >
          <TextField
            fullWidth
            placeholder="Search users by name, username, or email..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: localSearch && (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={handleClearSearch}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={roleFilter}
            label="Role"
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ bgcolor: 'background.paper' }}
          >
            <MenuItem value="all">All Roles</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ bgcolor: 'background.paper' }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={`${totalUsers} users`} variant="outlined" size="small" />
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

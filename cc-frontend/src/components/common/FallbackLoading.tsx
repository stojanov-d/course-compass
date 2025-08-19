import { Box, CircularProgress } from '@mui/material';

export const FallbackLoading = () => {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
};

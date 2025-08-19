import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken } from '../api/authApi';
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Button,
} from '@mui/material';
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material';

const AuthCallbackPage = () => {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRun = useRef(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Signing you in…');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (code) {
        try {
          setMessage('Verifying with server…');
          const { token, user, expiresAt } = await exchangeCodeForToken(code);
          setMessage('Signing you in…');
          setSession({ token, user, expiresAt });
          setStatus('success');
        } catch (error) {
          console.error('Authentication failed:', error);
          setStatus('error');
          setErrorText(
            'We could not complete the sign-in. Please try again in a moment.'
          );
          return;
        } finally {
          if (status !== 'error') {
            setTimeout(() => navigate('/'), 500);
          }
        }
      } else {
        console.error('No authorization code found in URL.');
        setStatus('error');
        setErrorText('Missing authorization code. Please start sign-in again.');
      }
    };

    handleAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSession, navigate, location.search]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}
        >
          <Stack spacing={2} alignItems="center">
            {status === 'loading' && (
              <>
                <CircularProgress color="primary" size={48} />
                <Typography variant="h6" fontWeight={600}>
                  {message}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This should only take a moment.
                </Typography>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircleOutline color="success" sx={{ fontSize: 48 }} />
                <Typography variant="h6" fontWeight={600}>
                  You’re signed in!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Redirecting you back to the app…
                </Typography>
              </>
            )}

            {status === 'error' && (
              <>
                <ErrorOutline color="error" sx={{ fontSize: 48 }} />
                <Typography variant="h6" fontWeight={600}>
                  Sign-in failed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {errorText}
                </Typography>
                <Stack direction="row" spacing={2} mt={1}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/')}
                    color="primary"
                  >
                    Back to Home
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => (window.location.href = '/')}
                    color="inherit"
                  >
                    Try Again
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthCallbackPage;

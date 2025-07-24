import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken } from '../api/authApi';

const AuthCallbackPage = () => {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (code) {
        try {
          const { token, user, expiresAt } = await exchangeCodeForToken(code);
          setSession({ token, user, expiresAt });
        } catch (error) {
          console.error('Authentication failed:', error);
        } finally {
          navigate('/');
        }
      } else {
        console.error('No authorization code found in URL.');
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [setSession, navigate, location]);

  return <div>Authenticating...</div>;
};

export default AuthCallbackPage;

import { ReactNode, useState, useCallback, useEffect } from 'react';
import {
  getProfile,
  getDiscordLoginUrl,
  refreshAuthToken,
} from '../api/authApi';
import { User } from '../types/user';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('authToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem('refreshToken')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const verifyToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const userProfile = await getProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Token verification failed', error);
      if (refreshToken) {
        try {
          const {
            token: newToken,
            user: newUser,
            refreshToken: newRefreshToken,
          } = await refreshAuthToken(refreshToken);
          localStorage.setItem('authToken', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
            setRefreshToken(newRefreshToken);
          }
          setToken(newToken);
          setUser(newUser);
          return;
        } catch (refreshError) {
          console.error('Token refresh failed', refreshError);
        }
      }
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setToken(null);
      setRefreshToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, [token, verifyToken]);

  const login = (newToken: string, newUser: User, newRefreshToken?: string) => {
    localStorage.setItem('authToken', newToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
      setRefreshToken(newRefreshToken);
    }
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    // localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    // setRefreshToken(null);
  };

  const authRedirect = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      try {
        setIsLoading(true);
        const {
          token: newToken,
          user: newUser,
          refreshToken: newRefreshToken,
        } = await refreshAuthToken(storedRefreshToken);

        localStorage.setItem('authToken', newToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
          setRefreshToken(newRefreshToken);
        }
        setToken(newToken);
        setUser(newUser);
        setIsLoading(false);
        return; // Don't redirect to Discord if refresh token works
      } catch (error) {
        console.error('Refresh token failed, redirecting to Discord:', error);
        localStorage.removeItem('refreshToken');
        setRefreshToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    try {
      const { authUrl } = await getDiscordLoginUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Discord login', error);
    }
  };

  const value = { user, token, isLoading, login, logout, authRedirect };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

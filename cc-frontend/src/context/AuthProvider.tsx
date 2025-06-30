import { ReactNode, useState, useCallback, useEffect } from 'react';
import { getProfile, getDiscordLoginUrl } from '../api/authApi';
import { User } from '../types/user';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('authToken')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const verifyToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const userProfile = await getProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Token verification failed', error);
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, [token, verifyToken]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  const authRedirect = async () => {
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

import { ReactNode, useState, useCallback, useEffect } from 'react';
import { getDiscordLoginUrl, getProfile, renewToken } from '../api/authApi';
import { User } from '../types/user';
import { AuthContext } from './AuthContext';

interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

const AUTH_STORAGE_KEY = 'courseCompassAuth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isSessionValid = useCallback((session: AuthSession): boolean => {
    return session.expiresAt > Date.now();
  }, []);

  const loadStoredSession = useCallback((): AuthSession | null => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;

      const session: AuthSession = JSON.parse(stored);
      if (!isSessionValid(session)) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load stored session:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }, [isSessionValid]);

  const saveSession = useCallback((session: AuthSession): void => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, []);

  const verifyAndLoadUser = useCallback(async (): Promise<User | null> => {
    try {
      const userProfile = await getProfile();
      return userProfile;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }, []);

  const attemptTokenRenewal = useCallback(
    async (session: AuthSession): Promise<AuthSession | null> => {
      try {
        console.log('Attempting token renewal for user:', session.user.id);
        const renewalResponse = await renewToken(session.user.id);

        const newSession: AuthSession = {
          token: renewalResponse.token,
          user: renewalResponse.user,
          expiresAt: renewalResponse.expiresAt,
        };

        saveSession(newSession);
        return newSession;
      } catch (error: unknown) {
        console.error('Token renewal failed:', error);

        if (
          (error as { response?: { data?: { requiresReauth?: boolean } } })
            ?.response?.data?.requiresReauth
        ) {
          console.log('Discord refresh token expired, clearing session');
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return null;
        }

        return null;
      }
    },
    [saveSession]
  );

  const needsRenewal = useCallback((session: AuthSession): boolean => {
    const daysUntilExpiry =
      (session.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 7;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      const storedSession = loadStoredSession();
      if (storedSession) {
        // Check if token needs renewal
        if (needsRenewal(storedSession)) {
          console.log('Token needs renewal, attempting automatic renewal...');
          const renewedSession = await attemptTokenRenewal(storedSession);
          if (renewedSession) {
            setToken(renewedSession.token);
            setUser(renewedSession.user);
            setIsLoading(false);
            return;
          }
        }

        const userProfile = await verifyAndLoadUser();
        if (userProfile) {
          setToken(storedSession.token);
          setUser(userProfile);
          setIsLoading(false);
          return;
        } else {
          console.log('Token invalid, attempting renewal...');
          const renewedSession = await attemptTokenRenewal(storedSession);
          if (renewedSession) {
            setToken(renewedSession.token);
            setUser(renewedSession.user);
            setIsLoading(false);
            return;
          }
          console.log('Token renewal failed, session cleared');
        }
      }

      setToken(null);
      setUser(null);
      setIsLoading(false);
    };

    initAuth();
  }, [loadStoredSession, verifyAndLoadUser, needsRenewal, attemptTokenRenewal]);

  const setSession = useCallback(
    (session: AuthSession) => {
      setToken(session.token);
      setUser(session.user);
      saveSession(session);
    },
    [saveSession]
  );

  const login = useCallback(async () => {
    try {
      setIsLoading(true);

      // First, check if we have a valid stored session
      const storedSession = loadStoredSession();
      if (storedSession) {
        // Check if token needs renewal first
        if (needsRenewal(storedSession)) {
          console.log(
            'Token needs renewal during login, attempting automatic renewal...'
          );
          const renewedSession = await attemptTokenRenewal(storedSession);
          if (renewedSession) {
            setToken(renewedSession.token);
            setUser(renewedSession.user);
            setIsLoading(false);
            return;
          }
        }

        const userProfile = await verifyAndLoadUser();
        if (userProfile) {
          setToken(storedSession.token);
          setUser(userProfile);
          setIsLoading(false);
          return;
        } else {
          console.log('Token invalid during login, attempting renewal...');
          const renewedSession = await attemptTokenRenewal(storedSession);
          if (renewedSession) {
            setToken(renewedSession.token);
            setUser(renewedSession.user);
            setIsLoading(false);
            return;
          } else {
            console.log('Token renewal failed, will redirect to Discord');
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      }

      console.log('Redirecting to Discord for authentication');
      const { authUrl } = await getDiscordLoginUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Discord login:', error);
      setIsLoading(false);
    }
  }, [loadStoredSession, verifyAndLoadUser, needsRenewal, attemptTokenRenewal]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = user !== null && token !== null;

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    clearSession,
    setSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

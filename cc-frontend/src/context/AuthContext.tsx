import { createContext } from 'react';
import { User } from '../types/user';

interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  clearSession: () => void;
  setSession: (session: AuthSession) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

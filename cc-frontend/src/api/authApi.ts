import { User } from '../types/user';
import apiClient from './apiClient';

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export const getDiscordLoginUrl = async (): Promise<{ authUrl: string }> => {
  const response = await apiClient.get('/auth/login');
  return response.data;
};

export const exchangeCodeForToken = async (
  code: string
): Promise<AuthResponse> => {
  const response = await apiClient.get(`/auth/callback?code=${code}`);
  return response.data;
};

export const getProfile = async (): Promise<User> => {
  const response = await apiClient.get('/auth/profile');
  return response.data;
};

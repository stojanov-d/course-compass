import apiClient from './apiClient';

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}

export interface GetUsersResponse {
  users: AdminUser[];
  total: number;
  adminId: string;
}

export interface UpdateUserRoleRequest {
  role: 'user' | 'admin';
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  error?: string;
  user?: T;
}

export const adminApi = {
  getUsers: async (searchTerm?: string): Promise<GetUsersResponse> => {
    const params = searchTerm
      ? `?search=${encodeURIComponent(searchTerm)}`
      : '';
    const response = await apiClient.get(`/user-management/users${params}`);
    return response.data;
  },

  getUserDetails: async (userId: string): Promise<AdminUser> => {
    const response = await apiClient.get(`/user-management/users/${userId}`);
    return response.data;
  },

  updateUserRole: async (
    userId: string,
    role: 'user' | 'admin'
  ): Promise<ApiResponse<AdminUser>> => {
    const response = await apiClient.put(
      `/user-management/users/${userId}/role`,
      { role }
    );
    return response.data;
  },

  toggleUserStatus: async (userId: string): Promise<ApiResponse<AdminUser>> => {
    const response = await apiClient.put(
      `/user-management/users/${userId}/status`
    );
    return response.data;
  },
};

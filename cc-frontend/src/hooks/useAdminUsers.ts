import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminUser, GetUsersResponse } from '../api/adminApi';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [adminId, setAdminId] = useState<string>('');

  const fetchUsers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: GetUsersResponse = await adminApi.getUsers(search);
      setUsers(response.users);
      setTotal(response.total);
      setAdminId(response.adminId);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Failed to fetch users:', err);
      setError(error.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserRole = useCallback(
    async (userId: string, role: 'user' | 'admin') => {
      try {
        const response = await adminApi.updateUserRole(userId, role);
        if (response.success && response.user) {
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId ? { ...user, role: response.user!.role } : user
            )
          );
          return {
            success: true,
            message: response.message || 'Role updated successfully',
          };
        }
        return {
          success: false,
          message: response.error || 'Failed to update role',
        };
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        console.error('Failed to update user role:', err);
        return {
          success: false,
          message: error.response?.data?.error || 'Failed to update user role',
        };
      }
    },
    []
  );

  const toggleUserStatus = useCallback(async (userId: string) => {
    try {
      const response = await adminApi.toggleUserStatus(userId);
      if (response.success && response.user) {
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId
              ? { ...user, isActive: response.user!.isActive }
              : user
          )
        );
        return {
          success: true,
          message: response.message || 'Status updated successfully',
        };
      }
      return {
        success: false,
        message: response.error || 'Failed to update status',
      };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Failed to toggle user status:', err);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to update user status',
      };
    }
  }, []);

  const searchUsers = useCallback(
    (term: string) => {
      setSearchTerm(term);
      fetchUsers(term);
    },
    [fetchUsers]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    total,
    adminId,
    searchTerm,
    fetchUsers,
    updateUserRole,
    toggleUserStatus,
    searchUsers,
  };
};

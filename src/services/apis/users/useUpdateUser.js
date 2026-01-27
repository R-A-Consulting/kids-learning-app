import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useUpdateUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiRequest = useCallback(async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }, []);

  const updateUser = useCallback(async (userId, updateData) => {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const userData = data.data?.user || data.user || null;

      return {
        success: true,
        user: userData,
        message: data.message || 'User updated successfully',
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update user';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    updateUser,
    clearError,
  };
};


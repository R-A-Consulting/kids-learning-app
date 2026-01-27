import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useGetUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

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

  const getUser = useCallback(async (userId) => {
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
        method: 'GET',
      });

      const userData = data.data?.user || data.user || null;
      setUser(userData);

      return {
        success: true,
        user: userData,
        message: data.message || 'User retrieved successfully',
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch user';
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

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  return {
    isLoading,
    error,
    user,
    getUser,
    clearError,
    clearUser,
  };
};


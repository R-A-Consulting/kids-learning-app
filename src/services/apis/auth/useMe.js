import { useState, useCallback } from 'react';
import { GlobalContext } from '@/services/contexts/global-context';
import { useNavigate } from 'react-router-dom';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');

export const useMe = () => {
  const { setUser: setUserGlobal } = GlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const getCurrentUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user information');
      }

      // Store user data in global context and local state
      setUserGlobal(data.data?.user || null);
      setUser(data.data?.user || null);

      if (!data.data?.user) {
        navigate('/login');
      }

      return {
        success: true,
        user: data.data?.user || null,
        message: data.message || 'User information retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while fetching user information';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [setUserGlobal, navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    setUserGlobal(null);
    setError(null);
  }, [setUserGlobal]);

  return {
    getCurrentUser,
    isLoading,
    error,
    user,
    clearError,
    clearUser
  };
};

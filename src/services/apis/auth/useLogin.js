import { useState, useCallback } from 'react';
import { GlobalContext } from '@/services/contexts/global-context';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || '';

export const useLogin = () => {
  const { setUser: setUserGlobal } = GlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store user data
      setUserGlobal(data.data.user || null);
      setUser(data.data.user || null);

      return {
        success: true,
        user: data.data.user || null,
        message: data.message || 'Login successful'
      };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during login';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  return {
    login,
    isLoading,
    error,
    user,
    clearError,
    logout
  };
};

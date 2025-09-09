import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || '';

export const useLogin = () => {
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

      const cookies = response.headers.get('set-cookie');
      console.log(cookies);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store user data
      setUser(data.user || data);

      return {
        success: true,
        user: data.user || data,
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

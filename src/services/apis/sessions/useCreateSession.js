import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useCreateSession = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function for API calls
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

  // Create a new session
  const createSession = useCallback(async (sessionData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      return {
        success: true,
        data: data.data || data,
        message: data.message || 'Session created successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create session';
      setError(errorMessage);
      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,

    // Actions
    createSession,

    // Utilities
    clearError,
  };
};

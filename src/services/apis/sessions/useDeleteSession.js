import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useDeleteSession = () => {
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

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      return {
        success: true,
        message: data.message || 'Session deleted successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete session';
      setError(errorMessage);

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
    deleteSession,

    // Utilities
    clearError,
  };
};

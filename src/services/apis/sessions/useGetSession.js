import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useGetSession = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);

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

  // Get a specific session by ID
  const getSession = useCallback(async (sessionId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/sessions/${sessionId}`, {
        method: 'GET',
        credentials: 'include',
      });

      // Update local state
      const sessionData = data.session || data;
      setCurrentSession(sessionData);

      return {
        success: true,
        session: sessionData,
        message: data.message || 'Session retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch session';
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

  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    currentSession,

    // Actions
    getSession,

    // Utilities
    clearError,
    clearCurrentSession,
  };
};

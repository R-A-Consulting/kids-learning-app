import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
// const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');
const API_BASE_URL = '/api/v1';


export const useUpdateSession = () => {
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

  // Update a session
  const updateSession = useCallback(async (sessionId, updateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      return {
        success: true,
        session: data.session || data,
        message: data.message || 'Session updated successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update session';
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
    updateSession,

    // Utilities
    clearError,
  };
};

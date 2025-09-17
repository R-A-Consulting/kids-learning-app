import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');
console.log(API_BASE_URL, "API_BASE_URL");

export const useGetAllSessions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);

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

  // Get all sessions
  const getAllSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/sessions', {
        method: 'GET',
      });

      // Update local state
      const sessionsData = data.data.sessions || [];
      setSessions(sessionsData);

      return {
        success: true,
        sessions: sessionsData,
        message: data.message || 'Sessions retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch sessions';
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

  const clearSessions = useCallback(() => {
    setSessions([]);
  }, []);

  return {
    // State
    isLoading,
    error,
    sessions,

    // Actions
    getAllSessions,

    // Utilities
    clearError,
    clearSessions,
  };
};

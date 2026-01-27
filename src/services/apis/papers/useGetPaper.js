import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api/v1';

export const useGetPaper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paper, setPaper] = useState(null);

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

  // Get a single paper by ID
  const getPaper = useCallback(async (paperId) => {
    if (!paperId) {
      setError('Paper ID is required');
      return { success: false, error: 'Paper ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/papers/${paperId}`, {
        method: 'GET',
      });

      const paperData = data.data?.paper || null;
      setPaper(paperData);

      return {
        success: true,
        paper: paperData,
        message: 'Paper retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch paper';
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

  const clearPaper = useCallback(() => {
    setPaper(null);
  }, []);

  // Update paper in local state (for optimistic updates)
  const updateLocalPaper = useCallback((updates) => {
    setPaper(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return {
    // State
    isLoading,
    error,
    paper,

    // Actions
    getPaper,

    // Utilities
    clearError,
    clearPaper,
    updateLocalPaper,
  };
};

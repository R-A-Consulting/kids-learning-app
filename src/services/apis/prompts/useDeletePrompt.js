import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api/v1';

export const useDeletePrompt = () => {
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

  // Delete a prompt
  const deletePrompt = useCallback(async (promptId) => {
    if (!promptId) {
      return {
        success: false,
        error: 'Prompt ID is required',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/prompts/${promptId}`, {
        method: 'DELETE',
      });

      return {
        success: true,
        message: data.message || 'Prompt deleted successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete prompt';
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
    deletePrompt,

    // Utilities
    clearError,
  };
};


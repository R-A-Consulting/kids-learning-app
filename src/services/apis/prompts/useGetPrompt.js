import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useGetPrompt = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(null);

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

  // Get a single prompt by ID
  const getPrompt = useCallback(async (promptId) => {
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
        method: 'GET',
        credentials: 'include',
      });

      // Update local state
      const promptData = data.data?.prompt || data.prompt || null;
      setPrompt(promptData);

      return {
        success: true,
        prompt: promptData,
        message: data.message || 'Prompt retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch prompt';
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

  const clearPrompt = useCallback(() => {
    setPrompt(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    prompt,

    // Actions
    getPrompt,

    // Utilities
    clearError,
    clearPrompt,
  };
};


import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');

export const useGetPrompts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prompts, setPrompts] = useState([]);

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

  // Get all prompts with optional filters
  const getPrompts = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.grade) queryParams.append('grade', filters.grade);
      if (filters.subject) queryParams.append('subject', filters.subject);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.tag) queryParams.append('tag', filters.tag);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive);

      const queryString = queryParams.toString();
      const url = `/prompts${queryString ? `?${queryString}` : ''}`;

      const data = await apiRequest(url, {
        method: 'GET',
        credentials: 'include',
      });

      // Update local state
      const promptsData = data.data?.prompts || data.prompts || [];
      setPrompts(promptsData);

      return {
        success: true,
        prompts: promptsData,
        message: data.message || 'Prompts retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch prompts';
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

  const clearPrompts = useCallback(() => {
    setPrompts([]);
  }, []);

  return {
    // State
    isLoading,
    error,
    prompts,

    // Actions
    getPrompts,

    // Utilities
    clearError,
    clearPrompts,
  };
};


import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useGetPapers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [papers, setPapers] = useState([]);
  const [pagination, setPagination] = useState(null);

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

  // Get all papers
  const getPapers = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.questionType) queryParams.append('questionType', params.questionType);

      const queryString = queryParams.toString();
      const url = `/papers${queryString ? `?${queryString}` : ''}`;

      const data = await apiRequest(url, {
        method: 'GET',
      });

      const papersData = data.data?.papers || [];
      setPapers(papersData);
      setPagination(data.data?.pagination || null);

      return {
        success: true,
        papers: papersData,
        pagination: data.data?.pagination,
        message: 'Papers retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch papers';
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

  const clearPapers = useCallback(() => {
    setPapers([]);
    setPagination(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    papers,
    pagination,

    // Actions
    getPapers,

    // Utilities
    clearError,
    clearPapers,
  };
};

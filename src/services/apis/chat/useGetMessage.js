import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useGetMessage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

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

  // Get a specific message by ID
  const getMessage = useCallback(async (messageId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/chat/messages/${messageId}`, {
        method: 'GET',
      });

      // Update local state
      const messageData = data.message || data;
      setMessage(messageData);

      return {
        success: true,
        message: messageData,
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch message';
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

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    message,

    // Actions
    getMessage,

    // Utilities
    clearError,
    clearMessage,
  };
};

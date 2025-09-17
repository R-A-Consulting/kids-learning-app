import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
// const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');
const API_BASE_URL = '/api/v1';

export const useCreateMessage = () => {
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

  // Create a new message
  const createMessage = useCallback(async (messageData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(messageData),
      });

      // Update local state
      const createdMessage = data.message || data;
      setMessage(createdMessage);

      return {
        success: true,
        message: createdMessage,
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create message';
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
    createMessage,

    // Utilities
    clearError,
    clearMessage,
  };
};

import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');

export const useGetSessionMessages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);

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

  // Get messages for a specific session
  const getSessionMessages = useCallback(async (sessionId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/chat/sessions/${sessionId}/messages`, {
        method: 'GET',
      });

      // Update local state - handle the nested structure
      const messagesData = data.data?.chatMessages || data.chatMessages || data.messages || [];
      setMessages(messagesData);

      return {
        success: true,
        messages: messagesData,
        message: data.message || 'Messages retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch session messages';
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

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // State
    isLoading,
    error,
    messages,

    // Actions
    getSessionMessages,

    // Utilities
    clearError,
    clearMessages,
  };
};

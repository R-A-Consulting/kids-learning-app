import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useUpdatePaper = () => {
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

  // Update entire paper
  const updatePaper = useCallback(async (paperId, updates) => {
    if (!paperId) {
      const errorMessage = 'Paper ID is required';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/papers/${paperId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return {
        success: true,
        paper: data.data?.paper,
        message: data.message || 'Paper updated successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update paper';
      setError(errorMessage);
      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Update a single question
  const updateQuestion = useCallback(async (paperId, questionId, updates) => {
    if (!paperId || !questionId) {
      const errorMessage = 'Paper ID and Question ID are required';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/papers/${paperId}/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      toast.success('Question updated');

      return {
        success: true,
        paper: data.data?.paper,
        updatedQuestion: data.data?.updatedQuestion,
        message: data.message || 'Question updated successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update question';
      setError(errorMessage);
      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Delete a question from paper
  const deleteQuestion = useCallback(async (paperId, questionId) => {
    if (!paperId || !questionId) {
      const errorMessage = 'Paper ID and Question ID are required';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/papers/${paperId}/questions/${questionId}`, {
        method: 'DELETE',
      });

      toast.success('Question deleted');

      return {
        success: true,
        paper: data.data?.paper,
        message: data.message || 'Question deleted successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete question';
      setError(errorMessage);
      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Add chat message for paper refinement
  const addChatMessage = useCallback(async (paperId, message) => {
    if (!paperId || !message) {
      const errorMessage = 'Paper ID and message are required';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/papers/${paperId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      return {
        success: true,
        chatHistory: data.data?.chatHistory,
        message: data.message || 'Message sent successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);

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
    updatePaper,
    updateQuestion,
    deleteQuestion,
    addChatMessage,

    // Utilities
    clearError,
  };
};

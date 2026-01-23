import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');

export const useGeneratePaper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // Generate a new paper from PDF
  const generatePaper = useCallback(async ({ title, file, questionType, numberOfQuestions, extraPrompt }) => {
    if (!title || !title.trim()) {
      const errorMessage = 'Paper title is required';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    
    if (!file) {
      const errorMessage = 'PDF file is required';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    setIsLoading(true);
    setError(null);
    setProgress(10);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('file', file);
      formData.append('questionType', questionType || 'objective');
      formData.append('numberOfQuestions', numberOfQuestions || 10);
      if (extraPrompt) {
        formData.append('extraPrompt', extraPrompt);
      }

      setProgress(50);

      const response = await fetch(`${API_BASE_URL}/papers/generate`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });

      setProgress(90);

      const data = await response.json();

      // Accept both 201 (created) and 202 (accepted for background processing)
      if (!response.ok && response.status !== 202) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      setProgress(100);
      toast.success('Question generation started! You\'ll be notified when complete.');

      return {
        success: true,
        paper: data.data?.paper,
        message: data.message || 'Paper generation started'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to start paper generation';
      setError(errorMessage);
      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 500);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
  }, []);

  return {
    // State
    isLoading,
    error,
    progress,

    // Actions
    generatePaper,

    // Utilities
    clearError,
    resetProgress,
  };
};

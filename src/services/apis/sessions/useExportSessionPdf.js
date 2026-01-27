import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api/v1';

export const useExportSessionPdf = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function for API calls
  const apiRequest = useCallback(async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response;
  }, []);

  // Export session as PDF
  const exportSessionPdf = useCallback(async (sessionId, filename = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest(`/sessions/${sessionId}/export/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Use provided filename or generate one
      const finalFilename = filename || `session-${sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = finalFilename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'PDF exported successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to export PDF';
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
    exportSessionPdf,

    // Utilities
    clearError,
  };
};

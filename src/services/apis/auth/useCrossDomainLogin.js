import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');

export const useCrossDomainLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const crossDomainLogin = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/cross-domain-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Cross-domain login failed');
      }

      setResponse(data);

      return {
        success: true,
        data: data.data || data,
        message: data.message || 'Cross-domain login successful'
      };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during cross-domain login';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResponse = useCallback(() => {
    setResponse(null);
  }, []);

  return {
    crossDomainLogin,
    isLoading,
    error,
    response,
    clearError,
    clearResponse,
  };
};


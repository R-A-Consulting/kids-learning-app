import { useState, useCallback } from 'react';
import { GlobalContext } from '@/services/contexts/global-context';

// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');

export const useConsumeToken = () => {
  const { setUser: setUserGlobal } = GlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const consumeToken = useCallback(async (token, credentials = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/consume-token?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token consumption failed');
      }

      // Store user data if returned
      if (data.data?.user) {
        setUserGlobal(data.data.user);
      }

      return {
        success: true,
        data: data.data || null,
        message: data.message || 'Token consumed successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during token consumption';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [setUserGlobal]);

  return {
    consumeToken,
    isLoading,
    error,
  };
};


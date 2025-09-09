import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || '';

export const useSessions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // Helper function for API calls
  const apiRequest = useCallback(async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}/api${url}`, {
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

  // Create a new session
  const createSession = useCallback(async (sessionData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      // Update local state
      setSessions(prev => [...prev, data.session || data]);

      return {
        success: true,
        session: data.session || data,
        message: data.message || 'Session created successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create session';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Get all sessions
  const getAllSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/sessions', {
        method: 'GET',
      });

      // Update local state
      setSessions(data.sessions || data || []);

      return {
        success: true,
        sessions: data.sessions || data || [],
        message: data.message || 'Sessions retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch sessions';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Get a specific session by ID
  const getSession = useCallback(async (sessionId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/sessions/${sessionId}`, {
        method: 'GET',
      });

      // Update local state
      setCurrentSession(data.session || data);

      return {
        success: true,
        session: data.session || data,
        message: data.message || 'Session retrieved successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch session';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Update a session
  const updateSession = useCallback(async (sessionId, updateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Update local state
      setSessions(prev =>
        prev.map(session =>
          session.id === sessionId ? (data.session || data) : session
        )
      );

      if (currentSession && currentSession.id === sessionId) {
        setCurrentSession(data.session || data);
      }

      return {
        success: true,
        session: data.session || data,
        message: data.message || 'Session updated successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update session';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, currentSession]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      // Update local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));

      if (currentSession && currentSession.id === sessionId) {
        setCurrentSession(null);
      }

      return {
        success: true,
        message: data.message || 'Session deleted successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete session';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, currentSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    sessions,
    currentSession,

    // Actions
    createSession,
    getAllSessions,
    getSession,
    updateSession,
    deleteSession,

    // Utilities
    clearError,
    clearCurrentSession,
  };
};

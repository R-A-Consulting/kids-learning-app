import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api/v1';

// Helper function for API calls
const apiRequest = async (url, options = {}) => {
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
};

/**
 * Hook to fetch dashboard stats
 */
export function useDashboardStats() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest('/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

/**
 * Hook to fetch quality metrics
 */
export function useQualityMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('/dashboard/quality-metrics');
        setMetrics(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return { metrics, isLoading, error };
}

/**
 * Hook to fetch recent activity
 */
export function useRecentActivity(limit = 10) {
  const [recentBanks, setRecentBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecent = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`/dashboard/recent-activity?limit=${limit}`);
      setRecentBanks(response.data?.recentBanks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return { recentBanks, isLoading, error, refetch: fetchRecent };
}

/**
 * Hook to fetch subject breakdown
 */
export function useSubjectBreakdown() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await apiRequest('/dashboard/subject-breakdown');
        setSubjects(response.data?.subjects || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  return { subjects, isLoading, error };
}

/**
 * Hook to fetch generation history
 */
export function useGenerationHistory(days = 30) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiRequest(`/dashboard/generation-history?days=${days}`);
        setHistory(response.data?.history || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [days]);

  return { history, isLoading, error };
}

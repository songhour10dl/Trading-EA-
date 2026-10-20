import { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import { useNotificationStore } from '../store/notificationStore';

export const useApi = <T,>(
  url: string,
  options?: { immediate?: boolean; dependencies?: any[] }
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToast = useNotificationStore((state) => state.addToast);

  const immediate = options?.immediate !== false;
  const deps = options?.dependencies || [url];

  useEffect(() => {
    if (!immediate) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(url);
        setData(response.data?.data !== undefined ? response.data.data : response.data);
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch data';
        setError(errorMsg);
        addToast(errorMsg, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, deps);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(url);
      setData(response.data?.data !== undefined ? response.data.data : response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch data';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

export const useMutation = <T, R>(url: string, method: 'post' | 'put' | 'patch' | 'delete' = 'post') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToast = useNotificationStore((state) => state.addToast);

  const mutate = async (payload?: T): Promise<R | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient[method]<any>(url, payload);
      addToast(response.data.message || 'Success', 'success');
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Operation failed';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
};

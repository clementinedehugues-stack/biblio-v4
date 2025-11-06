import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export type ReadingStatus = 'to_read' | 'reading' | 'finished' | 'favorites';

interface ReadingStatusData {
  status: ReadingStatus;
  startedAt?: number;
  finishedAt?: number;
  lastReadAt?: number;
  pagesRead?: number;
  totalPages?: number;
}

export function useReadingStatus() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, ReadingStatusData>>({});

  // Load all reading statuses from localStorage
  useEffect(() => {
    if (!user?.id) {
      setStatuses({});
      return;
    }

    const loaded: Record<string, ReadingStatusData> = {};
    const prefix = `reading_status:${user.id}:`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      const bookId = key.substring(prefix.length);
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        loaded[bookId] = data;
      } catch {
        // Ignore invalid data
      }
    }

    setStatuses(loaded);
  }, [user?.id]);

  const setReadingStatus = useCallback((bookId: string, status: ReadingStatus) => {
    if (!user?.id) return;

    const key = `reading_status:${user.id}:${bookId}`;
    const now = Date.now();
    const current = statuses[bookId] || {};

    const updated: ReadingStatusData = {
      ...current,
      status,
      lastReadAt: now,
    };

    // Track timestamps
    if (status === 'reading' && !current.startedAt) {
      updated.startedAt = now;
    }
    if (status === 'finished' && !current.finishedAt) {
      updated.finishedAt = now;
    }

    localStorage.setItem(key, JSON.stringify(updated));
    setStatuses((prev) => ({ ...prev, [bookId]: updated }));
  }, [user?.id, statuses]);

  const updateReadingProgress = useCallback((bookId: string, pagesRead: number, totalPages: number) => {
    if (!user?.id) return;

    const key = `reading_status:${user.id}:${bookId}`;
    const current = statuses[bookId] || { status: 'reading' as ReadingStatus };

    const updated: ReadingStatusData = {
      ...current,
      pagesRead,
      totalPages,
      lastReadAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(updated));
    setStatuses((prev) => ({ ...prev, [bookId]: updated }));
  }, [user?.id, statuses]);

  const getReadingStatus = useCallback((bookId: string): ReadingStatusData | null => {
    return statuses[bookId] || null;
  }, [statuses]);

  const getBooksByStatus = useCallback((status: ReadingStatus): string[] => {
    return Object.entries(statuses)
      .filter(([, data]) => data.status === status)
      .map(([bookId]) => bookId);
  }, [statuses]);

  const removeReadingStatus = useCallback((bookId: string) => {
    if (!user?.id) return;

    const key = `reading_status:${user.id}:${bookId}`;
    localStorage.removeItem(key);
    setStatuses((prev) => {
      const updated = { ...prev };
      delete updated[bookId];
      return updated;
    });
  }, [user?.id]);

  return {
    statuses,
    setReadingStatus,
    updateReadingProgress,
    getReadingStatus,
    getBooksByStatus,
    removeReadingStatus,
  };
}

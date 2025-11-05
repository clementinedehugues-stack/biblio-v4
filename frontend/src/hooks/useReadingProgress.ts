import { useMemo } from 'react';

export type ReadingProgress = {
  page?: number;
  pages?: number;
  at: number;
};

type ProgressEntry = { bookId: string; progress: ReadingProgress };

type ProgressApi = {
  get: (bookId: string) => ReadingProgress | null;
  set: (bookId: string, data: ReadingProgress) => void;
  getLatest: () => ProgressEntry | null;
  listAll: () => ProgressEntry[];
};

const noopApi: ProgressApi = {
  get: () => null,
  set: () => undefined,
  getLatest: () => null,
  listAll: () => [],
};

export function useReadingProgress(userId?: string | null): ProgressApi {
  const isBrowser = typeof window !== 'undefined';

  return useMemo(() => {
    if (!userId || !isBrowser) return noopApi;
    const prefix = `progress:${userId}:`;

    const get: ProgressApi['get'] = (bookId) => {
      try {
        const raw = window.localStorage.getItem(prefix + bookId);
        return raw ? (JSON.parse(raw) as ReadingProgress) : null;
      } catch {
        return null;
      }
    };

    const set: ProgressApi['set'] = (bookId, data) => {
      try {
        window.localStorage.setItem(prefix + bookId, JSON.stringify(data));
      } catch {
        // Swallow storage errors (quota, disabled storage, etc.)
      }
    };

    const listAll: ProgressApi['listAll'] = () => {
      const records: ProgressEntry[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const bookId = key.substring(prefix.length);
        try {
          const progress = JSON.parse(window.localStorage.getItem(key) || 'null') as ReadingProgress | null;
          if (progress && typeof progress.at === 'number') {
            records.push({ bookId, progress });
          }
        } catch {
          continue;
        }
      }
      return records.sort((a, b) => (b.progress.at ?? 0) - (a.progress.at ?? 0));
    };

    const getLatest: ProgressApi['getLatest'] = () => listAll()[0] ?? null;

    return { get, set, getLatest, listAll };
  }, [userId, isBrowser]);
}

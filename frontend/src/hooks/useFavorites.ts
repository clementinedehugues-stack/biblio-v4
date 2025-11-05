import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

const KEY = (userId: string | null) => `fav:${userId ?? 'guest'}`;

export function useFavorites() {
  const { user } = useAuth();
  const storageKey = KEY(user?.id ?? null);

  const read = useCallback((): Set<string> => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { return new Set<string>(); }
  }, [storageKey]);

  const write = useCallback((set: Set<string>) => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(set)));
  }, [storageKey]);

  const isFavorite = useCallback((id: string) => read().has(id), [read]);

  const toggle = useCallback((id: string) => {
    const s = read();
    if (s.has(id)) s.delete(id); else s.add(id);
    write(s);
    return s.has(id);
  }, [read, write]);

  const all = useMemo(() => Array.from(read()), [read]);

  return { isFavorite, toggle, favorites: all };
}

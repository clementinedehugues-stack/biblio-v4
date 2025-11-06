import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Shelf {
  id: string;
  name: string;
  bookIds: string[];
  createdAt: number;
  color?: string;
}

export function useShelves() {
  const { user } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);

  // Load shelves from localStorage
  useEffect(() => {
    if (!user?.id) {
      setShelves([]);
      return;
    }

    const key = `shelves:${user.id}`;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        setShelves(JSON.parse(data));
      }
    } catch {
      setShelves([]);
    }
  }, [user?.id]);

  // Persist shelves to localStorage
  const persistShelves = useCallback((updatedShelves: Shelf[]) => {
    if (!user?.id) return;
    const key = `shelves:${user.id}`;
    localStorage.setItem(key, JSON.stringify(updatedShelves));
    setShelves(updatedShelves);
  }, [user?.id]);

  const createShelf = useCallback((name: string, color?: string) => {
    const newShelf: Shelf = {
      id: `shelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      bookIds: [],
      createdAt: Date.now(),
      color,
    };
    persistShelves([...shelves, newShelf]);
    return newShelf;
  }, [shelves, persistShelves]);

  const updateShelf = useCallback((shelfId: string, updates: Partial<Omit<Shelf, 'id'>>) => {
    const updated = shelves.map((shelf) =>
      shelf.id === shelfId ? { ...shelf, ...updates } : shelf
    );
    persistShelves(updated);
  }, [shelves, persistShelves]);

  const deleteShelf = useCallback((shelfId: string) => {
    const updated = shelves.filter((shelf) => shelf.id !== shelfId);
    persistShelves(updated);
  }, [shelves, persistShelves]);

  const addBookToShelf = useCallback((shelfId: string, bookId: string) => {
    const updated = shelves.map((shelf) => {
      if (shelf.id === shelfId && !shelf.bookIds.includes(bookId)) {
        return { ...shelf, bookIds: [...shelf.bookIds, bookId] };
      }
      return shelf;
    });
    persistShelves(updated);
  }, [shelves, persistShelves]);

  const removeBookFromShelf = useCallback((shelfId: string, bookId: string) => {
    const updated = shelves.map((shelf) => {
      if (shelf.id === shelfId) {
        return { ...shelf, bookIds: shelf.bookIds.filter((id) => id !== bookId) };
      }
      return shelf;
    });
    persistShelves(updated);
  }, [shelves, persistShelves]);

  const getShelvesForBook = useCallback((bookId: string): Shelf[] => {
    return shelves.filter((shelf) => shelf.bookIds.includes(bookId));
  }, [shelves]);

  return {
    shelves,
    createShelf,
    updateShelf,
    deleteShelf,
    addBookToShelf,
    removeBookFromShelf,
    getShelvesForBook,
  };
}

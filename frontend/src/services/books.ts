import { apiFetch, apiUpload } from '@/lib/api';

export type Language = 'FR' | 'EN';

export interface BookCreatePayload {
  title: string;
  author: string;
  description?: string;
  cover_image_url?: string;
  category: string;
  tags?: string[];
  language: Language;
}

export interface BookRead {
  id: string;
  title: string;
  author: string;
  description?: string | null;
  cover_image_url?: string | null;
  thumbnail_path?: string | null;
  category: string;
  tags: string[];
  language: Language;
  created_at: string;
  updated_at: string;
  has_document: boolean;
  stream_endpoint?: string | null;
}

export interface DocumentStreamTokenResponse {
  token: string;
  expires_at: string;
  stream_endpoint: string;
  ttl_seconds: number;
}

export const getBooks = async (params?: { category?: string; author?: string; language?: Language }) => {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.author) qs.set('author', params.author);
  if (params?.language) qs.set('language', params.language);
  const query = qs.toString();
  return await apiFetch<BookRead[]>(`/books/${query ? `?${query}` : ''}`);
};

export const getBook = async (id: string) => {
  return await apiFetch<BookRead>(`/books/${id}`);
};

export const createBook = async (payload: BookCreatePayload) => {
  return await apiFetch<BookRead>('/books/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateBook = async (id: string, patch: Partial<BookCreatePayload>) => {
  return await apiFetch<BookRead>(`/books/${id}` , {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
};

export const deleteBook = async (id: string) => {
  await apiFetch(`/books/${id}`, { method: 'DELETE' });
  return { id };
};

export const requestBookStreamToken = async (id: string) => {
  return await apiFetch<DocumentStreamTokenResponse>(`/books/${id}/stream-token`, { method: 'POST' });
};

export const createBookWithFile = async (payload: {
  title: string;
  author: string;
  description?: string;
  category: string;
  language: Language;
  file: File;
}, opts?: { onProgress?: (percent: number) => void }) => {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('author', payload.author);
  if (payload.description) form.append('description', payload.description);
  form.append('category', payload.category);
  form.append('language', payload.language);
  form.append('file', payload.file);
  return await apiUpload<BookRead>('/books/create_with_file', form, { onProgress: opts?.onProgress });
};

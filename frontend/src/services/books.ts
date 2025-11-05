import api from './api';

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
  const { data } = await api.get<BookRead[]>('/books/', { params });
  return data;
};

export const getBook = async (id: string) => {
  const { data } = await api.get<BookRead>(`/books/${id}`);
  return data;
};

export const createBook = async (payload: BookCreatePayload) => {
  const { data } = await api.post<BookRead>('/books/', payload);
  return data;
};

export const updateBook = async (id: string, patch: Partial<BookCreatePayload>) => {
  const { data } = await api.put<BookRead>(`/books/${id}`, patch);
  return data;
};

export const deleteBook = async (id: string) => {
  await api.delete(`/books/${id}`);
  return { id };
};

export const requestBookStreamToken = async (id: string) => {
  const { data } = await api.post<DocumentStreamTokenResponse>(`/books/${id}/stream-token`);
  return data;
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
  const { data } = await api.post<BookRead>('/books/create_with_file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Narrow type compatible with AxiosProgressEvent shape
    onUploadProgress: (e: { total?: number | null; loaded?: number | null }) => {
      if (!opts?.onProgress) return;
      const total = (typeof e.total === 'number' && e.total > 0) ? e.total : 0;
      if (total > 0) {
        const loaded = (typeof e.loaded === 'number') ? e.loaded : 0;
        const percent = Math.round((loaded / total) * 100);
        opts.onProgress(percent);
      }
    },
  });
  return data;
};

import { apiFetch, apiUpload } from '@/lib/api';

export interface DocumentRead { id: string; [key: string]: unknown }

export const getDocuments = async (): Promise<DocumentRead[]> => {
  return await apiFetch<DocumentRead[]>('/documents/');
};

export const uploadDocument = async (file: File, bookId: string, opts?: { onProgress?: (percent: number) => void }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('book_id', bookId);
  return await apiUpload('/documents/upload', formData, { onProgress: opts?.onProgress });
};

export const regenerateThumbnails = async (params?: { onlyMissing?: boolean; limit?: number }) => {
  const onlyMissing = params?.onlyMissing ?? true;
  const query = new URLSearchParams();
  query.set('only_missing', String(onlyMissing));
  if (params?.limit != null) query.set('limit', String(params.limit));
  return await apiFetch<{ processed: number; updated: number; skipped: number }>(`/documents/regenerate_thumbnails?${query.toString()}`, { method: 'POST' });
};

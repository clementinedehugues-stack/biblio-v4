import api from './api';

export const getDocuments = async () => {
  const { data } = await api.get('/documents/');
  return data;
};

export const uploadDocument = async (file: File, bookId: string, opts?: { onProgress?: (percent: number) => void }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('book_id', bookId);
  const { data } = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
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

export const regenerateThumbnails = async (params?: { onlyMissing?: boolean; limit?: number }) => {
  const onlyMissing = params?.onlyMissing ?? true;
  const query = new URLSearchParams();
  query.set('only_missing', String(onlyMissing));
  if (params?.limit != null) query.set('limit', String(params.limit));
  const { data } = await api.post(`/documents/regenerate_thumbnails?${query.toString()}`);
  return data as { processed: number; updated: number; skipped: number };
};

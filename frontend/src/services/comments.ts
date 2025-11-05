import { apiFetch } from '@/lib/api';

export interface CommentRead {
  id: string;
  user_id: string;
  username: string;
  rating: number | null;
  content: string | null;
  created_at: string;
}

export interface CommentCreate {
  rating?: number | null;
  content?: string | null;
}

export const listComments = async (bookId: string): Promise<CommentRead[]> => {
  return await apiFetch<CommentRead[]>(`/books/${bookId}/comments/`);
};

export const addComment = async (bookId: string, payload: CommentCreate): Promise<CommentRead> => {
  return await apiFetch<CommentRead>(`/books/${bookId}/comments/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

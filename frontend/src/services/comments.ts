import api from './api';

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
  const { data } = await api.get(`/books/${bookId}/comments/`);
  return data;
};

export const addComment = async (bookId: string, payload: CommentCreate): Promise<CommentRead> => {
  const { data } = await api.post(`/books/${bookId}/comments/`, payload);
  return data;
};

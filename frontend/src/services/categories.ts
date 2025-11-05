import { apiFetch } from '@/lib/api';

export interface CategoryRead { name: string; usage_count: number }
export interface CategoryCreate { name: string }

export const listCategories = async (): Promise<CategoryRead[]> => {
  return await apiFetch<CategoryRead[]>('/categories/');
};

export const createCategory = async (payload: CategoryCreate): Promise<CategoryRead> => {
  return await apiFetch<CategoryRead>('/categories/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const deleteCategory = async (name: string): Promise<void> => {
  await apiFetch(`/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
};

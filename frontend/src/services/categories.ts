import api from './api';

export interface CategoryRead { name: string; usage_count: number }
export interface CategoryCreate { name: string }

export const listCategories = async (): Promise<CategoryRead[]> => {
  const { data } = await api.get('/categories/');
  return data;
};

export const createCategory = async (payload: CategoryCreate): Promise<CategoryRead> => {
  const { data } = await api.post('/categories/', payload);
  return data;
};

export const deleteCategory = async (name: string): Promise<void> => {
  await api.delete(`/categories/${encodeURIComponent(name)}`);
};

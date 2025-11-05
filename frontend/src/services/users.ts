import api from './api';
import type { User, CreateUser, UpdateUserPassword, ChangeOwnPassword } from '@/types/user';

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/admin/users/');
  return data;
};

export const createUser = async (userData: CreateUser): Promise<User> => {
  const { data } = await api.post('/admin/users/', userData);
  return data;
};

export const updateUserPassword = async ({ userId, newPassword }: UpdateUserPassword): Promise<void> => {
  await api.put(`/admin/users/${userId}/password`, { new_password: newPassword });
};

export const changeOwnPassword = async ({ oldPassword, newPassword }: ChangeOwnPassword): Promise<void> => {
  await api.put('/users/me/password', { current_password: oldPassword, new_password: newPassword });
};

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

export type UpdateUserProfilePayload = Partial<Pick<User, 'username' | 'full_name' | 'role'>>;

export const updateUserProfile = async (userId: string, patch: UpdateUserProfilePayload): Promise<User> => {
  const { data } = await api.patch(`/admin/users/${userId}`, patch);
  return data;
};

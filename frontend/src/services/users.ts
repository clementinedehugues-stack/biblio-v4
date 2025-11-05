import { apiFetch } from '@/lib/api';
import type { User, CreateUser, UpdateUserPassword, ChangeOwnPassword } from '@/types/user';

export const getUsers = async (): Promise<User[]> => {
  return await apiFetch<User[]>('/admin/users/');
};

export const createUser = async (userData: CreateUser): Promise<User> => {
  return await apiFetch<User>('/admin/users/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUserPassword = async ({ userId, newPassword }: UpdateUserPassword): Promise<void> => {
  await apiFetch(`/admin/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password: newPassword }),
  });
};

export const changeOwnPassword = async ({ oldPassword, newPassword }: ChangeOwnPassword): Promise<void> => {
  await apiFetch('/users/me/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: oldPassword, new_password: newPassword }),
  });
};

export const deleteUser = async (userId: string): Promise<void> => {
  await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
};

export type UpdateUserProfilePayload = Partial<Pick<User, 'username' | 'full_name' | 'role'>>;

export const updateUserProfile = async (userId: string, patch: UpdateUserProfilePayload): Promise<User> => {
  return await apiFetch<User>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
};

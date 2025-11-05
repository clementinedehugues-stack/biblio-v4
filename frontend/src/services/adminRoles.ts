// Services for admin roles management
import api from './api';

export type AdminRole = { id: string; user: string; role: string };

type AdminRoleAPIResponse = { id: string; username: string; full_name: string; role: string };

export async function getAdminRoles(): Promise<AdminRole[]> {
  const { data }: { data: AdminRoleAPIResponse[] } = await api.get('/admin/roles/');
  return data.map((role) => ({
    id: role.id,
    user: role.username,
    role: role.role
  }));
}

export async function updateAdminRole(id: string, newRole: string): Promise<AdminRole> {
  const { data }: { data: AdminRoleAPIResponse } = await api.put(`/admin/roles/${id}/`, { role: newRole });
  return {
    id: data.id,
    user: data.username,
    role: data.role
  };
}

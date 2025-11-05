// Services for admin roles management
import { apiFetch } from '@/lib/api';

export type AdminRole = { id: string; user: string; role: string };

type AdminRoleAPIResponse = { id: string; username: string; full_name: string; role: string };

export async function getAdminRoles(): Promise<AdminRole[]> {
  const data = await apiFetch<AdminRoleAPIResponse[]>('/admin/roles/');
  return data.map((role) => ({
    id: role.id,
    user: role.username,
    role: role.role
  }));
}

export async function updateAdminRole(id: string, newRole: string): Promise<AdminRole> {
  const data = await apiFetch<AdminRoleAPIResponse>(`/admin/roles/${id}/`, {
    method: 'PUT',
    body: JSON.stringify({ role: newRole }),
  });
  return {
    id: data.id,
    user: data.username,
    role: data.role
  };
}

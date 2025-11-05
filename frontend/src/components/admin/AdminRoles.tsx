import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminRoles, updateAdminRole, type AdminRole } from '@/services/adminRoles';

const ROLES = ['Administrateur', 'Modérateur', 'Utilisateur'];

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const { data } = useQuery<AdminRole[]>({ queryKey: ['adminRoles'], queryFn: getAdminRoles });
  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateAdminRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminRoles'] })
  });
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Utilisateur</th>
          <th className="text-left p-2">Rôle</th>
        </tr>
      </thead>
      <tbody>
        {data?.map(r => (
          <tr key={r.id} className="border-b">
            <td className="p-2">{r.user}</td>
            <td className="p-2">
              <select
                className="border rounded px-2 py-1"
                value={r.role}
                onChange={e => mutation.mutate({ id: r.id, role: e.target.value })}
              >
                {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </td>
          </tr>
        )) || <tr><td colSpan={2}>Aucun utilisateur</td></tr>}
      </tbody>
    </table>
  );
}

import { useQuery } from '@tanstack/react-query';
import { getAdminLogs, type AdminLog } from '@/services/adminLogs';

export default function AdminLogs() {
  const { data } = useQuery<AdminLog[]>({ queryKey: ['adminLogs'], queryFn: getAdminLogs });
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Utilisateur</th>
            <th className="text-left p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {data?.map(log => (
            <tr key={log.id} className="border-b hover:bg-muted/30">
              <td className="p-2 whitespace-nowrap">{log.date}</td>
              <td className="p-2 whitespace-nowrap">{log.user}</td>
              <td className="p-2">{log.action}</td>
            </tr>
          )) || <tr><td colSpan={3}>Aucun log</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

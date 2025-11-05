import { useQuery } from '@tanstack/react-query';
import { getAdminNotifications, type AdminNotification } from '@/services/adminNotifications';

export default function AdminNotifications() {
  const { data } = useQuery<AdminNotification[]>({ queryKey: ['adminNotifications'], queryFn: getAdminNotifications });
  return (
    <div className="space-y-3">
      {data?.map(n => (
        <div key={n.id} className={`border rounded p-3 flex items-center gap-3 ${n.type === 'error' ? 'border-red-400 bg-red-50' : n.type === 'warning' ? 'border-yellow-400 bg-yellow-50' : 'border-blue-400 bg-blue-50'}`}>
          <span className="font-bold uppercase text-xs">{n.type}</span>
          <span className="flex-1">{n.message}</span>
          <span className="text-xs text-muted-foreground">{n.date}</span>
        </div>
      )) || <div>Aucune notification</div>}
    </div>
  );
}

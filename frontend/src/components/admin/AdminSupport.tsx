import { useQuery } from '@tanstack/react-query';
import { getAdminTickets, type AdminTicket } from '@/services/adminSupport';

export default function AdminSupport() {
  const { data } = useQuery<AdminTicket[]>({ queryKey: ['adminTickets'], queryFn: getAdminTickets });
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Utilisateur</th>
            <th className="text-left p-2">Sujet</th>
            <th className="text-left p-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {data?.map(ticket => (
            <tr key={ticket.id} className="border-b hover:bg-muted/30">
              <td className="p-2 whitespace-nowrap">{ticket.date}</td>
              <td className="p-2 whitespace-nowrap">{ticket.user}</td>
              <td className="p-2">{ticket.subject}</td>
              <td className="p-2">{ticket.status}</td>
            </tr>
          )) || <tr><td colSpan={4}>Aucun ticket</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

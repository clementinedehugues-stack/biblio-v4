// Services for admin support tickets
import { apiFetch } from '@/lib/api';

export type AdminTicket = { id: number; user: string; subject: string; status: string; date: string };

type AdminTicketAPIResponse = { id: number; user: string; subject: string; status: string; timestamp: string };

export async function getAdminTickets(): Promise<AdminTicket[]> {
  const data = await apiFetch<AdminTicketAPIResponse[]>('/admin/tickets/');
  return data.map((ticket) => ({
    ...ticket,
    date: new Date(ticket.timestamp).toLocaleString()
  }));
}

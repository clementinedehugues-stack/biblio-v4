// Services for admin notifications
import { apiFetch } from '@/lib/api';

export type AdminNotification = { id: number; type: string; message: string; date: string };

type AdminNotificationAPIResponse = { id: number; type: string; message: string; timestamp: string };

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const data = await apiFetch<AdminNotificationAPIResponse[]>('/admin/notifications/');
  return data.map((notification) => ({
    ...notification,
    date: new Date(notification.timestamp).toLocaleString()
  }));
}

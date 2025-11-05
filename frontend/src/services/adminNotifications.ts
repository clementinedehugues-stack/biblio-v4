// Services for admin notifications
import api from './api';

export type AdminNotification = { id: number; type: string; message: string; date: string };

type AdminNotificationAPIResponse = { id: number; type: string; message: string; timestamp: string };

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const { data }: { data: AdminNotificationAPIResponse[] } = await api.get('/admin/notifications/');
  return data.map((notification) => ({
    ...notification,
    date: new Date(notification.timestamp).toLocaleString()
  }));
}

// Services for admin logs
import api from './api';

export type AdminLog = { id: number; user: string; action: string; date: string };

type AdminLogAPIResponse = { id: number; user: string; action: string; timestamp: string };

export async function getAdminLogs(): Promise<AdminLog[]> {
  const { data }: { data: AdminLogAPIResponse[] } = await api.get('/admin/logs/');
  return data.map((log) => ({
    ...log,
    date: new Date(log.timestamp).toLocaleString()
  }));
}

// Services for admin dashboard statistics
import api from './api';

// Types for the API responses
export type TopBooksData = {
  chartData: {
    labels: string[];
    datasets: Array<{ label: string; data: number[]; backgroundColor: string }>;
  };
  options: object;
};

export type ActiveUsersData = {
  chartData: {
    labels: string[];
    datasets: Array<{ label: string; data: number[]; borderColor: string; backgroundColor: string; tension: number }>;
  };
  options: object;
};

export type Report = { id: number; type: string; target: string };

export async function getTopBooks(): Promise<TopBooksData> {
  const { data } = await api.get('/admin/stats/top-books/');

  return {
    chartData: {
      labels: data.labels,
      datasets: [{
        label: 'Consultations',
        data: data.data,
        backgroundColor: 'rgba(99, 102, 241, 0.7)'
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  };
}

export async function getActiveUsers(): Promise<ActiveUsersData> {
  const { data } = await api.get('/admin/stats/active-users/');

  return {
    chartData: {
      labels: data.labels,
      datasets: [{
        label: 'Utilisateurs actifs',
        data: data.data,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  };
}

export async function getRecentReports(): Promise<Report[]> {
  const { data } = await api.get('/admin/stats/recent-reports/');
  return data.reports;
}

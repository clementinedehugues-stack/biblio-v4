import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useQuery } from '@tanstack/react-query';
import { getTopBooks, getActiveUsers, getRecentReports, type TopBooksData, type ActiveUsersData, type Report } from '../../services/adminStats';
import { Button } from '@/components/ui/button';

export function AdminStatsWidgets() {
  // Top books
  const { data: topBooks } = useQuery<TopBooksData>({ queryKey: ['topBooks'], queryFn: getTopBooks });
  // Active users
  const { data: activeUsers } = useQuery<ActiveUsersData>({ queryKey: ['activeUsers'], queryFn: getActiveUsers });
  // Recent reports
  const { data: reports } = useQuery<Report[]>({ queryKey: ['recentReports'], queryFn: getRecentReports });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Livres les plus consultés</CardTitle>
        </CardHeader>
        <CardContent>
          {topBooks && topBooks.chartData && topBooks.options ? (
            <Bar data={topBooks.chartData} options={topBooks.options} />
          ) : (
            <div>Chargement…</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs actifs (30j)</CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers && activeUsers.chartData && activeUsers.options ? (
            <Line data={activeUsers.chartData} options={activeUsers.options} />
          ) : (
            <div>Chargement…</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Signalements récents</CardTitle>
        </CardHeader>
        <CardContent>
          {reports && Array.isArray(reports) && reports.length > 0 ? (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="flex justify-between items-center">
                  <span>{r.type} sur {r.target}</span>
                  <Button size="sm" variant="outline">Voir</Button>
                </li>
              ))}
            </ul>
          ) : (
            <div>Aucun signalement récent</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default AdminStatsWidgets;

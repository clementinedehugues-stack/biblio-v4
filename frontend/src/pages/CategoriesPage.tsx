import { useQuery } from '@tanstack/react-query';
import UserLayout from '@/components/layout/UserLayout';
import { listCategories } from '@/services/categories';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CategoriesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['categories', 'user'],
    queryFn: () => listCategories(),
  });
  const navigate = useNavigate();

  return (
    <UserLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Categories</h1>
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.map((c, idx) => (
              <motion.button
                key={c.name}
                onClick={() => navigate(`/books?category=${encodeURIComponent(c.name)}`)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(0.05 * (idx % 12), 0.4) }}
                className="rounded-xl border border-border bg-card/50 p-4 text-left hover:bg-accent transition"
              >
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.usage_count} items</div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  );
}

import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type QueryStateWrapperProps = {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  data: unknown;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: React.ReactNode;
};

export function QueryStateWrapper({
  isLoading,
  isError,
  error,
  data,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}: QueryStateWrapperProps) {
  if (isLoading) {
    return loadingComponent || <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (isError) {
    return (
      errorComponent || (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          <AlertCircle className="h-8 w-8" />
          <h3 className="font-semibold">Une erreur est survenue</h3>
          <p className="text-sm">{error?.message || 'Impossible de charger les données.'}</p>
        </div>
      )
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      emptyComponent || (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <Info className="h-8 w-8" />
          <h3 className="font-semibold">Aucun contenu</h3>
          <p className="text-sm">Il n'y a rien à afficher ici pour le moment.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

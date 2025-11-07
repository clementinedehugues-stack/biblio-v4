import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/custom.css';
import './i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Global React Query client with smarter retry handling:
// - Disable retry on 404 (resource truly missing)
// - Keep limited retries (2) for transient network/server errors
// - Disable refetch on window focus to avoid surprise re-queries after resets
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message || '').toLowerCase() : '';
        if (message.includes('404')) return false; // don't hammer the API for missing resources
        return failureCount < 2; // up to 2 attempts for transient errors
      },
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

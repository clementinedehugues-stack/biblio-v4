import './App.css';
import { AppRoutes } from './AppRoutes';
import { AuthProvider } from '@/providers/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      {/* Removed global toast container */}
    </AuthProvider>
  );
}

export default App;

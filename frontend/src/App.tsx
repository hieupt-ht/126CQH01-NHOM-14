import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CreateImagePage from './pages/create/CreateImagePage';
import LibraryPage from './pages/library/LibraryPage';

// Keep the preview routes public until authentication and backend sessions are connected.
export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/login') return <LoginPage />;
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/app/create') return <CreateImagePage />;
  if (pathname === '/app/library') return <LibraryPage />;
  return <DashboardPage />;
}

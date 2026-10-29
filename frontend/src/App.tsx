import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CreateImagePage from './pages/create/CreateImagePage';
import LibraryPage from './pages/library/LibraryPage';
import ImageDetailPage from './pages/detail/ImageDetailPage';
import HistoryPage from './pages/history/HistoryPage';

// Keep the preview routes public until authentication and backend sessions are connected.
export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/login') return <LoginPage />;
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/app/create') return <CreateImagePage />;
  if (pathname === '/app/library') return <LibraryPage />;
  if (pathname === '/app/history') return <HistoryPage />;
  const imageDetailMatch = pathname.match(/^\/app\/images\/([^/]+)$/);
  if (imageDetailMatch) return <ImageDetailPage fixtureKey={decodeURIComponent(imageDetailMatch[1])} />;
  return <DashboardPage />;
}

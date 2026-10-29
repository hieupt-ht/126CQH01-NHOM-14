import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import CreateImagePage from './pages/create/CreateImagePage';
import RegisterPage from './pages/auth/RegisterPage';

// Keep dashboard preview public until authentication is connected. The login
// screen has its own URL without implying an authenticated session exists.
export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/login') {
    return <LoginPage />;
  }
  if (pathname === '/app/create') {
    return <CreateImagePage />;
  if (pathname === '/register') {
    return <RegisterPage />;
  }
  return <DashboardPage />;
}

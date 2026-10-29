import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Keep dashboard preview public until authentication is connected. The login
// screen has its own URL without implying an authenticated session exists.
export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/login') {
    return <LoginPage />;
  }
  if (pathname === '/register') {
    return <RegisterPage />;
  }
  return <DashboardPage />;
}

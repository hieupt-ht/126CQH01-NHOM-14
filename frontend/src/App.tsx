import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';

// Keep dashboard preview public until authentication is connected. The login
// screen has its own URL without implying an authenticated session exists.
export default function App() {
  if (window.location.pathname.replace(/\/+$/, '') === '/login') {
    return <LoginPage />;
  }
  return <DashboardPage />;
}

import SessionGate from "./components/auth/SessionGate";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CreateImagePage from "./pages/create/CreateImagePage";
import LibraryPage from "./pages/library/LibraryPage";
import ImageDetailPage from "./pages/detail/ImageDetailPage";
import HistoryPage from "./pages/history/HistoryPage";
import DashboardLayout from "./layouts/DashboardLayout";
import "./pages/detail/ImageDetailPage.css";
import AccountSettingsPage from "./pages/settings/AccountSettingsPage";

// SessionGate bypasses account checks only in the development UI preview.
function PageRoutes() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/register") return <RegisterPage />;
  if (pathname === "/app/create") return <CreateImagePage />;
  if (pathname === "/app/library") return <LibraryPage />;
  if (pathname === "/app/history") return <HistoryPage />;
  if (pathname === "/app/settings") return <AccountSettingsPage />;
  const imageDetailMatch = pathname.match(/^\/app\/images\/([^/]+)$/);
  if (imageDetailMatch) {
    try {
      return (
        <ImageDetailPage imageId={decodeURIComponent(imageDetailMatch[1])} />
      );
    } catch {
      return <NotFoundPage />;
    }
  }
  if (pathname === "/" || pathname === "/app") return <DashboardPage />;
  return <NotFoundPage />;
}

function NotFoundPage() {
  return (
    <DashboardLayout
      search=""
      onSearch={() => undefined}
      favoritesOnly={false}
      onFavorites={() => undefined}
      onCompose={() => window.location.assign("/app/create")}
      showSearch={false}
    >
      <section className="detail-state" aria-labelledby="not-found-title">
        <h1 id="not-found-title">Không tìm thấy trang</h1>
        <p>Đường dẫn không hợp lệ hoặc trang không còn tồn tại.</p>
        <a className="studio-button studio-button--primary" href="/app">
          Về tổng quan
        </a>
      </section>
    </DashboardLayout>
  );
}

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const protectedRoute =
    pathname === "/" || pathname === "/app" || pathname.startsWith("/app/");
  return protectedRoute ? (
    <SessionGate>
      <PageRoutes />
    </SessionGate>
  ) : (
    <PageRoutes />
  );
}

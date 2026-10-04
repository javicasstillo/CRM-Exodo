import { useState, useEffect } from 'react';
import './index.css';
import { auth, onAuthChange, logout } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Phones from './pages/Phones';
import Buyers from './pages/Buyers';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import Catalog from './pages/Catalog';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastProvider } from './context/ToastContext';
import { AppProvider, useApp } from './context/AppContext';
import SubscriptionGate from './components/SubscriptionGate';
import { Menu } from 'lucide-react';

const SUPER_ADMIN_UID = '5aHXAuMsBxPTlmyW9kDSM4tGXNX2';

const PAGE_TITLES = {
  dashboard:  'Panel',
  phones:     'Stock',
  buyers:     'Compradores',
  sales:      'Ventas',
  expenses:   'Gastos',
  stats:      'Estadísticas',
  settings:   'Configuración',
  admin:      'Admin — Genesys',
};

const PAGES = {
  dashboard:  Dashboard,
  phones:     Phones,
  buyers:     Buyers,
  sales:      Sales,
  expenses:   Expenses,
  stats:      Stats,
  settings:   Settings,
  admin:      AdminPanel,
};

function Skeleton() {
  return (
    <div style={{ padding: '28px 28px' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 100, flex: 1, borderRadius: 12 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

function AppShell({ user }) {
  const { profile, business, loading: appLoading } = useApp();
  const [page, setPage]               = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  useEffect(() => {
    document.title = `${PAGE_TITLES[page] || 'Panel'} — ${business?.name || 'Genesys App'}`;
  }, [page, business]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  if (appLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <div className="skeleton" style={{ width: 140, height: 14, borderRadius: 8 }} />
    </div>
  );

  const PageComponent = PAGES[page] || Dashboard;
  const isAdminPage = page === 'admin';

  const handleNavigate = (p) => {
    if (p === page) return;
    setPageLoading(true);
    setPage(p);
    setSidebarOpen(false);
    setTimeout(() => setPageLoading(false), 350);
  };

  return (
    <div className="app-shell">
      <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
        <Menu size={20} />
      </button>

      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        onLogout={logout}
        className={sidebarOpen ? 'open' : ''}
        business={business}
        profile={profile}
        isSuperAdmin={isSuperAdmin}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          profile={profile}
          business={business}
          onNavigate={handleNavigate}
          onLogout={logout}
        />
        {isAdminPage && isSuperAdmin ? (
          <main className="main-content" style={{ flex: 1 }}>
            {pageLoading ? <Skeleton /> : <PageComponent />}
          </main>
        ) : (
          <SubscriptionGate>
            <main className="main-content" style={{ flex: 1 }}>
              {pageLoading ? <Skeleton /> : <PageComponent />}
            </main>
          </SubscriptionGate>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthChange(setUser), []);

  // ── Ruta pública del catálogo ──
  if (window.location.pathname.startsWith('/catalogo/')) {
    return <Catalog />;
  }

  // ── Ruta pública de invitaciones ──
if (window.location.pathname.startsWith('/invite/')) {
  return <ToastProvider><Login /></ToastProvider>;
}

  if (user === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 8 }} />
    </div>
  );

  if (!user) return <ToastProvider><Login /></ToastProvider>;

  return (
    <ToastProvider>
      <AppProvider user={user}>
        <AppShell user={user} />
      </AppProvider>
    </ToastProvider>
  );
}
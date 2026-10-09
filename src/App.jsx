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
import OnboardingTour from './components/OnboardingTour';
import { ToastProvider } from './context/ToastContext';
import { AppProvider, useApp } from './context/AppContext';
import SubscriptionGate from './components/SubscriptionGate';
import { Menu } from 'lucide-react';
import BranchPanel from './pages/BranchPanel';

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
  branchPanel: 'Vista consolidada',
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
  branchPanel: BranchPanel,
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
  const { profile, business, loading: appLoading, isNewBusiness, setIsNewBusiness } = useApp();
  const [page, setPage]               = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [showTour, setShowTour]       = useState(false);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  // Si es negocio nuevo, ir a settings y mostrar tour
  useEffect(() => {
    if (!appLoading && isNewBusiness) {
      setPage('settings');
      setShowTour(true);
    }
  }, [appLoading, isNewBusiness]);

  useEffect(() => {
    document.title = `${PAGE_TITLES[page] || 'Panel'} — ${business?.name || 'Genesys App'}`;
  }, [page, business]);

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

  // El tour usa handleNavigate para moverse entre páginas
  const handleTourNavigate = (p) => {
    if (p === page) return;
    setPage(p);
    setSidebarOpen(false);
  };

  const handleTourComplete = () => {
    setShowTour(false);
    setIsNewBusiness(false);
    setPage('dashboard');
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

      {/* Tour de onboarding */}
      {showTour && (
        <OnboardingTour
          onComplete={handleTourComplete}
          onNavigate={handleTourNavigate}
        />
      )}
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

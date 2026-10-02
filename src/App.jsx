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
import Sidebar from './components/Sidebar';
import { ToastProvider } from './context/ToastContext';
import { Menu } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Panel',
  phones: 'Stock',
  buyers: 'Compradores',
  sales: 'Ventas',
  expenses: 'Gastos',
  stats: 'Estadísticas',
};

const PAGES = {
  dashboard: Dashboard,
  phones: Phones,
  buyers: Buyers,
  sales: Sales,
  expenses: Expenses,
  stats: Stats,
};

// Loading skeleton
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

export default function App() {
  const [user, setUser] = useState(undefined);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  // Título dinámico
  useEffect(() => {
    document.title = `${PAGE_TITLES[page] || 'Panel'} — ÉXODO`;
  }, [page]);

  if (user === undefined) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 16,
      background: 'var(--bg)',
    }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 8 }} />
    </div>
  );

  if (!user) return <ToastProvider><Login /></ToastProvider>;

  const PageComponent = PAGES[page] || Dashboard;

  const handleNavigate = (p) => {
    if (p === page) return;
    setLoading(true);
    setPage(p);
    setSidebarOpen(false);
    setTimeout(() => setLoading(false), 400);
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
          <Menu size={20} />
        </button>

        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <Sidebar
          page={page}
          onNavigate={handleNavigate}
          onLogout={logout}
          className={sidebarOpen ? 'open' : ''}
        />

        <main className="main-content">
          {loading ? <Skeleton /> : <PageComponent />}
        </main>
      </div>
    </ToastProvider>
  );
}
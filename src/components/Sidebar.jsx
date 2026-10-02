import { useState, useEffect } from 'react';
import { LayoutDashboard, Smartphone, Users, ShoppingCart, TrendingUp, LogOut, DollarSign, Search, X, Bell } from 'lucide-react';
import { phonesApi } from '../api';

const NAV = [
  { id: 'dashboard', label: 'Panel',         icon: LayoutDashboard },
  { id: 'phones',    label: 'Stock',          icon: Smartphone },
  { id: 'buyers',    label: 'Compradores',    icon: Users },
  { id: 'sales',     label: 'Ventas',         icon: ShoppingCart },
  { id: 'expenses',  label: 'Gastos',         icon: DollarSign },
  { id: 'stats',     label: 'Estadísticas',   icon: TrendingUp },
];

// Stock bajo: menos de 3 unidades
const LOW_STOCK_THRESHOLD = 3;

export default function Sidebar({ page, onNavigate, onLogout, className = '' }) {
  const [phones, setPhones] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => phonesApi.subscribe(setPhones), []);

  // Stock bajo
  const lowStock = phones.filter(p =>
    p.status === 'disponible' && (Number(p.quantity) || 1) < LOW_STOCK_THRESHOLD
  );

  // Garantías por vencer (próximos 7 días) — calculado desde ventas locales si hubiera
  const alertCount = lowStock.length;

  // Búsqueda global
  const searchResults = searchQ.length > 1
    ? phones.filter(p =>
        p.model?.toLowerCase().includes(searchQ.toLowerCase()) ||
        p.imei?.includes(searchQ) ||
        p.color?.toLowerCase().includes(searchQ.toLowerCase())
      ).slice(0, 6)
    : [];

  return (
    <>
      <div className={`sidebar ${className}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">É</div>
          <div>
            <h1>ÉXODO</h1>
            <span>Gestión de iPhones</span>
          </div>
        </div>

        {/* Búsqueda global */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(160,176,216,0.6)' }} />
            <input
              placeholder="Buscar producto..."
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                padding: '7px 10px 7px 30px', fontSize: 12,
                color: '#fff', outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setSearchOpen(false); }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(160,176,216,0.6)', cursor: 'pointer', padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Resultados de búsqueda */}
          {searchOpen && searchQ.length > 1 && (
            <div style={{
              background: '#1a2540', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, marginTop: 6, overflow: 'hidden',
            }}>
              {searchResults.length === 0
                ? <div style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(160,176,216,0.6)' }}>Sin resultados</div>
                : searchResults.map(p => (
                  <div key={p.id}
                    onClick={() => { onNavigate('phones'); setSearchQ(''); setSearchOpen(false); }}
                    style={{ padding: '9px 12px', fontSize: 12, color: '#fff', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,110,253,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {p.photo
                      ? <img src={p.photo} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} alt="" />
                      : <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>📱</div>
                    }
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.model}</div>
                      <div style={{ fontSize: 10, color: 'rgba(160,176,216,0.6)' }}>{p.storage} · {p.color}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menú</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              <Icon size={16} />
              {label}
              {id === 'phones' && alertCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 700, borderRadius: 20,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Panel de alertas de stock */}
        {alertCount > 0 && (
          <div style={{ margin: '0 12px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Bell size={11} /> Stock bajo ({alertCount})
            </div>
            {lowStock.slice(0, 3).map(p => (
              <div key={p.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{p.model}</span>
                <span style={{ color: '#f87171', fontWeight: 700, flexShrink: 0 }}>x{Number(p.quantity) || 1}</span>
              </div>
            ))}
            {lowStock.length > 3 && (
              <div style={{ fontSize: 10, color: 'rgba(160,176,216,0.5)', marginTop: 4 }}>+{lowStock.length - 3} más</div>
            )}
          </div>
        )}

        <div className="sidebar-footer">
          <button className="nav-item" onClick={onLogout} style={{ width: '100%' }}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Cerrar búsqueda al hacer click fuera */}
      {searchOpen && searchQ && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setSearchOpen(false)} />
      )}
    </>
  );
}
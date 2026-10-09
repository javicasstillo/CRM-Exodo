import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, Settings, LogOut, User, Building2, LayoutDashboard } from 'lucide-react';
import { phonesApi } from '../api';
import { useApp } from '../context/AppContext';

const ROLE_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', viewer: 'Solo lectura' };
const ROLE_COLORS = { admin: '#0d6efd', vendedor: '#16a34a', viewer: '#d97706' };

export default function Header({ profile, business, onNavigate, onLogout }) {
  const [phones, setPhones]         = useState([]);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const menuRef   = useRef();
  const branchRef = useRef();

  const { branches, activeBranchId, activeBusiness, switchBranch } = useApp();
  const hasBranches = business?.plan === 'empresa' && branches?.length > 0;

  useEffect(() => phonesApi.subscribe(setPhones), []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (branchRef.current && !branchRef.current.contains(e.target)) setBranchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const lowStock = phones.filter(p => p.status === 'disponible' && (Number(p.quantity) || 1) < 3);
  const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const isAdmin  = profile?.role === 'admin';

  const currentBranchName = activeBranchId
    ? branches.find(b => b.id === activeBranchId)?.name || 'Sucursal'
    : business?.name || 'Mi Negocio';

  return (
    <header style={{
      height: 58, background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16, flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
    }}>

      {/* Selector de sucursal o nombre del negocio */}
      {hasBranches ? (
        <div ref={branchRef} style={{ position: 'relative', flex: 1 }}>
          <button
            onClick={() => setBranchOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: branchOpen ? 'var(--bg2)' : 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '6px 12px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            <Building2 size={14} color="var(--primary)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {currentBranchName}
            </span>
            {activeBranchId && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>
                Sucursal
              </span>
            )}
            <ChevronDown size={13} color="var(--text3)" style={{ transform: branchOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {branchOpen && (
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 8px)',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, minWidth: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden', zIndex: 200,
            }}>
              {/* Negocio maestro */}
              <button
                className="dropdown-item"
                style={{ background: !activeBranchId ? 'var(--primary-bg)' : undefined, color: !activeBranchId ? 'var(--primary)' : undefined }}
                onClick={() => { switchBranch(null); setBranchOpen(false); }}>
                <LayoutDashboard size={14} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{business?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>Negocio principal</div>
                </div>
                {!activeBranchId && <span style={{ fontSize: 10, color: 'var(--primary)' }}>●</span>}
              </button>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {/* Sucursales */}
              {branches.map(b => (
                <button
                  key={b.id}
                  className="dropdown-item"
                  style={{ background: activeBranchId === b.id ? 'var(--primary-bg)' : undefined, color: activeBranchId === b.id ? 'var(--primary)' : undefined }}
                  onClick={() => { switchBranch(b.id); setBranchOpen(false); }}>
                  <Building2 size={14} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{b.adminEmail}</div>
                  </div>
                  {activeBranchId === b.id && <span style={{ fontSize: 10, color: 'var(--primary)' }}>●</span>}
                </button>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {/* Panel consolidado */}
              <button
                className="dropdown-item"
                onClick={() => { onNavigate('branchPanel'); setBranchOpen(false); }}>
                <LayoutDashboard size={14} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Vista consolidada</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>Todas las sucursales</div>
                </div>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {business?.name || 'Mi Negocio'}
          </span>
        </div>
      )}

      {/* Alertas de stock */}
      {lowStock.length > 0 && business?.plan !== 'emprendedor' && (
        <button
          className="stock-alert-btn"
          onClick={() => onNavigate('phones')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: '#fff1f1', border: '1px solid #fecaca',
            color: '#dc2626', borderRadius: 8, padding: '5px 12px',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
          <Bell size={13} />
          {lowStock.length} stock bajo
        </button>
      )}

      {/* Usuario + menú */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: menuOpen ? 'var(--bg2)' : 'none',
            border: '1px solid ' + (menuOpen ? 'var(--border2)' : 'transparent'),
            borderRadius: 10, padding: '5px 10px 5px 6px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, overflow: 'hidden', flexShrink: 0,
          }}>
            {profile?.photo
              ? <img src={profile.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : initials(profile?.name || 'U')
            }
          </div>
          <div className="header-user-info" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
              {profile?.name || 'Usuario'}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: ROLE_COLORS[profile?.role] || 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {ROLE_LABELS[profile?.role] || profile?.role || 'Usuario'}
            </div>
          </div>
          <ChevronDown size={14} color="var(--text3)" style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, width: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden', zIndex: 200,
            animation: 'fadeUp 0.15s ease',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{profile?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{profile?.email}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: ROLE_COLORS[profile?.role] + '20',
                  color: ROLE_COLORS[profile?.role],
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {ROLE_LABELS[profile?.role] || 'Usuario'}
                </span>
              </div>
            </div>
            <div style={{ padding: '6px' }}>
              {isAdmin && (
                <button className="dropdown-item" onClick={() => { onNavigate('settings'); setMenuOpen(false); }}>
                  <Settings size={14} /> Configuración
                </button>
              )}
              <button className="dropdown-item" onClick={() => { onNavigate('settings'); setMenuOpen(false); }}>
                <User size={14} /> Mi perfil
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button className="dropdown-item" style={{ color: '#dc2626' }} onClick={onLogout}>
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

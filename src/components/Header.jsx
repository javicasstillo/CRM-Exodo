import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, Settings, LogOut, User, Moon, Sun } from 'lucide-react';
import { phonesApi } from '../api';

const ROLE_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', viewer: 'Solo lectura' };
const ROLE_COLORS = { admin: '#0d6efd', vendedor: '#16a34a', viewer: '#d97706' };

export default function Header({ profile, business, onNavigate, onLogout }) {
  const [phones, setPhones]       = useState([]);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef();

  useEffect(() => phonesApi.subscribe(setPhones), []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const lowStock = phones.filter(p => p.status === 'disponible' && (Number(p.quantity) || 1) < 3);

  const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <header style={{
      height: 58, background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16, flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
    }}>

      {/* Nombre del negocio */}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {business?.name || 'Mi Negocio'}
        </span>
      </div>

      {/* Alertas de stock */}
      {lowStock.length > 0 && (
        <button
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

          {/* Avatar */}
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

          {/* Info */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
              {profile?.name || 'Usuario'}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: ROLE_COLORS[profile?.role] || 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {ROLE_LABELS[profile?.role] || profile?.role || 'Usuario'}
            </div>
          </div>

          <ChevronDown size={14} color="var(--text3)" style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, width: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden', zIndex: 200,
            animation: 'fadeUp 0.15s ease',
          }}>
            {/* Cabecera del menú */}
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

            {/* Opciones */}
            <div style={{ padding: '6px' }}>
              <button className="dropdown-item" onClick={() => { onNavigate('settings'); setMenuOpen(false); }}>
                <Settings size={14} /> Configuración
              </button>
              <button className="dropdown-item" onClick={() => { onNavigate('profile'); setMenuOpen(false); }}>
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
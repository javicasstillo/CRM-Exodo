import { useState, useEffect } from 'react';
import { login, getInvitation, registerWithInvitation } from '../firebase';
import { Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';

// Lee el código de invitación de la URL: /invite/CODIGO
function getInviteCode() {
  const path = window.location.pathname;
  const match = path.match(/\/invite\/([a-z0-9]+)/i);
  return match ? match[1] : null;
}

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'invite'
  const [invitation, setInvitation] = useState(null);
  const [inviteError, setInviteError] = useState('');

  const [form, setForm] = useState({ email: '', pass: '' });
  const [invForm, setInvForm] = useState({ name: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [success, setSuccess] = useState(false);

  // Detectar si es un link de invitación
  useEffect(() => {
    const code = getInviteCode();
    if (!code) return;
    setMode('invite');
    loadInvitation(code);
  }, []);

  const loadInvitation = async (code) => {
    setLoading(true);
    try {
      const inv = await getInvitation(code);
      if (!inv) { setInviteError('Invitación inválida o no existe'); return; }
      if (inv.used) { setInviteError('Esta invitación ya fue usada'); return; }
      if (new Date() > inv.expiresAt.toDate()) { setInviteError('Esta invitación expiró'); return; }
      setInvitation(inv);
    } catch (e) { setInviteError('Error al cargar la invitación'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.pass);
    } catch {
      setError('Email o contraseña incorrectos');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!invForm.name) { setError('Ingresá tu nombre'); return; }
    if (invForm.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (invForm.password !== invForm.confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      const code = getInviteCode();
      await registerWithInvitation({ code, name: invForm.name, password: invForm.password });
      setSuccess(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Pantalla de invitación
  if (mode === 'invite') {
    return (
      <div className="login-page">
        <div className="login-card fade-up" style={{ maxWidth: 420 }}>

          {inviteError ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Invitación inválida</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>{inviteError}</p>
              <button className="btn btn-secondary" onClick={() => { setMode('login'); window.history.pushState({}, '', '/'); }}>
                <ArrowLeft size={14} /> Ir al login
              </button>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={28} color="#16a34a" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¡Cuenta creada!</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Ya podés ingresar al sistema de <strong>{invitation?.businessName}</strong>
              </p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }}>
                Ingresar al sistema
              </button>
            </div>
          ) : loading && !invitation ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="skeleton" style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px' }} />
              <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 8, margin: '0 auto' }} />
            </div>
          ) : invitation && (
            <>
              <div className="login-logo">
                <div className="logo-mark" style={{ margin: '0 auto 14px', width: 52, height: 52, fontSize: 26 }}>
                  {invitation.businessName?.[0]?.toUpperCase() || 'G'}
                </div>
                <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, letterSpacing: 0 }}>{invitation.businessName}</h1>
                <p>Te invitaron como <strong>{invitation.role === 'vendedor' ? 'Vendedor' : invitation.role === 'admin' ? 'Administrador' : 'Solo lectura'}</strong></p>
              </div>

              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
                Registrándote como <strong style={{ color: 'var(--primary)' }}>{invitation.email}</strong>
              </div>

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Tu nombre completo</label>
                  <input className="form-input" placeholder="Juan Pérez" value={invForm.name}
                    onChange={e => { setInvForm(f => ({ ...f, name: e.target.value })); setError(''); }} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Elegí una contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={show ? 'text' : 'password'} placeholder="mínimo 6 caracteres"
                      value={invForm.password}
                      onChange={e => { setInvForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                      style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setShow(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', padding: 0, cursor: 'pointer' }}>
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmá la contraseña</label>
                  <input className="form-input" type="password" placeholder="repetí tu contraseña"
                    value={invForm.confirm}
                    onChange={e => { setInvForm(f => ({ ...f, confirm: e.target.value })); setError(''); }} />
                </div>
                {error && (
                  <div style={{ background: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
                  {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pantalla de login normal
  return (
    <div className="login-page">
      <div className="login-card fade-up">
        <div className="login-logo">
         <div style={{ margin: '0 auto 14px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/GenesysLogo.webp" alt="Genesys" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="admin@exodo.com"
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
              autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={show ? 'text' : 'password'} placeholder="••••••••"
                value={form.pass}
                onChange={e => { setForm(f => ({ ...f, pass: e.target.value })); setError(''); }}
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', padding: 0, cursor: 'pointer' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ background: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4, fontSize: 14 }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
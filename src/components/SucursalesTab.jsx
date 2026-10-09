// Componente separado — crear en src/components/SucursalesTab.jsx

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '../context/ToastContext';
import { Building2, Plus, X, Eye, EyeOff } from 'lucide-react';

export default function SucursalesTab({ profile, business, refreshBusiness }) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    branchName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const branches = business?.branches || [];

  const handleCreate = async () => {
    if (!form.branchName || !form.adminName || !form.adminEmail || !form.adminPassword) {
      toast('Completá todos los campos', 'warning'); return;
    }
    if (form.adminPassword.length < 6) {
      toast('La contraseña debe tener al menos 6 caracteres', 'warning'); return;
    }
    setSaving(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createBranch = httpsCallable(functions, 'createBranch');
      await createBranch(form);
      await refreshBusiness();
      setForm({ branchName: '', adminName: '', adminEmail: '', adminPassword: '' });
      setShowForm(false);
      toast('Sucursal creada correctamente', 'success');
    } catch (e) {
      toast(e.message || 'Error al crear la sucursal', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Sucursales</h3>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>{branches.length} sucursal{branches.length !== 1 ? 'es' : ''} creada{branches.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(o => !o)}>
            {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nueva sucursal</>}
          </button>
        </div>

        {/* Formulario nueva sucursal */}
        {showForm && (
          <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '18px 20px', marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Nueva sucursal</div>
            <div className="form-group">
              <label className="form-label">Nombre de la sucursal</label>
              <input className="form-input" placeholder="Ej: Sucursal Centro" value={form.branchName} onChange={e => set('branchName', e.target.value)} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Admin de la sucursal</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input className="form-input" placeholder="Juan Pérez" value={form.adminName} onChange={e => set('adminName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="admin@sucursal.com" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña inicial</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={form.adminPassword}
                  onChange={e => set('adminPassword', e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPass(o => !o)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>El admin recibirá un email con sus credenciales de acceso</span>
            </div>
            <button className="btn btn-primary" disabled={saving} onClick={handleCreate}>
              {saving ? 'Creando...' : 'Crear sucursal'}
            </button>
          </div>
        )}

        {/* Lista de sucursales */}
        {branches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
            <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No hay sucursales aún</div>
            <div style={{ fontSize: 12 }}>Creá tu primera sucursal con el botón de arriba</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {branches.map((b, i) => (
              <div key={b.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={18} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{b.adminName} · {b.adminEmail}</div>
                </div>
                <span className="badge badge-green">Activa</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

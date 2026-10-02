import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { saveBusinessConfig, updateUserProfile, createInvitation } from '../firebase';
import { useToast } from '../context/ToastContext';
import { Building2, Users, Plus, Camera, Save, X, Shield, Trash2, Copy, Check, Mail, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ROLE_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', viewer: 'Solo lectura' };
const ROLE_COLORS = { admin: '#0d6efd', vendedor: '#16a34a', viewer: '#d97706' };

function AvatarUploader({ value, onChange, size = 80 }) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ position: 'relative', width: size, height: size, cursor: 'pointer' }} onClick={() => ref.current.click()}>
      <div style={{ width: size, height: size, borderRadius: size > 60 ? 14 : '50%', background: 'var(--bg3)', border: '2px dashed var(--border2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {value
          ? <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <Camera size={size * 0.3} color="var(--text3)" style={{ opacity: 0.4 }} />
        }
      </div>
      <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Camera size={12} color="#fff" />
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function InviteModal({ profile, business, onClose }) {
  const [form, setForm] = useState({ email: '', role: 'vendedor' });
  const [link, setLink] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.email) { toast('Ingresá un email', 'warning'); return; }
    setSaving(true);
    try {
      const code = await createInvitation({
        email: form.email,
        role: form.role,
        businessId: profile.businessId,
        businessName: business?.name || 'el negocio',
      });
      const url = `${window.location.origin}/invite/${code}`;
      setLink(url);
      toast('Invitación generada', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Invitar usuario</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {!link ? (
            <>
              <div style={{ background: 'var(--primary-bg)', border: '1px solid rgba(13,110,253,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--primary)', marginBottom: 16, display: 'flex', gap: 8 }}>
                <Mail size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Generá un link de invitación y compartilo por WhatsApp o email. El usuario se registra solo con su propia contraseña. El link expira en <strong>7 días</strong>.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Email del usuario</label>
                <input className="form-input" type="email" placeholder="vendedor@negocio.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="admin">Administrador — acceso total</option>
                  <option value="vendedor">Vendedor — registra ventas y ve stock</option>
                  <option value="viewer">Solo lectura — solo puede ver</option>
                </select>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Check size={24} color="#16a34a" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>¡Link generado!</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Compartilo con <strong>{form.email}</strong></div>
              </div>

              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={11} /> Expira en 7 días · Un solo uso
                </div>
                <div style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--text2)', marginBottom: 10 }}>{link}</div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCopy}>
                  {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar link</>}
                </button>
              </div>

              <button className="btn btn-secondary" style={{ justifyContent: 'center' }}
                onClick={() => { setLink(null); setForm({ email: '', role: 'vendedor' }); }}>
                Generar otra invitación
              </button>
            </div>
          )}
        </div>
        {!link && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleGenerate}>
              {saving ? 'Generando...' : 'Generar link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { profile, business, refreshBusiness, refreshProfile } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('negocio');
  const [bizForm, setBizForm] = useState(null);
  const [profForm, setProfForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);

  useEffect(() => {
    if (business) setBizForm({ ...business });
  }, [business]);

  useEffect(() => {
    if (profile) setProfForm({ name: profile.name, email: profile.email, photo: profile.photo || null });
  }, [profile]);

  useEffect(() => {
    if (!profile?.businessId) return;
    const q = query(collection(db, 'users'), where('businessId', '==', profile.businessId));
    return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [profile]);

  const saveBusiness = async () => {
    setSaving(true);
    try {
      await saveBusinessConfig(profile.businessId, bizForm);
      await refreshBusiness();
      toast('Configuración del negocio guardada', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUserProfile(profile.id, profForm);
      await refreshProfile();
      toast('Perfil actualizado correctamente', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const toggleUserActive = async (u) => {
    if (!confirm(`¿${u.active !== false ? 'Desactivar' : 'Activar'} a ${u.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', u.id), { active: u.active === false ? true : false });
      toast(`Usuario ${u.active !== false ? 'desactivado' : 'activado'}`, 'info');
    } catch (e) { toast(e.message, 'error'); }
  };

  const isAdmin = profile?.role === 'admin';

  const TABS = [
    { id: 'negocio',  label: 'Negocio',   icon: Building2 },
    { id: 'perfil',   label: 'Mi perfil',  icon: Users },
    { id: 'usuarios', label: 'Usuarios',   icon: Shield },
  ];

  return (
    <>
      <div className="page-header">
        <div><h2>Configuración</h2><p>Personalizá tu sistema</p></div>
      </div>
      <div className="page-body fade-up">

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: tab === t.id ? 'var(--primary)' : 'none', color: tab === t.id ? '#fff' : 'var(--text2)' }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Negocio */}
        {tab === 'negocio' && bizForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Información del negocio</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <AvatarUploader value={bizForm.logo} onChange={v => setBizForm(f => ({ ...f, logo: v }))} size={72} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Logo del negocio</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Se muestra en el sidebar y documentos</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del negocio</label>
                <input className="form-input" placeholder="Ej: ÉXODO Celulares" value={bizForm.name || ''} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" placeholder="+54 261 555-1234" value={bizForm.phone || ''} onChange={e => setBizForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Moneda principal</label>
                  <select className="form-input" value={bizForm.currency || 'ARS'} onChange={e => setBizForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="ARS">ARS — Pesos argentinos</option>
                    <option value="USD">USD — Dólares</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" placeholder="Calle 123, Ciudad" value={bizForm.address || ''} onChange={e => setBizForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <button className="btn btn-primary" disabled={saving || !isAdmin} onClick={saveBusiness} style={{ marginTop: 4 }}>
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {!isAdmin && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Solo el administrador puede modificar esto</p>}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Parámetros del sistema</h3>
              <div className="form-group">
                <label className="form-label">Alerta stock bajo (unidades)</label>
                <input className="form-input" type="number" min="1" max="20" value={bizForm.lowStockThreshold || 3} onChange={e => setBizForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>Se alertará cuando un producto tenga menos de esta cantidad</span>
              </div>
              <div className="form-group">
                <label className="form-label">Días de garantía por defecto</label>
                <input className="form-input" type="number" min="1" value={bizForm.defaultWarrantyDays || 30} onChange={e => setBizForm(f => ({ ...f, defaultWarrantyDays: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp para ventas</label>
                <input className="form-input" placeholder="+5492615551234" value={bizForm.whatsapp || ''} onChange={e => setBizForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <button className="btn btn-primary" disabled={saving || !isAdmin} onClick={saveBusiness} style={{ marginTop: 4 }}>
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* TAB: Mi perfil */}
        {tab === 'perfil' && profForm && (
          <div style={{ maxWidth: 500 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Mi perfil</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <AvatarUploader value={profForm.photo} onChange={v => setProfForm(f => ({ ...f, photo: v }))} size={68} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{profForm.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{profForm.email}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ROLE_COLORS[profile?.role] + '20', color: ROLE_COLORS[profile?.role], textTransform: 'uppercase' }}>
                      {ROLE_LABELS[profile?.role]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input className="form-input" value={profForm.name || ''} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={profForm.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'block' }}>El email no se puede cambiar</span>
              </div>
              <button className="btn btn-primary" disabled={saving} onClick={saveProfile}>
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </div>
        )}

        {/* TAB: Usuarios */}
        {tab === 'usuarios' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Usuarios del sistema</h3>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
              </div>
              {isAdmin && (
                <button className="btn btn-primary" onClick={() => setInviteModal(true)}>
                  <Plus size={14} /> Invitar usuario
                </button>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-bg)', border: '2px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                            {u.photo
                              ? <img src={u.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              : u.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            {u.id === profile?.id && <div style={{ fontSize: 10, color: 'var(--primary)' }}>Vos</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{u.email}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.active !== false ? 'badge-green' : 'badge-gray'}`}>
                          {u.active !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {isAdmin && u.id !== profile?.id && (
                          <button
                            className={`btn btn-sm ${u.active !== false ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => toggleUserActive(u)}
                            title={u.active !== false ? 'Desactivar' : 'Activar'}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      {inviteModal && (
        <InviteModal
          profile={profile}
          business={business}
          onClose={() => setInviteModal(false)}
        />
      )}
    </>
  );
}
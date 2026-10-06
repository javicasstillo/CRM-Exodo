import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { saveBusinessConfig, updateUserProfile, createInvitation } from '../firebase';
import { useToast } from '../context/ToastContext';
import { Building2, Users, Plus, Camera, Save, X, Shield, Trash2, Copy, Check, Mail, Clock, CreditCard, AlertTriangle, CheckCircle, XCircle, Globe, ExternalLink, Share2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

const ROLE_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', viewer: 'Solo lectura' };
const ROLE_COLORS = { admin: '#0d6efd', vendedor: '#16a34a', viewer: '#d97706' };
const PLAN_LABELS = { emprendedor: 'Pequeño Emprendedor', pyme: 'Pyme', empresa: 'Empresa' };
const PLAN_PRICES = { emprendedor: 20000, pyme: 35000, empresa: 60000 };
const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const PLAN_LIMITS = {
  emprendedor: { maxUsers: 1 },
  pyme:        { maxUsers: 3 },
  empresa:     { maxUsers: 999 },
};

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
                <span>Generá un link de invitación y compartilo. El usuario se registra con su propia contraseña. Expira en <strong>7 días</strong>.</span>
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
                <div style={{ fontSize: 15, fontWeight: 700 }}>¡Link generado!</div>
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
  const { profile, business, refreshBusiness, refreshProfile, subStatus, trialDays } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('negocio');
  const [bizForm, setBizForm] = useState(null);
  const [profForm, setProfForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copiedCatalog, setCopiedCatalog] = useState(false);

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

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
      await cancelSubscription();
      await refreshBusiness();
      setConfirmCancel(false);
      toast('Suscripción cancelada. Tu acceso continúa hasta el próximo período.', 'info');
    } catch (e) {
      toast(e.message || 'Error al cancelar', 'error');
    } finally { setCancelling(false); }
  };

  const toggleUserActive = async (u) => {
    if (!confirm(`¿${u.active !== false ? 'Desactivar' : 'Activar'} a ${u.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', u.id), { active: u.active === false ? true : false });
      toast(`Usuario ${u.active !== false ? 'desactivado' : 'activado'}`, 'info');
    } catch (e) { toast(e.message, 'error'); }
  };

  const isAdmin = profile?.role === 'admin';
  const plan = business?.plan || 'emprendedor';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.emprendedor;
  const canInvite = users.filter(u => u.active !== false).length < limits.maxUsers;

  const catalogSlug = business?.slug || '';
  const catalogUrl = catalogSlug ? `${window.location.origin}/catalogo/${catalogSlug}` : '';

  const copyCatalogUrl = () => {
    if (!catalogUrl) return;
    navigator.clipboard.writeText(catalogUrl);
    setCopiedCatalog(true);
    setTimeout(() => setCopiedCatalog(false), 2000);
    toast('Link del catálogo copiado', 'success');
  };

  const shareCatalogWA = () => {
    const msg = encodeURIComponent(`¡Mirá nuestro catálogo online! 👉 ${catalogUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const STATUS_INFO = {
    trial:           { label: 'Período de prueba', color: '#d97706', bg: '#fffbeb', icon: <Clock size={16} /> },
    active:          { label: 'Activa',             color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircle size={16} /> },
    suspended:       { label: 'Suspendida',         color: '#dc2626', bg: '#fff1f1', icon: <XCircle size={16} /> },
    pending_payment: { label: 'Pago pendiente',     color: '#0d6efd', bg: 'var(--primary-bg)', icon: <CreditCard size={16} /> },
  };

  // ── Vista reducida para vendedor y viewer ──
  if (!isAdmin) return (
  <>
    <div className="page-header">
      <div><h2>Mi perfil</h2><p>Editá tu información personal</p></div>
    </div>
    <div className="page-body fade-up">

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ id: 'perfil', label: 'Mi perfil', icon: Users }, { id: 'catalogo', label: 'Catálogo', icon: Globe }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: tab === t.id ? 'var(--primary)' : 'none', color: tab === t.id ? '#fff' : 'var(--text2)' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Perfil */}
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

      {/* Catálogo — solo lectura para vendedor */}
      {tab === 'catalogo' && (
        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Catálogo público</h3>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Compartí el catálogo con tus clientes</p>
              </div>
            </div>
            {catalogSlug ? (
              <>
                <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Link público</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>{catalogUrl}</div>
                    <button className="btn btn-sm btn-secondary" onClick={copyCatalogUrl} style={{ flexShrink: 0 }}>
                      {copiedCatalog ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a href={catalogUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                    <ExternalLink size={14} /> Ver catálogo
                  </a>
                  <button className="btn btn-secondary" onClick={shareCatalogWA} style={{ flex: 1, justifyContent: 'center' }}>
                    <Share2 size={14} /> Compartir por WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>El catálogo todavía no está configurado.</p>
            )}
          </div>
        </div>
      )}

    </div>
  </>
);

  // ── Vista completa para admin ──
  const TABS = [
    { id: 'negocio',     label: 'Negocio',     icon: Building2  },
    { id: 'perfil',      label: 'Mi perfil',   icon: Users      },
    { id: 'usuarios',    label: 'Usuarios',    icon: Shield     },
    { id: 'catalogo',    label: 'Catálogo',    icon: Globe      },
    { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
  ];

  return (
    <>
      <div className="page-header">
        <div><h2>Configuración</h2><p>Personalizá tu sistema</p></div>
      </div>
      <div className="page-body fade-up">

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
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
             <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }} id="onboarding-logo">
                <AvatarUploader value={bizForm.logo} onChange={v => setBizForm(f => ({ ...f, logo: v }))} size={72} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Logo del negocio</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Se muestra en el sidebar</div>
                </div>
              </div>
              <div className="form-group" id="onboarding-name">
                <label className="form-label">Nombre del negocio</label>
                <input className="form-input" placeholder="Ej: Mi Tienda Tech" value={bizForm.name || ''} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} />
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
              <button className="btn btn-primary" disabled={saving} onClick={saveBusiness} style={{ marginTop: 4 }}>
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Parámetros del sistema</h3>
              <div className="form-group">
                <label className="form-label">Alerta stock bajo (unidades)</label>
                <input className="form-input" type="number" min="1" max="20" value={bizForm.lowStockThreshold || 3} onChange={e => setBizForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>Alertará cuando un producto tenga menos de esta cantidad</span>
              </div>
              <div className="form-group">
                <label className="form-label">Días de garantía por defecto</label>
                <input className="form-input" type="number" min="1" value={bizForm.defaultWarrantyDays || 30} onChange={e => setBizForm(f => ({ ...f, defaultWarrantyDays: Number(e.target.value) }))} />
              </div>
              <div className="form-group" id="onboarding-whatsapp">
                <label className="form-label">WhatsApp para ventas</label>
                <input className="form-input" placeholder="+5492615551234" value={bizForm.whatsapp || ''} onChange={e => setBizForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <button className="btn btn-primary" disabled={saving} onClick={saveBusiness} style={{ marginTop: 4 }} id="onboarding-save">

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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => canInvite ? setInviteModal(true) : toast(`Tu plan ${PLAN_LABELS[plan]} permite máximo ${limits.maxUsers} usuario${limits.maxUsers !== 1 ? 's' : ''}. Actualizá tu plan para agregar más.`, 'warning')}
                  style={{ opacity: canInvite ? 1 : 0.7 }}>
                  <Plus size={14} /> Invitar usuario
                  {!canInvite && <span style={{ fontSize: 10, marginLeft: 4, background: '#d97706', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>Límite</span>}
                </button>
                {!canInvite && (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {users.filter(u => u.active !== false).length}/{limits.maxUsers} usuarios en tu plan
                  </span>
                )}
              </div>
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
                        {u.id !== profile?.id && (
                          <button className={`btn btn-sm ${u.active !== false ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => toggleUserActive(u)}>
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

        {/* TAB: Catálogo */}
        {tab === 'catalogo' && (
          <div style={{ maxWidth: 560 }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={20} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Catálogo público</h3>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Compartí tu stock online con tus clientes</p>
                </div>
              </div>

              {catalogSlug ? (
                <>
                  <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Tu link público</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>{catalogUrl}</div>
                      <button className="btn btn-sm btn-secondary" onClick={copyCatalogUrl} style={{ flexShrink: 0 }}>
                        {copiedCatalog ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <a href={catalogUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                      <ExternalLink size={14} /> Ver catálogo
                    </a>
                    <button className="btn btn-secondary" onClick={shareCatalogWA} style={{ flex: 1, justifyContent: 'center' }}>
                      <Share2 size={14} /> Compartir por WhatsApp
                    </button>
                  </div>

                  <div style={{ background: 'var(--primary-bg)', border: '1px solid rgba(13,110,253,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>¿Cómo funciona?</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        'Los productos disponibles en Stock aparecen automáticamente en el catálogo',
                        'Cuando vendés un producto en Genesys, desaparece del catálogo',
                        'Tus clientes pueden consultar por WhatsApp directamente desde el catálogo',
                        'El catálogo usa el número de WhatsApp que configuraste en Negocio',
                      ].map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text2)' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bizForm && (
                    <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Personalizar URL del catálogo</div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label className="form-label">Identificador único</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
                            <span style={{ padding: '9px 12px', background: 'var(--bg3)', fontSize: 12, color: 'var(--text3)', borderRight: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>/catalogo/</span>
                            <input
                              style={{ flex: 1, padding: '9px 12px', border: 'none', outline: 'none', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)' }}
                              value={bizForm.slug || ''}
                              onChange={e => setBizForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                              placeholder="mi-tienda"
                            />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>Solo letras, números y guiones</span>
                        </div>
                        <button className="btn btn-primary" disabled={saving} onClick={saveBusiness}>
                          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Activá tu catálogo</div>
                  <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Elegí un identificador para la URL de tu catálogo.</p>
                  {bizForm && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 360, margin: '0 auto' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
                          <span style={{ padding: '9px 12px', background: 'var(--bg3)', fontSize: 12, color: 'var(--text3)', borderRight: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>/catalogo/</span>
                          <input
                            style={{ flex: 1, padding: '9px 12px', border: 'none', outline: 'none', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)' }}
                            value={bizForm.slug || ''}
                            onChange={e => setBizForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            placeholder="mi-tienda"
                            autoFocus
                          />
                        </div>
                      </div>
                      <button className="btn btn-primary" disabled={saving || !bizForm.slug} onClick={saveBusiness}>
                        <Save size={14} /> Activar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Suscripción */}
        {tab === 'suscripcion' && (
          <div style={{ maxWidth: 560 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Mi suscripción</h3>

              {(() => {
                const info = STATUS_INFO[subStatus] || STATUS_INFO.trial;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: info.bg, border: `1px solid ${info.color}30`, marginBottom: 20 }}>
                    <div style={{ color: info.color }}>{info.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: info.color }}>Suscripción {info.label}</div>
                      {subStatus === 'trial' && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                          {trialDays > 0 ? `Quedan ${trialDays} días de prueba gratis` : 'Tu prueba gratuita vence hoy'}
                        </div>
                      )}
                      {subStatus === 'active' && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Renovación automática mensual</div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Plan actual</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{PLAN_LABELS[business?.plan] || business?.plan || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Facturación mensual</div>
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                    {fmt(PLAN_PRICES[business?.plan] || 0)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)' }}>/mes</span>
                  </div>
                </div>
              </div>

              {(subStatus === 'active' || subStatus === 'trial') && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Cancelar suscripción</div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 14 }}>
                    Si cancelás, tu acceso continuará hasta el próximo período de facturación. Después el sistema quedará suspendido y no se realizarán más cobros.
                  </p>
                  {!confirmCancel ? (
                    <button className="btn btn-danger" onClick={() => setConfirmCancel(true)}>
                      <XCircle size={14} /> Cancelar suscripción
                    </button>
                  ) : (
                    <div style={{ background: '#fff1f1', border: '1px solid #fecaca', borderRadius: 12, padding: '16px' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>¿Estás seguro? Esta acción cancelará el débito automático mensual.</div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirmCancel(false)}>Volver</button>
                        <button className="btn btn-danger btn-sm" disabled={cancelling} onClick={handleCancelSubscription}>
                          {cancelling ? 'Cancelando...' : 'Sí, cancelar suscripción'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {subStatus === 'suspended' && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Tu suscripción está suspendida. Reactivala para seguir usando el sistema.</p>
                  <a href="https://api.whatsapp.com/send?phone=2604104160&text=Quiero reactivar mi suscripción de Genesys App"
                    target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    <CreditCard size={14} /> Reactivar suscripción
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      {inviteModal && (
        <InviteModal profile={profile} business={business} onClose={() => setInviteModal(false)} />
      )}
    </>
  );
}
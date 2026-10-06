import { useState, useEffect, useRef } from 'react';
import { buyersApi, salesApi, phonesApi } from '../api';
import { Plus, Search, Users, Edit2, Trash2, X, Phone, Mail, Camera, ImageOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const EMPTY = { name: '', dni: '', phone: '', email: '', notes: '', photo: null };

function PhotoUploader({ value, onChange }) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Máximo 3MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
      <label className="form-label">Foto del comprador (opcional)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={() => ref.current.click()}
          style={{ width: 72, height: 72, borderRadius: '50%', border: '2px dashed var(--border2)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}>
          {value
            ? <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            : <Camera size={22} color="var(--text3)" style={{ opacity: 0.4 }} />
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => ref.current.click()}>
            <Camera size={12} /> Subir foto
          </button>
          {value && (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(null)}>
              <ImageOff size={12} /> Quitar
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function Modal({ buyer, onClose, onSave, saving }) {
  const [form, setForm] = useState(buyer || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{buyer ? 'Editar Comprador' : 'Nuevo Comprador'}</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <PhotoUploader value={form.photo} onChange={v => set('photo', v)} />
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" placeholder="Juan Pérez" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">DNI</label>
              <input className="form-input" placeholder="28.456.789" value={form.dni} onChange={e => set('dni', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" placeholder="261-555-1234" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="correo@mail.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Observaciones sobre el comprador..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => { if (form.name) onSave(form); }}>
            {saving ? 'Guardando...' : buyer ? 'Guardar cambios' : 'Crear comprador'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Buyers() {
  const [buyers, setBuyers] = useState([]);
  const [sales, setSales] = useState([]);
  const [phones, setPhones] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const u1 = buyersApi.subscribe(setBuyers);
    const u2 = salesApi.subscribe(setSales);
    const u3 = phonesApi.subscribe(setPhones);
    return () => { u1(); u2(); u3(); };
  }, []);

  const filtered = buyers.filter(b => {
    const q = search.toLowerCase();
    return b.name?.toLowerCase().includes(q) || b.dni?.includes(q) || b.email?.toLowerCase().includes(q) || b.phone?.includes(q);
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'new') await buyersApi.add(form);
      else await buyersApi.update(modal.id, form);
      setModal(null);
      toast(modal === 'new' ? 'Comprador creado' : 'Cambios guardados', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este comprador?')) return;
    try {
      await buyersApi.remove(id);
      toast('Comprador eliminado', 'warning');
    } catch (e) { toast(e.message, 'error'); }
  };

  const getBuyerSales = (buyerId) => sales.filter(s => s.buyerId === buyerId);
  const getPhone = (id) => phones.find(p => p.id === id);
  const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <>
      <div className="page-header">
        <div><h2>Compradores</h2><p>{buyers.length} contactos registrados</p></div>
        <button className="btn btn-primary" id="onboarding-add-buyer" onClick={() => setModal('new')}><Plus size={15} /> Nuevo comprador</button>
      </div>
      <div className="page-body fade-up">
        <div className="toolbar">
          <div className="search-box">
            <Search className="search-icon" />
            <input className="form-input" placeholder="Buscar por nombre, DNI, teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0
          ? <div className="empty-state"><Users size={48} /><h4>No hay compradores</h4><p>Registrá tus primeros clientes</p></div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Comprador</th>
                    <th>DNI</th>
                    <th>Contacto</th>
                    <th>Compras</th>
                    <th>Total gastado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const buySales = getBuyerSales(b.id);
                    const totalGastado = buySales.reduce((a, s) => a + Number(s.salePrice || 0), 0);
                    const lastPhone = buySales.length > 0 ? getPhone(buySales[0].phoneId) : null;
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg3)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', flexShrink: 0, overflow: 'hidden' }}>
                              {b.photo
                                ? <img src={b.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                : initials(b.name)
                              }
                            </div>
                            <span style={{ fontWeight: 600 }}>{b.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text2)' }}>{b.dni || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {b.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)' }}><Phone size={11} />{b.phone}</span>}
                            {b.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)' }}><Mail size={11} />{b.email}</span>}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>{buySales.length}</span>
                          {lastPhone && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{lastPhone.model}</div>}
                        </td>
                        <td style={{ fontWeight: 700, color: buySales.length > 0 ? 'var(--primary)' : 'var(--text3)' }}>
                          {buySales.length > 0 ? fmt(totalGastado) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setModal(b)}><Edit2 size={12} /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
      {modal && <Modal buyer={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} saving={saving} />}
    </>
  );
}
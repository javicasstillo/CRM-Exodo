import { useState, useEffect } from 'react';
import { salesApi, phonesApi, buyersApi } from '../api';
import { Plus, Search, ShoppingCart, Edit2, Trash2, X, Download, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SourceLabel, SourceIcon } from '../components/SourceIcon';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Cuotas con tarjeta', 'Cuotas sin tarjeta', 'Cripto', 'Mixto'];
const SOURCES = ['Instagram', 'Facebook', 'TikTok', 'Recomendación', 'WhatsApp', 'Mercado Libre', 'Otro'];
const EMPTY = { phoneId: '', buyerId: '', salePrice: '', costPrice: '', currency: 'ARS', saleDate: new Date().toISOString().split('T')[0], paymentMethod: 'Efectivo', installments: '', notes: '', status: 'completada', warrantyDays: '30', source: 'Instagram' };

async function exportRecibo(sale, phone, buyer) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#000;padding:40px;width:700px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #000}
    .logo{font-size:32px;font-weight:900;letter-spacing:4px}
    .logo span{font-size:12px;display:block;font-weight:400;letter-spacing:1px;color:#555;margin-top:2px}
    .rec-num{text-align:right;font-size:12px;color:#555}
    .rec-num strong{display:block;font-size:14px;color:#000;margin-bottom:2px}
    .monto-box{background:#f5f5f5;border:2px solid #000;border-radius:10px;padding:20px 28px;margin:24px 0;display:flex;justify-content:space-between;align-items:center}
    .monto-box .label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#555}
    .monto-box .valor{font-size:34px;font-weight:900;color:#000;letter-spacing:1px}
    .section{margin-bottom:22px}
    .section-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#555;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:12px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 30px}
    .item label{font-size:10px;font-weight:600;text-transform:uppercase;color:#999;display:block;margin-bottom:2px}
    .item span{font-size:13px}
    .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#000;color:#fff}
    .watermark{text-align:center;margin-top:30px;font-size:10px;color:#ccc;letter-spacing:2px;text-transform:uppercase}
  </style></head><body>
  <div class="header">
    <div><div class="logo">ÉXODO<span>Gestión de iPhones</span></div></div>
    <div class="rec-num"><strong>RECIBO DE VENTA</strong>Fecha: ${sale.saleDate}<br>Garantía: ${sale.warrantyDays || 30} días</div>
  </div>
  <div class="monto-box">
    <div class="label">Total de la operación</div>
    <div class="valor">${fmt(sale.salePrice)} <span style="font-size:16px;font-weight:400">${sale.currency}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Equipo vendido</div>
    <div class="grid">
      <div class="item"><label>Modelo</label><span>${phone?.model || '—'}</span></div>
      <div class="item"><label>Almacenamiento</label><span>${phone?.storage || '—'}</span></div>
      <div class="item"><label>Color</label><span>${phone?.color || '—'}</span></div>
      <div class="item"><label>Condición</label><span>${phone?.condition || '—'}</span></div>
      ${phone?.imei ? `<div class="item"><label>IMEI</label><span>${phone.imei}</span></div>` : ''}
      ${phone?.batteryHealth ? `<div class="item"><label>Batería</label><span>${phone.batteryHealth}%</span></div>` : ''}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Comprador</div>
    <div class="grid">
      <div class="item"><label>Nombre</label><span>${buyer?.name || 'Sin datos'}</span></div>
      <div class="item"><label>DNI</label><span>${buyer?.dni || '—'}</span></div>
      <div class="item"><label>Teléfono</label><span>${buyer?.phone || '—'}</span></div>
      <div class="item"><label>Email</label><span>${buyer?.email || '—'}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Detalle del pago</div>
    <div class="grid">
      <div class="item"><label>Forma de pago</label><span>${sale.paymentMethod}</span></div>
      ${sale.installments ? `<div class="item"><label>Cuotas</label><span>${sale.installments}</span></div>` : ''}
      <div class="item"><label>Estado</label><span class="badge">${sale.status}</span></div>
    </div>
  </div>
  ${sale.notes ? `<div class="section"><div class="section-title">Observaciones</div><p style="font-size:13px;color:#444;line-height:1.6">${sale.notes}</p></div>` : ''}
  <div class="watermark">Generado el ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:780px;height:auto;border:none;';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  await new Promise(r => setTimeout(r, 600));

  const canvas = await html2canvas(iframe.contentDocument.body, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: 780,
  });

  document.body.removeChild(iframe);

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.height / canvas.width;
  const imgHeight = pageWidth * imgRatio;

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
  } else {
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
  }

  pdf.save(`recibo-${(phone?.model || 'equipo').replace(/\s+/g, '-')}-${sale.saleDate}.pdf`);
}

function Modal({ sale, phones, buyers, onClose, onSave, saving }) {
  const [form, setForm] = useState(sale || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhone = (id) => {
    const p = phones.find(p => p.id === id);
    if (p) setForm(f => ({ ...f, phoneId: id, salePrice: p.salePrice || '', costPrice: p.costPrice || '', currency: p.currency || 'ARS' }));
  };

  const ganancia = form.salePrice && form.costPrice ? Number(form.salePrice) - Number(form.costPrice) : null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h3>{sale ? 'Editar Venta' : 'Registrar Venta'}</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Equipo</label>
              <select className="form-input" value={form.phoneId} onChange={e => handlePhone(e.target.value)}>
                <option value="">Seleccionar...</option>
                {phones.filter(p => p.status === 'disponible' || p.id === form.phoneId).map(p => (
                  <option key={p.id} value={p.id}>{p.model} · {p.storage} · {p.color}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Comprador</label>
              <select className="form-input" value={form.buyerId} onChange={e => set('buyerId', e.target.value)}>
                <option value="">Sin comprador</option>
                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Precios</div>
            <div className="form-grid form-grid-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Costo</label>
                <input className="form-input" type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Precio de venta</label>
                <input className="form-input" type="number" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Moneda</label>
                <select className="form-input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            {ganancia !== null && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)' }}>
                Ganancia: <strong>{fmt(ganancia)}</strong>
                {form.costPrice > 0 && <span> · Margen: <strong>{(((Number(form.salePrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100).toFixed(1)}%</strong></span>}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Forma de pago</div>
            <div className="form-grid form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Método</label>
                <select className="form-input" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {(form.paymentMethod === 'Cuotas con tarjeta' || form.paymentMethod === 'Cuotas sin tarjeta') && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cantidad de cuotas</label>
                  <input className="form-input" type="number" min="2" max="48" placeholder="12" value={form.installments} onChange={e => set('installments', e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Fecha de venta</label>
              <input className="form-input" type="date" value={form.saleDate} onChange={e => set('saleDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Garantía (días)</label>
              <input className="form-input" type="number" placeholder="30" value={form.warrantyDays} onChange={e => set('warrantyDays', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="completada">Completada</option>
                <option value="pendiente">Pendiente de pago</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">¿De dónde vino el cliente?</label>
              <select className="form-input" value={form.source || 'Instagram'} onChange={e => set('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones sobre la venta..." />
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => { if (form.phoneId && form.salePrice) onSave(form); }}>
            {saving ? 'Guardando...' : sale ? 'Guardar' : 'Registrar venta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [phones, setPhones] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = salesApi.subscribe(setSales);
    const u2 = phonesApi.subscribe(setPhones);
    const u3 = buyersApi.subscribe(setBuyers);
    return () => { u1(); u2(); u3(); };
  }, []);

  const getPhone = (id) => phones.find(p => p.id === id);
  const getBuyer = (id) => buyers.find(b => b.id === id);

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const phone = getPhone(s.phoneId);
    const buyer = getBuyer(s.buyerId);
    return (phone?.model?.toLowerCase().includes(q) || buyer?.name?.toLowerCase().includes(q) || s.paymentMethod?.toLowerCase().includes(q) || s.source?.toLowerCase().includes(q))
      && (filterStatus === 'todos' || s.status === filterStatus);
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'new') {
        await salesApi.add(form);
        if (form.phoneId) await phonesApi.update(form.phoneId, { status: 'vendido' });
      } else {
        await salesApi.update(modal.id, form);
      }
      setModal(null);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    try { await salesApi.remove(id); } catch (e) { alert(e.message); }
  };

  const totalIngresos = sales.filter(s => s.status === 'completada').reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const totalGanancia = sales.filter(s => s.status === 'completada').reduce((a, s) => a + (Number(s.salePrice || 0) - Number(s.costPrice || 0)), 0);
  const statusBadge = { completada: 'badge-black', pendiente: 'badge-gray', cancelada: 'badge-outline' };
  const payIcon = { 'Efectivo': '💵', 'Transferencia': '📲', 'Cuotas con tarjeta': '💳', 'Cuotas sin tarjeta': '📅', 'Cripto': '₿', 'Mixto': '🔀' };

  return (
    <>
      <div className="page-header">
        <div><h2>Ventas</h2><p>{sales.length} operaciones registradas</p></div>
        <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={15} /> Registrar venta</button>
      </div>
      <div className="page-body fade-up">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Ingresos totales</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalIngresos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ganancia bruta</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalGanancia)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ventas completadas</div>
            <div className="stat-value">{sales.filter(s => s.status === 'completada').length}</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search className="search-icon" />
            <input className="form-input" placeholder="Buscar por modelo, comprador, forma de pago, origen..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['todos', 'completada', 'pendiente', 'cancelada'].map(f => (
            <button key={f} className={`btn btn-sm ${filterStatus === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterStatus(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="empty-state"><ShoppingCart size={48} /><h4>No hay ventas</h4><p>Registrá tu primera operación</p></div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Comprador</th>
                    <th>Fecha</th>
                    <th>Precio venta</th>
                    <th>Ganancia</th>
                    <th>Pago</th>
                    <th>Origen</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const phone = getPhone(s.phoneId);
                    const buyer = getBuyer(s.buyerId);
                    const ganancia = Number(s.salePrice || 0) - Number(s.costPrice || 0);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{phone?.model || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{phone?.storage} · {phone?.color}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{buyer?.name || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.saleDate}</td>
                        <td style={{ fontFamily: 'Bebas Neue', fontSize: 15 }}>{fmt(s.salePrice)}</td>
                        <td style={{ fontFamily: 'Bebas Neue', fontSize: 15 }}>{fmt(ganancia)}</td>
                        <td>
                          <div style={{ fontSize: 12 }}>
                            {payIcon[s.paymentMethod] || ''} {s.paymentMethod}
                            {s.installments && <span style={{ color: 'var(--text3)' }}> · {s.installments}c</span>}
                          </div>
                        </td>
                        <td>
                          {s.source ? <SourceLabel source={s.source} /> : '—'}
                        </td>
                        <td><span className={`badge ${statusBadge[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" title="Descargar recibo"
                              onClick={() => exportRecibo(s, getPhone(s.phoneId), getBuyer(s.buyerId))}>
                              <Download size={12} />
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => setModal(s)}><Edit2 size={12} /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}><Trash2 size={12} /></button>
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
      {modal && <Modal sale={modal === 'new' ? null : modal} phones={phones} buyers={buyers} onClose={() => setModal(null)} onSave={handleSave} saving={saving} />}
    </>
  );
}
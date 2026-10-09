import { useState, useEffect } from 'react';
import { salesApi, phonesApi, buyersApi } from '../api';
import { Plus, Search, ShoppingCart, Edit2, Trash2, X, Download, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { SourceLabel } from '../components/SourceIcon';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Cuotas con tarjeta', 'Cuotas sin tarjeta', 'Cripto', 'Mixto', 'Canje'];
const SOURCES = ['Instagram', 'Facebook', 'TikTok', 'Recomendación', 'WhatsApp', 'Mercado Libre', 'Otro'];
const EMPTY = { phoneId: '', buyerId: '', salePrice: '', costPrice: '', currency: 'ARS', saleDate: new Date().toISOString().split('T')[0], paymentMethod: 'Efectivo', installments: '', notes: '', status: 'completada', warrantyDays: '30', source: 'Instagram' };
const EMPTY_CANJE = { model: '', storage: 'N/A', color: '', condition: 'Bueno', imei: '', batteryHealth: '', costPrice: '', diferenciaMonto: '', diferenciaMedio: 'Efectivo', category: 'iPhone' };
const PAGE_SIZE = 15;

const STORAGE_OPTIONS = ['N/A', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const CONDITIONS = ['Nuevo', 'Como nuevo', 'Excelente', 'Muy bueno', 'Bueno', 'Regular'];
const DIFF_METHODS = ['Efectivo', 'Transferencia', 'Cuotas con tarjeta', 'Cuotas sin tarjeta', 'Cripto'];

const DATE_FILTERS = [
  { id: 'todos',         label: 'Todas' },
  { id: 'hoy',          label: 'Hoy' },
  { id: 'semana',       label: 'Esta semana' },
  { id: 'mes',          label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
];

const PLAN_LIMITS = {
  emprendedor: { maxUsers: 1, canExportExcel: false },
  pyme:        { maxUsers: 3, canExportExcel: true  },
  empresa:     { maxUsers: 999, canExportExcel: true },
};

async function exportRecibo(sale, phone, buyer, business) {
  const negocioNombre = business?.name || 'Mi Negocio';
  const negocioTel = business?.phone || '';
  const negocioDireccion = business?.address || '';
  const negocioWA = business?.whatsapp || '';
  const esCanje = sale.paymentMethod === 'Canje';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;width:700px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #0d6efd}
    .logo-name{font-size:28px;font-weight:900;letter-spacing:2px;color:#0d6efd}
    .logo-sub{font-size:11px;font-weight:400;color:#666;margin-top:3px;letter-spacing:0.5px}
    .logo-contact{font-size:11px;color:#888;margin-top:6px;line-height:1.6}
    .rec-info{text-align:right;font-size:12px;color:#666}
    .rec-info strong{display:block;font-size:15px;color:#111;font-weight:800;margin-bottom:4px;letter-spacing:1px}
    .monto-box{background:linear-gradient(135deg,#0d6efd,#1a56db);border-radius:12px;padding:20px 28px;margin:24px 0;display:flex;justify-content:space-between;align-items:center;color:#fff}
    .monto-box .label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.8}
    .monto-box .valor{font-size:34px;font-weight:900;letter-spacing:1px}
    .section{margin-bottom:22px}
    .section-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0d6efd;border-bottom:1px solid #e0e8ff;padding-bottom:6px;margin-bottom:12px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 30px}
    .item label{font-size:10px;font-weight:600;text-transform:uppercase;color:#999;display:block;margin-bottom:2px}
    .item span{font-size:13px;color:#111}
    .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#0d6efd;color:#fff}
    .canje-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin:16px 0}
    .canje-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;margin-bottom:10px}
    .watermark{text-align:center;margin-top:30px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#bbb;letter-spacing:2px;text-transform:uppercase}
    .watermark span{color:#0d6efd;font-weight:700}
  </style></head><body>
  <div class="header">
    <div>
      <div class="logo-name">${negocioNombre}</div>
      <div class="logo-sub">Sistema de gestión Genesys</div>
      <div class="logo-contact">
        ${negocioDireccion ? `📍 ${negocioDireccion}<br>` : ''}
        ${negocioTel ? `📞 ${negocioTel}<br>` : ''}
        ${negocioWA ? `📱 WhatsApp: ${negocioWA}` : ''}
      </div>
    </div>
    <div class="rec-info">
      <strong>RECIBO DE VENTA</strong>
      Fecha: ${sale.saleDate}<br>
      Garantía: ${sale.warrantyDays || 30} días
    </div>
  </div>
  <div class="monto-box">
    <div class="label">Total de la operación</div>
    <div class="valor">${fmt(sale.salePrice)} <span style="font-size:16px;font-weight:400;opacity:0.8">${sale.currency}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Producto vendido</div>
    <div class="grid">
      <div class="item"><label>Modelo</label><span>${phone?.model || '—'}</span></div>
      ${phone?.storage && phone.storage !== 'N/A' ? `<div class="item"><label>Almacenamiento</label><span>${phone.storage}</span></div>` : ''}
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
      ${sale.vendedorName ? `<div class="item"><label>Vendedor</label><span>${sale.vendedorName}</span></div>` : ''}
    </div>
  </div>
  ${esCanje && sale.canjeData ? `
  <div class="canje-box">
    <div class="canje-title">🔄 Equipo recibido en canje</div>
    <div class="grid">
      <div class="item"><label>Modelo</label><span>${sale.canjeData.model || '—'}</span></div>
      ${sale.canjeData.storage && sale.canjeData.storage !== 'N/A' ? `<div class="item"><label>Almacenamiento</label><span>${sale.canjeData.storage}</span></div>` : ''}
      <div class="item"><label>Color</label><span>${sale.canjeData.color || '—'}</span></div>
      <div class="item"><label>Condición</label><span>${sale.canjeData.condition || '—'}</span></div>
      ${sale.canjeData.imei ? `<div class="item"><label>IMEI</label><span>${sale.canjeData.imei}</span></div>` : ''}
      ${sale.canjeData.batteryHealth ? `<div class="item"><label>Batería</label><span>${sale.canjeData.batteryHealth}%</span></div>` : ''}
      <div class="item"><label>Valor del canje</label><span>${fmt(sale.canjeData.costPrice)}</span></div>
      ${sale.canjeData.diferenciaMonto ? `<div class="item"><label>Diferencia abonada</label><span>${fmt(sale.canjeData.diferenciaMonto)} — ${sale.canjeData.diferenciaMedio}</span></div>` : ''}
    </div>
  </div>` : ''}
  ${sale.notes ? `<div class="section"><div class="section-title">Observaciones</div><p style="font-size:13px;color:#444;line-height:1.6">${sale.notes}</p></div>` : ''}
  <div class="watermark">
    Recibo generado el ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })} · Powered by <span>Genesys</span>
  </div>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:780px;height:auto;border:none;';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  await new Promise(r => setTimeout(r, 600));
  const canvas = await html2canvas(iframe.contentDocument.body, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 780 });
  document.body.removeChild(iframe);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = pageWidth * (canvas.height / canvas.width);
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight <= pageHeight ? imgHeight : pageHeight);
  pdf.save(`recibo-${(phone?.model || 'producto').replace(/\s+/g, '-')}-${sale.saleDate}.pdf`);
}

function Modal({ sale, phones, buyers, onClose, onSave, saving }) {
  const [form, setForm] = useState(sale || EMPTY);
  const [canjeForm, setCanjeForm] = useState(sale?.canjeData || { ...EMPTY_CANJE });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCanje = (k, v) => setCanjeForm(f => ({ ...f, [k]: v }));

  const esCanje = form.paymentMethod === 'Canje';

  const handlePhone = (id) => {
    const p = phones.find(p => p.id === id);
    if (p) setForm(f => ({ ...f, phoneId: id, salePrice: p.salePrice || '', costPrice: p.costPrice || '', currency: p.currency || 'ARS' }));
  };

  const ganancia = form.salePrice && form.costPrice ? Number(form.salePrice) - Number(form.costPrice) : null;

  const handleSaveForm = () => {
    if (!form.phoneId || !form.salePrice) return;
    const finalForm = { ...form };
    if (esCanje) finalForm.canjeData = { ...canjeForm };
    onSave(finalForm);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
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

          {/* ── Sección canje ── */}
          {esCanje && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <RefreshCw size={15} color="#16a34a" />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Equipo recibido en canje</div>
              </div>

              <div className="form-grid form-grid-2" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Modelo del equipo recibido</label>
                  <input className="form-input" placeholder="Ej: iPhone 13 Pro" value={canjeForm.model} onChange={e => setCanje('model', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Almacenamiento</label>
                  <select className="form-input" value={canjeForm.storage} onChange={e => setCanje('storage', e.target.value)}>
                    {STORAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid form-grid-3" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Color</label>
                  <input className="form-input" placeholder="Negro" value={canjeForm.color} onChange={e => setCanje('color', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Condición</label>
                  <select className="form-input" value={canjeForm.condition} onChange={e => setCanje('condition', e.target.value)}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Batería (%)</label>
                  <input className="form-input" type="number" min="0" max="100" placeholder="85" value={canjeForm.batteryHealth} onChange={e => setCanje('batteryHealth', e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">IMEI (opcional)</label>
                <input className="form-input" placeholder="352xxx..." value={canjeForm.imei} onChange={e => setCanje('imei', e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Valorización del canje</div>
                <div className="form-grid form-grid-3">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Valor del equipo recibido</label>
                    <input className="form-input" type="number" placeholder="0" value={canjeForm.costPrice} onChange={e => setCanje('costPrice', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Diferencia que paga el cliente</label>
                    <input className="form-input" type="number" placeholder="0" value={canjeForm.diferenciaMonto} onChange={e => setCanje('diferenciaMonto', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Medio de la diferencia</label>
                    <select className="form-input" value={canjeForm.diferenciaMedio} onChange={e => setCanje('diferenciaMedio', e.target.value)}>
                      {DIFF_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                {canjeForm.costPrice && canjeForm.diferenciaMonto && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                    Total recibido: {fmt(Number(canjeForm.costPrice) + Number(canjeForm.diferenciaMonto))} ({fmt(canjeForm.costPrice)} en canje + {fmt(canjeForm.diferenciaMonto)} en {canjeForm.diferenciaMedio})
                  </div>
                )}
              </div>
            </div>
          )}

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
          <button className="btn btn-primary" disabled={saving} onClick={handleSaveForm}>
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
  const { business, subStatus, profile } = useApp();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterDate, setFilterDate] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const plan = business?.plan || 'emprendedor';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.emprendedor;
  const isPyme = plan !== 'emprendedor';

  useEffect(() => {
    const u1 = salesApi.subscribe(setSales);
    const u2 = phonesApi.subscribe(setPhones);
    const u3 = buyersApi.subscribe(setBuyers);
    return () => { u1(); u2(); u3(); };
  }, []);

  useEffect(() => setCurrentPage(1), [search, filterStatus, filterDate]);

  const getPhone = (id) => phones.find(p => p.id === id);
  const getBuyer = (id) => buyers.find(b => b.id === id);

  const filterByDate = (s) => {
    if (filterDate === 'todos') return true;
    if (!s.saleDate) return false;
    const d = new Date(s.saleDate);
    const now = new Date();
    if (filterDate === 'hoy') return s.saleDate === now.toISOString().split('T')[0];
    if (filterDate === 'semana') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    if (filterDate === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filterDate === 'mes_anterior') { const p = new Date(now); p.setMonth(now.getMonth() - 1); return d.getMonth() === p.getMonth() && d.getFullYear() === p.getFullYear(); }
    return true;
  };

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const phone = getPhone(s.phoneId);
    const buyer = getBuyer(s.buyerId);
    return (
      phone?.model?.toLowerCase().includes(q) ||
      buyer?.name?.toLowerCase().includes(q) ||
      s.paymentMethod?.toLowerCase().includes(q) ||
      s.source?.toLowerCase().includes(q) ||
      s.vendedorName?.toLowerCase().includes(q)
    )
      && (filterStatus === 'todos' || s.status === filterStatus)
      && filterByDate(s);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'new') {
        await salesApi.add({
          ...form,
          vendedorId: profile?.id || '',
          vendedorName: profile?.name || '',
        });

        // Descontar stock del equipo vendido
        if (form.phoneId) {
          const phone = await phonesApi.getOne(form.phoneId);
          if (phone) {
            const qty = Number(phone.quantity) || 1;
            if (qty > 1) {
              await phonesApi.update(form.phoneId, { quantity: qty - 1 });
            } else {
              await phonesApi.update(form.phoneId, { status: 'vendido', quantity: 0 });
            }
          }
        }

        // Si es canje, agregar el equipo recibido al stock
        if (form.paymentMethod === 'Canje' && form.canjeData?.model) {
          await phonesApi.add({
            model: form.canjeData.model,
            category: form.canjeData.category || 'iPhone',
            storage: form.canjeData.storage || 'N/A',
            color: form.canjeData.color || '',
            condition: form.canjeData.condition || 'Bueno',
            imei: form.canjeData.imei || '',
            batteryHealth: form.canjeData.batteryHealth || '',
            costPrice: form.canjeData.costPrice || '',
            salePrice: '',
            currency: 'ARS',
            status: 'disponible',
            quantity: 1,
            notes: `Recibido en canje — ${form.saleDate}`,
            photo: null,
          });
          toast('Venta registrada y equipo recibido agregado al stock', 'success');
        } else {
          toast('Venta registrada correctamente', 'success');
        }
      } else {
        await salesApi.update(modal.id, form);
        toast('Venta actualizada', 'success');
      }
      setModal(null);
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await salesApi.remove(id);
      toast('Venta eliminada', 'warning');
    } catch (e) { toast(e.message, 'error'); }
  };

  const exportExcel = () => {
    if (!limits.canExportExcel) {
      toast('El exportar a Excel no está disponible en tu plan. Actualizá al plan Pyme o Empresa.', 'warning');
      return;
    }
    const data = filtered.map(s => {
      const phone = getPhone(s.phoneId);
      const buyer = getBuyer(s.buyerId);
      return {
        'Fecha': s.saleDate,
        'Equipo': phone?.model || '—',
        'Almacenamiento': phone?.storage || '—',
        'Color': phone?.color || '—',
        'Comprador': buyer?.name || '—',
        'DNI': buyer?.dni || '—',
        'Vendedor': s.vendedorName || '—',
        'Precio venta': Number(s.salePrice || 0),
        'Costo': Number(s.costPrice || 0),
        'Ganancia': Number(s.salePrice || 0) - Number(s.costPrice || 0),
        'Forma de pago': s.paymentMethod || '—',
        'Cuotas': s.installments || '—',
        'Canje — Equipo recibido': s.canjeData?.model || '—',
        'Canje — Valor': s.canjeData?.costPrice || '—',
        'Canje — Diferencia': s.canjeData?.diferenciaMonto || '—',
        'Canje — Medio diferencia': s.canjeData?.diferenciaMedio || '—',
        'Origen': s.source || '—',
        'Estado': s.status,
        'Garantía (días)': s.warrantyDays || 30,
        'Notas': s.notes || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas-${business?.name || 'negocio'}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast('Excel exportado correctamente', 'success');
  };

  const totalIngresos = sales.filter(s => s.status === 'completada').reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const totalGanancia = sales.filter(s => s.status === 'completada').reduce((a, s) => a + (Number(s.salePrice || 0) - Number(s.costPrice || 0)), 0);
  const statusBadge = { completada: 'badge-green', pendiente: 'badge-yellow', cancelada: 'badge-red' };
  const payIcon = { 'Efectivo': '💵', 'Transferencia': '📲', 'Cuotas con tarjeta': '💳', 'Cuotas sin tarjeta': '📅', 'Cripto': '₿', 'Mixto': '🔀', 'Canje': '🔄' };

  return (
    <>
      <div className="page-header">
        <div><h2>Ventas</h2><p>{sales.length} operaciones registradas</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${limits.canExportExcel ? 'btn-secondary' : 'btn-outline'}`}
            onClick={exportExcel}
            title={!limits.canExportExcel ? 'Disponible en plan Pyme o Empresa' : 'Exportar a Excel'}
            style={{ opacity: limits.canExportExcel ? 1 : 0.6 }}>
            <Download size={15} /> Exportar Excel
            {!limits.canExportExcel && <span style={{ fontSize: 10, marginLeft: 4, background: '#d97706', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>Pyme+</span>}
          </button>
          <button className="btn btn-primary" id="onboarding-add-sale" onClick={() => setModal('new')}><Plus size={15} /> Registrar venta</button>
        </div>
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {DATE_FILTERS.map(f => (
            <button key={f.id} className={`btn btn-sm ${filterDate === f.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterDate(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search className="search-icon" />
            <input className="form-input" placeholder="Buscar por modelo, comprador, vendedor, origen..." value={search} onChange={e => setSearch(e.target.value)} />
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
                    {isPyme && <th>Vendedor</th>}
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
                  {paginated.map(s => {
                    const phone = getPhone(s.phoneId);
                    const buyer = getBuyer(s.buyerId);
                    const ganancia = Number(s.salePrice || 0) - Number(s.costPrice || 0);
                    const esCanje = s.paymentMethod === 'Canje';
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{phone?.model || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{phone?.storage} · {phone?.color}</div>
                          {esCanje && s.canjeData?.model && (
                            <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                              🔄 {s.canjeData.model} {s.canjeData.storage !== 'N/A' ? `· ${s.canjeData.storage}` : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>{buyer?.name || '—'}</td>
                        {isPyme && (
                          <td>
                            <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
                              {s.vendedorName || '—'}
                            </span>
                          </td>
                        )}
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.saleDate}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(s.salePrice)}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(ganancia)}</td>
                        <td>
                          <div style={{ fontSize: 12 }}>
                            {payIcon[s.paymentMethod] || ''} {s.paymentMethod}
                            {s.installments && <span style={{ color: 'var(--text3)' }}> · {s.installments}c</span>}
                            {esCanje && s.canjeData?.diferenciaMonto && (
                              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                                +{fmt(s.canjeData.diferenciaMonto)} {s.canjeData.diferenciaMedio}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{s.source ? <SourceLabel source={s.source} /> : '—'}</td>
                        <td><span className={`badge ${statusBadge[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" title="Descargar recibo"
                              onClick={() => exportRecibo(s, getPhone(s.phoneId), getBuyer(s.buyerId), business)}>
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

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCurrentPage(p)}>{p}</button>
                    ))}
                    <button className="btn btn-sm btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>
      {modal && <Modal sale={modal === 'new' ? null : modal} phones={phones} buyers={buyers} onClose={() => setModal(null)} onSave={handleSave} saving={saving} />}
    </>
  );
}

import { useState, useEffect } from 'react';
import { expensesApi } from '../api';
import { Plus, Search, DollarSign, Edit2, Trash2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const CATEGORIES = ['Compra de equipo', 'Envío / Flete', 'Reparación', 'Comisión', 'Publicidad', 'Caja / Accesorios', 'Impuestos', 'Otros'];
const CAT_ICONS = { 'Compra de equipo': '📱', 'Envío / Flete': '📦', 'Reparación': '🔧', 'Comisión': '💼', 'Publicidad': '📣', 'Caja / Accesorios': '🎁', 'Impuestos': '📋', 'Otros': '📌' };
const EMPTY = { category: 'Compra de equipo', description: '', amount: '', currency: 'ARS', date: new Date().toISOString().split('T')[0], notes: '' };

function Modal({ expense, onClose, onSave, saving }) {
  const [form, setForm] = useState(expense || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" placeholder="Ej: Compra iPhone 14 Pro..." value={form.description} onChange={e => set('description', e.target.value)} autoFocus />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Importe</label>
              <input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Moneda</label>
              <select className="form-input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="ARS">ARS – Pesos</option>
                <option value="USD">USD – Dólares</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => { if (form.description && form.amount) onSave(form); }}>
            {saving ? 'Guardando...' : expense ? 'Guardar' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('todas');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => expensesApi.subscribe(setExpenses), []);

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    return (e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q))
      && (filterCat === 'todas' || e.category === filterCat);
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'new') await expensesApi.add(form);
      else await expensesApi.update(modal.id, form);
      setModal(null);
      toast(modal === 'new' ? 'Gasto registrado' : 'Gasto actualizado', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await expensesApi.remove(id);
      toast('Gasto eliminado', 'warning');
    } catch (e) { toast(e.message, 'error'); }
  };

  const byCat = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((a, e) => a + Number(e.amount || 0), 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  const totalGeneral = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const maxCat = byCat[0]?.total || 1;

  return (
    <>
      <div className="page-header">
        <div><h2>Gastos</h2><p>Control de egresos del negocio</p></div>
        <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={15} /> Nuevo gasto</button>
      </div>
      <div className="page-body fade-up">
        <div className="expenses-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div>
            <div className="toolbar">
              <div className="search-box">
                <Search className="search-icon" />
                <input className="form-input" placeholder="Buscar gasto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-input" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="todas">Todas</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {filtered.length === 0
              ? <div className="empty-state"><DollarSign size={48} /><h4>No hay gastos</h4></div>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Cat.</th><th>Descripción</th><th>Importe</th><th>Fecha</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filtered.map(e => (
                        <tr key={e.id}>
                          <td>
                            <span style={{ fontSize: 16, marginRight: 6 }}>{CAT_ICONS[e.category] || '📌'}</span>
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{e.category}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{e.description}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {fmt(e.amount)} <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{e.currency}</span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text2)' }}>{e.date}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setModal(e)}><Edit2 size={12} /></button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 13, color: 'var(--text2)' }}>
              Total filtrado: <strong style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(filtered.reduce((a, e) => a + Number(e.amount || 0), 0))}</strong>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Por categoría</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byCat.map(c => {
                const pct = Math.round((c.total / maxCat) * 100);
                return (
                  <div key={c.cat}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {CAT_ICONS[c.cat]} {c.cat}
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>({c.count})</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>{fmt(c.total)}</span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-bar progress-bar--default" style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </div>
                );
              })}
              {byCat.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin gastos aún</p>}
              {byCat.length > 0 && (
                <div style={{ paddingTop: 12, borderTop: '2px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>TOTAL</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{fmt(totalGeneral)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {modal && <Modal expense={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} saving={saving} />}
    </>
  );
}
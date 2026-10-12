// src/components/PublicarMLModal.jsx
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { X, ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Categorías principales de ML Argentina para tecnología
const ML_CATEGORIES = [
  { id: 'MLA1055',  label: 'Celulares y Smartphones' },
  { id: 'MLA1714',  label: 'Tablets y Accesorios' },
  { id: 'MLA1648',  label: 'Computación — Laptops y Accesorios' },
  { id: 'MLA1649',  label: 'Computación — PC de Escritorio' },
  { id: 'MLA1700',  label: 'Computación — Monitores' },
  { id: 'MLA3697',  label: 'Electrónica — Auriculares' },
  { id: 'MLA3584',  label: 'Electrónica — Parlantes' },
  { id: 'MLA412349', label: 'Accesorios para Celulares — Fundas' },
  { id: 'MLA412350', label: 'Accesorios para Celulares — Vidrios Templados' },
  { id: 'MLA412351', label: 'Accesorios para Celulares — Cargadores' },
  { id: 'MLA412352', label: 'Accesorios para Celulares — Cables' },
  { id: 'MLA1678',  label: 'Smartwatches y Accesorios' },
  { id: 'MLA1051',  label: 'Electrónica — Otro' },
];

const CONDITIONS_ML = [
  { value: 'new',  label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
];

export default function PublicarMLModal({ phone, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    categoryId:  ML_CATEGORIES[0].id,
    precio:      phone?.salePrice || '',
    condicion:   phone?.condition === 'Nuevo' ? 'new' : 'used',
    descripcion: '',
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const titulo = [phone?.model, phone?.storage !== 'N/A' ? phone?.storage : '', phone?.color]
    .filter(Boolean).join(' ').trim();

  const handlePublicar = async () => {
    if (!form.categoryId || !form.precio) {
      toast('Completá todos los campos', 'warning'); return;
    }
    setSaving(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const mlPublicar = httpsCallable(functions, 'mlPublicarProducto');
      const res = await mlPublicar({
        phoneId:     phone.id,
        categoryId:  form.categoryId,
        precio:      Number(form.precio),
        condicion:   form.condicion,
        descripcion: form.descripcion,
      });
      setResult(res.data);
      toast('¡Producto publicado en Mercado Libre!', 'success');
    } catch (e) {
      toast(e.message || 'Error al publicar', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            <h3>Publicar en Mercado Libre</h3>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          {!result ? (
            <>
              {/* Vista previa del título */}
              <div style={{ background: '#fff200', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 4 }}>Título de la publicación</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{titulo}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Categoría en Mercado Libre</label>
                <select className="form-input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  {ML_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Precio de publicación (ARS)</label>
                  <input className="form-input" type="number" value={form.precio} onChange={e => set('precio', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condición</label>
                  <select className="form-input" value={form.condicion} onChange={e => set('condicion', e.target.value)}>
                    {CONDITIONS_ML.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción (opcional)</label>
                <textarea className="form-input" rows={3}
                  placeholder="Describí el estado, accesorios incluidos, garantía..."
                  value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>

              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                💡 La publicación se creará como <strong>Compra inmediata</strong> en ML. Podés editarla después desde tu cuenta de ML.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¡Publicado en Mercado Libre!</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Tu producto ya está disponible en ML
              </div>
              <a href={result.mlUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={14} /> Ver publicación en ML
              </a>
            </div>
          )}
        </div>

        {!result && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={saving} onClick={handlePublicar}
              style={{ background: '#fff200', color: '#333', border: 'none' }}>
              {saving ? 'Publicando...' : '🛒 Publicar en ML'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

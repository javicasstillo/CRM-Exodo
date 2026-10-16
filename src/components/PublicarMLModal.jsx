// src/components/PublicarMLModal.jsx
import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { X, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CONDITIONS_ML = [
  { value: 'new',  label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
];

export default function PublicarMLModal({ phone, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    categoryId:  '',
    categoryNombre: '',
    precio:      phone?.salePrice || '',
    condicion:   phone?.condition === 'Nuevo' ? 'new' : 'used',
    descripcion: '',
    gtin:        '',
  });
  const [categoriasML, setCategoriasML] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const titulo = [phone?.model, phone?.storage !== 'N/A' ? phone?.storage : '', phone?.color]
    .filter(Boolean).join(' ').trim();

  // Predecir categoría al abrir el modal
  useEffect(() => {
    const predecir = async () => {
      setLoadingCat(true);
      try {
        const functions = getFunctions(undefined, 'us-central1');
        const mlPredecir = httpsCallable(functions, 'mlPredecirCategoria');
        const res = await mlPredecir({ titulo });
        if (res.data?.categorias?.length > 0) {
          setCategoriasML(res.data.categorias);
          setForm(f => ({
            ...f,
            categoryId: res.data.categorias[0].id,
            categoryNombre: res.data.categorias[0].nombre,
          }));
        }
      } catch (e) {
        console.error('Error prediciendo categoría:', e);
      } finally {
        setLoadingCat(false);
      }
    };
    predecir();
  }, []);

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
        gtin:        form.gtin || '',
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

              {/* Categoría detectada automáticamente */}
              <div className="form-group">
                <label className="form-label">
                  Categoría en Mercado Libre
                  {loadingCat && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, fontWeight: 400 }}>Detectando...</span>}
                </label>
                {loadingCat ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--text3)' }}>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Buscando la mejor categoría para este producto...
                  </div>
                ) : (
                  <>
                    <select className="form-input" value={form.categoryId} onChange={e => {
                      const cat = categoriasML.find(c => c.id === e.target.value);
                      set('categoryId', e.target.value);
                      set('categoryNombre', cat?.nombre || '');
                    }}>
                      {categoriasML.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    {form.categoryId && (
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>
                        ✓ Categoría detectada automáticamente por Mercado Libre
                      </div>
                    )}
                  </>
                )}
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

              <div className="form-group">
                <label className="form-label">GTIN / Código de barras <span style={{color:'var(--text3)', fontWeight:400}}>(opcional)</span></label>
                <input className="form-input" placeholder="Ej: 0194252671085 — está en la caja del producto"
                  value={form.gtin || ''} onChange={e => set('gtin', e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  ⚠️ Sin este código Mercado Libre puede rechazar la publicación. Encontralo en la caja del producto o buscando el modelo en <a href="https://barcodelookup.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>barcodelookup.com</a>
                </div>
              </div>
                <div style={{ background: '#fff8f0', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#9a3412', lineHeight: 1.6, marginBottom: 12 }}>
                  ⚠️ <strong>Importante:</strong> No publiques productos réplica, falsificados ni uses marcas sin autorización. Esto puede resultar en la suspensión de tu cuenta de Mercado Libre.
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
            <button className="btn btn-primary" disabled={saving || loadingCat} onClick={handlePublicar}
              style={{ background: '#fff200', color: '#333', border: 'none' }}>
              {saving ? 'Publicando...' : '🛒 Publicar en ML'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 

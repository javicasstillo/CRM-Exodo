import { useState, useEffect, useRef } from 'react';
import { phonesApi } from '../api';
import { Plus, Search, Smartphone, Edit2, Trash2, X, Camera, ImageOff, Minus } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

const CATEGORIES = {
  'iPhone': [
    'iPhone 6', 'iPhone 6S', 'iPhone 7', 'iPhone 7 Plus',
    'iPhone 8', 'iPhone 8 Plus', 'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  ],
  'Samsung': [
    'Samsung Galaxy A05', 'Samsung Galaxy A15', 'Samsung Galaxy A25', 'Samsung Galaxy A35', 'Samsung Galaxy A55',
    'Samsung Galaxy A54', 'Samsung Galaxy A34', 'Samsung Galaxy A14',
    'Samsung Galaxy S23', 'Samsung Galaxy S23+', 'Samsung Galaxy S23 Ultra',
    'Samsung Galaxy S24', 'Samsung Galaxy S24+', 'Samsung Galaxy S24 Ultra',
    'Samsung Galaxy S25', 'Samsung Galaxy S25+', 'Samsung Galaxy S25 Ultra',
    'Samsung Galaxy Z Fold 5', 'Samsung Galaxy Z Fold 6',
    'Samsung Galaxy Z Flip 5', 'Samsung Galaxy Z Flip 6',
  ],
  'Motorola': [
    'Motorola Moto G04', 'Motorola Moto G14', 'Motorola Moto G24', 'Motorola Moto G34', 'Motorola Moto G54', 'Motorola Moto G84',
    'Motorola Edge 40', 'Motorola Edge 40 Neo', 'Motorola Edge 40 Pro',
    'Motorola Edge 50', 'Motorola Edge 50 Pro', 'Motorola Edge 50 Ultra',
    'Motorola Razr 40', 'Motorola Razr 40 Ultra',
    'Motorola Razr 50', 'Motorola Razr 50 Ultra',
  ],
  'Xiaomi': [
    'Xiaomi Redmi 12', 'Xiaomi Redmi 12C', 'Xiaomi Redmi 13', 'Xiaomi Redmi 13C',
    'Xiaomi Redmi Note 12', 'Xiaomi Redmi Note 13', 'Xiaomi Redmi Note 13 Pro',
    'Xiaomi 13', 'Xiaomi 13 Pro', 'Xiaomi 13T', 'Xiaomi 13T Pro',
    'Xiaomi 14', 'Xiaomi 14 Pro', 'Xiaomi 14T', 'Xiaomi 14T Pro',
    'POCO X5', 'POCO X5 Pro', 'POCO X6', 'POCO X6 Pro',
    'POCO M6 Pro', 'POCO F5', 'POCO F6',
  ],
  'Apple Watch': [
    'Apple Watch SE', 'Apple Watch SE 2',
    'Apple Watch Series 6', 'Apple Watch Series 7', 'Apple Watch Series 8', 'Apple Watch Series 9', 'Apple Watch Series 10',
    'Apple Watch Ultra', 'Apple Watch Ultra 2',
  ],
  'AirPods': [
    'AirPods 2', 'AirPods 3', 'AirPods 4',
    'AirPods Pro', 'AirPods Pro 2',
    'AirPods Max',
  ],
  'Tablet': [
    'iPad Mini 6', 'iPad Mini 7',
    'iPad 9', 'iPad 10',
    'iPad Air 4', 'iPad Air 5', 'iPad Air M2',
    'iPad Pro 11 M2', 'iPad Pro 11 M4', 'iPad Pro 13 M2', 'iPad Pro 13 M4',
    'Samsung Galaxy Tab A8', 'Samsung Galaxy Tab A9', 'Samsung Galaxy Tab S8', 'Samsung Galaxy Tab S9',
    'Lenovo Tab M10', 'Lenovo Tab P11',
  ],
  'Computadora': [
    'MacBook Air M1', 'MacBook Air M2', 'MacBook Air M3',
    'MacBook Pro 13 M2', 'MacBook Pro 14 M3', 'MacBook Pro 16 M3',
    'iMac M1', 'iMac M3',
    'Notebook HP', 'Notebook Dell', 'Notebook Lenovo', 'Notebook Asus', 'Notebook Acer',
    'PC Armada',
  ],
  'Parlante': [
    'JBL Go 4', 'JBL Go 4 Pro', 'JBL Flip 6', 'JBL Charge 5', 'JBL Xtreme 3',
    'Sony SRS-XB100', 'Sony SRS-XB13',
    'Bose SoundLink Flex', 'Bose SoundLink Mini',
  ],
  'Auriculares': [
    'Sony WH-1000XM5', 'Sony WF-1000XM5',
    'Bose QuietComfort 45', 'Bose QuietComfort Ultra',
    'Samsung Galaxy Buds 2', 'Samsung Galaxy Buds 2 Pro', 'Samsung Galaxy Buds 3',
    'JBL Tune 770NC', 'JBL Live 770NC',
  ],
  'Cargador': [
    'Cargador Apple 20W Original', 'Cargador Apple 20W Replica',
    'Cargador Apple 35W Original', 'Cargador Apple 35W Replica',
    'Cargador MagSafe Original', 'Cargador MagSafe Replica',
    'Cargador Samsung 25W Original', 'Cargador Samsung 45W Original',
    'Cargador Inalámbrico 15W', 'Cargador Inalámbrico 10W',
    'Cable USB-C a Lightning Original', 'Cable USB-C a USB-C Original',
    'Cable USB-C a Lightning Replica', 'Cable USB-C a USB-C Replica',
  ],
  'Battery Pack': [
    'Battery Pack MagSafe Original', 'Battery Pack MagSafe Replica',
    'Battery Pack USB-C 5000mAh', 'Battery Pack USB-C 10000mAh', 'Battery Pack USB-C 20000mAh',
  ],
  'Accesorio': [
    'Funda iPhone', 'Funda Samsung', 'Funda Universal',
    'Vidrio Templado iPhone', 'Vidrio Templado Samsung', 'Vidrio Templado Universal',
    'Soporte Auto', 'Soporte Escritorio',
    'Mouse Inalámbrico', 'Teclado Inalámbrico',
    'Hub USB-C', 'Adaptador',
  ],
  'Otro': [],
};

const STORAGE = ['N/A', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const CONDITIONS = ['Nuevo', 'Como nuevo', 'Excelente', 'Muy bueno', 'Bueno', 'Regular'];
const COLORS = ['Negro', 'Blanco', 'Rojo', 'Azul', 'Celeste', 'Verde', 'Amarillo', 'Rosa', 'Morado', 'Gris', 'Dorado', 'Natural', 'Titanio', 'Starlight', 'Midnight', 'Otro'];

const CAT_ICON = {
  'iPhone': '📱', 'Samsung': '📱', 'Motorola': '📱', 'Xiaomi': '📱',
  'Apple Watch': '⌚', 'AirPods': '🎧', 'Tablet': '📟',
  'Computadora': '💻', 'Parlante': '🔊', 'Auriculares': '🎧',
  'Cargador': '🔌', 'Battery Pack': '🔋', 'Accesorio': '🧩', 'Otro': '📦',
};

// Categorías que necesitan IMEI
const NEEDS_IMEI = ['iPhone', 'Samsung', 'Motorola', 'Xiaomi'];
// Categorías que muestran almacenamiento
const NEEDS_STORAGE = ['iPhone', 'Samsung', 'Motorola', 'Xiaomi', 'Apple Watch', 'AirPods', 'Tablet', 'Computadora'];
// Categorías que muestran batería
const NEEDS_BATTERY = ['iPhone', 'Samsung', 'Motorola', 'Xiaomi', 'Apple Watch'];
// Categorías que son unitarias (sin cantidad)
const IS_UNIQUE = ['iPhone', 'Samsung', 'Motorola', 'Xiaomi', 'Computadora'];

const getCategory = (model) => {
  for (const [cat, models] of Object.entries(CATEGORIES)) {
    if (models.includes(model)) return cat;
  }
  return 'Otro';
};

const needsQuantity = (category) => !IS_UNIQUE.includes(category);

const EMPTY = {
  category: 'iPhone', model: 'iPhone 13', customModel: '', storage: '128GB', color: 'Negro',
  condition: 'Excelente', imei: '', serial: '', costPrice: '', salePrice: '', currency: 'ARS',
  batteryHealth: '', notes: '', status: 'disponible', photo: null, quantity: 1,
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="form-label">Foto del producto</label>
      <div onClick={() => ref.current.click()}
        style={{ height: 160, borderRadius: 10, border: '2px dashed var(--border2)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}>
        {value
          ? <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <Camera size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>Clic para subir foto</div>
              <div style={{ fontSize: 11 }}>JPG, PNG · máx 3MB</div>
            </div>
        }
      </div>
      {value && (
        <button type="button" className="btn btn-sm btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => onChange(null)}>
          <ImageOff size={12} /> Quitar foto
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function QuantitySelector({ value, onChange }) {
  const qty = Number(value) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--border2)', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
      <button type="button" onClick={() => onChange(Math.max(1, qty - 1))}
        style={{ padding: '8px 12px', background: 'var(--bg3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <Minus size={14} />
      </button>
      <input type="number" min="1" max="999" value={qty}
        onChange={e => onChange(Math.max(1, Number(e.target.value) || 1))}
        style={{ width: 52, textAlign: 'center', border: 'none', outline: 'none', fontSize: 18, fontWeight: 700, background: 'var(--bg-card)', color: 'var(--text)', padding: '6px 0' }} />
      <button type="button" onClick={() => onChange(qty + 1)}
        style={{ padding: '8px 12px', background: 'var(--bg3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function Modal({ phone, onClose, onSave, saving }) {
  const [form, setForm] = useState({ quantity: 1, customModel: '', ...phone } || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCategory = (cat) => {
    const models = CATEGORIES[cat];
    const firstModel = models?.length > 0 ? models[0] : '';
    setForm(f => ({
      ...f,
      category: cat,
      model: firstModel,
      customModel: '',
      quantity: IS_UNIQUE.includes(cat) ? 1 : (f.quantity || 1),
    }));
  };

  const isOtro = form.category === 'Otro';
  const hasModels = CATEGORIES[form.category]?.length > 0;
  const useCustomModel = isOtro || form.model === '__custom__';

  const needsStorage = NEEDS_STORAGE.includes(form.category);
  const needsBattery = NEEDS_BATTERY.includes(form.category);
  const needsImei = NEEDS_IMEI.includes(form.category);
  const showQuantity = needsQuantity(form.category);

  const displayModel = useCustomModel ? form.customModel : form.model;

  const margen = form.salePrice && form.costPrice
    ? (((Number(form.salePrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100).toFixed(1)
    : null;

  const handleSaveForm = () => {
    const finalForm = {
      ...form,
      model: useCustomModel ? (form.customModel || 'Sin modelo') : form.model,
    };
    if (finalForm.model) onSave(finalForm);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{phone ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <PhotoUploader value={form.photo} onChange={v => set('photo', v)} />

          {/* Categoría */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Categoría</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.keys(CATEGORIES).map(cat => (
                <button key={cat} type="button"
                  className={`btn btn-sm ${form.category === cat ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleCategory(cat)}>
                  {CAT_ICON[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Modelo */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Modelo</label>
              {isOtro || !hasModels ? (
                <input
                  className="form-input"
                  placeholder="Escribí el modelo..."
                  value={form.customModel || ''}
                  onChange={e => set('customModel', e.target.value)}
                />
              ) : (
                <>
                  <select className="form-input" value={form.model} onChange={e => {
                    if (e.target.value === '__custom__') {
                      set('model', '__custom__');
                    } else {
                      set('model', e.target.value);
                      set('customModel', '');
                    }
                  }}>
                    {CATEGORIES[form.category]?.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="__custom__">✏️ Escribir modelo...</option>
                  </select>
                  {form.model === '__custom__' && (
                    <input
                      className="form-input"
                      style={{ marginTop: 6 }}
                      placeholder="Escribí el modelo exacto..."
                      value={form.customModel || ''}
                      onChange={e => set('customModel', e.target.value)}
                      autoFocus
                    />
                  )}
                </>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="disponible">Disponible</option>
                <option value="vendido">Vendido</option>
                <option value="reservado">Reservado</option>
                <option value="reparacion">En reparación</option>
              </select>
            </div>
          </div>

          {/* Cantidad */}
          {showQuantity && (
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Cantidad en stock</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <QuantitySelector value={form.quantity || 1} onChange={v => set('quantity', v)} />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {form.quantity > 1 ? `Tenés ${form.quantity} unidades de este producto` : '1 unidad disponible'}
                </span>
              </div>
            </div>
          )}

          {/* Storage, Color, Condición */}
          <div className="form-grid form-grid-3">
            {needsStorage && (
              <div className="form-group">
                <label className="form-label">Almacenamiento</label>
                <select className="form-input" value={form.storage || 'N/A'} onChange={e => set('storage', e.target.value)}>
                  {STORAGE.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Color</label>
              <select className="form-input" value={form.color} onChange={e => set('color', e.target.value)}>
                {COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Condición</label>
              <select className="form-input" value={form.condition} onChange={e => set('condition', e.target.value)}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* IMEI / Serial / Batería */}
          <div className="form-grid form-grid-2">
            {needsImei ? (
              <div className="form-group">
                <label className="form-label">IMEI</label>
                <input className="form-input" placeholder="352xxx..." value={form.imei || ''} onChange={e => set('imei', e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Serial / Código</label>
                <input className="form-input" placeholder="Serial..." value={form.serial || ''} onChange={e => set('serial', e.target.value)} />
              </div>
            )}
            {needsBattery && (
              <div className="form-group">
                <label className="form-label">Batería (%)</label>
                <input className="form-input" type="number" min="0" max="100" placeholder="89" value={form.batteryHealth || ''} onChange={e => set('batteryHealth', e.target.value)} />
              </div>
            )}
          </div>

          {/* Precios */}
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Precios</div>
            <div className="form-grid form-grid-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Costo</label>
                <input className="form-input" type="number" placeholder="0" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Precio de venta</label>
                <input className="form-input" type="number" placeholder="0" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Moneda</label>
                <select className="form-input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  <option value="ARS">ARS – Pesos</option>
                  <option value="USD">USD – Dólares</option>
                </select>
              </div>
            </div>
            {margen !== null && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)' }}>
                Ganancia: <strong>{fmt(Number(form.salePrice) - Number(form.costPrice))}</strong> · Margen: <strong>{margen}%</strong>
                {showQuantity && form.quantity > 1 && (
                  <span> · Invertido: <strong>{fmt(Number(form.costPrice) * Number(form.quantity))}</strong></span>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notas / Accesorios incluidos</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Caja original, cargador, auriculares..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSaveForm}>
            {saving ? 'Guardando...' : phone ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Phones() {
  const [phones, setPhones] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [filterCat, setFilterCat] = useState('todas');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => phonesApi.subscribe(setPhones), []);

  const filtered = phones.filter(p => {
    const q = search.toLowerCase();
    const matchQ = p.model?.toLowerCase().includes(q) || p.imei?.includes(q) || p.color?.toLowerCase().includes(q) || p.storage?.includes(q) || p.category?.toLowerCase().includes(q);
    const matchF = filter === 'todos' || p.status === filter;
    const matchCat = filterCat === 'todas' || (p.category || getCategory(p.model)) === filterCat;
    return matchQ && matchF && matchCat;
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'new') await phonesApi.add(form);
      else await phonesApi.update(modal.id, form);
      setModal(null);
      toast(modal === 'new' ? 'Producto agregado correctamente' : 'Cambios guardados', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await phonesApi.remove(id);
      toast('Producto eliminado', 'warning');
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleReduceQty = async (p) => {
    const qty = Number(p.quantity) || 1;
    if (qty <= 1) {
      if (!confirm('Solo queda 1 unidad. ¿Querés marcarlo como vendido?')) return;
      await phonesApi.update(p.id, { status: 'vendido', quantity: 0 });
      toast('Producto marcado como vendido', 'info');
    } else {
      await phonesApi.update(p.id, { quantity: qty - 1 });
      toast(`Stock actualizado: ${qty - 1} unidades`, 'info');
    }
  };

  const badgeStatus = (s) => {
    if (s === 'disponible') return 'badge-green';
    if (s === 'reservado') return 'badge-yellow';
    if (s === 'vendido') return 'badge-gray';
    return 'badge-gray';
  };

  const labelStatus = { disponible: 'Disponible', vendido: 'Vendido', reservado: 'Reservado', reparacion: 'Reparación' };
  const totalUnidades = phones.filter(p => p.status === 'disponible').reduce((a, p) => a + (Number(p.quantity) || 1), 0);

  // Categorías que tienen productos en stock para los filtros
  const catsEnUso = ['todas', ...new Set(phones.map(p => p.category || getCategory(p.model)))];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Stock</h2>
          <p>{totalUnidades} unidades disponibles · {phones.filter(p => p.status === 'disponible').length} productos distintos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={15} /> Agregar producto</button>
      </div>
      <div className="page-body fade-up">

        {/* Filtros por categoría — solo muestra las que tienen productos */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {catsEnUso.map(cat => (
            <button key={cat} className={`btn btn-sm ${filterCat === cat ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterCat(cat)}>
              {cat === 'todas' ? 'Todas' : `${CAT_ICON[cat] || '📦'} ${cat}`}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search className="search-icon" />
            <input className="form-input" placeholder="Buscar por modelo, color, IMEI..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['todos', 'disponible', 'vendido', 'reservado', 'reparacion'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : labelStatus[f]}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="empty-state"><Smartphone size={48} /><h4>No hay productos</h4><p>Agregá tu primer producto</p></div>
          : (
            <div className="phone-grid">
              {filtered.map(p => {
                const cat = p.category || getCategory(p.model);
                const qty = Number(p.quantity) || 1;
                const showQty = needsQuantity(cat);
                const isLowStock = showQty && p.status === 'disponible' && qty < 3;
                return (
                  <div key={p.id} className="phone-card" style={{ border: isLowStock ? '1.5px solid #fca5a5' : undefined }}>
                    <div className="phone-card-img" style={{ position: 'relative', overflow: 'hidden' }}>
                      {p.photo
                        ? <img src={p.photo} alt={p.model} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Smartphone size={44} color="var(--text3)" />
                      }
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <span className={`badge ${badgeStatus(p.status)}`}>{labelStatus[p.status] || p.status}</span>
                      </div>
                      <div style={{ position: 'absolute', top: 8, left: 8 }}>
                        <span className="badge badge-blue">{CAT_ICON[cat] || '📦'} {cat}</span>
                      </div>
                      {showQty && p.status === 'disponible' && (
                        <div style={{ position: 'absolute', bottom: 8, right: 8, background: isLowStock ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                          x{qty} {isLowStock ? '⚠️' : ''}
                        </div>
                      )}
                      {p.batteryHealth && (
                        <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 20 }}>
                          🔋 {p.batteryHealth}%
                        </div>
                      )}
                    </div>
                    <div className="phone-card-body">
                      {isLowStock && (
                        <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⚠️ Stock bajo — quedan {qty} unidades
                        </div>
                      )}
                      <div className="phone-card-model">{p.model}</div>
                      <div className="phone-card-sub">{p.condition}{p.storage && p.storage !== 'N/A' ? ` · ${p.storage}` : ''}</div>
                      <div className="chip-row">
                        {p.color && <span className="chip">{p.color}</span>}
                        {p.imei && <span className="chip">IMEI: {p.imei.slice(-4)}</span>}
                        {p.serial && <span className="chip">S/N: {p.serial.slice(-4)}</span>}
                      </div>
                      {p.costPrice && p.salePrice && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                          Costo: {fmt(p.costPrice)} · Ganancia: {fmt(Number(p.salePrice) - Number(p.costPrice))}
                        </div>
                      )}
                      {showQty && p.status === 'disponible' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--text3)', flex: 1 }}>Stock:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
                            <button type="button" onClick={() => handleReduceQty(p)}
                              style={{ padding: '3px 8px', background: 'var(--bg3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Minus size={11} />
                            </button>
                            <span style={{ padding: '3px 10px', fontSize: 15, fontWeight: 700, background: 'var(--bg-card)', minWidth: 30, textAlign: 'center' }}>{qty}</span>
                            <button type="button" onClick={() => phonesApi.update(p.id, { quantity: qty + 1 })}
                              style={{ padding: '3px 8px', background: 'var(--bg3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="phone-card-footer">
                        <div className="phone-price">{fmt(p.salePrice)}<span style={{ fontSize: 10, fontFamily: 'Inter', color: 'var(--text3)' }}> {p.currency}</span></div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setModal(p)}><Edit2 size={12} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
      {modal && <Modal phone={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} saving={saving} />}
    </>
  );
}
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

const CAT_ICON = {
  'iPhone': '📱', 'Samsung': '📱', 'Motorola': '📱', 'Xiaomi': '📱',
  'Apple Watch': '⌚', 'AirPods': '🎧', 'Tablet': '📟',
  'Computadora': '💻', 'Parlante': '🔊', 'Auriculares': '🎧',
  'Cargador': '🔌', 'Battery Pack': '🔋', 'Accesorio': '🧩', 'Otro': '📦',
};

const CONDITION_COLORS = {
  'Nuevo': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Como nuevo': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Excelente': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Muy bueno': { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  'Bueno': { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  'Regular': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

function ProductModal({ product, business, onClose }) {
  const condition = CONDITION_COLORS[product.condition] || CONDITION_COLORS['Bueno'];

  const waMessage = encodeURIComponent(
    `Hola! 👋 Quiero consultar por ${product.model}${product.storage && product.storage !== 'N/A' ? ` ${product.storage}` : ''}${product.color ? ` ${product.color}` : ''} que vi en su catálogo. ¿Sigue disponible?`
  );
  const waNumber = business?.whatsapp?.replace(/\D/g, '') || '';
  const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${waMessage}`;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', animation: 'slideUp 0.25s ease' }}>

        {/* Imagen */}
        <div style={{ position: 'relative', height: 280, background: '#f8f9fc', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
          {product.photo
            ? <img src={product.photo} alt={product.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 64 }}>{CAT_ICON[product.category] || '📦'}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{product.category}</span>
              </div>
          }
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          {product.batteryHealth && (
            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
              🔋 {product.batteryHealth}%
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '20px 20px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>{product.category}</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f1729', margin: 0, lineHeight: 1.2 }}>{product.model}</h2>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0d6efd', textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>{fmt(product.salePrice)}</div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {product.storage && product.storage !== 'N/A' && (
              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20 }}>{product.storage}</span>
            )}
            {product.color && (
              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20 }}>{product.color}</span>
            )}
            {product.condition && (
              <span style={{ background: condition.bg, color: condition.color, border: `1px solid ${condition.border}`, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>{product.condition}</span>
            )}
          </div>

          {/* Detalles */}
          <div style={{ background: '#f8f9fc', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            {product.imei && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>IMEI</span>
                <span style={{ fontWeight: 600, color: '#0f1729' }}>···{product.imei.slice(-4)}</span>
              </div>
            )}
            {product.batteryHealth && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Batería</span>
                <span style={{ fontWeight: 600, color: product.batteryHealth >= 85 ? '#16a34a' : product.batteryHealth >= 70 ? '#ca8a04' : '#dc2626' }}>{product.batteryHealth}%</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Disponibilidad</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>✓ Disponible</span>
            </div>
          </div>

          {product.notes && (
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16, padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
              📝 {product.notes}
            </div>
          )}

          {/* Botón WhatsApp */}
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#25d366', color: '#fff', borderRadius: 14, padding: '16px', textDecoration: 'none', fontWeight: 700, fontSize: 16, boxShadow: '0 4px 20px rgba(37,211,102,0.3)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Consultar por WhatsApp
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ProductCard({ product, business, onClick }) {
  const condition = CONDITION_COLORS[product.condition] || CONDITION_COLORS['Bueno'];
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,23,41,0.08)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid #e2e8f0' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,41,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(15,23,41,0.08)'; }}>

      {/* Imagen */}
      <div style={{ height: 180, background: '#f8f9fc', position: 'relative', overflow: 'hidden' }}>
        {product.photo
          ? <img src={product.photo} alt={product.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{CAT_ICON[product.category] || '📦'}</div>
        }
        {product.batteryHealth && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
            🔋 {product.batteryHealth}%
          </div>
        )}
        {product.condition && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: condition.bg, color: condition.color, border: `1px solid ${condition.border}`, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
            {product.condition}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 3 }}>{product.category}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1729', marginBottom: 4, lineHeight: 1.3 }}>{product.model}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          {[product.storage !== 'N/A' && product.storage, product.color].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0d6efd' }}>{fmt(product.salePrice)}</div>
          <div style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, border: '1px solid #bbf7d0' }}>Disponible</div>
        </div>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('todas');
  const [selected, setSelected] = useState(null);

  // Obtener slug de la URL
  const slug = window.location.pathname.split('/catalogo/')[1]?.split('/')[0];

  useEffect(() => {
    if (!slug) { setError('Catálogo no encontrado'); setLoading(false); return; }
    loadCatalog();
  }, [slug]);

  const loadCatalog = async () => {
    try {
      // Buscar negocio por slug
      const bizSnap = await getDocs(query(collection(db, 'businesses'), where('slug', '==', slug)));
      if (bizSnap.empty) { setError('Tienda no encontrada'); setLoading(false); return; }

      const bizData = { id: bizSnap.docs[0].id, ...bizSnap.docs[0].data() };
      setBusiness(bizData);

      // Cargar productos disponibles
      const prodsSnap = await getDocs(query(
        collection(db, 'phones'),
        where('businessId', '==', bizData.id),
        where('status', '==', 'disponible')
      ));

      const prods = prodsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => (Number(p.quantity) || 1) > 0);

      setProducts(prods);
    } catch (e) {
      setError('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['todas', ...new Set(products.map(p => p.category || 'Otro'))];

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.model?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.color?.toLowerCase().includes(q);
    const matchCat = filterCat === 'todas' || (p.category || 'Otro') === filterCat;
    return matchQ && matchCat;
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#0d6efd', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: 14 }}>Cargando catálogo...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0f1729', margin: 0 }}>{error}</h2>
      <p style={{ color: '#64748b', margin: 0 }}>Verificá el link que te compartieron</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {business?.logo
              ? <img src={business.logo} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1px solid #e2e8f0' }} alt="" />
              : <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0d6efd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {business?.name?.[0]?.toUpperCase() || 'G'}
                </div>
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, color: '#0f1729', lineHeight: 1.2 }}>{business?.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{products.length} producto{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}</div>
            </div>
            {business?.whatsapp && (
              <a href={`https://api.whatsapp.com/send?phone=${business.whatsapp.replace(/\D/g,'')}&text=${encodeURIComponent('Hola! 👋 Vi su catálogo y quiero hacer una consulta.')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ width: 40, height: 40, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
          </div>

          {/* Buscador */}
          <div style={{ marginTop: 12, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8f9fc', color: '#0f1729', fontFamily: 'Inter, sans-serif' }}
              onFocus={e => e.target.style.borderColor = '#0d6efd'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Filtros categoría */}
          {categories.length > 2 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: filterCat === cat ? 'none' : '1.5px solid #e2e8f0', background: filterCat === cat ? '#0d6efd' : '#fff', color: filterCat === cat ? '#fff' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', flexShrink: 0, transition: 'all 0.15s' }}>
                  {cat === 'todas' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Productos */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f1729', marginBottom: 4 }}>No hay productos</div>
            <div style={{ fontSize: 13 }}>{search ? 'Probá con otra búsqueda' : 'No hay productos disponibles en este momento'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} business={business} onClick={() => setSelected(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 16px', borderTop: '1px solid #e2e8f0', marginTop: 16, background: '#fff' }}>
        <a href="https://genesys.com.ar" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Powered by <strong style={{ color: '#0d6efd' }}>Genesys App</strong>
        </a>
      </div>

      {/* Modal producto */}
      {selected && <ProductModal product={selected} business={business} onClose={() => setSelected(null)} />}
    </div>
  );
}

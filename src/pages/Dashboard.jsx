import { useState, useEffect } from 'react';
import { phonesApi, salesApi, expensesApi, buyersApi } from '../api';
import { Smartphone, ShoppingCart, TrendingUp, DollarSign, AlertTriangle, Package, Users, Wallet } from 'lucide-react';
import { SourceIcon, SourceLabel } from '../components/SourceIcon';
import { useApp } from '../context/AppContext';

const fmt    = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const fmtUSD = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

const SOURCE_BAR_CLASS = {
  'Instagram':     'progress-bar--instagram',
  'Facebook':      'progress-bar--facebook',
  'TikTok':        'progress-bar--tiktok',
  'WhatsApp':      'progress-bar--whatsapp',
  'Mercado Libre': 'progress-bar--mercadolibre',
  'Recomendación': 'progress-bar--recomendacion',
  'Otro':          'progress-bar--otro',
};

export default function Dashboard() {
  const [phones, setPhones] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const { business } = useApp();

  const plan = business?.plan || 'emprendedor';
  const isBasic = plan === 'emprendedor';

  useEffect(() => {
    const u1 = phonesApi.subscribe(setPhones);
    const u2 = salesApi.subscribe(setSales);
    const u3 = expensesApi.subscribe(setExpenses);
    const u4 = buyersApi.subscribe(setBuyers);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const stock    = phones.filter(p => p.status === 'disponible').reduce((a, p) => a + (Number(p.quantity) || 1), 0);
  const vendidos = phones.filter(p => p.status === 'vendido').length;

  // ── Valor total del stock (costo * cantidad) ──────────────────────
  const valorStockARS = phones
    .filter(p => p.status === 'disponible' && (!p.currency || p.currency === 'ARS') && p.costPrice)
    .reduce((a, p) => a + Number(p.costPrice || 0) * (Number(p.quantity) || 1), 0);
  const valorStockUSD = phones
    .filter(p => p.status === 'disponible' && p.currency === 'USD' && p.costPrice)
    .reduce((a, p) => a + Number(p.costPrice || 0) * (Number(p.quantity) || 1), 0);

  // ── Separar ventas por moneda ──────────────────────────────────────
  const completed    = sales.filter(s => s.status === 'completada');
  const completedARS = completed.filter(s => !s.currency || s.currency === 'ARS');
  const completedUSD = completed.filter(s => s.currency === 'USD');
  const hasUSD = completedUSD.length > 0;

  // Métricas ARS
  const totalIngresosARS = completedARS.reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const totalCostosARS   = completedARS.reduce((a, s) => a + Number(s.costPrice || 0), 0);
  const gananciaBrutaARS = totalIngresosARS - totalCostosARS;
  const totalGastos      = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const gananciaNeta     = gananciaBrutaARS - totalGastos;
  const margen           = totalIngresosARS > 0 ? ((gananciaBrutaARS / totalIngresosARS) * 100).toFixed(1) : 0;
  const ticketProm       = completedARS.length > 0 ? totalIngresosARS / completedARS.length : 0;

  // ── Liquidez real (descuenta valor de canjes) ──────────────────────
  // En un canje el cliente paga: valor_canje + diferencia_en_plata
  // La liquidez real es: precio_venta - valor_canje (solo entra la diferencia en plata)
  const totalCanjeValor = completedARS
    .filter(s => s.paymentMethod === 'Canje' && s.canjeData?.costPrice)
    .reduce((a, s) => a + Number(s.canjeData.costPrice || 0), 0);
  const liquidezReal = totalIngresosARS - totalCanjeValor;
  const hayCanjes = completedARS.some(s => s.paymentMethod === 'Canje');

  // Métricas USD
  const totalIngresosUSD = completedUSD.reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const totalCostosUSD   = completedUSD.reduce((a, s) => a + Number(s.costPrice || 0), 0);
  const gananciaBrutaUSD = totalIngresosUSD - totalCostosUSD;

  // Este mes — solo ARS
  const now       = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ventasMes    = completedARS.filter(s => s.saleDate?.slice(0, 7) === mesActual);
  const ingresosMes  = ventasMes.reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const gananciaMes  = ventasMes.reduce((a, s) => a + (Number(s.salePrice || 0) - Number(s.costPrice || 0)), 0);
  const ventasMesUSD   = completedUSD.filter(s => s.saleDate?.slice(0, 7) === mesActual);
  const gananciaMesUSD = ventasMesUSD.reduce((a, s) => a + (Number(s.salePrice || 0) - Number(s.costPrice || 0)), 0);

  const recentSales = sales.slice(0, 5);
  const getPhone    = (id) => phones.find(p => p.id === id);
  const getBuyer    = (id) => buyers.find(b => b.id === id);
  const sinCosto    = phones.filter(p => p.status === 'disponible' && !p.costPrice);

  const byModel = {};
  completed.forEach(s => {
    if (s.currency && s.currency !== 'ARS') return;
    const phone = phones.find(p => p.id === s.phoneId);
    const model = phone?.model || 'Desconocido';
    if (!byModel[model]) byModel[model] = { count: 0, profit: 0 };
    byModel[model].count++;
    byModel[model].profit += Number(s.salePrice || 0) - Number(s.costPrice || 0);
  });
  const topModels = Object.entries(byModel).sort((a, b) => b[1].count - a[1].count).slice(0, 4);

  const bySource = {};
  completed.forEach(s => {
    const src = s.source || 'Otro';
    if (!bySource[src]) bySource[src] = 0;
    bySource[src]++;
  });
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stockDisponible = phones.filter(p => p.status === 'disponible');
  const totalProductos  = stockDisponible.length;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Panel Principal</h2>
          <p>Resumen general de {business?.name || 'tu negocio'}</p>
        </div>
      </div>

      <div className="page-body fade-up">

        {sinCosto.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {sinCosto.map(p => (
              <div key={p.id} className="alert">
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span><strong>{p.model}</strong> ({p.storage}, {p.color}) — sin precio de costo cargado</span>
              </div>
            ))}
          </div>
        )}

        {/* FILA 1 — KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #1a56db 100%)',
            borderRadius: 'var(--radius-lg)', padding: '22px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxShadow: 'var(--shadow-blue)', color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -30, right: 20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.75, marginBottom: 10 }}>Este mes</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, marginBottom: 4 }}>{fmt(gananciaMes)}</div>
            {hasUSD && gananciaMesUSD > 0 && (
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 4 }}>+ {fmtUSD(gananciaMesUSD)} USD</div>
            )}
            <div style={{ fontSize: 11, opacity: 0.75 }}>Ganancia · {ventasMes.length + ventasMesUSD.length} ventas · {fmt(ingresosMes)} ingresos</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><DollarSign size={16} /></div>
            <div className="stat-label">Ganancia neta</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(gananciaNeta)}</div>
            <div className="stat-sub">Margen {margen}%</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><ShoppingCart size={16} /></div>
            <div className="stat-label">Ventas totales</div>
            <div className="stat-value">{completed.length}</div>
            <div className="stat-sub">Ticket prom. {fmt(ticketProm)}</div>
          </div>

          {/* ── NUEVO: Valor del stock ── */}
          <div className="stat-card">
            <div className="stat-icon"><Package size={16} /></div>
            <div className="stat-label">Stock</div>
            <div className="stat-value">{stock}</div>
            <div className="stat-sub">
              {valorStockARS > 0 ? `${fmt(valorStockARS)} en mercadería` : `${vendidos} vendidos`}
              {valorStockUSD > 0 && ` · ${fmtUSD(valorStockUSD)} USD`}
            </div>
          </div>
        </div>

        {/* FILA 2 — Últimas ventas + Stock disponible */}
        <div className="dashboard-cols" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Últimas Ventas</h3>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Operaciones recientes</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={15} color="var(--primary)" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSales.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin ventas registradas</p>}
              {recentSales.map(s => {
                const phone   = getPhone(s.phoneId);
                const buyer   = getBuyer(s.buyerId);
                const ganancia = Number(s.salePrice || 0) - Number(s.costPrice || 0);
                const isUSD   = s.currency === 'USD';
                const esCanje = s.paymentMethod === 'Canje';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                        {phone?.photo ? <img src={phone.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Smartphone size={15} color="var(--text3)" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {phone?.model || '—'}
                          {isUSD && <span style={{ fontSize: 9, fontWeight: 700, background: '#d97706', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>USD</span>}
                          {esCanje && <span style={{ fontSize: 9, fontWeight: 700, background: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>🔄</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                          {buyer?.name || 'Sin comprador'} · {s.saleDate}
                          {s.source && <><span>·</span><SourceIcon source={s.source} size={12} /></>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        {isUSD ? fmtUSD(s.salePrice) : fmt(s.salePrice)}
                      </div>
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                        +{isUSD ? fmtUSD(ganancia) : fmt(ganancia)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Stock Disponible</h3>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{stock} unidades · {totalProductos} productos</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={15} color="var(--primary)" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stock === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin stock disponible</p>}
              {stockDisponible.slice(0, 5).map(p => {
                const qty   = Number(p.quantity) || 1;
                const isUSD = p.currency === 'USD';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                      {p.photo ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Smartphone size={15} color="var(--text3)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.storage && p.storage !== 'N/A' ? `${p.storage} · ` : ''}{p.color}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                        {isUSD ? fmtUSD(p.salePrice) : fmt(p.salePrice)}
                      </div>
                      {qty > 1 && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>x{qty} uds.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FILA 3 — Top modelos + Origen clientes + Financiero */}
        <div className="dashboard-cols" style={{ display: 'grid', gridTemplateColumns: isBasic ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>

          {!isBasic && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Top Modelos</h3>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={15} color="var(--primary)" />
                </div>
              </div>
              {topModels.length === 0
                ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin ventas aún</p>
                : topModels.map(([model, data], i) => (
                  <div key={model} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                        background: i === 0 ? 'var(--primary)' : 'var(--bg3)',
                        color: i === 0 ? '#fff' : 'var(--text2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        boxShadow: i === 0 ? 'var(--shadow-blue)' : 'none',
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{model}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(data.profit)} ganancia</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? 'var(--primary)' : 'var(--text)' }}>{data.count}</span>
                  </div>
                ))
              }
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Origen Clientes</h3>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="var(--primary)" />
              </div>
            </div>
            {topSources.length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos aún</p>
              : topSources.map(([source, count]) => {
                const pct      = completed.length > 0 ? Math.round((count / completed.length) * 100) : 0;
                const barClass = SOURCE_BAR_CLASS[source] || 'progress-bar--default';
                return (
                  <div key={source} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <SourceLabel source={source} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{count} · {pct}%</span>
                    </div>
                    <div className="progress-wrap">
                      <div className={`progress-bar ${barClass}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Financiero */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Financiero</h3>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={15} color="var(--primary)" />
              </div>
            </div>

            {/* ARS */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Pesos ARS</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 4 }}>
              {[
                { label: 'Ingresos comerciales', value: fmt(totalIngresosARS), tooltip: 'Precio de venta de todas las operaciones' },
                ...(hayCanjes ? [{ label: 'Valor canjes recibidos', value: `− ${fmt(totalCanjeValor)}`, highlight: false, orange: true }] : []),
                { label: hayCanjes ? 'Liquidez real' : 'Ingresos totales', value: fmt(liquidezReal), highlight: hayCanjes },
                { label: 'Costos de equipos', value: `− ${fmt(totalCostosARS)}` },
                { label: 'Ganancia bruta', value: fmt(gananciaBrutaARS), highlight: true },
                { label: 'Gastos operativos', value: `− ${fmt(totalGastos)}` },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: row.highlight ? '2px solid var(--primary)' : '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: row.orange ? '#d97706' : 'var(--text3)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: row.highlight ? 'var(--primary)' : row.orange ? '#d97706' : 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>GANANCIA NETA</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{fmt(gananciaNeta)}</span>
              </div>
            </div>

            {/* Valor del stock */}
            {valorStockARS > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={12} /> Mercadería en stock
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmt(valorStockARS)}</span>
                </div>
                {valorStockUSD > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>Mercadería USD</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{fmtUSD(valorStockUSD)}</span>
                  </div>
                )}
              </div>
            )}

            {/* USD */}
            {hasUSD && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#d97706', marginBottom: 8 }}>Dólares USD</div>
                {[
                  { label: 'Ingresos USD',  value: fmtUSD(totalIngresosUSD) },
                  { label: 'Costos USD',    value: `− ${fmtUSD(totalCostosUSD)}` },
                  { label: 'Ganancia USD',  value: fmtUSD(gananciaBrutaUSD), highlight: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: row.highlight ? `2px solid #d97706` : '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: row.highlight ? '#d97706' : 'var(--text)' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0' }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text3)' }}>{completedUSD.length} ventas en USD</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>{fmtUSD(gananciaBrutaUSD)}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

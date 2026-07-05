import { useState, useEffect } from 'react';
import { phonesApi, salesApi, expensesApi, buyersApi } from '../api';
import { Smartphone, ShoppingCart, TrendingUp, DollarSign, AlertTriangle, ArrowUpRight, Package, Users } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

const sourceIcon = { 'Instagram': '📸', 'Facebook': '👤', 'TikTok': '🎵', 'Recomendación': '🤝', 'WhatsApp': '💬', 'Mercado Libre': '🛒', 'Otro': '📌' };

export default function Dashboard() {
  const [phones, setPhones] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [buyers, setBuyers] = useState([]);

  useEffect(() => {
    const u1 = phonesApi.subscribe(setPhones);
    const u2 = salesApi.subscribe(setSales);
    const u3 = expensesApi.subscribe(setExpenses);
    const u4 = buyersApi.subscribe(setBuyers);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const stock = phones.filter(p => p.status === 'disponible').length;
  const vendidos = phones.filter(p => p.status === 'vendido').length;
  const reservados = phones.filter(p => p.status === 'reservado').length;
  const completed = sales.filter(s => s.status === 'completada');
  const totalIngresos = completed.reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const totalCostos = completed.reduce((a, s) => a + Number(s.costPrice || 0), 0);
  const gananciaBruta = totalIngresos - totalCostos;
  const totalGastos = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const gananciaNeta = gananciaBruta - totalGastos;
  const margen = totalIngresos > 0 ? ((gananciaBruta / totalIngresos) * 100).toFixed(1) : 0;
  const ticketProm = completed.length > 0 ? totalIngresos / completed.length : 0;

  const recentSales = sales.slice(0, 5);
  const getPhone = (id) => phones.find(p => p.id === id);
  const getBuyer = (id) => buyers.find(b => b.id === id);
  const sinCosto = phones.filter(p => p.status === 'disponible' && !p.costPrice);

  // Top modelos vendidos
  const byModel = {};
  completed.forEach(s => {
    const phone = phones.find(p => p.id === s.phoneId);
    const model = phone?.model || 'Desconocido';
    if (!byModel[model]) byModel[model] = { count: 0, profit: 0 };
    byModel[model].count++;
    byModel[model].profit += Number(s.salePrice || 0) - Number(s.costPrice || 0);
  });
  const topModels = Object.entries(byModel).sort((a, b) => b[1].count - a[1].count).slice(0, 4);

  // Origen de clientes
  const bySource = {};
  completed.forEach(s => {
    const src = s.source || 'Otro';
    if (!bySource[src]) bySource[src] = 0;
    bySource[src]++;
  });
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Ventas del mes actual
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ventasMes = completed.filter(s => s.saleDate?.slice(0, 7) === mesActual);
  const ingresosMes = ventasMes.reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const gananciaMes = ventasMes.reduce((a, s) => a + (Number(s.salePrice || 0) - Number(s.costPrice || 0)), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Panel Principal</h2>
          <p>Resumen general de ÉXODO</p>
        </div>
      </div>

      <div className="page-body fade-up">

        {/* ALERTAS */}
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

        {/* FILA 1 — MES ACTUAL destacado + KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>

          {/* Mes actual — card grande negro */}
          <div style={{ background: 'var(--text)', color: 'var(--bg)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>Este mes</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 26, letterSpacing: 1, lineHeight: 1 }}>{fmt(gananciaMes)}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>Ganancia · {ventasMes.length} ventas · {fmt(ingresosMes)} ingresos</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><DollarSign size={16} /></div>
            <div className="stat-label">Ganancia neta total</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(gananciaNeta)}</div>
            <div className="stat-sub">Margen {margen}%</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><ShoppingCart size={16} /></div>
            <div className="stat-label">Ventas totales</div>
            <div className="stat-value">{completed.length}</div>
            <div className="stat-sub">Ticket prom. {fmt(ticketProm)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Package size={16} /></div>
            <div className="stat-label">Stock</div>
            <div className="stat-value">{stock}</div>
            <div className="stat-sub">{vendidos} vendidos · {reservados} reservados</div>
          </div>

        </div>

        {/* FILA 2 — Últimas ventas + Stock disponible */}
        <div className="dashboard-cols" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Últimas ventas */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 17, letterSpacing: 1 }}>Últimas Ventas</h3>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>Operaciones recientes</p>
              </div>
              <ShoppingCart size={16} color="var(--text3)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentSales.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin ventas registradas</p>}
              {recentSales.map(s => {
                const phone = getPhone(s.phoneId);
                const buyer = getBuyer(s.buyerId);
                const ganancia = Number(s.salePrice || 0) - Number(s.costPrice || 0);
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg4)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {phone?.photo ? <img src={phone.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Smartphone size={14} color="var(--text3)" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{phone?.model || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{buyer?.name || 'Sin comprador'} · {s.saleDate} {s.source && `· ${sourceIcon[s.source] || ''} ${s.source}`}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: 15 }}>{fmt(s.salePrice)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>+{fmt(ganancia)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock disponible */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 17, letterSpacing: 1 }}>Stock Disponible</h3>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{stock} equipos listos</p>
              </div>
              <Smartphone size={16} color="var(--text3)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stock === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin stock disponible</p>}
              {phones.filter(p => p.status === 'disponible').slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg4)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {p.photo ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Smartphone size={14} color="var(--text3)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.storage} · {p.color}</div>
                  </div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, flexShrink: 0 }}>{fmt(p.salePrice)}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* FILA 3 — Top modelos + Origen clientes + Resumen financiero */}
        <div className="dashboard-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

          {/* Top modelos */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 17, letterSpacing: 1 }}>Top Modelos</h3>
              <TrendingUp size={16} color="var(--text3)" />
            </div>
            {topModels.length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin ventas aún</p>
              : topModels.map(([model, data], i) => (
                <div key={model} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? 'var(--text)' : 'var(--bg3)', color: i === 0 ? 'var(--bg)' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{model}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(data.profit)} ganancia</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 18 }}>{data.count}</span>
                </div>
              ))
            }
          </div>

          {/* Origen de clientes */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 17, letterSpacing: 1 }}>Origen Clientes</h3>
              <Users size={16} color="var(--text3)" />
            </div>
            {topSources.length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos aún</p>
              : topSources.map(([source, count]) => {
                const pct = completed.length > 0 ? Math.round((count / completed.length) * 100) : 0;
                return (
                  <div key={source} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                      <span>{sourceIcon[source] || '📌'} {source}</span>
                      <span style={{ fontWeight: 600 }}>{count} · {pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 20, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(pct, 4)}%`, background: 'var(--text)', borderRadius: 20, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Resumen financiero */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 17, letterSpacing: 1 }}>Financiero</h3>
              <DollarSign size={16} color="var(--text3)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Ingresos totales', value: fmt(totalIngresos) },
                { label: 'Costos de equipos', value: `− ${fmt(totalCostos)}` },
                { label: 'Ganancia bruta', value: fmt(gananciaBruta), sep: true },
                { label: 'Gastos operativos', value: `− ${fmt(totalGastos)}` },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: row.sep ? '1.5px solid var(--text)' : '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 14, fontWeight: row.sep ? 700 : 400 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 13 }}>
                <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>GANANCIA NETA</span>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: 22 }}>{fmt(gananciaNeta)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
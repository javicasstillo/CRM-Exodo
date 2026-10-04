import { useState, useEffect } from 'react';
import { salesApi, phonesApi, expensesApi } from '../api';
import { SourceLabel } from '../components/SourceIcon';
import { TrendingUp, DollarSign, ShoppingCart, BarChart2, Lock, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const SOURCE_COLORS = {
  'Instagram':     '#e1306c',
  'Facebook':      '#1877f2',
  'TikTok':        '#010101',
  'WhatsApp':      '#25d366',
  'Mercado Libre': '#ffe600',
  'Recomendación': '#7c3aed',
  'Otro':          '#94a3b8',
  'Sin datos':     '#94a3b8',
};

function LockedCard({ title }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', gap: 12, minHeight: 280 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Lock size={22} color="var(--text3)" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, lineHeight: 1.6, maxWidth: 220 }}>
        Disponible en el plan <strong>Pyme</strong> o <strong>Empresa</strong>
      </p>
      <span style={{ fontSize: 11, background: 'var(--primary-bg)', color: 'var(--primary)', padding: '5px 16px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(13,110,253,0.2)' }}>
        Pyme+
      </span>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.profit), 1);
  const [hovered, setHovered] = useState(null);
  const H = 160;

  if (data.length === 0) return <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sin datos todavía</p>;

  return (
    <div style={{ position: 'relative' }}>
      {hovered !== null && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12, boxShadow: 'var(--shadow-md)', zIndex: 10, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{data[hovered]?.label}</div>
          <div style={{ color: 'var(--primary)', fontWeight: 700 }}>Ganancia: {fmt(data[hovered]?.profit)}</div>
          <div style={{ color: 'var(--text3)', fontSize: 11 }}>Ingresos: {fmt(data[hovered]?.revenue)} · {data[hovered]?.count} ventas</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: H + 28, paddingTop: 48 }}>
        {data.map((m, i) => {
          const h = Math.max(8, (m.profit / max) * H);
          const isHov = hovered === i;
          return (
            <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div style={{ width: '100%', height: h, borderRadius: '6px 6px 3px 3px', background: isHov ? 'linear-gradient(180deg, #3d8bfd, #0d6efd)' : 'linear-gradient(180deg, rgba(13,110,253,0.7), rgba(13,110,253,0.4))', transition: 'all 0.2s ease', transform: isHov ? 'scaleY(1.03)' : 'scaleY(1)', transformOrigin: 'bottom', position: 'relative', overflow: 'hidden' }}>
                {isHov && <div style={{ position: 'absolute', top: 0, left: '-60%', width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 1s' }} />}
              </div>
              <span style={{ fontSize: 9, color: isHov ? 'var(--primary)' : 'var(--text3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{m.label.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ data, total }) {
  const [hovered, setHovered] = useState(null);
  const r = 70, cx = 90, cy = 90, stroke = 22;
  const circumference = 2 * Math.PI * r;

  if (data.length === 0) return <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sin datos todavía</p>;

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.count / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const seg = { ...d, dash, gap, offset, pct, color: SOURCE_COLORS[d.source] || '#94a3b8' };
    offset += dash;
    return seg;
  });

  const hov = hovered !== null ? segments[hovered] : null;

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={180} height={180} style={{ overflow: 'visible' }}>
          {segments.map((seg, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
              strokeWidth={hovered === i ? stroke + 3 : stroke}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset + circumference / 4}
              strokeLinecap="round"
              style={{ cursor: 'pointer', transition: 'stroke-width 0.2s', opacity: hovered !== null && hovered !== i ? 0.4 : 1 }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          ))}
          <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 20, fontWeight: 800, fill: 'var(--text)', fontFamily: 'Space Grotesk, sans-serif' }}>
            {hov ? Math.round(hov.pct * 100) + '%' : total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text3)', fontFamily: 'Inter, sans-serif' }}>
            {hov ? hov.source : 'ventas'}
          </text>
        </svg>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: hovered !== null && hovered !== i ? 0.4 : 1, transition: 'opacity 0.2s' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{seg.source}</div></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{seg.count} · {Math.round(seg.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ data }) {
  const max = data[0]?.[1]?.count || 1;
  const [hovered, setHovered] = useState(null);

  if (data.length === 0) return <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos todavía</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map(([model, d], i) => {
        const pct = Math.max(6, (d.count / max) * 100);
        const isHov = hovered === i;
        return (
          <div key={model} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: i === 0 ? 'var(--primary)' : 'var(--bg3)', color: i === 0 ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{model}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? 'var(--primary)' : 'var(--text)' }}>{d.count}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>un.</span>
              </div>
            </div>
            <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: i === 0 ? 'linear-gradient(90deg, #0d6efd, #3d8bfd)' : isHov ? 'linear-gradient(90deg, var(--primary), #3d8bfd)' : 'linear-gradient(90deg, var(--border2), var(--border))', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: '-60%', width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shimmer 2s infinite' }} />
              </div>
            </div>
            {isHov && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Ganancia: {fmt(d.profit)}</div>}
          </div>
        );
      })}
    </div>
  );
}

// Ranking de vendedores
function VendedorBars({ data }) {
  const max = data[0]?.count || 1;
  const [hovered, setHovered] = useState(null);

  if (data.length === 0) return <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin ventas registradas todavía</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((v, i) => {
        const pct = Math.max(6, (v.count / max) * 100);
        const isHov = hovered === i;
        return (
          <div key={v.name} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: i === 0 ? 'var(--primary)' : 'var(--bg3)', color: i === 0 ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, border: i === 0 ? '2px solid rgba(13,110,253,0.3)' : '2px solid var(--border)' }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{v.count} venta{v.count !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? 'var(--primary)' : 'var(--text)' }}>{fmt(v.profit)}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>ganancia</div>
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: i === 0 ? 'linear-gradient(90deg, #0d6efd, #3d8bfd)' : isHov ? 'linear-gradient(90deg, var(--primary), #3d8bfd)' : 'linear-gradient(90deg, var(--border2), var(--border))', transition: 'all 0.3s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Stats() {
  const [sales, setSales] = useState([]);
  const [phones, setPhones] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const { business } = useApp();

  const plan = business?.plan || 'emprendedor';
  const isBasic = plan === 'emprendedor';

  useEffect(() => {
    const u1 = salesApi.subscribe(setSales);
    const u2 = phonesApi.subscribe(setPhones);
    const u3 = expensesApi.subscribe(setExpenses);
    return () => { u1(); u2(); u3(); };
  }, []);

  const completed = sales.filter(s => s.status === 'completada');
  const totalIngresos = completed.reduce((a, s) => a + Number(s.salePrice || 0), 0);
  const totalCostos = completed.reduce((a, s) => a + Number(s.costPrice || 0), 0);
  const totalGastos = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const gananciaBruta = totalIngresos - totalCostos;
  const gananciaNeta = gananciaBruta - totalGastos;
  const margenProm = totalIngresos > 0 ? ((gananciaBruta / totalIngresos) * 100).toFixed(1) : 0;
  const ticketProm = completed.length > 0 ? totalIngresos / completed.length : 0;

  // Modelos más vendidos
  const byModel = {};
  completed.forEach(s => {
    const phone = phones.find(p => p.id === s.phoneId);
    const model = phone?.model || 'Desconocido';
    if (!byModel[model]) byModel[model] = { count: 0, revenue: 0, profit: 0 };
    byModel[model].count++;
    byModel[model].revenue += Number(s.salePrice || 0);
    byModel[model].profit += Number(s.salePrice || 0) - Number(s.costPrice || 0);
  });
  const modelRanking = Object.entries(byModel).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  // Origen de clientes
  const bySource = {};
  completed.forEach(s => {
    const src = s.source || 'Sin datos';
    if (!bySource[src]) bySource[src] = 0;
    bySource[src]++;
  });
  const sourceList = Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count }));

  // Ranking de vendedores
  const byVendedor = {};
  completed.forEach(s => {
    const name = s.vendedorName || 'Sin asignar';
    if (!byVendedor[name]) byVendedor[name] = { count: 0, profit: 0, revenue: 0 };
    byVendedor[name].count++;
    byVendedor[name].revenue += Number(s.salePrice || 0);
    byVendedor[name].profit += Number(s.salePrice || 0) - Number(s.costPrice || 0);
  });
  const vendedorRanking = Object.entries(byVendedor)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, data]) => ({ name, ...data }));

  // Ganancias por mes
  const byMonth = {};
  completed.forEach(s => {
    if (!s.saleDate) return;
    const key = s.saleDate.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { count: 0, revenue: 0, profit: 0, costs: 0 };
    byMonth[key].count++;
    byMonth[key].revenue += Number(s.salePrice || 0);
    byMonth[key].costs += Number(s.costPrice || 0);
    byMonth[key].profit += Number(s.salePrice || 0) - Number(s.costPrice || 0);
  });

  const monthList = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, data]) => {
      const [year, month] = key.split('-');
      return { key, label: `${MONTH_NAMES[Number(month) - 1]} ${year.slice(2)}`, ...data };
    });

  return (
    <>
      <div className="page-header">
        <div><h2>Estadísticas</h2><p>Análisis del negocio</p></div>
      </div>
      <div className="page-body fade-up">

        {/* KPIs */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon"><DollarSign size={16} /></div>
            <div className="stat-label">Ingresos totales</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totalIngresos)}</div>
            <div className="stat-sub">{completed.length} ventas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><TrendingUp size={16} /></div>
            <div className="stat-label">Ganancia bruta</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(gananciaBruta)}</div>
            <div className="stat-sub">Margen {margenProm}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><BarChart2 size={16} /></div>
            <div className="stat-label">Ganancia neta</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(gananciaNeta)}</div>
            <div className="stat-sub">Gastos descontados</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><ShoppingCart size={16} /></div>
            <div className="stat-label">Ticket promedio</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(ticketProm)}</div>
            <div className="stat-sub">Por venta</div>
          </div>
        </div>

        {/* FILA 1 — Ganancias por mes + Origen clientes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
          {isBasic ? (
            <LockedCard title="Ganancias por mes" />
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Ganancias por mes</h3>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Últimos {monthList.length} meses</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={15} color="var(--primary)" />
                </div>
              </div>
              <BarChart data={monthList} />
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Origen de clientes</h3>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{completed.length} ventas totales</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="var(--primary)" />
              </div>
            </div>
            <DonutChart data={sourceList} total={completed.length} />
          </div>
        </div>

        {/* FILA 2 — Modelos + Vendedores */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {isBasic ? (
            <LockedCard title="Modelos más vendidos" />
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Modelos más vendidos</h3>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Top {modelRanking.length} productos</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart2 size={15} color="var(--primary)" />
                </div>
              </div>
              <HorizontalBars data={modelRanking} />
            </div>
          )}

          {/* Ranking vendedores — solo Pyme y Empresa */}
          {isBasic ? (
            <LockedCard title="Ranking de vendedores" />
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Ranking de vendedores</h3>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{vendedorRanking.length} vendedor{vendedorRanking.length !== 1 ? 'es' : ''}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={15} color="var(--primary)" />
                </div>
              </div>
              <VendedorBars data={vendedorRanking} />
            </div>
          )}
        </div>

        {/* FILA 3 — Resumen financiero */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Resumen financiero</h3>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={15} color="var(--primary)" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Ingresos totales', value: fmt(totalIngresos) },
                { label: 'Costos de equipos', value: `− ${fmt(totalCostos)}` },
                { label: 'Ganancia bruta', value: fmt(gananciaBruta), highlight: true },
                { label: 'Gastos operativos', value: `− ${fmt(totalGastos)}` },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: row.highlight ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.highlight ? 'var(--primary)' : 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 4px' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>GANANCIA NETA</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Space Grotesk, sans-serif' }}>{fmt(gananciaNeta)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              <div style={{ padding: '16px 20px', background: 'var(--primary-bg)', borderRadius: 12, border: '1px solid rgba(13,110,253,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Margen promedio</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{margenProm}%</span>
              </div>
              <div style={{ padding: '16px 20px', background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>Ticket promedio</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{fmt(ticketProm)}</span>
              </div>
              <div style={{ padding: '16px 20px', background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>Total ventas</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{completed.length}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
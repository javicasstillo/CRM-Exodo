import { useState, useEffect } from 'react';
import { salesApi, phonesApi, expensesApi } from '../api';
import { SourceLabel } from '../components/SourceIcon';
import { TrendingUp, DollarSign, ShoppingCart, BarChart2, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const SOURCE_BAR_CLASS = {
  'Instagram':     'progress-bar--instagram',
  'Facebook':      'progress-bar--facebook',
  'TikTok':        'progress-bar--tiktok',
  'WhatsApp':      'progress-bar--whatsapp',
  'Mercado Libre': 'progress-bar--mercadolibre',
  'Recomendación': 'progress-bar--recomendacion',
  'Otro':          'progress-bar--otro',
  'Sin datos':     'progress-bar--otro',
};

function Bar({ label, value, max, sub }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>{sub}</span>
      </div>
      <div className="progress-wrap">
        <div className="progress-bar progress-bar--default" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LockedCard({ title, icon: Icon }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Lock size={20} color="var(--text3)" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, lineHeight: 1.6 }}>
        Disponible en el plan <strong>Pyme</strong> o <strong>Empresa</strong>
      </p>
      <span style={{ fontSize: 11, background: 'var(--primary-bg)', color: 'var(--primary)', padding: '4px 14px', borderRadius: 20, fontWeight: 600, border: '1px solid rgba(13,110,253,0.2)' }}>
        Pyme+
      </span>
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
  const modelRanking = Object.entries(byModel).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
  const maxCount = modelRanking[0]?.[1]?.count || 1;

  // Formas de pago
  const byPayment = {};
  completed.forEach(s => {
    const m = s.paymentMethod || 'Otro';
    if (!byPayment[m]) byPayment[m] = 0;
    byPayment[m]++;
  });
  const paymentList = Object.entries(byPayment).sort((a, b) => b[1] - a[1]);
  const maxPayment = paymentList[0]?.[1] || 1;

  // Origen de clientes
  const bySource = {};
  completed.forEach(s => {
    const src = s.source || 'Sin datos';
    if (!bySource[src]) bySource[src] = 0;
    bySource[src]++;
  });
  const sourceList = Object.entries(bySource).sort((a, b) => b[1] - a[1]);

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

  expenses.forEach(e => {
    if (!e.date) return;
    const key = e.date.slice(0, 7);
    if (byMonth[key]) {
      byMonth[key].gastos = (byMonth[key].gastos || 0) + Number(e.amount || 0);
    }
  });

  const monthList = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, data]) => {
      const [year, month] = key.split('-');
      return {
        key,
        label: `${MONTH_NAMES[Number(month) - 1]} ${year}`,
        ...data,
        neta: data.profit - (data.gastos || 0),
      };
    });

  const maxProfit = Math.max(...monthList.map(m => m.profit), 1);

  return (
    <>
      <div className="page-header">
        <div><h2>Estadísticas</h2><p>Análisis del negocio</p></div>
      </div>
      <div className="page-body fade-up">

        {/* KPIs — disponibles para todos */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
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
            <div className="stat-sub">Margen: {margenProm}%</div>
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

        {/* GANANCIAS POR MES — solo Pyme y Empresa */}
        {isBasic ? (
          <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Lock size={20} color="var(--text3)" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Estadísticas mensuales</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, maxWidth: 360, margin: '0 auto 16px' }}>
              El desglose mensual de ingresos, costos y ganancias está disponible en el plan Pyme o Empresa.
            </p>
            <span style={{ fontSize: 11, background: 'var(--primary-bg)', color: 'var(--primary)', padding: '4px 14px', borderRadius: 20, fontWeight: 600, border: '1px solid rgba(13,110,253,0.2)' }}>
              Disponible en Pyme+
            </span>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Ganancias por mes</h3>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Últimos 6 meses · Ingresos, ganancia bruta y neta</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} color="var(--primary)" />
              </div>
            </div>

            {monthList.length > 0 && (
              <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'flex-end', height: 60 }}>
                {monthList.map(m => {
                  const h = Math.max(8, (m.profit / maxProfit) * 60);
                  return (
                    <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', height: h, borderRadius: 6, background: 'var(--primary)', opacity: 0.85, transition: 'height 0.6s ease', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: '-60%', width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2s infinite' }} />
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {monthList.length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 16 }}>Sin datos todavía</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg2)', borderRadius: 8 }}>
                        {['Mes', 'Ventas', 'Ingresos', 'Costos', 'Gan. Bruta', 'Gastos', 'Gan. Neta', 'Margen'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthList.map((m, idx) => {
                        const margen = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : 0;
                        const isLast = idx === monthList.length - 1;
                        return (
                          <tr key={m.key} style={{ borderBottom: '1px solid var(--border)', background: isLast ? 'var(--primary-bg)' : 'transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                            onMouseLeave={e => e.currentTarget.style.background = isLast ? 'var(--primary-bg)' : 'transparent'}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, fontSize: 13, color: isLast ? 'var(--primary)' : 'var(--text)' }}>{m.label}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{m.count}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{fmt(m.revenue)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)' }}>{fmt(m.costs)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{fmt(m.profit)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)' }}>{fmt(m.gastos || 0)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{fmt(m.neta)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 12 }}>
                              <span style={{ background: 'var(--primary-bg)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{margen}%</span>
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
        )}

        <div className="stats-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>

          {/* Modelos más vendidos — solo Pyme y Empresa */}
          {isBasic ? (
            <LockedCard title="Modelos más vendidos" icon={TrendingUp} />
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Modelos más vendidos</h3>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={15} color="var(--primary)" />
                </div>
              </div>
              {modelRanking.length === 0
                ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos todavía</p>
                : modelRanking.map(([model, data]) => (
                  <Bar key={model} label={model} value={data.count} max={maxCount} sub={`${data.count} un. · ${fmt(data.profit)}`} />
                ))
              }
            </div>
          )}

          {/* Origen de clientes — disponible para todos */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Origen de clientes</h3>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={15} color="var(--primary)" />
              </div>
            </div>
            {sourceList.length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos todavía</p>
              : sourceList.map(([source, count]) => {
                const pct = completed.length > 0 ? Math.round((count / completed.length) * 100) : 0;
                const barClass = SOURCE_BAR_CLASS[source] || 'progress-bar--default';
                return (
                  <div key={source} style={{ marginBottom: 16 }}>
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

          {/* Formas de pago — solo Pyme y Empresa */}
          {isBasic ? (
            <LockedCard title="Formas de pago" icon={ShoppingCart} />
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Formas de pago</h3>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={15} color="var(--primary)" />
                </div>
              </div>
              {paymentList.length === 0
                ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos todavía</p>
                : paymentList.map(([method, count]) => {
                  const pct = completed.length > 0 ? Math.round((count / completed.length) * 100) : 0;
                  return (
                    <div key={method} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{method}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{count} · {pct}%</span>
                      </div>
                      <div className="progress-wrap">
                        <div className="progress-bar progress-bar--default" style={{ width: `${Math.max(pct, 4)}%` }} />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* Resumen financiero — disponible para todos */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Resumen financiero</h3>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={15} color="var(--primary)" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Total ingresos (ventas)', value: fmt(totalIngresos) },
                { label: 'Total costos (equipos)', value: `− ${fmt(totalCostos)}` },
                { label: 'Ganancia bruta', value: fmt(gananciaBruta), highlight: true },
                { label: 'Total gastos operativos', value: `− ${fmt(totalGastos)}` },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: row.highlight ? '2px solid var(--primary)' : '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.highlight ? 'var(--primary)' : 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 0' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>GANANCIA NETA</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{fmt(gananciaNeta)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
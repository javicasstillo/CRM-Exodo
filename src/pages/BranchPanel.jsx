import { useState, useEffect } from 'react';
import { getBusinessConfig } from '../firebase';
import { useApp } from '../context/AppContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Building2, TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

export default function BranchPanel() {
  const { business, branches, switchBranch } = useApp();
  const [branchData, setBranchData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branches?.length) { setLoading(false); return; }
    loadBranchData();
  }, [branches]);

  const loadBranchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        [
          // Negocio maestro
          { id: business?.id || '', name: business?.name || 'Principal', isMaster: true },
          // Sucursales
          ...branches.map(b => ({ id: b.id, name: b.name, isMaster: false }))
        ].map(async (b) => {
          if (!b.id) return { ...b, sales: 0, revenue: 0, profit: 0, stock: 0 };
          try {
            // Ventas
            const salesSnap = await getDocs(
              query(collection(db, 'sales'),
                where('businessId', '==', b.id),
                where('status', '==', 'completada')
              )
            );
            const sales = salesSnap.docs.map(d => d.data());
            const revenue = sales.filter(s => !s.currency || s.currency === 'ARS').reduce((a, s) => a + Number(s.salePrice || 0), 0);
            const profit  = sales.filter(s => !s.currency || s.currency === 'ARS').reduce((a, s) => a + (Number(s.salePrice || 0) - Number(s.costPrice || 0)), 0);

            // Stock
            const stockSnap = await getDocs(
              query(collection(db, 'phones'),
                where('businessId', '==', b.id),
                where('status', '==', 'disponible')
              )
            );
            const stock = stockSnap.docs.reduce((a, d) => a + (Number(d.data().quantity) || 1), 0);

            return { ...b, salesCount: sales.length, revenue, profit, stock };
          } catch {
            return { ...b, salesCount: 0, revenue: 0, profit: 0, stock: 0 };
          }
        })
      );
      setBranchData(results);
    } catch (e) {
      console.error('Error cargando datos de sucursales:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = branchData.reduce((a, b) => a + (b.revenue || 0), 0);
  const totalProfit  = branchData.reduce((a, b) => a + (b.profit || 0), 0);
  const totalSales   = branchData.reduce((a, b) => a + (b.salesCount || 0), 0);
  const totalStock   = branchData.reduce((a, b) => a + (b.stock || 0), 0);

  if (loading) return (
    <div style={{ padding: 28 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />)}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Vista consolidada</h2>
          <p>Resumen de todas las sucursales — {business?.name}</p>
        </div>
      </div>
      <div className="page-body fade-up">

        {/* KPIs consolidados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Ingresos totales', value: fmt(totalRevenue), icon: <DollarSign size={16} /> },
            { label: 'Ganancia total',   value: fmt(totalProfit),  icon: <TrendingUp size={16} /> },
            { label: 'Ventas totales',   value: totalSales,        icon: <ShoppingCart size={16} /> },
            { label: 'Stock total',      value: totalStock,        icon: <Package size={16} /> },
          ].map((k, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon">{k.icon}</div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabla de sucursales */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Detalle por sucursal</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Ventas</th>
                  <th>Ingresos</th>
                  <th>Ganancia</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {branchData.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={16} color="var(--primary)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                          {b.isMaster && <div style={{ fontSize: 10, color: 'var(--primary)' }}>Principal</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 15 }}>{b.salesCount}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(b.revenue)}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(b.profit)}</td>
                    <td>{b.stock} uds.</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => switchBranch(b.isMaster ? null : b.id)}>
                        Ver →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Search, Building2 } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

const STATUS_LABELS = { trial: 'Trial', active: 'Activo', suspended: 'Suspendido', pending_payment: 'Pago pendiente' };
const STATUS_COLORS = { trial: '#d97706', active: '#16a34a', suspended: '#dc2626', pending_payment: '#0d6efd' };
const STATUS_BG    = { trial: '#fffbeb', active: '#f0fdf4', suspended: '#fff1f1', pending_payment: 'var(--primary-bg)' };

const PLAN_LABELS  = { emprendedor: 'Emprendedor', pyme: 'Pyme', empresa: 'Empresa' };
const PLAN_PRICES  = { emprendedor: 20000, pyme: 35000, empresa: 60000 };

export default function AdminPanel() {
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers]           = useState([]);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [loading, setLoading]       = useState(true);
  const toast = useToast();

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'businesses'), snap => {
      setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  const getOwner = (bizId) => users.find(u => u.businessId === bizId && u.role === 'admin');

  const getDaysLeft = (biz) => {
    if (biz.status !== 'trial' || !biz.trialEnd) return null;
    const end = biz.trialEnd.toDate ? biz.trialEnd.toDate() : new Date(biz.trialEnd);
    return Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
  };

  const handleToggleStatus = async (biz) => {
    const newStatus = biz.status === 'active' ? 'suspended' : 'active';
    const label = newStatus === 'active' ? 'activado' : 'suspendido';
    try {
      await updateDoc(doc(db, 'businesses', biz.id), { status: newStatus });
      toast(`${biz.name} ${label}`, newStatus === 'active' ? 'success' : 'warning');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── FIX bug 4: separar negocios principales de sucursales ──
  const mainBusinesses = businesses.filter(b => !b.parentBusinessId);
  const branchBusinesses = businesses.filter(b => !!b.parentBusinessId);

  const filtered = mainBusinesses.filter(b => {
    const owner = getOwner(b.id);
    const q = search.toLowerCase();
    const matchQ = b.name?.toLowerCase().includes(q) || owner?.email?.toLowerCase().includes(q);
    const matchS = filterStatus === 'todos' || b.status === filterStatus;
    return matchQ && matchS;
  });

  // KPIs — solo negocios principales
  const total       = mainBusinesses.length;
  const activos     = mainBusinesses.filter(b => b.status === 'active').length;
  const trials      = mainBusinesses.filter(b => b.status === 'trial').length;
  const suspendidos = mainBusinesses.filter(b => b.status === 'suspended').length;
  const mrr         = mainBusinesses.filter(b => b.status === 'active').reduce((a, b) => a + (PLAN_PRICES[b.plan] || 0), 0);
  const mrrTrial    = mainBusinesses.filter(b => b.status === 'trial').reduce((a, b) => a + (PLAN_PRICES[b.plan] || 0), 0);
  const totalSucursales = branchBusinesses.length;

  if (loading) return (
    <div style={{ padding: 28 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />)}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Panel de Administración</h2>
          <p>Todos los negocios de Genesys App</p>
        </div>
      </div>
      <div className="page-body fade-up">

        {/* KPIs */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon"><Users size={16} /></div>
            <div className="stat-label">Clientes</div>
            <div className="stat-value">{total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle size={16} /></div>
            <div className="stat-label">Activos</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{activos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Clock size={16} /></div>
            <div className="stat-label">En trial</div>
            <div className="stat-value" style={{ color: '#d97706' }}>{trials}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fff1f1', color: '#dc2626' }}><XCircle size={16} /></div>
            <div className="stat-label">Suspendidos</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{suspendidos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}><Building2 size={16} /></div>
            <div className="stat-label">Sucursales</div>
            <div className="stat-value">{totalSucursales}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><DollarSign size={16} /></div>
            <div className="stat-label">MRR activo</div>
            <div className="stat-value" style={{ fontSize: 17 }}>{fmt(mrr)}</div>
            <div className="stat-sub">+{fmt(mrrTrial)} potencial</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="toolbar">
          <div className="search-box">
            <Search className="search-icon" />
            <input className="form-input" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['todos', 'active', 'trial', 'suspended', 'pending_payment'].map(s => (
            <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterStatus(s)}>
              {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Tabla — solo clientes principales */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Email admin</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Trial / Pago</th>
                <th>Sucursales</th>
                <th>Registro</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Sin resultados</td></tr>
              )}
              {filtered.map(biz => {
                const owner = getOwner(biz.id);
                const daysLeft = getDaysLeft(biz);
                const createdAt = biz.createdAt?.toDate ? biz.createdAt.toDate().toLocaleDateString('es-AR') : '—';
                const sucursalesCuenta = (biz.branches || []).length;
                return (
                  <tr key={biz.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{biz.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{biz.id.slice(0, 8)}...</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{owner?.email || '—'}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                        {PLAN_LABELS[biz.plan] || biz.plan || '—'}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(PLAN_PRICES[biz.plan] || 0)}/mes</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: STATUS_BG[biz.status],
                        color: STATUS_COLORS[biz.status],
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        {STATUS_LABELS[biz.status] || biz.status}
                      </span>
                    </td>
                    <td>
                      {biz.status === 'trial' && daysLeft !== null && (
                        <span style={{ fontSize: 12, color: daysLeft <= 3 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                          {daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días`}
                        </span>
                      )}
                      {biz.status === 'active' && biz.lastPaymentAt && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          Último pago: {biz.lastPaymentAt.toDate?.().toLocaleDateString('es-AR') || '—'}
                        </span>
                      )}
                      {biz.status === 'suspended' && <span style={{ fontSize: 11, color: '#dc2626' }}>Sin pago</span>}
                      {biz.status === 'pending_payment' && <span style={{ fontSize: 11, color: 'var(--primary)' }}>Esperando pago</span>}
                    </td>
                    <td>
                      {sucursalesCuenta > 0
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={12} /> {sucursalesCuenta}</span>
                        : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{createdAt}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${biz.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => handleToggleStatus(biz)}>
                        {biz.status === 'active' ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        {biz.status === 'active' ? 'Suspender' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
          {filtered.length} de {total} clientes · {totalSucursales} sucursales (no mostradas)
        </div>

      </div>
    </>
  );
}

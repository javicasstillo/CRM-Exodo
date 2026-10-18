import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { Users, Globe, DollarSign, CheckCircle, XCircle, Clock, Search, Building2, Smartphone, ShoppingBag, MessageCircle, Activity, StickyNote, Plus, Minus } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

const STATUS_LABELS = { trial: 'Trial', active: 'Activo', suspended: 'Suspendido', pending_payment: 'Pago pendiente' };
const STATUS_COLORS = { trial: '#d97706', active: '#16a34a', suspended: '#dc2626', pending_payment: '#0d6efd' };
const STATUS_BG    = { trial: '#fffbeb', active: '#f0fdf4', suspended: '#fff1f1', pending_payment: 'var(--primary-bg)' };

const PLAN_LABELS  = { emprendedor: 'Emprendedor', pyme: 'Pyme', empresa: 'Empresa' };
const PLAN_PRICES  = { emprendedor: 20000, pyme: 35000, empresa: 60000 };

export default function AdminPanel() {
  const [businesses, setBusinesses]       = useState([]);
  const [users, setUsers]                 = useState([]);
  const [stockCounts, setStockCounts]     = useState({});
  const [lastActivity, setLastActivity]   = useState({});
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState('todos');
  const [loading, setLoading]             = useState(true);
  const [notaModal, setNotaModal]         = useState(null); // { bizId, nota }
  const [trialModal, setTrialModal]       = useState(null); // { biz }
  const [trialDias, setTrialDias]         = useState(3);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [guardandoTrial, setGuardandoTrial] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'businesses'), snap => {
      const bizList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBusinesses(bizList);
      setLoading(false);

      // Cargar stock y última actividad por negocio
      bizList.filter(b => !b.parentBusinessId).forEach(async (biz) => {
        // Stock count
        try {
          const phonesSnap = await getDocs(query(
            collection(db, 'phones'),
            where('businessId', '==', biz.id),
            where('status', '==', 'disponible')
          ));
          setStockCounts(prev => ({ ...prev, [biz.id]: phonesSnap.size }));
        } catch {}

        // Última actividad (última venta)
        try {
          const salesSnap = await getDocs(query(
            collection(db, 'sales'),
            where('businessId', '==', biz.id),
            orderBy('saleDate', 'desc'),
            limit(1)
          ));
          if (!salesSnap.empty) {
            const lastSale = salesSnap.docs[0].data();
            setLastActivity(prev => ({ ...prev, [biz.id]: lastSale.saleDate }));
          }
        } catch {}
      });
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
  const accion = newStatus === 'active' ? 'activar' : 'suspender';
  if (!confirm(`¿Querés ${accion} a ${biz.name}?`)) return;
  const label = newStatus === 'active' ? 'activado' : 'suspendido';
  try {
    await updateDoc(doc(db, 'businesses', biz.id), { status: newStatus });
    toast(`${biz.name} ${label}`, newStatus === 'active' ? 'success' : 'warning');
  } catch (e) { toast(e.message, 'error'); }
};

  const handleGuardarNota = async () => {
    setGuardandoNota(true);
    try {
      await updateDoc(doc(db, 'businesses', notaModal.bizId), { adminNota: notaModal.nota });
      toast('Nota guardada', 'success');
      setNotaModal(null);
    } catch (e) { toast(e.message, 'error'); }
    finally { setGuardandoNota(false); }
  };

  const handleExtenderTrial = async () => {
    setGuardandoTrial(true);
    try {
      const biz = trialModal.biz;
      const currentEnd = biz.trialEnd?.toDate ? biz.trialEnd.toDate() : new Date(biz.trialEnd || new Date());
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + trialDias);
      await updateDoc(doc(db, 'businesses', biz.id), {
        trialEnd: newEnd,
        status: 'trial',
      });
      toast(`Trial extendido ${trialDias} días para ${biz.name}`, 'success');
      setTrialModal(null);
    } catch (e) { toast(e.message, 'error'); }
    finally { setGuardandoTrial(false); }
  };

  const mainBusinesses = businesses.filter(b => !b.parentBusinessId);
  const branchBusinesses = businesses.filter(b => !!b.parentBusinessId);

  const filtered = mainBusinesses.filter(b => {
    const owner = getOwner(b.id);
    const q = search.toLowerCase();
    const matchQ = b.name?.toLowerCase().includes(q) || owner?.email?.toLowerCase().includes(q);
    const matchS = filterStatus === 'todos' || b.status === filterStatus;
    return matchQ && matchS;
  });

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

        {/* Tabla */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Email / WhatsApp</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Trial / Pago</th>
                <th>Stock</th>
                <th>Última venta</th>
                <th>ML</th>
                <th>Nota</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Sin resultados</td></tr>
              )}
              {filtered.map(biz => {
                const owner = getOwner(biz.id);
                const daysLeft = getDaysLeft(biz);
                const createdAt = biz.createdAt?.toDate ? biz.createdAt.toDate().toLocaleDateString('es-AR') : '—';
                const sucursalesCuenta = (biz.branches || []).length;
                const stockCount = stockCounts[biz.id];
                const lastSale = lastActivity[biz.id];
                return (
                  <tr key={biz.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{biz.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Registro: {createdAt}</div>
                      {sucursalesCuenta > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Building2 size={10} /> {sucursalesCuenta} sucursal{sucursalesCuenta > 1 ? 'es' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{owner?.email || '—'}</div>
                      {biz.whatsapp && (
                        <a href={`https://api.whatsapp.com/send?phone=${biz.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, textDecoration: 'none' }}>
                          <MessageCircle size={10} /> {biz.whatsapp}
                        </a>
                      )}
                    </td>
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
                        <div>
                          <span style={{ fontSize: 12, color: daysLeft <= 3 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                            {daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días`}
                          </span>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ marginTop: 4, fontSize: 10, padding: '2px 6px', display: 'block' }}
                            onClick={() => { setTrialDias(3); setTrialModal({ biz }); }}>
                            + Extender
                          </button>
                        </div>
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
                      {stockCount !== undefined
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                            <Smartphone size={12} color="var(--text3)" /> {stockCount}
                          </div>
                        : <span style={{ color: 'var(--text3)', fontSize: 11 }}>...</span>
                      }
                    </td>
                    <td>
                      {lastSale
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <Activity size={11} color="#16a34a" /> {lastSale}
                          </div>
                        : <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sin ventas</span>
                      }
                    </td>
                    <td>
                      {biz.mlConnected
                        ? <span style={{ fontSize: 11, fontWeight: 700, background: '#fff200', color: '#333', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
                            🛒 ON
                          </span>
                        : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                      }
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        title={biz.adminNota || 'Agregar nota'}
                        onClick={() => setNotaModal({ bizId: biz.id, bizName: biz.name, nota: biz.adminNota || '' })}
                        style={{ position: 'relative' }}>
                        <StickyNote size={12} />
                        {biz.adminNota && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />}
                      </button>
                    </td>
                    <td>
  <div style={{ display: 'flex', gap: 6 }}>
    {biz.slug && (
      <a href={`/catalogo/${biz.slug}`} target="_blank" rel="noopener noreferrer"
        className="btn btn-sm btn-secondary" title="Ver catálogo"
        style={{ textDecoration: 'none' }}>
        <Globe size={12} />
      </a>
    )}
    <button
      className={`btn btn-sm ${biz.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
      onClick={() => handleToggleStatus(biz)}>
      {biz.status === 'active' ? <XCircle size={12} /> : <CheckCircle size={12} />}
      {biz.status === 'active' ? 'Suspender' : 'Activar'}
    </button>
  </div>
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

      {/* ── Modal Nota ── */}
      {notaModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNotaModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Nota — {notaModal.bizName}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setNotaModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <textarea
                className="form-input"
                rows={5}
                placeholder="Escribí una nota interna sobre este cliente..."
                value={notaModal.nota}
                onChange={e => setNotaModal(n => ({ ...n, nota: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Solo visible para vos en el panel de administración.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setNotaModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={guardandoNota} onClick={handleGuardarNota}>
                {guardandoNota ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Extender Trial ── */}
      {trialModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTrialModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Extender trial — {trialModal.biz.name}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setTrialModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                  ¿Cuántos días querés agregarle al trial?
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setTrialDias(d => Math.max(1, d - 1))}>
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: 32, fontWeight: 800, minWidth: 60, textAlign: 'center' }}>{trialDias}</span>
                  <button className="btn btn-secondary" onClick={() => setTrialDias(d => d + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>
                  días adicionales
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTrialModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={guardandoTrial} onClick={handleExtenderTrial}>
                {guardandoTrial ? 'Guardando...' : `Agregar ${trialDias} días`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

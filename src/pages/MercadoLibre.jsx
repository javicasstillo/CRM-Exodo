import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ExternalLink, ShoppingBag, TrendingUp, Package, CheckCircle, XCircle, RefreshCw, Link } from 'lucide-react';
import logoMeli from '../assets/logoMeli.webp';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

export default function MercadoLibre() {
  const { business, profile } = useApp();
  const toast = useToast();
  const [phones, setPhones] = useState([]);
  const [connecting, setConnecting] = useState(false);

  const mlConnected = !!business?.mlConnected;
  const mlUserId = business?.mlUserId;

  useEffect(() => {
    if (!profile?.businessId) return;
    const q = query(collection(db, 'phones'), where('businessId', '==', profile.businessId), where('mlItemId', '!=', null));
    return onSnapshot(q, snap => setPhones(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.mlItemId)));
  }, [profile]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const mlAuthUrl = httpsCallable(functions, 'mlAuthUrl');
      const result = await mlAuthUrl();
      window.location.href = result.data.url;
    } catch (e) {
      toast(e.message, 'error');
      setConnecting(false);
    }
  };

  const publicados   = phones.filter(p => p.mlStatus === 'active');
  const pausados     = phones.filter(p => p.mlStatus === 'paused');
  const cerrados     = phones.filter(p => p.mlStatus === 'closed');

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff200', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={logoMeli} style={{ width: 32, height: 32, objectFit: 'contain' }} alt="Mercado Libre" />
          </div>
          <div>
            <h2>Mercado Libre</h2>
            <p>{mlConnected ? `Cuenta conectada · ID ${mlUserId}` : 'Conectá tu cuenta para publicar productos'}</p>
          </div>
        </div>
        {mlConnected && (
          <a href={`https://www.mercadolibre.com.ar/perfil/${mlUserId}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <ExternalLink size={14} /> Ver mi perfil en ML
          </a>
        )}
      </div>

      <div className="page-body fade-up">

        {/* No conectado */}
        {!mlConnected && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Conectá tu cuenta de Mercado Libre</h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Una vez conectada podés publicar productos directo desde el Stock de Genesys. Cuando se venden en ML, el stock se descuenta automáticamente.
            </p>
            <button className="btn btn-primary" disabled={connecting} onClick={handleConnect} style={{ fontSize: 15, padding: '12px 32px' }}>
              {connecting ? 'Redirigiendo...' : '🔗 Conectar con Mercado Libre'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
              Te va a redirigir a ML para autorizar la conexión. Solo tarda un minuto.
            </p>
          </div>
        )}

        {/* Conectado */}
        {mlConnected && (
          <>
            {/* KPIs */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle size={16} /></div>
                <div className="stat-label">Publicaciones activas</div>
                <div className="stat-value" style={{ color: '#16a34a' }}>{publicados.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Package size={16} /></div>
                <div className="stat-label">Pausadas</div>
                <div className="stat-value" style={{ color: '#d97706' }}>{pausados.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}><ShoppingBag size={16} /></div>
                <div className="stat-label">Vendidas en ML</div>
                <div className="stat-value">{cerrados.length}</div>
              </div>
            </div>

            {/* Lista de publicaciones */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Mis publicaciones</h3>
                <a href="https://www.mercadolibre.com.ar/ventas" target="_blank" rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                  <ExternalLink size={12} /> Ver en ML
                </a>
              </div>

              {phones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
                  <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Sin publicaciones todavía</div>
                  <div style={{ fontSize: 12 }}>Publicá productos desde el Stock usando el botón ML en cada producto</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Estado ML</th>
                        <th>Precio</th>
                        <th>ID ML</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {phones.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.model}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.storage !== 'N/A' ? `${p.storage} · ` : ''}{p.color}</div>
                          </td>
                          <td>
                            <span className={`badge ${p.mlStatus === 'active' ? 'badge-green' : p.mlStatus === 'paused' ? 'badge-yellow' : 'badge-gray'}`}>
                              {p.mlStatus === 'active' ? 'Activa' : p.mlStatus === 'paused' ? 'Pausada' : 'Cerrada'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(p.salePrice)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace' }}>{p.mlItemId}</td>
                          <td>
                            {p.mlUrl && (
                              <a href={p.mlUrl} target="_blank" rel="noopener noreferrer"
                                className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Desconectar */}
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                ¿Querés desconectar tu cuenta? Contactanos por WhatsApp.
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

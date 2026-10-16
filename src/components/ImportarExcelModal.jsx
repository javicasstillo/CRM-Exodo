// src/components/ImportarExcelModal.jsx
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { phonesApi } from '../api';

const CAMPOS_GENESYS = [
  { key: 'model',        label: 'Modelo',           required: true  },
  { key: 'category',     label: 'Categoría',         required: false },
  { key: 'storage',      label: 'Almacenamiento',    required: false },
  { key: 'color',        label: 'Color',             required: false },
  { key: 'condition',    label: 'Condición',         required: false },
  { key: 'costPrice',    label: 'Precio de costo',   required: false },
  { key: 'salePrice',    label: 'Precio de venta',   required: false },
  { key: 'currency',     label: 'Moneda',            required: false },
  { key: 'imei',         label: 'IMEI',              required: false },
  { key: 'batteryHealth',label: 'Batería (%)',        required: false },
  { key: 'quantity',     label: 'Cantidad',          required: false },
  { key: 'notes',        label: 'Notas',             required: false },
  { key: 'imageUrl',     label: 'URL de foto',       required: false },
];

const IGNORAR = '-- Ignorar columna --';

export default function ImportarExcelModal({ onClose, onImportado }) {
  const toast = useToast();
  const fileRef = useRef();
  const [paso, setPaso] = useState(1); // 1: subir, 2: mapear, 3: preview, 4: éxito
  const [columnas, setColumnas] = useState([]);
  const [filas, setFilas] = useState([]);
  const [mapeo, setMapeo] = useState({});
  const [importando, setImportando] = useState(false);
  const [importados, setImportados] = useState(0);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          toast('El Excel no tiene datos suficientes', 'error');
          return;
        }

        const cols = data[0].map(c => String(c).trim());
        const rows = data.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

        setColumnas(cols);
        setFilas(rows);

        // Auto-mapeo inteligente
        const autoMapeo = {};
        cols.forEach(col => {
          const colLower = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          CAMPOS_GENESYS.forEach(campo => {
            const campoLower = campo.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const keyLower = campo.key.toLowerCase();
            if (
              colLower.includes(campoLower) ||
              campoLower.includes(colLower) ||
              colLower.includes(keyLower) ||
              colLower === 'modelo' && campo.key === 'model' ||
              colLower === 'precio' && campo.key === 'salePrice' ||
              colLower === 'precio venta' && campo.key === 'salePrice' ||
              colLower === 'precio de venta' && campo.key === 'salePrice' ||
              colLower === 'costo' && campo.key === 'costPrice' ||
              colLower === 'precio costo' && campo.key === 'costPrice' ||
              colLower === 'precio de costo' && campo.key === 'costPrice' ||
              colLower === 'stock' && campo.key === 'quantity' ||
              colLower === 'cantidad' && campo.key === 'quantity' ||
              colLower === 'bateria' && campo.key === 'batteryHealth' ||
              colLower === 'almacenamiento' && campo.key === 'storage' ||
              colLower === 'capacidad' && campo.key === 'storage' ||
              colLower === 'condicion' && campo.key === 'condition' ||
              colLower === 'estado' && campo.key === 'condition'
            ) {
              if (!autoMapeo[campo.key]) autoMapeo[campo.key] = col;
            }
          });
        });

        setMapeo(autoMapeo);
        setPaso(2);
      } catch (err) {
        toast('Error al leer el Excel. Asegurate que sea un archivo .xlsx o .xls', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const getValor = (fila, campoKey) => {
    const col = mapeo[campoKey];
    if (!col) return '';
    const idx = columnas.indexOf(col);
    if (idx === -1) return '';
    return fila[idx] !== undefined ? String(fila[idx]).trim() : '';
  };

  const preview = filas.slice(0, 5).map(fila => ({
    model:         getValor(fila, 'model') || '—',
    category:      getValor(fila, 'category') || 'Otro',
    storage:       getValor(fila, 'storage') || 'N/A',
    color:         getValor(fila, 'color') || '—',
    condition:     getValor(fila, 'condition') || 'Bueno',
    costPrice:     getValor(fila, 'costPrice') || '',
    salePrice:     getValor(fila, 'salePrice') || '',
    currency:      getValor(fila, 'currency') || 'ARS',
    imei:          getValor(fila, 'imei') || '',
    batteryHealth: getValor(fila, 'batteryHealth') || '',
    quantity:      getValor(fila, 'quantity') || '1',
    notes:         getValor(fila, 'notes') || '',
  }));

  const handleImportar = async () => {
    if (!mapeo.model) {
      toast('Tenés que mapear al menos el campo Modelo', 'warning');
      return;
    }
    setImportando(true);
    let count = 0;
    try {
      for (const fila of filas) {
        const model = getValor(fila, 'model');
        if (!model) continue;

        await phonesApi.add({
          model,
          category:      getValor(fila, 'category') || 'Otro',
          storage:       getValor(fila, 'storage') || 'N/A',
          color:         getValor(fila, 'color') || '',
          condition:     getValor(fila, 'condition') || 'Bueno',
          costPrice:     getValor(fila, 'costPrice') || '',
          salePrice:     getValor(fila, 'salePrice') || '',
          currency:      getValor(fila, 'currency') || 'ARS',
          imei:          getValor(fila, 'imei') || '',
          batteryHealth: getValor(fila, 'batteryHealth') || '',
          quantity:      Number(getValor(fila, 'quantity')) || 1,
          notes:         getValor(fila, 'notes') || '',
          status:        'disponible',
          photo:          getValor(fila, 'imageUrl') || null,
        });
        count++;
      }
      setImportados(count);
      setPaso(4);
      onImportado?.();
    } catch (e) {
      toast('Error al importar: ' + e.message, 'error');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: paso === 2 ? 700 : 560 }}>
        <div className="modal-header">
          <h3>Importar stock desde Excel</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">

          {/* ── Paso 1: Subir archivo ── */}
          {paso === 1 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Subí tu archivo Excel</div>
              <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
                Genesys va a leer las columnas de tu Excel y te va a pedir que confirmes qué corresponde a cada campo.
              </p>
              <button className="btn btn-primary" onClick={() => fileRef.current.click()} style={{ padding: '12px 32px', fontSize: 15 }}>
                <Upload size={16} style={{ marginRight: 8 }} /> Elegir archivo Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>Formatos aceptados: .xlsx, .xls</p>
            </div>
          )}

          {/* ── Paso 2: Mapeo de columnas ── */}
          {paso === 2 && (
            <>
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>
                Se encontraron <strong>{columnas.length} columnas</strong> y <strong>{filas.length} productos</strong> en tu Excel.
                Indicá qué columna corresponde a cada campo de Genesys.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {CAMPOS_GENESYS.map(campo => (
                  <div key={campo.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {campo.label} {campo.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <select
                      className="form-input"
                      value={mapeo[campo.key] || ''}
                      onChange={e => setMapeo(m => ({ ...m, [campo.key]: e.target.value || undefined }))}
                      style={{ fontSize: 13 }}>
                      <option value="">{IGNORAR}</option>
                      {columnas.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!mapeo.model && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#d97706' }}>
                  <AlertTriangle size={14} /> El campo Modelo es obligatorio para importar
                </div>
              )}
            </>
          )}

          {/* ── Paso 3: Preview ── */}
          {paso === 3 && (
            <>
              <div style={{ marginBottom: 14, fontSize: 14, color: 'var(--text2)' }}>
                Así van a quedar los primeros 5 productos. Si está bien apretá <strong>Importar todo</strong>.
              </div>
              <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Color</th>
                      <th>Storage</th>
                      <th>Condición</th>
                      <th>Precio venta</th>
                      <th>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{p.model}</td>
                        <td>{p.color}</td>
                        <td>{p.storage}</td>
                        <td>{p.condition}</td>
                        <td>{p.salePrice || '—'}</td>
                        <td>{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text3)' }}>
                Se van a importar <strong>{filas.length} productos</strong> en total.
              </div>
            </>
          )}

          {/* ── Paso 4: Éxito ── */}
          {paso === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={28} color="#16a34a" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¡Importación completada!</div>
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>
                Se importaron <strong>{importados} productos</strong> correctamente al stock.
              </div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          {paso === 1 && (
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          )}
          {paso === 2 && (
            <>
              <button className="btn btn-secondary" onClick={() => setPaso(1)}>← Volver</button>
              <button className="btn btn-primary" disabled={!mapeo.model} onClick={() => setPaso(3)}>
                Ver preview <ArrowRight size={14} style={{ marginLeft: 6 }} />
              </button>
            </>
          )}
          {paso === 3 && (
            <>
              <button className="btn btn-secondary" onClick={() => setPaso(2)}>← Editar mapeo</button>
              <button className="btn btn-primary" disabled={importando} onClick={handleImportar}>
                {importando ? 'Importando...' : `Importar ${filas.length} productos`}
              </button>
            </>
          )}
          {paso === 4 && (
            <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}

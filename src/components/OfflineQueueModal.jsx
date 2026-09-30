import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, X, Trash2, Droplet, Wind, MapPin, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { getAllPendingRecords, deleteOfflineRecord, syncAllOfflineData } from '../lib/offlineManager';
import './OfflineQueueModal.css';

const OfflineQueueModal = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState([]);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadRecords = () => {
    setRecords(getAllPendingRecords());
  };

  useEffect(() => {
    if (!isOpen) return;

    loadRecords();

    const handleUpdate = () => loadRecords();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncFinish = () => {
      setIsSyncing(false);
      loadRecords();
    };

    window.addEventListener('offline-queue-updated', handleUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-started', handleSyncStart);
    window.addEventListener('offline-sync-finished', handleSyncFinish);

    return () => {
      window.removeEventListener('offline-queue-updated', handleUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-started', handleSyncStart);
      window.removeEventListener('offline-sync-finished', handleSyncFinish);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (item) => {
    const desc = item.descripcion || item.tipo_tratamiento || item.numero_aviso || 'este registro';
    if (window.confirm(`¿Seguro que quieres eliminar de la memoria del móvil "${desc}" de ${item.cliente_nombre || 'Cliente'}?`)) {
      deleteOfflineRecord(item._queueType, item.id || item._offlineId);
      loadRecords();
    }
  };

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      window.__toast?.error("⚠️ Aún no tienes cobertura de Internet. En cuanto recuperes señal se sincronizará automáticamente.");
      return;
    }
    if (isSyncing) return;
    setIsSyncing(true);
    await syncAllOfflineData();
    setIsSyncing(false);
    loadRecords();
  };

  return (
    <div className="offline-modal-overlay" onClick={onClose}>
      <div className="offline-modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="offline-modal-header">
          <div className="offline-modal-header-left">
            <div className="offline-header-icon-box">
              <Smartphone size={22} color="#0284c7" />
            </div>
            <div>
              <h3>Registros en este Móvil</h3>
              <p className="offline-modal-subtitle">
                {records.length === 0 
                  ? 'Todo sincronizado con la nube'
                  : `${records.length} registro${records.length > 1 ? 's' : ''} pendiente${records.length > 1 ? 's' : ''} de subir`
                }
              </p>
            </div>
          </div>
          <button type="button" className="offline-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Status bar */}
        <div className={`offline-status-bar ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? (
            <>
              <Wifi size={16} color="#16a34a" />
              <span><strong>Con cobertura:</strong> Listo para sincronizar con la nube de Agendapp.</span>
            </>
          ) : (
            <>
              <WifiOff size={16} color="#b45309" />
              <span><strong>Sin cobertura:</strong> Los datos están a salvo aquí. Se subirán en cuanto vuelvas a tener señal.</span>
            </>
          )}
        </div>

        {/* Content / List */}
        <div className="offline-records-list">
          {records.length === 0 ? (
            <div className="offline-empty-state">
              <CheckCircle2 size={44} color="#16a34a" />
              <h4>¡Memoria del móvil al día!</h4>
              <p>No tienes muestras ni avisos pendientes de subir. Todos tus datos ya están seguros en la nube.</p>
            </div>
          ) : (
            records.map((item, idx) => {
              const isMuestra = item._queueType === 'muestra';
              const isTrat = item._queueType === 'tratamiento';
              const isAviso = item._queueType === 'aviso';

              return (
                <div key={item.id || item._offlineId || idx} className="offline-record-item">
                  <div className="offline-item-top">
                    <div className="offline-item-badges">
                      {isMuestra && (
                        <span className="offline-type-badge muestra">
                          <Droplet size={12} /> Muestra {item.tipo_muestra || 'Estándar'}
                        </span>
                      )}
                      {isTrat && (
                        <span className="offline-type-badge tratamiento">
                          <Wind size={12} /> {item.tipo_tratamiento || 'Tratamiento'}
                        </span>
                      )}
                      {isAviso && (
                        <span className="offline-type-badge aviso">
                          <MapPin size={12} /> Aviso #{item.numero_aviso || ''}
                        </span>
                      )}

                      {item.cod_envase && (
                        <span className="offline-envase-pill">
                          Envase #{item.cod_envase}
                        </span>
                      )}
                    </div>

                    <button 
                      type="button" 
                      className="offline-item-delete-btn"
                      onClick={() => handleDelete(item)}
                      title="Descartar este registro del móvil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="offline-item-client">
                    {item.cliente_nombre || 'Cliente sin nombre'}
                  </div>

                  {item.descripcion && (
                    <div className="offline-item-desc">
                      📍 {item.descripcion}
                    </div>
                  )}

                  <div className="offline-item-footer">
                    <span className="offline-item-time">
                      🕒 {item.fecha} {item.hora ? `· ${item.hora}` : ''}
                    </span>
                    <span className="offline-item-safe-tag">
                      ✓ Guardado seguro
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="offline-modal-footer">
          <button 
            type="button" 
            className="offline-btn-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>

          {records.length > 0 && (
            <button 
              type="button" 
              className="offline-btn-primary"
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? 'spin-icon' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Subir a la nube ahora'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineQueueModal;

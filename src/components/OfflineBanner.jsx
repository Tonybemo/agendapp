import React, { useState, useEffect } from 'react';
import { WifiOff, CloudUpload, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { getPendingOfflineCount, syncAllOfflineData } from '../lib/offlineManager';
import './OfflineBanner.css';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(() => getPendingOfflineCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync on regaining connection
      syncAllOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    const updatePending = () => {
      const count = getPendingOfflineCount();
      setPendingCount(count);
    };

    const handleSyncStarted = () => setIsSyncing(true);
    const handleSyncFinished = () => {
      setIsSyncing(false);
      const remaining = getPendingOfflineCount();
      setPendingCount(remaining);
      if (remaining === 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3500);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', updatePending);
    window.addEventListener('offline-sync-started', handleSyncStarted);
    window.addEventListener('offline-sync-finished', handleSyncFinished);

    // Periodic check every 15s
    const interval = setInterval(() => {
      updatePending();
      if (navigator.onLine && getPendingOfflineCount() > 0) {
        syncAllOfflineData();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', updatePending);
      window.removeEventListener('offline-sync-started', handleSyncStarted);
      window.removeEventListener('offline-sync-finished', handleSyncFinished);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = (e) => {
    e.stopPropagation();
    if (isSyncing) return;
    syncAllOfflineData();
  };

  // Don't render anything if everything is online and no items pending
  if (isOnline && pendingCount === 0 && !showSuccess && !isSyncing) {
    return null;
  }

  return (
    <div className={`offline-floating-banner animate-fade-in ${!isOnline ? 'is-offline' : ''} ${showSuccess ? 'is-success' : ''}`}>
      <div className="offline-banner-content">
        {!isOnline ? (
          <>
            <div className="offline-banner-left">
              <span className="offline-pulse-dot" />
              <WifiOff size={18} className="offline-icon" />
              <div className="offline-banner-texts">
                <strong>Sin cobertura (Modo Fuera de Línea)</strong>
                <span>
                  {pendingCount > 0 
                    ? `${pendingCount} registro${pendingCount > 1 ? 's' : ''} a salvo en este móvil` 
                    : 'Tus registros se guardarán en el móvil y se subirán al volver a tener señal'}
                </span>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="offline-badge-count">
                <Smartphone size={13} /> {pendingCount}
              </span>
            )}
          </>
        ) : showSuccess ? (
          <div className="offline-banner-left success-mode">
            <CheckCircle2 size={18} color="#ffffff" />
            <span>¡Todo sincronizado con la nube con éxito!</span>
          </div>
        ) : isSyncing ? (
          <div className="offline-banner-left syncing-mode">
            <RefreshCw size={18} className="spin-icon" color="#ffffff" />
            <span>Subiendo {pendingCount} registro{pendingCount > 1 ? 's' : ''} a la nube...</span>
          </div>
        ) : (
          <>
            <div className="offline-banner-left">
              <CloudUpload size={18} className="offline-icon-upload" />
              <div className="offline-banner-texts">
                <strong>{pendingCount} registro{pendingCount > 1 ? 's' : ''} guardado{pendingCount > 1 ? 's' : ''} en el móvil</strong>
                <span>Cobertura recuperada. Listo para sincronizar con la nube.</span>
              </div>
            </div>
            <button 
              type="button" 
              className="offline-sync-btn"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              <RefreshCw size={14} className={isSyncing ? 'spin-icon' : ''} />
              <span>Subir ahora</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;

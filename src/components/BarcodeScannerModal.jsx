import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, Camera, Image, ExternalLink, Copy, Check, AlertCircle, RefreshCw, ZoomIn } from 'lucide-react';
import './BarcodeScannerModal.css';

// Formatos específicos para frascos de laboratorio (Conycal, etc.): Code 128 (1D), QR y EAN-13.
// EXCLUIMOS deliberadamente ITF y Codabar que generan falsos positivos numéricos con sombras o desenfoque.
const BOTTLE_SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.DATA_MATRIX
].filter(Boolean);

// Formatos generales para enlaces, hojas de cálculo, tickets
const GENERAL_SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.CODE_39
].filter(Boolean);

// Helper para seleccionar la mejor cámara trasera con autofoco (evitando ultra-wide con foco fijo en Samsung)
const pickBestCamera = (devices) => {
  if (!devices || devices.length === 0) return null;
  // 1. Filtrar sólo cámaras traseras
  const back = devices.filter(d => !/front|delantera|user|selfie|face|1,\s*facing/i.test(d.label || ''));
  const pool = back.length > 0 ? back : devices;
  // 2. Descartar lentes ultra-wide / gran angular (tienen enfoque fijo al infinito en Samsung A16)
  const nonUltra = pool.filter(d => !/wide|gran\s*angular|ultra|depth/i.test(d.label || ''));
  const preferred = nonUltra.length > 0 ? nonUltra : pool;
  // 3. Buscar la cámara principal 0 o "back"
  const main = preferred.find(d => /0.*back|main|principal/i.test(d.label || '')) || preferred[0];
  return main.id;
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código',
  mode = 'general' // 'bottle' | 'general'
}) {
  const [cameraError, setCameraError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3 });
  const [focusRing, setFocusRing] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scannedResult, setScannedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const playFeedback = () => {
    // 1. Vibración háptica
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(80);
      }
    } catch (e) {}

    // 2. Beep acústico agradable
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      }
    } catch (e) {}
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error parando escáner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
    setFocusRing(null);
  };

  const handleScanSuccess = (decodedText) => {
    if (!decodedText || !decodedText.trim()) return;
    let cleanText = decodedText.trim().replace(/[\r\n\t]/g, '').trim();

    if (mode === 'bottle') {
      // Ignorar lecturas espurias de menos de 4 caracteres
      if (cleanText.length < 4) return;

      // Limpiar sufijo de frasco/fracción de laboratorio (ej. "1982889_6" -> "1982889")
      cleanText = cleanText.replace(/_[0-9]+$/, '').trim();
    }

    playFeedback();

    if (mode === 'bottle') {
      // En modo frasco, autocompleta inmediatamente y cierra
      stopScanner().then(() => {
        onScan && onScan(cleanText);
        onClose && onClose();
      });
    } else {
      // En modo general, muestra el resultado para decidir (abrir link, copiar, etc.)
      setScannedResult(cleanText);
      stopScanner();
    }
  };

  const startScanner = async (cameraIdToUse = null) => {
    try {
      setCameraError(null);
      await stopScanner();

      const formats = mode === 'bottle' ? BOTTLE_SUPPORTED_FORMATS : GENERAL_SUPPORTED_FORMATS;
      const html5QrCode = new Html5Qrcode('barcode-reader-viewport', {
        formatsToSupport: formats,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // Obtener cámaras y elegir la mejor trasera con autofoco
      let targetCameraId = cameraIdToUse;
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (!targetCameraId) {
            targetCameraId = pickBestCamera(devices);
          }
        }
      } catch (e) {}

      if (targetCameraId) {
        setSelectedCameraId(targetCameraId);
      }

      // Configuración de escaneo optimizada en alta definición (1080p ideal) para enfocar códigos finos
      const config = {
        fps: 25,
        videoConstraints: targetCameraId
          ? {
              deviceId: { exact: targetCameraId },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          : {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Ventana rectangular horizontal amplia para abarcar el código cómodamente
          const width = Math.min(Math.round(viewfinderWidth * 0.92), 380);
          const height = Math.min(Math.round(viewfinderHeight * 0.7), 240);
          return { width, height };
        }
      };

      const cameraSource = targetCameraId ? targetCameraId : { facingMode: 'environment' };

      try {
        await html5QrCode.start(
          cameraSource,
          config,
          (decodedText) => handleScanSuccess(decodedText),
          () => {} // Ignorar frames sin código
        );
      } catch (firstErr) {
        console.warn('Primer intento de inicio de cámara falló, probando fallback estándar:', firstErr);
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 20 },
          (decodedText) => handleScanSuccess(decodedText),
          () => {}
        );
      }

      setIsScanning(true);

      // Comprobar soporte de linterna, zoom y foco continuo en la cámara activa
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities?.() || {};
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
        if (capabilities?.zoom) {
          setZoomSupported(true);
          setZoomRange({
            min: capabilities.zoom.min || 1,
            max: capabilities.zoom.max || 4
          });
        }
        // Activar autofocus continuo en el sensor
        if (capabilities?.focusMode && capabilities.focusMode.includes('continuous')) {
          await html5QrCode.applyVideoConstraints({
            advanced: [{ focusMode: 'continuous' }]
          });
        }
      } catch (e) {
        console.warn('Configuración avanzada de track de cámara:', e);
      }
    } catch (err) {
      console.error('Error iniciando cámara:', err);
      let msg = 'No se pudo acceder a la cámara.';
      const errStr = String(err?.message || err?.name || err).toLowerCase();
      if (err?.name === 'NotAllowedError' || errStr.includes('permission') || errStr.includes('denied') || errStr.includes('permiso')) {
        msg = 'Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes del navegador (o en el candado 🔒 de la barra de direcciones).';
      } else if (err?.name === 'NotFoundError' || errStr.includes('not found')) {
        msg = 'No se encontró ninguna cámara disponible en tu dispositivo.';
      } else if (err?.name === 'NotReadableError' || errStr.includes('in use') || errStr.includes('en uso')) {
        msg = 'La cámara está siendo usada por otra app. Ciérrala y pulsa Reintentar.';
      } else {
        msg = 'No se pudo abrir la cámara. Revisa los permisos de tu navegador o escribe el código en el cajetín de abajo.';
      }
      setCameraError(msg);
      setIsScanning(false);
    }
  };

  const handleTapToFocus = async (e) => {
    if (!scannerRef.current || !isScanning) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusRing({ x, y });
    setTimeout(() => setFocusRing(null), 900);

    try {
      const capabilities = scannerRef.current.getRunningTrackCapabilities?.() || {};
      if (capabilities?.focusMode && capabilities.focusMode.includes('continuous')) {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ focusMode: 'continuous' }]
        });
      }
    } catch (err) {}
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  const toggleZoom = async () => {
    if (!scannerRef.current || !zoomSupported) return;
    try {
      const maxZ = zoomRange.max || 3;
      let nextZoom = currentZoom === 1 ? 2 : currentZoom === 2 ? (maxZ >= 3 ? 3 : 1) : 1;
      if (nextZoom > maxZ) nextZoom = 1;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ zoom: nextZoom }]
      });
      setCurrentZoom(nextZoom);
    } catch (e) {
      console.warn('Error alternando zoom:', e);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await startScanner(nextCamera.id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setCameraError(null);
      await stopScanner();

      const formats = mode === 'bottle' ? BOTTLE_SUPPORTED_FORMATS : GENERAL_SUPPORTED_FORMATS;
      const html5QrCode = new Html5Qrcode('barcode-reader-viewport', {
        formatsToSupport: formats,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      scannerRef.current = html5QrCode;

      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      setCameraError('No se detectó ningún código de barras o QR en la imagen seleccionada.');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = (str) => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://');
  };

  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setCameraError(null);
      // Pequeño retardo para asegurar que el elemento DOM del modal está listo
      const t = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="bs-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="bs-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bs-modal-header">
          <div className="bs-modal-title-group">
            <h3>{title}</h3>
            <span className="bs-modal-subtitle">
              {mode === 'bottle'
                ? 'Apunta al código del frasco de laboratorio'
                : 'Escanea códigos de barras o QR (Google Sheets, Forms...)'}
            </span>
          </div>
          <button type="button" className="bs-close-btn" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Body Viewport */}
        <div className="bs-viewport-wrapper" onClick={handleTapToFocus} style={{ cursor: 'pointer' }}>
          {/* Animated Tap-to-Focus Reticle */}
          {focusRing && (
            <div
              className="bs-focus-ring"
              style={{ left: `${focusRing.x}px`, top: `${focusRing.y}px` }}
            />
          )}

          {/* Target Scanning Laser Line Overlay */}
          {!scannedResult && !cameraError && (
            <div className="bs-scan-overlay">
              <div className="bs-target-box">
                <div className="bs-laser-line"></div>
                <div className="bs-corner top-left"></div>
                <div className="bs-corner top-right"></div>
                <div className="bs-corner bottom-left"></div>
                <div className="bs-corner bottom-right"></div>
              </div>
              <p className="bs-aim-hint">
                {mode === 'bottle'
                  ? 'Mantén a 15-20 cm · Toca para enfocar · Usa 2x Zoom si está cerca'
                  : 'Centra el código · Toca la pantalla para enfocar'}
              </p>
            </div>
          )}

          {/* html5-qrcode mount point */}
          <div id="barcode-reader-viewport" className="bs-camera-mount"></div>

          {/* Camera Error / Permission Banner */}
          {cameraError && (
            <div className="bs-error-banner" onClick={(e) => e.stopPropagation()}>
              <AlertCircle size={28} color="#ef4444" />
              <p>{cameraError}</p>
              <button
                type="button"
                className="bs-btn-retry"
                onClick={() => startScanner(selectedCameraId)}
              >
                <RefreshCw size={14} /> Reintentar cámara
              </button>
            </div>
          )}
        </div>

        {/* Floating Quick Action Controls (Torch, Zoom, Switch Camera, Gallery Photo) */}
        {!scannedResult && (
          <div className="bs-controls-bar">
            {torchSupported && (
              <button
                type="button"
                className={`bs-ctrl-btn ${torchOn ? 'active' : ''}`}
                onClick={toggleTorch}
                title={torchOn ? 'Apagar linterna' : 'Encender linterna'}
              >
                <Flashlight size={18} />
                <span>{torchOn ? 'Luz ON' : 'Linterna'}</span>
              </button>
            )}

            {zoomSupported && (
              <button
                type="button"
                className={`bs-ctrl-btn ${currentZoom > 1 ? 'active' : ''}`}
                onClick={toggleZoom}
                title={`Zoom actual ${currentZoom}x. Pulsa para cambiar`}
              >
                <ZoomIn size={18} />
                <span>{currentZoom}x Zoom</span>
              </button>
            )}

            {cameras.length > 1 && (
              <button
                type="button"
                className="bs-ctrl-btn"
                onClick={switchCamera}
                title="Cambiar lente de la cámara trasera"
              >
                <Camera size={18} />
                <span>Lente ({Math.max(1, cameras.findIndex((c) => c.id === selectedCameraId) + 1)}/{cameras.length})</span>
              </button>
            )}

            <button
              type="button"
              className="bs-ctrl-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Seleccionar foto de la galería"
            >
              <Image size={18} />
              <span>Galería</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Manual Code Input Fallback */}
        {!scannedResult && (
          <div className="bs-manual-bar">
            <input 
              type="text"
              className="bs-manual-input"
              placeholder="O teclea el código (ej. 2626376)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  handleScanSuccess(manualCode.trim());
                }
              }}
            />
            <button
              type="button"
              className="bs-manual-btn"
              disabled={!manualCode.trim()}
              onClick={() => manualCode.trim() && handleScanSuccess(manualCode.trim())}
            >
              Usar
            </button>
          </div>
        )}

        {/* Scanned Result Card (General Mode) */}
        {scannedResult && (
          <div className="bs-result-card animate-fade-in">
            <div className="bs-result-badge">
              <Check size={16} /> {isUrl(scannedResult) ? 'Enlace detectado' : 'Código detectado'}
            </div>

            <div className="bs-result-content">
              <span className="bs-result-text">{scannedResult}</span>
            </div>

            <div className="bs-result-actions">
              {isUrl(scannedResult) ? (
                <a
                  href={scannedResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bs-btn-primary"
                  onClick={onClose}
                >
                  <ExternalLink size={16} /> Abrir enlace
                </a>
              ) : (
                onScan && (
                  <button
                    type="button"
                    className="bs-btn-primary"
                    onClick={() => {
                      onScan(scannedResult);
                      onClose();
                    }}
                  >
                    <Check size={16} /> Usar este código
                  </button>
                )
              )}

              <button
                type="button"
                className="bs-btn-secondary"
                onClick={() => handleCopy(scannedResult)}
              >
                {copied ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>

              <button
                type="button"
                className="bs-btn-outline"
                onClick={() => {
                  setScannedResult(null);
                  startScanner(selectedCameraId);
                }}
              >
                <RefreshCw size={15} /> Escanear otro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, Camera, Image, ExternalLink, Copy, Check, AlertCircle, RefreshCw, ZoomIn } from 'lucide-react';
import './BarcodeScannerModal.css';

const ALL_SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417
].filter(Boolean);

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
  };

  const handleScanSuccess = (decodedText) => {
    if (!decodedText || !decodedText.trim()) return;
    const cleanText = decodedText.trim();

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

      const html5QrCode = new Html5Qrcode('barcode-reader-viewport', {
        formatsToSupport: ALL_SUPPORTED_FORMATS,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // Obtener cámaras disponibles si aún no las tenemos
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch (e) {}

      // Configuración de escaneo optimizada para frascos, etiquetas de laboratorio y códigos 1D/2D
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Ventana rectangular horizontal que abarca el código cómodamente
          const width = Math.min(Math.round(viewfinderWidth * 0.88), 350);
          const height = Math.min(Math.round(viewfinderHeight * 0.65), 200);
          return { width, height };
        },
        aspectRatio: 1.3333
      };

      // Intentar primero con facingMode environment estándar (sin min/max de resolución que puedan fallar en móvil)
      let cameraSource = cameraIdToUse || { facingMode: 'environment' };

      try {
        await html5QrCode.start(
          cameraSource,
          config,
          (decodedText) => handleScanSuccess(decodedText),
          () => {} // Ignorar frames intermedios
        );
      } catch (firstErr) {
        console.warn('Primer intento de cámara con facingMode falló, probando con listado de dispositivos:', firstErr);
        // Fallback: obtener lista de cámaras y seleccionar la trasera
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d => 
            /back|trasera|environment|rear|0/i.test(d.label || '')
          ) || devices[0];
          setSelectedCameraId(backCam.id);
          await html5QrCode.start(
            backCam.id,
            config,
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
          );
        } else {
          // Último recurso: cámara por defecto
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
          );
        }
      }

      setIsScanning(true);

      // Cargar lista de cámaras disponibles si no las tenemos para el botón "Cambiar"
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch (e) {}

      // Comprobar soporte de linterna y zoom óptico/digital en la cámara
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
        if (capabilities && capabilities.zoom) {
          setZoomSupported(true);
        }
      } catch (e) {}
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
      const nextZoom = currentZoom === 1 ? 2 : currentZoom === 2 ? 3 : 1;
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

      const html5QrCode = new Html5Qrcode('barcode-reader-viewport', {
        formatsToSupport: ALL_SUPPORTED_FORMATS,
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
        <div className="bs-viewport-wrapper">
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
                Centra el código · Mantén a 15-20 cm o usa Zoom si está cerca
              </p>
            </div>
          )}

          {/* html5-qrcode mount point */}
          <div id="barcode-reader-viewport" className="bs-camera-mount"></div>

          {/* Camera Error / Permission Banner */}
          {cameraError && (
            <div className="bs-error-banner">
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
                title={`Zoom actual ${currentZoom}x. Pulsa para alternar`}
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
                title="Cambiar cámara"
              >
                <Camera size={18} />
                <span>Cambiar</span>
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

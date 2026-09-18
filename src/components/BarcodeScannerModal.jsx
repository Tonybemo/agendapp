import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, Camera, Image, ExternalLink, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import './BarcodeScannerModal.css';

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
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scannedResult, setScannedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

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
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
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

      // Configuración de escaneo optimizada para frascos y códigos 1D horizontales
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Ventana rectangular horizontal perfecta para códigos de barras de frascos y QR
          const width = Math.min(viewfinderWidth * 0.85, 320);
          const height = Math.min(viewfinderHeight * 0.65, 220);
          return { width: Math.round(width), height: Math.round(height) };
        },
        aspectRatio: 1.3333
      };

      const cameraSource = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraSource,
        config,
        (decodedText) => handleScanSuccess(decodedText),
        () => {} // Ignorar errores de frame sin código
      );

      setIsScanning(true);

      // Comprobar soporte de linterna / flash
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
      } catch (e) {}
    } catch (err) {
      console.error('Error iniciando cámara:', err);
      let msg = 'No se pudo acceder a la cámara.';
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
        msg = 'Permiso de cámara denegado. Concede permiso en los ajustes de tu navegador para escanear.';
      } else if (err?.name === 'NotFoundError') {
        msg = 'No se encontró ninguna cámara disponible en tu dispositivo.';
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
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF
        ]
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
              <p className="bs-aim-hint">Centra el código dentro del recuadro</p>
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

        {/* Floating Quick Action Controls (Torch, Switch Camera, Gallery Photo) */}
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
                <span>{torchOn ? 'Linterna ON' : 'Linterna'}</span>
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

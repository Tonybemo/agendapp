import React, { useState, useMemo } from 'react';
import { 
  Calculator, Droplet, ShieldAlert, Bug, FileText, 
  CheckCircle2, AlertTriangle, XCircle, Info, ArrowRight, 
  FlaskConical, Scale, Thermometer, Waves, Building2, Search,
  Sliders, Zap, HelpCircle, ChevronRight, X, Sparkles
} from 'lucide-react';

import './Calculadora.css';

// ── Datos Normativos RD 487/2022 (Captura 2) ─────────────────────────
const NORMATIVA_DATA = [
  // 1. Sistemas de Agua Sanitaria (ACS / AFCH)
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'Cloro Libre Residual (AFCH)',
    rangoNormal: '0.20 - 1.00 mg/L',
    limiteCritico: '< 0.20 mg/L (Riesgo colonización) / > 2.00 mg/L (Potabilidad / Corrosión)',
    cierreProhibicion: 'Sí, si supera 5.00 mg/L (Cierre de suministro)',
    cierreFlag: true,
    accionBajo: 'Revisar sistema de dosificación. Incrementar dosificación de hipoclorito.',
    accionAlto: 'Disminuir dosificación. Realizar purgas para favorecer renovación de agua.',
    frecuencia: 'Diario (rotatorio en grifos terminales)'
  },
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'Temperatura ACS (Acumulador)',
    rangoNormal: '≥ 60 ºC continuo',
    limiteCritico: '< 60 ºC (Permite proliferación bacteriana en el depósito)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'Revisar caldera / intercambiador. Elevar consigna de calefacción.',
    accionAlto: 'Reducir consigna (evitar > 70 ºC en grifos sin mezclar por riesgo de quemaduras).',
    frecuencia: 'Diario (en acumulador)'
  },
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'Temperatura ACS (Puntos terminales)',
    rangoNormal: '≥ 50 ºC (Hospitales: ≥ 55 ºC) en menos de 1 minuto',
    limiteCritico: '< 50 ºC (Punto de riesgo directo en duchas)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'Purgar grifos poco usados. Revisar bomba de recirculación. Equilibrar hidráulicamente la red.',
    accionAlto: 'No aplica (si supera 70 ºC ajustar válvulas mezcladoras termostáticas).',
    frecuencia: 'Mensual (rotatorio)'
  },
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'Temperatura AFCH (Agua Fría)',
    rangoNormal: 'Preferiblemente < 20 ºC',
    limiteCritico: '> 20 ºC (Estímulo de multiplicación bacteriana)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica.',
    accionAlto: 'Purgar tramos estancados. Aislar conducciones de focos calientes. Verificar depósitos expuestos al sol.',
    frecuencia: 'Diario (rotatorio)'
  },
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'pH',
    rangoNormal: '6.5 - 9.5',
    limiteCritico: '< 6.5 (Corrosión ácida) / > 8.5 (El cloro pierde > 90% de su poder bactericida)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'Revisar regulador de pH. Dosificar incrementador alcalino.',
    accionAlto: 'Revisar regulador de pH. Dosificar minorador ácido.',
    frecuencia: 'Diario (rotatorio)'
  },
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'Turbidez',
    rangoNormal: '< 4.00 UNF',
    limiteCritico: '> 4.00 UNF (Las partículas suspensas protegen a la bacteria frente a biocidas)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica.',
    accionAlto: 'Limpieza de depósitos y filtros. Realizar purga de fondo para arrastrar sedimentos.',
    frecuencia: 'Semanal (en depósitos)'
  },
  {
    sistema: 'agua_sanitaria',
    sistemaLabel: 'Agua Sanitaria (ACS / AFCH)',
    parametro: 'Hierro Total',
    rangoNormal: '≤ 0.20 mg/L',
    limiteCritico: '> 0.20 mg/L (Actúa como nutriente esencial y multiplicador de Legionella)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica.',
    accionAlto: 'Dosificar secuestrantes de hierro / polifosfatos. Limpieza y desincrustación.',
    frecuencia: 'Mensual (si existen tramos o partes férreas)'
  },

  // 2. Torres de Refrigeración y Condensadores Evaporativos
  {
    sistema: 'torres',
    sistemaLabel: 'Torres de Refrigeración y Condensadores',
    parametro: 'Cloro Libre Residual',
    rangoNormal: '1.00 - 2.00 mg/L',
    limiteCritico: '< 1.00 mg/L (Falta de control microbiológico)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'Ajustar sistema de dosificación. Realizar hipercloración preventiva.',
    accionAlto: 'Reducir dosificación. Efectuar purga de fondo.',
    frecuencia: 'Diario (o monitorización continua)'
  },
  {
    sistema: 'torres',
    sistemaLabel: 'Torres de Refrigeración y Condensadores',
    parametro: 'pH',
    rangoNormal: '6.5 - 9.0 (Recomendado: 6.5 - 8.0)',
    limiteCritico: '< 6.5 (Corrosivo) / > 8.0 (Incrustaciones calcáreas y fuerte pérdida de eficacia del cloro)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'Dosificar corrector alcalino. Calcular Índice de Langelier.',
    accionAlto: 'Dosificar corrector ácido. Valorar cambio a bromo o biocida no oxidante.',
    frecuencia: 'Mensual'
  },
  {
    sistema: 'torres',
    sistemaLabel: 'Torres de Refrigeración y Condensadores',
    parametro: 'Turbidez',
    rangoNormal: '< 15.0 UNF',
    limiteCritico: '> 15.0 UNF (Favorece biofilm y reduce drásticamente la eficacia biocida)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica.',
    accionAlto: 'Efectuar purga de fondo. Limpiar balsa físicamente. Revisar sistema de filtración de arena.',
    frecuencia: 'Mensual'
  },
  {
    sistema: 'torres',
    sistemaLabel: 'Torres de Refrigeración y Condensadores',
    parametro: 'Hierro Total',
    rangoNormal: '< 2.00 mg/L',
    limiteCritico: '> 2.00 mg/L (Corrosión activa y nutrición bacteriana)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica.',
    accionAlto: 'Revisar dosificación de inhibidores de corrosión. Limpieza física de depósitos.',
    frecuencia: 'Mensual'
  },
  {
    sistema: 'torres',
    sistemaLabel: 'Torres de Refrigeración y Condensadores',
    parametro: 'Conductividad',
    rangoNormal: 'Estable según especificación del fabricante',
    limiteCritico: 'Incrustante si supera límites de sales disueltas del agua de aporte',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica (agua excesivamente agresiva si es extremadamente baja).',
    accionAlto: 'Automatizar la purga de fondo por conductividad. Incrementar agua de aporte.',
    frecuencia: 'Mensual'
  },
  {
    sistema: 'torres',
    sistemaLabel: 'Torres de Refrigeración y Condensadores',
    parametro: 'Aerobios Totales',
    rangoNormal: '< 10.000 UFC/ml',
    limiteCritico: '≥ 10.000 UFC/ml (Falta de control) / ≥ 100.000 UFC/ml (Riesgo inminente)',
    cierreProhibicion: 'No aplica',
    cierreFlag: false,
    accionBajo: 'No aplica.',
    accionAlto: 'Revisar dosis de biocida. Si es > 10.000: Muestrear Legionella. Si es > 100.000: Limpieza y desinfección de choque inmediata.',
    frecuencia: 'Mensual'
  },

  // 3. Spas, Jacuzzis y Vasos de Hidromasaje
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'Cloro Libre Residual',
    rangoNormal: '0.80 - 2.00 mg/L',
    limiteCritico: '0.00 mg/L (Sin desinfectante) / > 5.00 mg/L (Irritación severa de mucosas)',
    cierreProhibicion: 'Sí (Si es 0.00 mg/L o si supera 5.00 mg/L)',
    cierreFlag: true,
    accionBajo: 'Aumentar dosificación. Comprobar nivel de depósito y sondas dosificadoras.',
    accionAlto: 'Parar dosificación. Dosificar neutralizante (Tiosulfato). Diluir con agua limpia.',
    frecuencia: 'Diario (dos análisis diarios mínimos)'
  },
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'Cloro Combinado (Cloraminas)',
    rangoNormal: '≤ 0.60 mg/L',
    limiteCritico: '> 0.60 mg/L (Falta de renovación, olor picante, irritación ocular)',
    cierreProhibicion: 'Sí (Si supera 3.00 mg/L)',
    cierreFlag: true,
    accionBajo: 'No aplica.',
    accionAlto: 'Aumentar renovación de agua. Cloración de choque (punto de ruptura) sin bañistas.',
    frecuencia: 'Diario (dos análisis diarios)'
  },
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'pH',
    rangoNormal: '7.2 - 8.0',
    limiteCritico: '< 7.2 (Irritante, corrosivo) / > 8.0 (Precipitación calcárea, inactiva cloro)',
    cierreProhibicion: 'Sí (Si es < 6.0 o > 9.0)',
    cierreFlag: true,
    accionBajo: 'Dosificar incrementador de pH. Calibrar sonda de pH.',
    accionAlto: 'Dosificar reductor de pH (ácido). Calibrar sonda de pH.',
    frecuencia: 'Diario (dos análisis diarios)'
  },
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'Bromo Total',
    rangoNormal: '2.0 - 5.0 mg/L',
    limiteCritico: '< 2.0 mg/L (Falta de control) / > 10.0 mg/L (Exceso severo)',
    cierreProhibicion: 'Sí (Si supera 10.00 mg/L)',
    cierreFlag: true,
    accionBajo: 'Aumentar dosificación del bromo.',
    accionAlto: 'Parar dosificación. Diluir con agua de red.',
    frecuencia: 'Diario (dos análisis diarios)'
  },
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'Ácido Isocianúrico',
    rangoNormal: '≤ 75.0 mg/L',
    limiteCritico: '> 75.0 mg/L (Bloquea la acción desinfectante del cloro)',
    cierreProhibicion: 'Sí (Si supera 150.00 mg/L)',
    cierreFlag: true,
    accionBajo: 'No aplica.',
    accionAlto: 'Efectuar vaciado parcial del vaso y rellenar con agua de red limpia.',
    frecuencia: 'Mensual'
  },
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'Temperatura del Agua',
    rangoNormal: '24 - 30 ºC (Spas/Jacuzzis: > 36 ºC)',
    limiteCritico: '> 36 ºC (Vaso común) / > 40 ºC (Spas y Jacuzzis)',
    cierreProhibicion: 'Sí (Si supera 40.0 ºC)',
    cierreFlag: true,
    accionBajo: 'Ajustar termostato / intercambiador de calor.',
    accionAlto: 'Apagar sistema de calefacción. Renovar con agua fría.',
    frecuencia: 'Diario (dos análisis diarios)'
  },
  {
    sistema: 'spas',
    sistemaLabel: 'Spas, Jacuzzis y Vasos de Hidromasaje',
    parametro: 'Turbidez',
    rangoNormal: '≤ 5.0 UNF',
    limiteCritico: '> 5.0 UNF (Problemas de depuración / filtración)',
    cierreProhibicion: 'Sí (Si supera 20.0 UNF)',
    cierreFlag: true,
    accionBajo: 'No aplica.',
    accionAlto: 'Revisar filtro, realizar lavado a contracorriente. Dosificar floculante. Aumentar renovación.',
    frecuencia: 'Diario (dos análisis diarios)'
  }
];

const Calculadora = () => {
  const [activeTab, setActiveTab] = useState('hipoclorito');

  // ── ESTADO 1: Hipoclorito & pH ──────────────────────────────────────
  const [volumenAgua, setVolumenAgua] = useState(100); // en m3
  const [dosisCloro, setDosisCloro] = useState(5.0);   // en ppm (mg/L)
  const [riquezaLejia, setRiquezaLejia] = useState(150); // en g/L
  const [phAgua, setPhAgua] = useState(7.0);

  // Cálculo de dosis de hipoclorito
  const calculoHipoclorito = useMemo(() => {
    const v = parseFloat(volumenAgua) || 0;
    const c = parseFloat(dosisCloro) || 0;
    const r = parseFloat(riquezaLejia) || 1;
    const ph = parseFloat(phAgua) || 7.0;

    // Fórmula estándar: (V * C) / R
    const litrosTeoricos = (v * c) / r;

    // Factor de corrección según tabla de la Guía IDAE / Sanidad (Captura 1)
    let factor = 1.0;
    let eficacia = '100% (Óptimo)';
    let estado = 'optimo'; // 'optimo', 'bueno', 'insuficiente', 'muy_deficiente', 'ineficaz'
    let recomendacion = 'Acción biocida máxima. Rango óptimo teórico para desinfección.';

    if (ph <= 7.0) {
      factor = 1.0;
      eficacia = '100% (Óptimo)';
      estado = 'optimo';
      recomendacion = 'Acción biocida máxima. Rango óptimo teórico para desinfección.';
    } else if (ph <= 7.5) {
      const ratio = (ph - 7.0) / 0.5;
      factor = 1.0 + ratio * 0.5;
      eficacia = '65% (Bueno)';
      estado = 'bueno';
      recomendacion = 'Límite superior aconsejado para asegurar desinfección química eficaz.';
    } else if (ph <= 8.0) {
      const ratio = (ph - 7.5) / 0.5;
      factor = 1.5 + ratio * 1.7;
      eficacia = '30% (Insuficiente)';
      estado = 'insuficiente';
      recomendacion = 'Se requiere triplicar la dosis teórica de cloro para igualar la eficacia a pH 7.0.';
    } else if (ph <= 8.5) {
      const ratio = (ph - 8.0) / 0.5;
      factor = 3.2 + ratio * 5.2;
      eficacia = '12% (Muy deficiente)';
      estado = 'muy_deficiente';
      recomendacion = 'Eficacia extremadamente baja. Se debe dosificar ácido (reductor de pH) obligatoriamente.';
    } else {
      const ratio = Math.min(1.0, (ph - 8.5) / 0.5);
      factor = 8.4 + ratio * 16.9;
      eficacia = '< 4% (Ineficaz)';
      estado = 'ineficaz';
      recomendacion = 'El cloro libre prácticamente no desinfecta. Riesgo biológico extremo. Tratar pH con urgencia antes de clorar.';
    }

    const litrosCorregidos = litrosTeoricos * factor;

    return {
      litrosTeoricos: litrosTeoricos.toFixed(2),
      factor: factor.toFixed(1),
      litrosCorregidos: litrosCorregidos.toFixed(2),
      eficacia,
      estado,
      recomendacion
    };
  }, [volumenAgua, dosisCloro, riquezaLejia, phAgua]);

  // ── ESTADO 2: Neutralizante Tiosulfato Sódico 50% ──────────────────
  const [tipoNeutralizacion, setTipoNeutralizacion] = useState('cloro'); // 'cloro' | 'dioxido'
  const [ppmPresentes, setPpmPresentes] = useState(10.0);
  const [volumenNeutralizar, setVolumenNeutralizar] = useState(50); // en m3

  const calculoNeutralizante = useMemo(() => {
    const a = parseFloat(ppmPresentes) || 0; // ppm
    const b = parseFloat(volumenNeutralizar) || 0; // m3

    if (tipoNeutralizacion === 'cloro') {
      return {
        kg: (a * b * 0.014).toFixed(3),
        litros: (a * b * 0.011).toFixed(3),
        gramos: Math.round(a * b * 14),
        ml: Math.round(a * b * 11)
      };
    } else {
      return {
        kg: (a * b * 0.005).toFixed(3),
        litros: (a * b * 0.004).toFixed(3),
        gramos: Math.round(a * b * 5),
        ml: Math.round(a * b * 4)
      };
    }
  }, [tipoNeutralizacion, ppmPresentes, volumenNeutralizar]);

  // ── ESTADO 3: Dilución de Plagas & Desinfección ─────────────────────
  const [capacidadPulverizador, setCapacidadPulverizador] = useState(5); // Litros
  const [porcentajeDosis, setPorcentajeDosis] = useState(5.0); // %

  const calculoPlagas = useMemo(() => {
    const capL = parseFloat(capacidadPulverizador) || 0;
    const pct = parseFloat(porcentajeDosis) || 0;

    const productoMl = capL * (pct / 100) * 1000;
    const productoL = productoMl / 1000;
    const aguaMl = Math.max(0, capL * 1000 - productoMl);
    const aguaL = aguaMl / 1000;

    return {
      productoMl: productoMl >= 100 ? productoMl.toFixed(0) : productoMl.toFixed(1),
      productoL: productoL.toFixed(3),
      aguaMl: aguaMl.toFixed(0),
      aguaL: aguaL.toFixed(2),
      proporcionPct: pct
    };
  }, [capacidadPulverizador, porcentajeDosis]);

  // ── ESTADO 4: Guía Normativa RD 487/2022 ───────────────────────────
  const [normativaFiltroSistema, setNormativaFiltroSistema] = useState('todos');
  const [normativaSearch, setNormativaSearch] = useState('');

  const normativaFiltrada = useMemo(() => {
    return NORMATIVA_DATA.filter(item => {
      if (normativaFiltroSistema !== 'todos' && item.sistema !== normativaFiltroSistema) {
        return false;
      }
      if (normativaSearch.trim()) {
        const q = normativaSearch.toLowerCase();
        return (
          item.parametro.toLowerCase().includes(q) ||
          item.sistemaLabel.toLowerCase().includes(q) ||
          item.rangoNormal.toLowerCase().includes(q) ||
          item.accionBajo.toLowerCase().includes(q) ||
          item.accionAlto.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [normativaFiltroSistema, normativaSearch]);

  return (
    <div className="calc-container animate-fade-in">
      {/* 1. Header principal */}
      <div className="calc-header-block">
        <div className="calc-title-group">
          <div className="calc-icon-badge">
            <Calculator size={26} color="#ffffff" />
          </div>
          <div>
            <h1>Calculadora Técnica</h1>
            <p>Dosificación química, biocidas, diluciones y normativa de Legionella</p>
          </div>
        </div>
      </div>

      {/* 2. Píldoras de Navegación de la Calculadora */}
      <div className="calc-pills-nav">
        <button
          type="button"
          className={`calc-nav-pill ${activeTab === 'hipoclorito' ? 'active tab-cloro' : ''}`}
          onClick={() => setActiveTab('hipoclorito')}
        >
          <FlaskConical size={16} />
          <span>Hipoclorito & pH</span>
        </button>

        <button
          type="button"
          className={`calc-nav-pill ${activeTab === 'neutralizante' ? 'active tab-neutral' : ''}`}
          onClick={() => setActiveTab('neutralizante')}
        >
          <Scale size={16} />
          <span>Neutralizante (Tiosulfato)</span>
        </button>

        <button
          type="button"
          className={`calc-nav-pill ${activeTab === 'plagas' ? 'active tab-plagas' : ''}`}
          onClick={() => setActiveTab('plagas')}
        >
          <Bug size={16} />
          <span>Dilución Plagas</span>
        </button>

        <button
          type="button"
          className={`calc-nav-pill ${activeTab === 'normativa' ? 'active tab-normativa' : ''}`}
          onClick={() => setActiveTab('normativa')}
        >
          <FileText size={16} />
          <span>Guía RD 487/2022</span>
          <span className="calc-badge-count">{NORMATIVA_DATA.length}</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CALCULADORA DE HIPOCLORITO & CORRECTOR POR pH           */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'hipoclorito' && (
        <div className="calc-tab-pane animate-fade-in">
          <div className="calc-intro-card">
            <div className="calc-intro-text">
              <h3>Dosificación de Choque (Hipercloración) con Corrección por pH</h3>
              <p>Basada en la Guía Técnica del IDAE y Sanidad para control de Legionella. Ajusta automáticamente los litros requeridos según el pH real del agua.</p>
            </div>
            <span className="calc-source-tag">IDAE / Sanidad</span>
          </div>

          <div className="calc-grid-2col">
            {/* Panel Izquierdo: Entradas */}
            <div className="calc-panel-card">
              <h4 className="calc-panel-title">
                <Sliders size={18} color="#0284c7" /> Parámetros de la Instalación
              </h4>

              {/* Volumen del vaso */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Volumen total de agua a tratar</label>
                  <span className="calc-unit-pill">{volumenAgua} m³ ({Math.round(volumenAgua * 1000)} L)</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={volumenAgua}
                    onChange={(e) => setVolumenAgua(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">m³</span>
                </div>
                <div className="calc-chip-row">
                  {[1, 5, 10, 25, 50, 100].map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`calc-chip-btn ${volumenAgua == v ? 'active' : ''}`}
                      onClick={() => setVolumenAgua(v)}
                    >
                      {v} m³
                    </button>
                  ))}
                </div>
              </div>

              {/* Dosis de cloro deseada */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Concentración de Cloro Libre deseada</label>
                  <span className="calc-unit-pill">{dosisCloro} ppm (mg/L)</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={dosisCloro}
                    onChange={(e) => setDosisCloro(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">ppm</span>
                </div>
                <div className="calc-chip-row">
                  {[
                    { label: '2 ppm (Mantenimiento)', val: 2 },
                    { label: '5 ppm (Rápido)', val: 5 },
                    { label: '20 ppm (Choque estándar)', val: 20 },
                    { label: '30 ppm (Choque severo)', val: 30 }
                  ].map(d => (
                    <button
                      key={d.val}
                      type="button"
                      className={`calc-chip-btn ${dosisCloro == d.val ? 'active' : ''}`}
                      onClick={() => setDosisCloro(d.val)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Riqueza de la lejía comercial */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Riqueza en cloro activo de la lejía comercial</label>
                  <span className="calc-unit-pill">{riquezaLejia} g/L</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={riquezaLejia}
                    onChange={(e) => setRiquezaLejia(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">g Cl/L</span>
                </div>
                <div className="calc-chip-row">
                  {[40, 50, 115, 150].map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`calc-chip-btn ${riquezaLejia == r ? 'active' : ''}`}
                      onClick={() => setRiquezaLejia(r)}
                    >
                      {r} g/L {r === 150 ? '(Pura industrial)' : r === 50 ? '(Doméstica)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* pH del agua */}
              <div className="calc-field-group calc-ph-slider-box">
                <div className="calc-field-header">
                  <label className="calc-ph-title">
                    <Thermometer size={16} color="#0284c7" /> pH medido en el agua
                  </label>
                  <span className={`calc-ph-badge state-${calculoHipoclorito.estado}`}>
                    pH {parseFloat(phAgua).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="6.5"
                  max="9.0"
                  step="0.1"
                  value={phAgua}
                  onChange={(e) => setPhAgua(e.target.value)}
                  className="calc-slider-input"
                />
                <div className="calc-slider-ticks">
                  <span>6.5</span>
                  <span>7.0 (Óptimo)</span>
                  <span>7.5</span>
                  <span>8.0</span>
                  <span>8.5</span>
                  <span>9.0 (Crítico)</span>
                </div>
              </div>
            </div>

            {/* Panel Derecho: Resultados y Efecto del pH */}
            <div className="calc-panel-results">
              {/* Resultado Dosis Real Corregida */}
              <div className={`calc-result-card border-${calculoHipoclorito.estado}`}>
                <span className="calc-result-badge">CANTIDAD TOTAL REQUERIDA</span>
                <div className="calc-result-big-number">
                  <strong>{calculoHipoclorito.litrosCorregidos}</strong>
                  <span>Litros</span>
                </div>
                <p className="calc-result-subtext">
                  de hipoclorito comercial al {riquezaLejia} g/L para tratar {volumenAgua} m³ a {dosisCloro} ppm
                </p>

                {/* Comparativa con dosis teórica estándar */}
                <div className="calc-compare-row">
                  <div className="calc-compare-item">
                    <span>Dosis teórica estándar (pH 7.0):</span>
                    <strong>{calculoHipoclorito.litrosTeoricos} L</strong>
                  </div>
                  <div className="calc-compare-item">
                    <span>Factor Corrector por pH:</span>
                    <strong className={`calc-tag-factor state-${calculoHipoclorito.estado}`}>
                      × {calculoHipoclorito.factor}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Diagnóstico de Eficacia Biocida según pH */}
              <div className={`calc-diagnostic-card state-${calculoHipoclorito.estado}`}>
                <div className="calc-diag-top">
                  <div className="calc-diag-icon">
                    {calculoHipoclorito.estado === 'optimo' && <CheckCircle2 size={24} color="#16a34a" />}
                    {calculoHipoclorito.estado === 'bueno' && <CheckCircle2 size={24} color="#059669" />}
                    {calculoHipoclorito.estado === 'insuficiente' && <AlertTriangle size={24} color="#d97706" />}
                    {calculoHipoclorito.estado === 'muy_deficiente' && <AlertTriangle size={24} color="#dc2626" />}
                    {calculoHipoclorito.estado === 'ineficaz' && <XCircle size={24} color="#b91c1c" />}
                  </div>
                  <div className="calc-diag-header">
                    <h4>Eficacia Relativa Desinfectante: {calculoHipoclorito.eficacia}</h4>
                    <p>{calculoHipoclorito.recomendacion}</p>
                  </div>
                </div>

                {parseFloat(phAgua) > 7.5 && (
                  <div className="calc-acid-callout">
                    <Zap size={16} />
                    <span>
                      <strong>Consejo Técnico:</strong> A este pH el cloro pierde eficacia activa (ácido hipocloroso). Es mucho más económico y seguro dosificar ácido reductor para situar el pH en 7.0-7.2 antes de añadir el cloro.
                    </span>
                  </div>
                )}
              </div>

              {/* Tabla de Referencia Rápida de pH */}
              <div className="calc-ph-table-card">
                <h5>Escala Oficial de pH vs Eficacia del Cloro</h5>
                <div className="calc-ph-mini-table">
                  <div className={`calc-ph-row ${parseFloat(phAgua) <= 7.2 ? 'highlight' : ''}`}>
                    <span className="col-ph">pH 7.0</span>
                    <span className="col-factor">1.0 ×</span>
                    <span className="col-eff opt">100% Óptimo</span>
                    <span className="col-desc">Máxima acción biocida</span>
                  </div>
                  <div className={`calc-ph-row ${parseFloat(phAgua) > 7.2 && parseFloat(phAgua) <= 7.7 ? 'highlight' : ''}`}>
                    <span className="col-ph">pH 7.5</span>
                    <span className="col-factor">1.5 ×</span>
                    <span className="col-eff good">65% Bueno</span>
                    <span className="col-desc">Límite aconsejado</span>
                  </div>
                  <div className={`calc-ph-row ${parseFloat(phAgua) > 7.7 && parseFloat(phAgua) <= 8.2 ? 'highlight' : ''}`}>
                    <span className="col-ph">pH 8.0</span>
                    <span className="col-factor">3.2 ×</span>
                    <span className="col-eff warn">30% Insuficiente</span>
                    <span className="col-desc">Triplicar dosis de cloro</span>
                  </div>
                  <div className={`calc-ph-row ${parseFloat(phAgua) > 8.2 && parseFloat(phAgua) <= 8.7 ? 'highlight' : ''}`}>
                    <span className="col-ph">pH 8.5</span>
                    <span className="col-factor">8.4 ×</span>
                    <span className="col-eff bad">12% Deficiente</span>
                    <span className="col-desc">Obligatorio dosificar reductor</span>
                  </div>
                  <div className={`calc-ph-row ${parseFloat(phAgua) > 8.7 ? 'highlight' : ''}`}>
                    <span className="col-ph">pH 9.0</span>
                    <span className="col-factor">25.3 ×</span>
                    <span className="col-eff crit">&lt; 4% Ineficaz</span>
                    <span className="col-desc">Riesgo biológico severo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 2: CALCULADORA DE NEUTRALIZANTE (TIOSULFATO SÓDICO 50%)    */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'neutralizante' && (
        <div className="calc-tab-pane animate-fade-in">
          <div className="calc-intro-card">
            <div className="calc-intro-text">
              <h3>Tiosulfato Sódico 5H2O 50% (Agente Neutralizante de Biocidas)</h3>
              <p>Fórmulas oficiales de la ficha técnica para neutralizar Cloro Libre o Dióxido de Cloro tras hipercloraciones o antes de vertidos a red.</p>
            </div>
            <span className="calc-source-tag">Ficha Técnica Oficial</span>
          </div>

          <div className="calc-grid-2col">
            {/* Panel de Entradas */}
            <div className="calc-panel-card">
              <h4 className="calc-panel-title">
                <Scale size={18} color="#7c3aed" /> Parámetros del Biocida a Neutralizar
              </h4>

              {/* Selector de Biocida */}
              <div className="calc-field-group">
                <label>Tipo de Biocida a neutralizar</label>
                <div className="calc-biocide-selector">
                  <button
                    type="button"
                    className={`calc-biocide-btn ${tipoNeutralizacion === 'cloro' ? 'active' : ''}`}
                    onClick={() => setTipoNeutralizacion('cloro')}
                  >
                    <FlaskConical size={18} />
                    <div>
                      <strong>Cloro Libre Residual</strong>
                      <span>Hipoclorito / Lejía (ppm Cl)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`calc-biocide-btn ${tipoNeutralizacion === 'dioxido' ? 'active' : ''}`}
                    onClick={() => setTipoNeutralizacion('dioxido')}
                  >
                    <Waves size={18} />
                    <div>
                      <strong>Dióxido de Cloro</strong>
                      <span>ADY'OX LG / 75 / H2O (ppm ClO2)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Concentración de biocida */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Concentración medida en el agua (A)</label>
                  <span className="calc-unit-pill">{ppmPresentes} ppm</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={ppmPresentes}
                    onChange={(e) => setPpmPresentes(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">ppm</span>
                </div>
                <div className="calc-chip-row">
                  {[2, 5, 10, 20, 30, 50].map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`calc-chip-btn ${ppmPresentes == c ? 'active' : ''}`}
                      onClick={() => setPpmPresentes(c)}
                    >
                      {c} ppm
                    </button>
                  ))}
                </div>
              </div>

              {/* Volumen del agua */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Volumen de agua a tratar (B)</label>
                  <span className="calc-unit-pill">{volumenNeutralizar} m³</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={volumenNeutralizar}
                    onChange={(e) => setVolumenNeutralizar(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">m³</span>
                </div>
                <div className="calc-chip-row">
                  {[1, 5, 10, 25, 50, 100].map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`calc-chip-btn ${volumenNeutralizar == v ? 'active' : ''}`}
                      onClick={() => setVolumenNeutralizar(v)}
                    >
                      {v} m³
                    </button>
                  ))}
                </div>
              </div>

              <div className="calc-formula-footer">
                <span className="calc-formula-badge">FÓRMULA APLICADA:</span>
                <code>
                  {tipoNeutralizacion === 'cloro'
                    ? "Litros = (ppm Cloro) × (m³ agua) × 0,011"
                    : "Litros = (ppm ClO2) × (m³ agua) × 0,004"}
                </code>
              </div>
            </div>

            {/* Panel de Resultados */}
            <div className="calc-panel-results">
              <div className="calc-neutral-results-grid">
                {/* Litros */}
                <div className="calc-neutral-card primary">
                  <div className="calc-neutral-head">
                    <span>DOSIS EN VOLUMEN LÍQUIDO</span>
                    <Droplet size={18} color="#7c3aed" />
                  </div>
                  <div className="calc-neutral-val">
                    <strong>{calculoNeutralizante.litros}</strong>
                    <span className="unit">Litros</span>
                  </div>
                  <p className="calc-neutral-sub">o bien <strong>{calculoNeutralizante.ml} ml</strong> de Tiosulfato al 50%</p>
                </div>

                {/* Kilos / Peso */}
                <div className="calc-neutral-card secondary">
                  <div className="calc-neutral-head">
                    <span>DOSIS EN PESO / MASA</span>
                    <Scale size={18} color="#059669" />
                  </div>
                  <div className="calc-neutral-val">
                    <strong>{calculoNeutralizante.kg}</strong>
                    <span className="unit">Kg</span>
                  </div>
                  <p className="calc-neutral-sub">o bien <strong>{calculoNeutralizante.gramos} gramos</strong></p>
                </div>
              </div>

              {/* Ficha técnica y consejos de aplicación */}
              <div className="calc-info-card">
                <div className="calc-info-title">
                  <Info size={18} color="#2563eb" />
                  <h5>Modo de Empleo y Recomendaciones</h5>
                </div>
                <ul className="calc-info-list">
                  <li>Dosificar por peso o volumen según necesidades de forma manual o automática.</li>
                  <li>Añadir lentamente cerca de los puntos de recirculación para homogeneizar la mezcla.</li>
                  <li>Medir el cloro libre restante transcurridos <strong>15-30 minutos</strong> para asegurar neutralización completa a 0.0 ppm.</li>
                  <li>Solución estabilizada apta para tratar agua de consumo y circuitos de refrigeración.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 3: CALCULADORA DE DILUCIÓN PARA PLAGAS & DESINFECCIÓN      */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'plagas' && (
        <div className="calc-tab-pane animate-fade-in">
          <div className="calc-intro-card">
            <div className="calc-intro-text">
              <h3>Calculadora de Mezcla para Pulverizadores y Nebulizadores</h3>
              <p>Dosifica con exactitud insecticidas, acaricidas o desinfectantes (ej. Sterilex Beta, Cipermetrina, etc.) según el porcentaje recomendado en la ficha de producto.</p>
            </div>
            <span className="calc-source-tag">Control de Plagas & DDD</span>
          </div>

          <div className="calc-grid-2col">
            {/* Panel de Entradas */}
            <div className="calc-panel-card">
              <h4 className="calc-panel-title">
                <Bug size={18} color="#f43f5e" /> Parámetros del Depósito
              </h4>

              {/* Capacidad de la mochila / pulverizador */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Capacidad del depósito / Caldo a preparar</label>
                  <span className="calc-unit-pill">{capacidadPulverizador} Litros ({Math.round(capacidadPulverizador * 1000)} ml)</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={capacidadPulverizador}
                    onChange={(e) => setCapacidadPulverizador(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">Litros</span>
                </div>
                <div className="calc-chip-row">
                  {[1, 2, 5, 8, 10, 15, 16, 20].map(l => (
                    <button
                      key={l}
                      type="button"
                      className={`calc-chip-btn ${capacidadPulverizador == l ? 'active' : ''}`}
                      onClick={() => setCapacidadPulverizador(l)}
                    >
                      {l} L {l === 16 ? '(Mochila standard)' : l === 5 ? '(Mochila ligera)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Porcentaje de dosis */}
              <div className="calc-field-group">
                <div className="calc-field-header">
                  <label>Porcentaje de producto a dosificar (%)</label>
                  <span className="calc-unit-pill">{porcentajeDosis} %</span>
                </div>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min="0.05"
                    step="0.25"
                    value={porcentajeDosis}
                    onChange={(e) => setPorcentajeDosis(e.target.value)}
                    className="calc-main-input"
                  />
                  <span className="calc-input-suffix">%</span>
                </div>
                <div className="calc-chip-row">
                  {[0.25, 0.5, 1.0, 2.0, 2.5, 5.0, 10.0].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`calc-chip-btn ${porcentajeDosis == p ? 'active' : ''}`}
                      onClick={() => setPorcentajeDosis(p)}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="calc-formula-footer">
                <span className="calc-formula-badge">FÓRMULA APLICADA:</span>
                <code>Producto (ml) = Litros Totales × (% / 100) × 1000</code>
              </div>
            </div>

            {/* Panel de Resultados */}
            <div className="calc-panel-results">
              <div className="calc-plagas-summary-card">
                <span className="calc-plagas-badge">CÁLCULO EXACTO DEL CALDO</span>

                <div className="calc-plagas-big-stat">
                  <div className="calc-plagas-stat-box product">
                    <span className="stat-label">PRODUCTO BIOCIDA</span>
                    <strong className="stat-val">{calculoPlagas.productoMl} ml</strong>
                    <span className="stat-sub">({calculoPlagas.productoL} L)</span>
                  </div>

                  <div className="calc-plagas-plus">+</div>

                  <div className="calc-plagas-stat-box water">
                    <span className="stat-label">AGUA LIMPIA</span>
                    <strong className="stat-val">{calculoPlagas.aguaL} L</strong>
                    <span className="stat-sub">({calculoPlagas.aguaMl} ml)</span>
                  </div>
                </div>

                {/* Esquema visual del tanque */}
                <div className="calc-tank-visual">
                  <div className="calc-tank-bar">
                    <div 
                      className="calc-tank-water" 
                      style={{ width: `${Math.max(5, 100 - calculoPlagas.proporcionPct)}%` }}
                      title={`Agua: ${calculoPlagas.aguaL} L`}
                    >
                      <span>Agua: {calculoPlagas.aguaL} L</span>
                    </div>
                    <div 
                      className="calc-tank-product" 
                      style={{ width: `${Math.max(5, Math.min(95, calculoPlagas.proporcionPct))}%` }}
                      title={`Producto: ${calculoPlagas.productoMl} ml`}
                    >
                      <span>{calculoPlagas.productoMl} ml</span>
                    </div>
                  </div>
                  <div className="calc-tank-footer">
                    <span>Volumen total de caldo: <strong>{capacidadPulverizador} Litros</strong></span>
                    <span>Concentración final: <strong>{porcentajeDosis}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Ejemplo práctico de aplicación */}
              <div className="calc-example-card">
                <div className="calc-example-title">
                  <Sparkles size={18} color="#e11d48" />
                  <h5>Procedimiento Recomendado de Carga</h5>
                </div>
                <ol className="calc-example-steps">
                  <li>Llenar el pulverizador con la mitad del agua calculada (<strong>{(parseFloat(calculoPlagas.aguaL || 0) / 2).toFixed(2)} L</strong>).</li>
                  <li>Medir y verter los <strong>{calculoPlagas.productoMl} ml</strong> de producto con probeta o jeringa dosificadora.</li>
                  <li>Completar con el resto del agua hasta alcanzar los <strong>{capacidadPulverizador} L</strong> finales.</li>
                  <li>Cerrar y agitar enérgicamente antes de presurizar o nebulizar.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 4: GUÍA NORMATIVA RD 487/2022 INTERACTIVA (Captura 2)     */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'normativa' && (
        <div className="calc-tab-pane animate-fade-in">
          <div className="calc-intro-card">
            <div className="calc-intro-text">
              <h3>Control de Parámetros Físico-Químicos del Agua</h3>
              <p>Prevención y Control de Legionella según <strong>RD 487/2022</strong>, RD 742/2013 y RD 140/2003. Valores reglamentarios, límites de alarma y medidas correctoras.</p>
            </div>
            <span className="calc-source-tag">RD 487/2022 Oficial</span>
          </div>

          {/* Filtros de la Guía Normativa */}
          <div className="calc-norm-toolbar">
            <div className="calc-norm-pills">
              <button
                type="button"
                className={`calc-norm-filter-btn ${normativaFiltroSistema === 'todos' ? 'active' : ''}`}
                onClick={() => setNormativaFiltroSistema('todos')}
              >
                Todos ({NORMATIVA_DATA.length})
              </button>
              <button
                type="button"
                className={`calc-norm-filter-btn ${normativaFiltroSistema === 'agua_sanitaria' ? 'active' : ''}`}
                onClick={() => setNormativaFiltroSistema('agua_sanitaria')}
              >
                <Building2 size={14} /> Agua Sanitaria (7)
              </button>
              <button
                type="button"
                className={`calc-norm-filter-btn ${normativaFiltroSistema === 'torres' ? 'active' : ''}`}
                onClick={() => setNormativaFiltroSistema('torres')}
              >
                <FlaskConical size={14} /> Torres / Condensadores (6)
              </button>
              <button
                type="button"
                className={`calc-norm-filter-btn ${normativaFiltroSistema === 'spas' ? 'active' : ''}`}
                onClick={() => setNormativaFiltroSistema('spas')}
              >
                <Waves size={14} /> Spas / Hidromasajes (7)
              </button>
            </div>

            {/* Buscador de parámetros */}
            <div className="calc-norm-search">
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar parámetro (ej. cloro, pH, turbidez, hierro)..."
                value={normativaSearch}
                onChange={(e) => setNormativaSearch(e.target.value)}
              />
              {normativaSearch && (
                <button type="button" className="calc-search-clear" onClick={() => setNormativaSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Listado de Tarjetas de Parámetros */}
          {normativaFiltrada.length === 0 ? (
            <div className="calc-empty-norm">
              <AlertTriangle size={36} color="var(--text-faint)" />
              <p>No se encontraron parámetros que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div className="calc-norm-cards-grid">
              {normativaFiltrada.map((item, idx) => (
                <div key={idx} className={`calc-param-card ${item.cierreFlag ? 'has-cierre' : ''}`}>
                  {/* Cabecera de la tarjeta */}
                  <div className="calc-param-header">
                    <div className="calc-param-title-wrap">
                      <span className="calc-param-sys-badge">{item.sistemaLabel}</span>
                      <h4>{item.parametro}</h4>
                    </div>
                    <span className="calc-param-freq-badge">{item.frecuencia}</span>
                  </div>

                  {/* Rangos y Alarma */}
                  <div className="calc-param-body">
                    <div className="calc-param-metric-row">
                      <div className="calc-metric-box ok">
                        <span className="lbl">RANGO NORMAL</span>
                        <strong className="val">{item.rangoNormal}</strong>
                      </div>

                      <div className="calc-metric-box alarm">
                        <span className="lbl">LÍMITE CRÍTICO / ALARMA</span>
                        <span className="val-text">{item.limiteCritico}</span>
                      </div>
                    </div>

                    {/* Aviso de cierre / prohibición si aplica */}
                    {item.cierreFlag && (
                      <div className="calc-cierre-alert">
                        <ShieldAlert size={16} color="#dc2626" />
                        <div>
                          <strong>¿Cierre / Prohibición?: </strong>
                          <span>{item.cierreProhibicion}</span>
                        </div>
                      </div>
                    )}

                    {/* Acciones Correctoras */}
                    <div className="calc-actions-block">
                      <div className="calc-action-item bajo">
                        <span className="action-tag bajo">SI ES BAJO</span>
                        <p>{item.accionBajo}</p>
                      </div>

                      <div className="calc-action-item alto">
                        <span className="action-tag alto">SI ES ALTO</span>
                        <p>{item.accionAlto}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calculadora;

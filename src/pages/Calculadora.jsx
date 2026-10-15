import React, { useState, useMemo } from 'react';
import { 
  Calculator, Droplet, ShieldAlert, Bug, FileText, 
  CheckCircle2, AlertTriangle, XCircle, Info, ArrowRight, 
  FlaskConical, Scale, Thermometer, Waves, Building2, Search,
  Sliders, Zap, HelpCircle, ChevronRight, X, Sparkles,
  ArrowLeftRight, Gauge, Activity, Layers, RefreshCw, BookOpen
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

  // ── ESTADO 4: Factores de Conversión de Unidades ────────────────────
  const [conversorCat, setConversorCat] = useState('conductividad');

  // 1. Conductividad (mS ↔ µS y TDS)
  const [condMs, setCondMs] = useState('0.46');
  const [condUs, setCondUs] = useState('460');

  const updateCondFromMs = (val) => {
    setCondMs(val);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      const us = n * 1000;
      setCondUs(Number.isInteger(us) ? us.toString() : parseFloat(us.toFixed(3)).toString());
    } else if (val === '') {
      setCondUs('');
    }
  };

  const updateCondFromUs = (val) => {
    setCondUs(val);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      const ms = n / 1000;
      setCondMs(Number.isInteger(ms) ? ms.toString() : parseFloat(ms.toFixed(4)).toString());
    } else if (val === '') {
      setCondMs('');
    }
  };

  // 2. Volumen y Dosificación (base en Litros)
  const [volBaseL, setVolBaseL] = useState(0.01); // 10 ml = 0.01 L
  const [volInputVal, setVolInputVal] = useState('10');
  const [volInputUnit, setVolInputUnit] = useState('cm3');

  const handleVolInputChange = (val, unit) => {
    setVolInputVal(val);
    setVolInputUnit(unit);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      let l = 0;
      if (unit === 'cm3' || unit === 'ml') l = n / 1000;
      else if (unit === 'L') l = n;
      else if (unit === 'm3') l = n * 1000;
      else if (unit === 'garrafas') l = n * 25;
      setVolBaseL(l);
    }
  };

  // 3. Dureza del Agua (base en ºfH)
  const [durezaBaseFh, setDurezaBaseFh] = useState(25);
  const [durezaInputVal, setDurezaInputVal] = useState('25');
  const [durezaInputUnit, setDurezaInputUnit] = useState('fh');

  const handleDurezaChange = (val, unit) => {
    setDurezaInputVal(val);
    setDurezaInputUnit(unit);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      let fh = 0;
      if (unit === 'fh') fh = n;
      else if (unit === 'dh') fh = n / 0.56;
      else if (unit === 'ppm') fh = n / 10;
      else if (unit === 'mmol') fh = n / 0.1;
      setDurezaBaseFh(fh);
    }
  };

  const clasificacionDureza = useMemo(() => {
    const n = parseFloat(durezaBaseFh) || 0;
    if (n < 7) return { label: 'Muy Blanda (< 7 ºfH)', color: '#0284c7', bg: '#e0f2fe', desc: 'Baja mineralización. Agua agresiva/corrosiva para canalizaciones metálicas si el pH es bajo.' };
    if (n <= 15) return { label: 'Blanda (7 - 15 ºfH)', color: '#16a34a', bg: '#dcfce7', desc: 'Dureza equilibrada. Apta para consumo y calderas con bajo depósito de cal.' };
    if (n <= 30) return { label: 'Moderadamente Dura (15 - 30 ºfH)', color: '#d97706', bg: '#fef3c7', desc: 'Dureza estándar de red. Requiere seguimiento en intercambiadores de calor.' };
    if (n <= 45) return { label: 'Dura (30 - 45 ºfH)', color: '#ea580c', bg: '#ffedd5', desc: 'Concentración apreciable de cal. Aconsejable descalcificador o dispersante.' };
    return { label: 'Muy Dura (> 45 ºfH)', color: '#dc2626', bg: '#fee2e2', desc: 'Alto riesgo de incrustación calcárea severa en relleno de torres y serpentines.' };
  }, [durezaBaseFh]);

  // 4. Concentración (% y ppm) (base en ppm)
  const [concBasePpm, setConcBasePpm] = useState(150000); // 15% lejía comercial
  const [concInputVal, setConcInputVal] = useState('15');
  const [concInputUnit, setConcInputUnit] = useState('pct');

  const handleConcChange = (val, unit) => {
    setConcInputVal(val);
    setConcInputUnit(unit);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      let ppm = 0;
      if (unit === 'pct') ppm = n * 10000;
      else if (unit === 'ppm') ppm = n;
      else if (unit === 'gl') ppm = n * 1000;
      else if (unit === 'gm3') ppm = n;
      setConcBasePpm(ppm);
    }
  };

  // 5. Presión & Temperatura
  const [presionBaseBar, setPresionBaseBar] = useState(2.5);
  const [presionInputVal, setPresionInputVal] = useState('2.5');
  const [presionInputUnit, setPresionInputUnit] = useState('bar');

  const handlePresionChange = (val, unit) => {
    setPresionInputVal(val);
    setPresionInputUnit(unit);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      let bar = 0;
      if (unit === 'bar') bar = n;
      else if (unit === 'psi') bar = n / 14.5038;
      else if (unit === 'mca') bar = n / 10.1972;
      else if (unit === 'atm') bar = n / 0.986923;
      setPresionBaseBar(bar);
    }
  };

  const [tempBaseC, setTempBaseC] = useState(60);
  const [tempInputVal, setTempInputVal] = useState('60');
  const [tempInputUnit, setTempInputUnit] = useState('c');

  const handleTempChange = (val, unit) => {
    setTempInputVal(val);
    setTempInputUnit(unit);
    const clean = String(val).replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) {
      let c = 0;
      if (unit === 'c') c = n;
      else if (unit === 'f') c = (n - 32) * (5 / 9);
      setTempBaseC(c);
    }
  };

  const legionellaTempZona = useMemo(() => {
    const t = parseFloat(tempBaseC) || 0;
    if (t < 20) return { label: 'Inactiva (Estado Latente)', color: '#2563eb', bg: '#eff6ff', desc: 'La bacteria sobrevive en el agua pero está aletargada y no se multiplica.' };
    if (t <= 45) return { label: '⚠️ RANGO CRÍTICO DE PROLIFERACIÓN', color: '#dc2626', bg: '#fee2e2', desc: 'Multiplicación óptima entre 35 ºC y 37 ºC. Máximo riesgo de colonización en ACS y torres.' };
    if (t <= 50) return { label: 'Supervivencia sin proliferación', color: '#d97706', bg: '#fef3c7', desc: 'Deja de multiplicarse, pero puede subsistir en biopelículas o lodos.' };
    if (t <= 60) return { label: 'Destrucción gradual bacteriana', color: '#7c3aed', bg: '#f5f3ff', desc: 'El 90% de la carga bacteriana muere en aproximadamente 2 horas a 60 ºC.' };
    return { label: 'Destrucción térmica inmediata', color: '#16a34a', bg: '#dcfce7', desc: 'Muerte celular en pocos minutos. Temperatura objetivo de choque térmico (>70 ºC).' };
  }, [tempBaseC]);

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
          className={`calc-nav-pill ${activeTab === 'conversor' ? 'active tab-conversor' : ''}`}
          onClick={() => setActiveTab('conversor')}
        >
          <ArrowLeftRight size={16} />
          <span>Factores de Conversión</span>
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
      {/* TAB 4: FACTORES DE CONVERSIÓN DE UNIDADES (TÉCNICO DE CAMPO)   */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'conversor' && (
        <div className="calc-tab-pane animate-fade-in">
          {/* Cabecera del Conversor */}
          <div className="calc-intro-card conv-intro-card">
            <div className="calc-intro-text">
              <h3>Conversor Técnico de Unidades de Campo</h3>
              <p>Herramienta rápida para mediciones de sondas, lectura de conductividad en mS o µS, dosificación de garrafas, volúmenes, dureza y concentraciones químicas.</p>
            </div>
            <span className="calc-source-tag conv-badge-tag">Agua & Plagas</span>
          </div>

          {/* Subnavegación de Categorías */}
          <div className="calc-conv-subnav">
            {[
              { id: 'conductividad', label: '⚡ Conductividad & TDS', desc: 'mS ↔ µS y sólidos' },
              { id: 'volumen', label: '🧪 Volumen & Dosis', desc: 'cm³, ml, L, m³, garrafas' },
              { id: 'dureza', label: '💧 Dureza del Agua', desc: 'ºfH, ºdH, ppm CaCO3' },
              { id: 'concentracion', label: '🔬 Concentración (%/ppm)', desc: '% ↔ ppm ↔ g/L' },
              { id: 'presion_temp', label: '🌡️ Presión & Tª', desc: 'bar, psi, ºC ↔ ºF' },
              { id: 'chuleta', label: '📋 Chuleta de Bolsillo', desc: 'Factores directos' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`calc-conv-subpill ${conversorCat === cat.id ? 'active' : ''}`}
                onClick={() => setConversorCat(cat.id)}
              >
                <span className="conv-subpill-title">{cat.label}</span>
                <span className="conv-subpill-desc">{cat.desc}</span>
              </button>
            ))}
          </div>

          {/* 1. SECCIÓN CONDUCTIVIDAD & TDS */}
          {conversorCat === 'conductividad' && (
            <div className="calc-conv-section animate-fade-in">
              <div className="calc-grid-2col">
                {/* Calculador Bidireccional */}
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Calculador Bidireccional de Conductividad</h4>
                    <span className="calc-chip chip-cyan">Sondas y Programas</span>
                  </div>

                  <p className="calc-card-desc">
                    Escribe en <strong>mS</strong> (como marca la sonda en campo) o en <strong>µS</strong> (como pide el programa) y se convertirá en tiempo real.
                  </p>

                  <div className="calc-conv-dual-box">
                    <div className="calc-conv-field">
                      <label>
                        <span>MiliSiemens (mS o mS/cm)</span>
                        <span className="calc-unit-pill blue">Medición de Sonda</span>
                      </label>
                      <div className="calc-input-wrapper">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={condMs}
                          onChange={e => updateCondFromMs(e.target.value)}
                          placeholder="Ej. 0.46"
                        />
                        <span className="calc-input-unit">mS/cm</span>
                      </div>
                    </div>

                    <div className="calc-conv-arrow-divider">
                      <div className="conv-arrow-icon-circle">
                        <ArrowLeftRight size={18} />
                      </div>
                      <span className="conv-arrow-legend">1 mS = 1.000 µS</span>
                    </div>

                    <div className="calc-conv-field">
                      <label>
                        <span>MicroSiemens (µS o µS/cm)</span>
                        <span className="calc-unit-pill green">Registro / Informe</span>
                      </label>
                      <div className="calc-input-wrapper">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={condUs}
                          onChange={e => updateCondFromUs(e.target.value)}
                          placeholder="Ej. 460"
                        />
                        <span className="calc-input-unit">µS/cm</span>
                      </div>
                    </div>
                  </div>

                  {/* Banner de resultado destacado */}
                  <div className="calc-conv-banner-res">
                    <div className="conv-banner-top">
                      <span className="conv-val-highlight">{condMs || '0'} mS/cm</span>
                      <span className="conv-val-equals">=</span>
                      <span className="conv-val-highlight accent">{condUs || '0'} µS/cm</span>
                    </div>

                    {/* Estimación TDS */}
                    {(() => {
                      const u = parseFloat(String(condUs).replace(',', '.')) || 0;
                      const tdsAgua = (u * 0.67).toFixed(1);
                      const tdsNacl = (u * 0.50).toFixed(1);
                      return (
                        <div className="conv-tds-grid">
                          <div className="conv-tds-item">
                            <span className="tds-title">TDS Estimado (Agua Potable/Red · factor 0.67):</span>
                            <strong className="tds-number">{tdsAgua} ppm (mg/L)</strong>
                          </div>
                          <div className="conv-tds-item">
                            <span className="tds-title">TDS Estándar NaCl (factor 0.50):</span>
                            <strong className="tds-number">{tdsNacl} ppm (mg/L)</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Píldoras de valores rápidos */}
                  <div className="calc-quick-pills-container">
                    <span className="quick-pills-label">Valores habituales de campo:</span>
                    <div className="quick-pills-flex">
                      {[
                        { label: '0.46 mS (Expal)', ms: '0.46' },
                        { label: '0.35 mS (Red blanda)', ms: '0.35' },
                        { label: '0.65 mS (Red media)', ms: '0.65' },
                        { label: '1.50 mS (Torre recirc.)', ms: '1.50' },
                        { label: '2.50 mS (Límite RD 3/2023)', ms: '2.50' },
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          className="conv-preset-btn"
                          onClick={() => updateCondFromMs(p.ms)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Referencia Normativa */}
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Escala de Conductividad en Aguas Reales</h4>
                    <span className="calc-chip chip-amber">RD 3/2023 & RD 487/2022</span>
                  </div>

                  <div className="conv-ref-timeline">
                    <div className="conv-ref-item">
                      <div className="ref-status-circle blue" />
                      <div className="ref-info-box">
                        <div className="ref-info-head">
                          <strong>Agua Desmineralizada / Ósmosis</strong>
                          <span className="ref-range-badge">&lt; 20 µS/cm (&lt; 0.02 mS)</span>
                        </div>
                        <p>Agua muy pura, sin sales disueltas. Común en purgas de calderas de vapor.</p>
                      </div>
                    </div>

                    <div className="conv-ref-item">
                      <div className="ref-status-circle green" />
                      <div className="ref-info-box">
                        <div className="ref-info-head">
                          <strong>Agua de Grifo / Red Potable</strong>
                          <span className="ref-range-badge">200 – 800 µS/cm (0.2 – 0.8 mS)</span>
                        </div>
                        <p>Rangos habituales de abastecimiento público en Asturias y zona norte.</p>
                      </div>
                    </div>

                    <div className="conv-ref-item">
                      <div className="ref-status-circle amber" />
                      <div className="ref-info-box">
                        <div className="ref-info-head">
                          <strong>Torres de Refrigeración (Agua en balsa)</strong>
                          <span className="ref-range-badge">1.200 – 2.400 µS/cm (1.2 – 2.4 mS)</span>
                        </div>
                        <p>Ciclos de concentración normales. Si sube de 2.500 µS se activa la purga automática.</p>
                      </div>
                    </div>

                    <div className="conv-ref-item">
                      <div className="ref-status-circle red" />
                      <div className="ref-info-box">
                        <div className="ref-info-head">
                          <strong>Límite Legal Parámetro RD 3/2023</strong>
                          <span className="ref-range-badge alert">2.500 µS/cm (2.5 mS) a 20 ºC</span>
                        </div>
                        <p>Valor paramétrico máximo autorizado para agua de consumo humano.</p>
                      </div>
                    </div>
                  </div>

                  <div className="calc-tip-box" style={{ marginTop: '16px' }}>
                    <Info size={16} color="#0284c7" />
                    <span>
                      <strong>Regla rápida:</strong> Para pasar de <strong>mS a µS</strong> multiplica por <strong>1.000</strong> (0,46 × 1.000 = 460). Para pasar de <strong>µS a mS</strong> divide entre 1.000 (460 ÷ 1.000 = 0,46).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECCIÓN VOLUMEN & DOSIFICACIÓN */}
          {conversorCat === 'volumen' && (
            <div className="calc-conv-section animate-fade-in">
              <div className="calc-grid-2col">
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Conversor de Volumen y Dosis</h4>
                    <span className="calc-chip chip-blue">Dosificación y Garrafas</span>
                  </div>

                  <p className="calc-card-desc">
                    Introduce cualquier cantidad y selecciona su unidad para ver al instante la equivalencia en centímetros cúbicos, mililitros, litros, metros cúbicos y garrafas estándar.
                  </p>

                  <div className="conv-input-control-row">
                    <div className="calc-input-wrapper flex-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={volInputVal}
                        onChange={e => handleVolInputChange(e.target.value, volInputUnit)}
                        placeholder="Introduce cantidad..."
                      />
                    </div>
                    <select
                      className="calc-select-styled flex-1"
                      value={volInputUnit}
                      onChange={e => handleVolInputChange(volInputVal, e.target.value)}
                    >
                      <option value="cm3">Centímetros cúbicos (cm³ / cc)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="L">Litros (L)</option>
                      <option value="m3">Metros cúbicos (m³)</option>
                      <option value="garrafas">Garrafas (25 L)</option>
                    </select>
                  </div>

                  {/* Tabla de Resultados Sincronizados */}
                  <div className="conv-results-cards-grid">
                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Centímetros Cúbicos (cm³ / cc)</span>
                      <strong className="mini-card-number">
                        {(volBaseL * 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                        <span className="mini-card-unit">cm³</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card highlight">
                      <span className="mini-card-label">Mililitros (ml)</span>
                      <strong className="mini-card-number">
                        {(volBaseL * 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                        <span className="mini-card-unit">ml</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card highlight-green">
                      <span className="mini-card-label">Litros (L)</span>
                      <strong className="mini-card-number">
                        {volBaseL.toLocaleString('es-ES', { maximumFractionDigits: 4 })}
                        <span className="mini-card-unit">L</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Metros Cúbicos (m³)</span>
                      <strong className="mini-card-number">
                        {(volBaseL / 1000).toLocaleString('es-ES', { maximumFractionDigits: 6 })}
                        <span className="mini-card-unit">m³</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card col-span-2">
                      <span className="mini-card-label">Equivalencia en Garrafas Estándar (25 L)</span>
                      <strong className="mini-card-number">
                        {(volBaseL / 25).toLocaleString('es-ES', { maximumFractionDigits: 3 })}
                        <span className="mini-card-unit">garrafas de 25 L</span>
                      </strong>
                    </div>
                  </div>

                  {/* Botones de Preselección */}
                  <div className="calc-quick-pills-container">
                    <span className="quick-pills-label">Volúmenes típicos de trabajo:</span>
                    <div className="quick-pills-flex">
                      {[
                        { label: '10 cm³ (probeta)', val: '10', unit: 'cm3' },
                        { label: '50 ml (dosis)', val: '50', unit: 'ml' },
                        { label: '1 L (1.000 ml)', val: '1', unit: 'L' },
                        { label: '25 L (1 garrafa)', val: '25', unit: 'L' },
                        { label: '1 m³ (1.000 L / IBC)', val: '1', unit: 'm3' },
                        { label: '25 m³ (torre/vaso)', val: '25', unit: 'm3' },
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          className="conv-preset-btn"
                          onClick={() => handleVolInputChange(p.val, p.unit)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Equivalencias Directas de Capacidad</h4>
                    <span className="calc-chip chip-green">Guía Rápida</span>
                  </div>

                  <div className="conv-rule-box">
                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">💧</span>
                      <div>
                        <strong>1 centímetro cúbico (cm³) = 1 mililitro (ml)</strong>
                        <p>Son exactamente el mismo volumen. 10 cm³ son exactamente 10 ml.</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">🧪</span>
                      <div>
                        <strong>1 Litro (L) = 1.000 ml = 1.000 cm³</strong>
                        <p>Para pasar de ml a Litros divide entre 1.000 (ej: 250 ml = 0,25 L).</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">📦</span>
                      <div>
                        <strong>1 metro cúbico (m³) = 1.000 Litros</strong>
                        <p>Un depósito IBC estándar cúbico suele albergar exactamente 1 m³ (1.000 L).</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">⚖️</span>
                      <div>
                        <strong>1 Litro de agua pura = 1 Kilogramo (kg)</strong>
                        <p>En biocidas densos (ácidos, cloro) 1 L suele pesar entre 1,15 kg y 1,25 kg.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. SECCIÓN DUREZA DEL AGUA */}
          {conversorCat === 'dureza' && (
            <div className="calc-conv-section animate-fade-in">
              <div className="calc-grid-2col">
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Conversor de Dureza del Agua</h4>
                    <span className="calc-chip chip-amber">Incrustación & Cal</span>
                  </div>

                  <p className="calc-card-desc">
                    Convierte entre grados franceses (ºfH, habitual en analíticas españolas), alemanes (ºdH) y concentración en ppm de CaCO3.
                  </p>

                  <div className="conv-input-control-row">
                    <div className="calc-input-wrapper flex-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={durezaInputVal}
                        onChange={e => handleDurezaChange(e.target.value, durezaInputUnit)}
                        placeholder="Introduce valor de dureza..."
                      />
                    </div>
                    <select
                      className="calc-select-styled flex-1"
                      value={durezaInputUnit}
                      onChange={e => handleDurezaChange(durezaInputVal, e.target.value)}
                    >
                      <option value="fh">Grados franceses (ºfH)</option>
                      <option value="dh">Grados alemanes (ºdH)</option>
                      <option value="ppm">ppm CaCO3 (mg/L)</option>
                      <option value="mmol">mmol/L (Ca²⁺ + Mg²⁺)</option>
                    </select>
                  </div>

                  {/* Resultados de Dureza */}
                  <div className="conv-results-cards-grid">
                    <div className="conv-res-mini-card highlight-amber">
                      <span className="mini-card-label">Grados Franceses (ºfH)</span>
                      <strong className="mini-card-number">
                        {durezaBaseFh.toFixed(1)}
                        <span className="mini-card-unit">ºfH</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Grados Alemanes (ºdH)</span>
                      <strong className="mini-card-number">
                        {(durezaBaseFh * 0.56).toFixed(1)}
                        <span className="mini-card-unit">ºdH</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card highlight">
                      <span className="mini-card-label">ppm CaCO3 (mg/L)</span>
                      <strong className="mini-card-number">
                        {(durezaBaseFh * 10).toFixed(0)}
                        <span className="mini-card-unit">mg/L</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">mmol/L</span>
                      <strong className="mini-card-number">
                        {(durezaBaseFh * 0.1).toFixed(2)}
                        <span className="mini-card-unit">mmol/L</span>
                      </strong>
                    </div>
                  </div>

                  {/* Diagnóstico en color de la dureza */}
                  <div 
                    className="conv-dureza-badge-card" 
                    style={{ background: clasificacionDureza.bg, borderColor: clasificacionDureza.color }}
                  >
                    <div className="dureza-badge-header">
                      <span className="dureza-tag-pill" style={{ background: clasificacionDureza.color }}>
                        {clasificacionDureza.label}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: 'var(--text-main)' }}>
                      {clasificacionDureza.desc}
                    </p>
                  </div>

                  {/* Botones Rápidos */}
                  <div className="calc-quick-pills-container">
                    <span className="quick-pills-label">Valores de referencia:</span>
                    <div className="quick-pills-flex">
                      {[
                        { label: '5 ºfH (Muy blanda)', val: '5', unit: 'fh' },
                        { label: '12 ºfH (Red suave)', val: '12', unit: 'fh' },
                        { label: '25 ºfH (Moderada)', val: '25', unit: 'fh' },
                        { label: '35 ºfH (Dura)', val: '35', unit: 'fh' },
                        { label: '50 ºfH (Muy dura)', val: '50', unit: 'fh' },
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          className="conv-preset-btn"
                          onClick={() => handleDurezaChange(p.val, p.unit)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Factores Exactos de Dureza</h4>
                    <span className="calc-chip chip-cyan">Fórmulas Oficiales</span>
                  </div>

                  <div className="conv-rule-box">
                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">🔹</span>
                      <div>
                        <strong>1 ºfH = 10 mg/L de CaCO3 (ppm)</strong>
                        <p>Para pasar de grados franceses a ppm solo hay que multiplicar por 10.</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">🔹</span>
                      <div>
                        <strong>1 ºfH = 0,56 ºdH (alemanes)</strong>
                        <p>1 grado alemán equivale a 1,786 grados franceses (1 ºdH = 17,86 mg/L CaCO3).</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">⚠️</span>
                      <div>
                        <strong>Impacto en Torres de Refrigeración:</strong>
                        <p>A partir de 30 ºfH se acelera la cristalización de carbonato en el condensador si no se dosifica antiincrustante (tipo Aktiphos) o se aumentan las purgas.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. SECCIÓN CONCENTRACIÓN (% Y PPM) */}
          {conversorCat === 'concentracion' && (
            <div className="calc-conv-section animate-fade-in">
              <div className="calc-grid-2col">
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Concentración Química y Biocidas</h4>
                    <span className="calc-chip chip-rose">% y ppm</span>
                  </div>

                  <p className="calc-card-desc">
                    Convierte concentraciones entre porcentaje (%), partes por millón (ppm / mg/L), gramos por litro (g/L) y gramos por metro cúbico.
                  </p>

                  <div className="conv-input-control-row">
                    <div className="calc-input-wrapper flex-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={concInputVal}
                        onChange={e => handleConcChange(e.target.value, concInputUnit)}
                        placeholder="Introduce valor de concentración..."
                      />
                    </div>
                    <select
                      className="calc-select-styled flex-1"
                      value={concInputUnit}
                      onChange={e => handleConcChange(concInputVal, e.target.value)}
                    >
                      <option value="pct">Porcentaje (%)</option>
                      <option value="ppm">ppm (Partes por millón / mg/L)</option>
                      <option value="gl">Gramos por Litro (g/L)</option>
                      <option value="gm3">Gramos por m³ (g/m³)</option>
                    </select>
                  </div>

                  {/* Resultados */}
                  <div className="conv-results-cards-grid">
                    <div className="conv-res-mini-card highlight-rose">
                      <span className="mini-card-label">Porcentaje (%)</span>
                      <strong className="mini-card-number">
                        {(concBasePpm / 10000).toLocaleString('es-ES', { maximumFractionDigits: 4 })}
                        <span className="mini-card-unit">%</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card highlight">
                      <span className="mini-card-label">Partes por Millón (ppm / mg/L)</span>
                      <strong className="mini-card-number">
                        {concBasePpm.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                        <span className="mini-card-unit">ppm</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Gramos por Litro (g/L)</span>
                      <strong className="mini-card-number">
                        {(concBasePpm / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })}
                        <span className="mini-card-unit">g/L</span>
                      </strong>
                    </div>

                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Gramos por m³ (g/m³)</span>
                      <strong className="mini-card-number">
                        {concBasePpm.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                        <span className="mini-card-unit">g/m³</span>
                      </strong>
                    </div>
                  </div>

                  {/* Botones Rápidos */}
                  <div className="calc-quick-pills-container">
                    <span className="quick-pills-label">Concentraciones frecuentes:</span>
                    <div className="quick-pills-flex">
                      {[
                        { label: '0.2 ppm (mín. ACS)', val: '0.2', unit: 'ppm' },
                        { label: '2.0 ppm (máx. consumo)', val: '2.0', unit: 'ppm' },
                        { label: '50 ppm (choque Legionella)', val: '50', unit: 'ppm' },
                        { label: '1% (10.000 ppm)', val: '1', unit: 'pct' },
                        { label: '15% (Lejía comercial)', val: '15', unit: 'pct' },
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          className="conv-preset-btn"
                          onClick={() => handleConcChange(p.val, p.unit)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Regla de Oro en Diluciones</h4>
                    <span className="calc-chip chip-green">Fórmula</span>
                  </div>

                  <div className="conv-rule-box">
                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">🎯</span>
                      <div>
                        <strong>1% = 10.000 ppm = 10 g/L = 10.000 mg/L</strong>
                        <p>Cada 1% de riqueza equivale a 10.000 partes por millón.</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">🧪</span>
                      <div>
                        <strong>Lejía comercial al 15% (150 g/L):</strong>
                        <p>15% × 10.000 = <strong>150.000 ppm</strong> de cloro libre disponible.</p>
                      </div>
                    </div>

                    <div className="conv-rule-item">
                      <span className="conv-rule-bullet">💡</span>
                      <div>
                        <strong>1 ppm en agua = 1 g por cada metro cúbico (m³)</strong>
                        <p>Para subir 1 ppm en un aljibe de 100 m³ necesitas 100 g de cloro puro activo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. SECCIÓN PRESIÓN & TEMPERATURA */}
          {conversorCat === 'presion_temp' && (
            <div className="calc-conv-section animate-fade-in">
              <div className="calc-grid-2col">
                {/* Presión */}
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Presión en Circuitos Hidráulicos</h4>
                    <span className="calc-chip chip-blue">bar, psi, m.c.a.</span>
                  </div>

                  <div className="conv-input-control-row">
                    <div className="calc-input-wrapper flex-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={presionInputVal}
                        onChange={e => handlePresionChange(e.target.value, presionInputUnit)}
                        placeholder="Introduce presión..."
                      />
                    </div>
                    <select
                      className="calc-select-styled flex-1"
                      value={presionInputUnit}
                      onChange={e => handlePresionChange(presionInputVal, e.target.value)}
                    >
                      <option value="bar">Bar (bar)</option>
                      <option value="psi">PSI (libras/pulgada²)</option>
                      <option value="mca">m.c.a. (metros columna agua)</option>
                      <option value="atm">Atmósferas (atm)</option>
                    </select>
                  </div>

                  <div className="conv-results-cards-grid">
                    <div className="conv-res-mini-card highlight-cyan">
                      <span className="mini-card-label">Bar</span>
                      <strong className="mini-card-number">{presionBaseBar.toFixed(2)} <span className="mini-card-unit">bar</span></strong>
                    </div>
                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">PSI (lb/in²)</span>
                      <strong className="mini-card-number">{(presionBaseBar * 14.5038).toFixed(1)} <span className="mini-card-unit">psi</span></strong>
                    </div>
                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">m.c.a.</span>
                      <strong className="mini-card-number">{(presionBaseBar * 10.1972).toFixed(1)} <span className="mini-card-unit">mca</span></strong>
                    </div>
                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Atmósferas</span>
                      <strong className="mini-card-number">{(presionBaseBar * 0.986923).toFixed(2)} <span className="mini-card-unit">atm</span></strong>
                    </div>
                  </div>

                  <div className="calc-tip-box" style={{ marginTop: '14px' }}>
                    <Info size={16} color="#0284c7" />
                    <span><strong>1 bar ≈ 10 metros de altura de agua (m.c.a.)</strong> y aprox. 14,5 psi. Presión típica de red en edificios: 2,5 a 4,5 bar.</span>
                  </div>
                </div>

                {/* Temperatura */}
                <div className="calc-card">
                  <div className="calc-card-header">
                    <h4>Temperatura y Rangos de Legionella</h4>
                    <span className="calc-chip chip-amber">RD 487/2022</span>
                  </div>

                  <div className="conv-input-control-row">
                    <div className="calc-input-wrapper flex-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tempInputVal}
                        onChange={e => handleTempChange(e.target.value, tempInputUnit)}
                        placeholder="Introduce temperatura..."
                      />
                    </div>
                    <select
                      className="calc-select-styled flex-1"
                      value={tempInputUnit}
                      onChange={e => handleTempChange(tempInputVal, e.target.value)}
                    >
                      <option value="c">Grados Celsius (ºC)</option>
                      <option value="f">Grados Fahrenheit (ºF)</option>
                    </select>
                  </div>

                  <div className="conv-results-cards-grid">
                    <div className="conv-res-mini-card highlight-amber">
                      <span className="mini-card-label">Celsius (ºC)</span>
                      <strong className="mini-card-number">{tempBaseC.toFixed(1)} <span className="mini-card-unit">ºC</span></strong>
                    </div>
                    <div className="conv-res-mini-card">
                      <span className="mini-card-label">Fahrenheit (ºF)</span>
                      <strong className="mini-card-number">{((tempBaseC * 9/5) + 32).toFixed(1)} <span className="mini-card-unit">ºF</span></strong>
                    </div>
                  </div>

                  {/* Diagnóstico Legionella */}
                  <div 
                    className="conv-dureza-badge-card" 
                    style={{ background: legionellaTempZona.bg, borderColor: legionellaTempZona.color, marginTop: '14px' }}
                  >
                    <div className="dureza-badge-header">
                      <span className="dureza-tag-pill" style={{ background: legionellaTempZona.color }}>
                        {legionellaTempZona.label}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: 'var(--text-main)' }}>
                      {legionellaTempZona.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. SECCIÓN CHULETA DE BOLSILLO */}
          {conversorCat === 'chuleta' && (
            <div className="calc-conv-section animate-fade-in">
              <div className="calc-card">
                <div className="calc-card-header">
                  <h4>Chuleta Rápida de Campo (Factores Directos)</h4>
                  <span className="calc-chip chip-green">Consulta Inmediata</span>
                </div>

                <p className="calc-card-desc">
                  Tabla de bolsillo con todas las fórmulas de conversión directa para aplicar mentalmente en las visitas técnicas.
                </p>

                <div className="conv-table-wrapper">
                  <table className="conv-table">
                    <thead>
                      <tr>
                        <th>Magnitud</th>
                        <th>Conversión</th>
                        <th>Operación Directa</th>
                        <th>Ejemplo Práctico</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Conductividad</strong></td>
                        <td>mS/cm → µS/cm</td>
                        <td><span className="conv-op-badge mult">× 1.000</span></td>
                        <td>0,46 mS/cm = <strong>460 µS/cm</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Conductividad</strong></td>
                        <td>µS/cm → mS/cm</td>
                        <td><span className="conv-op-badge div">÷ 1.000</span></td>
                        <td>460 µS/cm = <strong>0,46 mS/cm</strong></td>
                      </tr>
                      <tr>
                        <td><strong>TDS Sólidos</strong></td>
                        <td>µS/cm → ppm (mg/L)</td>
                        <td><span className="conv-op-badge mult">× 0,67</span></td>
                        <td>460 µS/cm ≈ <strong>308 ppm TDS</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Volumen</strong></td>
                        <td>cm³ (cc) → ml</td>
                        <td><span className="conv-op-badge eq">= Idéntico</span></td>
                        <td>10 cm³ = <strong>10 ml</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Volumen</strong></td>
                        <td>ml → Litros (L)</td>
                        <td><span className="conv-op-badge div">÷ 1.000</span></td>
                        <td>500 ml = <strong>0,5 Litros</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Volumen</strong></td>
                        <td>Litros → m³</td>
                        <td><span className="conv-op-badge div">÷ 1.000</span></td>
                        <td>1.000 L = <strong>1 m³</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Garrafas (25 L)</strong></td>
                        <td>Garrafas → Litros</td>
                        <td><span className="conv-op-badge mult">× 25</span></td>
                        <td>2 garrafas = <strong>50 Litros</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Dureza Agua</strong></td>
                        <td>ºfH (francés) → ppm CaCO3</td>
                        <td><span className="conv-op-badge mult">× 10</span></td>
                        <td>25 ºfH = <strong>250 ppm CaCO3</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Dureza Agua</strong></td>
                        <td>ºfH → ºdH (alemán)</td>
                        <td><span className="conv-op-badge mult">× 0,56</span></td>
                        <td>25 ºfH = <strong>14,0 ºdH</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Concentración</strong></td>
                        <td>% → ppm (mg/L)</td>
                        <td><span className="conv-op-badge mult">× 10.000</span></td>
                        <td>15% = <strong>150.000 ppm</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Concentración</strong></td>
                        <td>ppm → g/L</td>
                        <td><span className="conv-op-badge div">÷ 1.000</span></td>
                        <td>50 ppm = <strong>0,05 g/L</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Presión</strong></td>
                        <td>bar → psi</td>
                        <td><span className="conv-op-badge mult">× 14,50</span></td>
                        <td>2,5 bar = <strong>36,3 psi</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Presión</strong></td>
                        <td>bar → m.c.a. (altura agua)</td>
                        <td><span className="conv-op-badge mult">× 10,20</span></td>
                        <td>3,0 bar ≈ <strong>30,6 m.c.a.</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 5: GUÍA NORMATIVA RD 487/2022 INTERACTIVA (Captura 2)     */}
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

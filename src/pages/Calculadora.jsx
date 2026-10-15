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
  const [condInputUnit, setCondInputUnit] = useState('ms'); // 'ms' (sonda) o 'us' (programa)
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

  const changeVolUnit = (newUnit) => {
    setVolInputUnit(newUnit);
    let newVal = volBaseL;
    if (newUnit === 'cm3' || newUnit === 'ml') newVal = volBaseL * 1000;
    else if (newUnit === 'L') newVal = volBaseL;
    else if (newUnit === 'm3') newVal = volBaseL / 1000;
    else if (newUnit === 'garrafas') newVal = volBaseL / 25;
    const formatted = Number.isInteger(newVal) ? newVal.toString() : parseFloat(newVal.toFixed(4)).toString();
    setVolInputVal(formatted);
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

  const changeDurezaUnit = (newUnit) => {
    setDurezaInputUnit(newUnit);
    let newVal = durezaBaseFh;
    if (newUnit === 'fh') newVal = durezaBaseFh;
    else if (newUnit === 'dh') newVal = durezaBaseFh * 0.56;
    else if (newUnit === 'ppm') newVal = durezaBaseFh * 10;
    else if (newUnit === 'mmol') newVal = durezaBaseFh * 0.1;
    const formatted = Number.isInteger(newVal) ? newVal.toString() : parseFloat(newVal.toFixed(2)).toString();
    setDurezaInputVal(formatted);
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

  const changeConcUnit = (newUnit) => {
    setConcInputUnit(newUnit);
    let newVal = concBasePpm;
    if (newUnit === 'pct') newVal = concBasePpm / 10000;
    else if (newUnit === 'ppm') newVal = concBasePpm;
    else if (newUnit === 'gl') newVal = concBasePpm / 1000;
    else if (newUnit === 'gm3') newVal = concBasePpm;
    const formatted = Number.isInteger(newVal) ? newVal.toString() : parseFloat(newVal.toFixed(4)).toString();
    setConcInputVal(formatted);
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

  const changePresionUnit = (newUnit) => {
    setPresionInputUnit(newUnit);
    let newVal = presionBaseBar;
    if (newUnit === 'bar') newVal = presionBaseBar;
    else if (newUnit === 'psi') newVal = presionBaseBar * 14.5038;
    else if (newUnit === 'mca') newVal = presionBaseBar * 10.1972;
    else if (newUnit === 'atm') newVal = presionBaseBar * 0.986923;
    const formatted = Number.isInteger(newVal) ? newVal.toString() : parseFloat(newVal.toFixed(2)).toString();
    setPresionInputVal(formatted);
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

  const changeTempUnit = (newUnit) => {
    setTempInputUnit(newUnit);
    let newVal = tempBaseC;
    if (newUnit === 'c') newVal = tempBaseC;
    else if (newUnit === 'f') newVal = (tempBaseC * 9/5) + 32;
    const formatted = Number.isInteger(newVal) ? newVal.toString() : parseFloat(newVal.toFixed(1)).toString();
    setTempInputVal(formatted);
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
          <div className="calc-intro-card">
            <div className="calc-intro-text">
              <h3>Factores de Conversión de Unidades de Campo</h3>
              <p>Mismo criterio de cálculo directo: introduce el dato medido y obtén al instante su equivalencia en el programa o normativa.</p>
            </div>
            <span className="calc-source-tag">Técnico de Campo</span>
          </div>

          {/* Subnavegación de Categorías (Píldoras limpias y accesibles) */}
          <div className="calc-conv-subnav">
            {[
              { id: 'conductividad', label: '⚡ Conductividad (mS ↔ µS)' },
              { id: 'volumen', label: '🧪 Volumen & Dosis (cm³, ml, L, garrafas)' },
              { id: 'dureza', label: '💧 Dureza del Agua (ºfH, ºdH, ppm)' },
              { id: 'concentracion', label: '🔬 Concentración (% ↔ ppm ↔ g/L)' },
              { id: 'presion_temp', label: '🌡️ Presión & Temperatura' },
              { id: 'chuleta', label: '📋 Chuleta de Bolsillo' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`calc-conv-subpill ${conversorCat === cat.id ? 'active' : ''}`}
                onClick={() => setConversorCat(cat.id)}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* 1. CONDUCTIVIDAD */}
          {conversorCat === 'conductividad' && (
            <div className="calc-grid-2col animate-fade-in">
              {/* Panel Izquierdo: Entradas */}
              <div className="calc-panel-card">
                <h4 className="calc-panel-title">
                  <Sliders size={18} color="#059669" /> Medición de la Sonda / Entrada
                </h4>

                {/* Unidad de Origen */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Sentido de la conversión</label>
                  </div>
                  <div className="calc-chip-row">
                    <button
                      type="button"
                      className={`calc-chip-btn ${condInputUnit === 'ms' ? 'active' : ''}`}
                      onClick={() => setCondInputUnit('ms')}
                    >
                      ⚡ De Sonda (mS/cm) → A Programa (µS/cm)
                    </button>
                    <button
                      type="button"
                      className={`calc-chip-btn ${condInputUnit === 'us' ? 'active' : ''}`}
                      onClick={() => setCondInputUnit('us')}
                    >
                      📝 De Programa (µS/cm) → A Sonda (mS/cm)
                    </button>
                  </div>
                </div>

                {/* Campo Principal de Entrada */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>
                      {condInputUnit === 'ms' ? 'Conductividad leída en sonda de campo' : 'Conductividad requerida en el programa'}
                    </label>
                    <span className="calc-unit-pill">
                      {condInputUnit === 'ms' ? `${condMs || 0} mS/cm` : `${condUs || 0} µS/cm`}
                    </span>
                  </div>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      value={condInputUnit === 'ms' ? condMs : condUs}
                      onChange={(e) => {
                        if (condInputUnit === 'ms') updateCondFromMs(e.target.value);
                        else updateCondFromUs(e.target.value);
                      }}
                      placeholder={condInputUnit === 'ms' ? 'Ej. 0.46' : 'Ej. 460'}
                      className="calc-main-input"
                    />
                    <span className="calc-input-suffix">
                      {condInputUnit === 'ms' ? 'mS/cm' : 'µS/cm'}
                    </span>
                  </div>

                  {/* Chips de valores rápidos habituales */}
                  <div className="calc-chip-row">
                    {condInputUnit === 'ms'
                      ? [
                          { label: '0.46 mS (Torre Expal)', val: '0.46' },
                          { label: '0.35 mS (Red blanda)', val: '0.35' },
                          { label: '0.65 mS (Red media)', val: '0.65' },
                          { label: '1.50 mS (Recirculación)', val: '1.50' },
                          { label: '2.50 mS (Límite RD 3/2023)', val: '2.50' }
                        ].map(c => (
                          <button
                            key={c.val}
                            type="button"
                            className={`calc-chip-btn ${condMs === c.val ? 'active' : ''}`}
                            onClick={() => updateCondFromMs(c.val)}
                          >
                            {c.label}
                          </button>
                        ))
                      : [
                          { label: '460 µS (Torre Expal)', val: '460' },
                          { label: '350 µS (Red blanda)', val: '350' },
                          { label: '650 µS (Red media)', val: '650' },
                          { label: '1.500 µS (Recirculación)', val: '1500' },
                          { label: '2.500 µS (Límite RD 3/2023)', val: '2500' }
                        ].map(c => (
                          <button
                            key={c.val}
                            type="button"
                            className={`calc-chip-btn ${condUs === c.val ? 'active' : ''}`}
                            onClick={() => updateCondFromUs(c.val)}
                          >
                            {c.label}
                          </button>
                        ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resultados */}
              <div className="calc-panel-results">
                {/* Tarjeta Hero de Resultado */}
                <div className="calc-result-card border-optimo">
                  <span className="calc-result-badge">VALOR CONVERTIDO RESULTANTE</span>
                  <div className="calc-result-big-number">
                    <strong>{condInputUnit === 'ms' ? (condUs || '0') : (condMs || '0')}</strong>
                    <span>{condInputUnit === 'ms' ? 'µS/cm' : 'mS/cm'}</span>
                  </div>
                  <p className="calc-result-subtext">
                    {condInputUnit === 'ms'
                      ? `${condMs || 0} mS/cm leídos en la sonda equivalen a ${condUs || 0} µS/cm para registrar en el programa.`
                      : `${condUs || 0} µS/cm solicitados en el programa equivalen a ${condMs || 0} mS/cm en la lectura de la sonda.`}
                  </p>

                  <div className="calc-compare-row">
                    <div className="calc-compare-item">
                      <span>TDS Estimado (Agua Red · factor 0.67):</span>
                      <strong>
                        {((parseFloat(String(condUs).replace(',', '.')) || 0) * 0.67).toFixed(1)} ppm (mg/L)
                      </strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Factor de Cálculo:</span>
                      <strong className="calc-tag-factor state-optimo">
                        {condInputUnit === 'ms' ? '× 1.000' : '÷ 1.000'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico / Consejo Técnico */}
                <div className="calc-diagnostic-card state-optimo">
                  <div className="calc-diag-top">
                    <div className="calc-diag-icon">
                      <CheckCircle2 size={24} color="#16a34a" />
                    </div>
                    <div className="calc-diag-header">
                      <h4>Regla Rápida de Campo</h4>
                      <p>
                        Para pasar de <strong>mS a µS</strong> (sonda al programa) multiplica por <strong>1.000</strong> (ej: 0,46 × 1.000 = <strong>460 µS</strong>). Para pasar de <strong>µS a mS</strong> divide entre <strong>1.000</strong> (ej: 460 ÷ 1.000 = <strong>0,46 mS</strong>).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla de Referencia Rápida */}
                <div className="calc-ph-table-card">
                  <h5>Rangos de Conductividad en Aguas Reales (RD 3/2023 & RD 487/2022)</h5>
                  <div className="calc-ph-mini-table">
                    <div className="calc-ph-row highlight">
                      <span className="col-ph">&lt; 20 µS</span>
                      <span className="col-factor">&lt; 0.02 mS</span>
                      <span className="col-eff opt">Ósmosis / Desmin.</span>
                      <span className="col-desc">Purgas calderas</span>
                    </div>
                    <div className="calc-ph-row">
                      <span className="col-ph">200-800 µS</span>
                      <span className="col-factor">0.2-0.8 mS</span>
                      <span className="col-eff good">Red de Consumo</span>
                      <span className="col-desc">Agua potable habitual</span>
                    </div>
                    <div className="calc-ph-row">
                      <span className="col-ph">1.200-2.400 µS</span>
                      <span className="col-factor">1.2-2.4 mS</span>
                      <span className="col-eff warn">Torres de Refrig.</span>
                      <span className="col-desc">Ciclos de balsa</span>
                    </div>
                    <div className="calc-ph-row">
                      <span className="col-ph">2.500 µS</span>
                      <span className="col-factor">2.5 mS</span>
                      <span className="col-eff bad">Límite RD 3/2023</span>
                      <span className="col-desc">Purga obligatoria</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. VOLUMEN & DOSIS */}
          {conversorCat === 'volumen' && (
            <div className="calc-grid-2col animate-fade-in">
              {/* Panel Izquierdo: Entradas */}
              <div className="calc-panel-card">
                <h4 className="calc-panel-title">
                  <Sliders size={18} color="#0284c7" /> Cantidad y Unidad de Volumen
                </h4>

                {/* Unidad de Origen */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Unidad que tienes en mano o en el envase</label>
                  </div>
                  <div className="calc-chip-row">
                    {[
                      { id: 'cm3', label: 'cm³ / cc (Centímetros cúbicos)' },
                      { id: 'ml', label: 'ml (Mililitros)' },
                      { id: 'L', label: 'L (Litros)' },
                      { id: 'garrafas', label: 'Garrafas (25 L)' },
                      { id: 'm3', label: 'm³ (Metros cúbicos)' }
                    ].map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className={`calc-chip-btn ${volInputUnit === u.id ? 'active' : ''}`}
                        onClick={() => changeVolUnit(u.id)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo Principal de Entrada */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Cantidad a convertir</label>
                    <span className="calc-unit-pill">
                      {volInputVal} {volInputUnit}
                    </span>
                  </div>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      value={volInputVal}
                      onChange={(e) => handleVolInputChange(e.target.value, volInputUnit)}
                      placeholder="Ej. 10"
                      className="calc-main-input"
                    />
                    <span className="calc-input-suffix">{volInputUnit}</span>
                  </div>

                  {/* Chips de valores rápidos */}
                  <div className="calc-chip-row">
                    {[
                      { label: '10 cm³ (probeta)', val: '10', unit: 'cm3' },
                      { label: '50 ml (dosis plagas)', val: '50', unit: 'ml' },
                      { label: '250 ml (1/4 L)', val: '250', unit: 'ml' },
                      { label: '1 L (1.000 ml)', val: '1', unit: 'L' },
                      { label: '25 L (1 garrafa Ferrocid)', val: '25', unit: 'L' },
                      { label: '1 m³ (1.000 L / IBC)', val: '1', unit: 'm3' },
                      { label: '25 m³ (aljibe / torre)', val: '25', unit: 'm3' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`calc-chip-btn ${volInputVal == p.val && volInputUnit === p.unit ? 'active' : ''}`}
                        onClick={() => handleVolInputChange(p.val, p.unit)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resultados */}
              <div className="calc-panel-results">
                <div className="calc-result-card border-optimo">
                  <span className="calc-result-badge">EQUIVALENCIAS SIMULTÁNEAS</span>
                  <div className="calc-result-big-number">
                    <strong>
                      {volInputUnit === 'cm3' || volInputUnit === 'ml'
                        ? (volBaseL >= 1 ? volBaseL.toLocaleString('es-ES', { maximumFractionDigits: 3 }) : (volBaseL * 1000).toLocaleString('es-ES'))
                        : volInputUnit === 'L'
                        ? (volBaseL / 25).toLocaleString('es-ES', { maximumFractionDigits: 2 })
                        : volBaseL.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                    </strong>
                    <span>
                      {volInputUnit === 'cm3' || volInputUnit === 'ml'
                        ? (volBaseL >= 1 ? 'Litros (L)' : 'ml (cm³)')
                        : volInputUnit === 'L'
                        ? 'Garrafas (25 L)'
                        : 'Litros (L)'}
                    </span>
                  </div>
                  <p className="calc-result-subtext">
                    {volInputVal} {volInputUnit} corresponden a las siguientes medidas estándar:
                  </p>

                  <div className="calc-compare-row">
                    <div className="calc-compare-item">
                      <span>Mililitros (ml) = cm³:</span>
                      <strong>{(volBaseL * 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} ml</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Litros (L):</span>
                      <strong>{volBaseL.toLocaleString('es-ES', { maximumFractionDigits: 4 })} L</strong>
                    </div>
                  </div>

                  <div className="calc-compare-row" style={{ marginTop: '10px' }}>
                    <div className="calc-compare-item">
                      <span>Garrafas Estándar (25 L):</span>
                      <strong>{(volBaseL / 25).toLocaleString('es-ES', { maximumFractionDigits: 3 })} garrafas</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Metros Cúbicos (m³):</span>
                      <strong>{(volBaseL / 1000).toLocaleString('es-ES', { maximumFractionDigits: 6 })} m³</strong>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico / Consejo */}
                <div className="calc-diagnostic-card state-optimo">
                  <div className="calc-diag-top">
                    <div className="calc-diag-icon">
                      <CheckCircle2 size={24} color="#16a34a" />
                    </div>
                    <div className="calc-diag-header">
                      <h4>Equivalencia Exacta de Volumen</h4>
                      <p>
                        <strong>1 centímetro cúbico (cm³) es EXACTAMENTE 1 mililitro (ml)</strong> (10 cm³ = 10 ml). 
                        1 Litro = 1.000 ml = 1.000 cm³. 
                        1 m³ = 1.000 Litros = 40 garrafas de 25 L.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DUREZA DEL AGUA */}
          {conversorCat === 'dureza' && (
            <div className="calc-grid-2col animate-fade-in">
              {/* Panel Izquierdo: Entradas */}
              <div className="calc-panel-card">
                <h4 className="calc-panel-title">
                  <Sliders size={18} color="#d97706" /> Medición de Dureza del Agua
                </h4>

                {/* Unidad de Origen */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Unidad de la analítica o kit</label>
                  </div>
                  <div className="calc-chip-row">
                    {[
                      { id: 'fh', label: 'ºfH (Grados Franceses)' },
                      { id: 'dh', label: 'ºdH (Grados Alemanes)' },
                      { id: 'ppm', label: 'ppm CaCO3 (mg/L)' },
                      { id: 'mmol', label: 'mmol/L (Ca²⁺+Mg²⁺)' }
                    ].map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className={`calc-chip-btn ${durezaInputUnit === u.id ? 'active' : ''}`}
                        onClick={() => changeDurezaUnit(u.id)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo Principal de Entrada */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Valor de dureza analizado</label>
                    <span className="calc-unit-pill">
                      {durezaInputVal} {durezaInputUnit === 'fh' ? 'ºfH' : durezaInputUnit === 'dh' ? 'ºdH' : durezaInputUnit === 'ppm' ? 'ppm' : 'mmol/L'}
                    </span>
                  </div>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      value={durezaInputVal}
                      onChange={(e) => handleDurezaChange(e.target.value, durezaInputUnit)}
                      placeholder="Ej. 25"
                      className="calc-main-input"
                    />
                    <span className="calc-input-suffix">
                      {durezaInputUnit === 'fh' ? 'ºfH' : durezaInputUnit === 'dh' ? 'ºdH' : durezaInputUnit === 'ppm' ? 'ppm' : 'mmol/L'}
                    </span>
                  </div>

                  {/* Chips de valores de referencia */}
                  <div className="calc-chip-row">
                    {[
                      { label: '5 ºfH (Muy blanda)', val: '5', unit: 'fh' },
                      { label: '12 ºfH (Red suave)', val: '12', unit: 'fh' },
                      { label: '25 ºfH (Red media)', val: '25', unit: 'fh' },
                      { label: '35 ºfH (Agua dura)', val: '35', unit: 'fh' },
                      { label: '50 ºfH (Muy dura)', val: '50', unit: 'fh' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`calc-chip-btn ${durezaBaseFh == p.val ? 'active' : ''}`}
                        onClick={() => handleDurezaChange(p.val, p.unit)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resultados */}
              <div className="calc-panel-results">
                <div className="calc-result-card border-optimo">
                  <span className="calc-result-badge">CLASIFICACIÓN OFICIAL DE DUREZA</span>
                  <div className="calc-result-big-number">
                    <strong>{durezaBaseFh.toFixed(1)}</strong>
                    <span style={{ color: clasificacionDureza.color }}>ºfH</span>
                  </div>
                  <p className="calc-result-subtext">
                    <strong>{clasificacionDureza.label}:</strong> {clasificacionDureza.desc}
                  </p>

                  <div className="calc-compare-row">
                    <div className="calc-compare-item">
                      <span>ppm CaCO3 (mg/L):</span>
                      <strong>{(durezaBaseFh * 10).toFixed(0)} mg/L</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Grados Alemanes (ºdH):</span>
                      <strong>{(durezaBaseFh * 0.56).toFixed(1)} ºdH</strong>
                    </div>
                  </div>

                  <div className="calc-compare-row" style={{ marginTop: '10px' }}>
                    <div className="calc-compare-item">
                      <span>mmol/L:</span>
                      <strong>{(durezaBaseFh * 0.1).toFixed(2)} mmol/L</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Regla directa:</span>
                      <strong className="calc-tag-factor state-optimo">1 ºfH = 10 ppm CaCO3</strong>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico */}
                <div className={`calc-diagnostic-card ${durezaBaseFh > 30 ? 'state-insuficiente' : 'state-optimo'}`}>
                  <div className="calc-diag-top">
                    <div className="calc-diag-icon">
                      {durezaBaseFh > 30 ? <AlertTriangle size={24} color="#d97706" /> : <CheckCircle2 size={24} color="#16a34a" />}
                    </div>
                    <div className="calc-diag-header">
                      <h4>{durezaBaseFh > 30 ? 'Atención en Circuitos Térmicos' : 'Estado Químico Favorable'}</h4>
                      <p>
                        {durezaBaseFh > 30
                          ? 'A partir de 30 ºfH se acelera la formación de incrustaciones de carbonato en intercambiadores y relleno de torres si no se añade antiincrustante (tipo Aktiphos) o se purga con mayor frecuencia.'
                          : 'Rango de dureza controlado para calderas y circuitos cerrados, con menor tendencia a la precipitación de cal.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla Escala Dureza */}
                <div className="calc-ph-table-card">
                  <h5>Escala de Dureza del Agua (ºfH)</h5>
                  <div className="calc-ph-mini-table">
                    <div className={`calc-ph-row ${durezaBaseFh < 7 ? 'highlight' : ''}`}>
                      <span className="col-ph">&lt; 7 ºfH</span>
                      <span className="col-factor">&lt; 70 ppm</span>
                      <span className="col-eff opt">Muy Blanda</span>
                      <span className="col-desc">Baja mineralización (corrosiva)</span>
                    </div>
                    <div className={`calc-ph-row ${durezaBaseFh >= 7 && durezaBaseFh <= 15 ? 'highlight' : ''}`}>
                      <span className="col-ph">7 - 15 ºfH</span>
                      <span className="col-factor">70-150 ppm</span>
                      <span className="col-eff good">Blanda</span>
                      <span className="col-desc">Óptima de consumo y calderas</span>
                    </div>
                    <div className={`calc-ph-row ${durezaBaseFh > 15 && durezaBaseFh <= 30 ? 'highlight' : ''}`}>
                      <span className="col-ph">15 - 30 ºfH</span>
                      <span className="col-factor">150-300 ppm</span>
                      <span className="col-eff warn">Moderada</span>
                      <span className="col-desc">Red estándar habitual</span>
                    </div>
                    <div className={`calc-ph-row ${durezaBaseFh > 30 && durezaBaseFh <= 45 ? 'highlight' : ''}`}>
                      <span className="col-ph">30 - 45 ºfH</span>
                      <span className="col-factor">300-450 ppm</span>
                      <span className="col-eff bad">Dura</span>
                      <span className="col-desc">Incrustante en torres</span>
                    </div>
                    <div className={`calc-ph-row ${durezaBaseFh > 45 ? 'highlight' : ''}`}>
                      <span className="col-ph">&gt; 45 ºfH</span>
                      <span className="col-factor">&gt; 450 ppm</span>
                      <span className="col-eff crit">Muy Dura</span>
                      <span className="col-desc">Alto riesgo de cal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. CONCENTRACIÓN (% Y PPM) */}
          {conversorCat === 'concentracion' && (
            <div className="calc-grid-2col animate-fade-in">
              {/* Panel Izquierdo: Entradas */}
              <div className="calc-panel-card">
                <h4 className="calc-panel-title">
                  <Sliders size={18} color="#e11d48" /> Concentración Química y Dilución
                </h4>

                {/* Unidad de Origen */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Unidad expresada en ficha técnica o analítica</label>
                  </div>
                  <div className="calc-chip-row">
                    {[
                      { id: 'pct', label: '% (Porcentaje)' },
                      { id: 'ppm', label: 'ppm (mg/L)' },
                      { id: 'gl', label: 'g/L (Gramos/Litro)' },
                      { id: 'gm3', label: 'g/m³ (Gramos/m³)' }
                    ].map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className={`calc-chip-btn ${concInputUnit === u.id ? 'active' : ''}`}
                        onClick={() => changeConcUnit(u.id)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo Principal de Entrada */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Concentración a convertir</label>
                    <span className="calc-unit-pill">
                      {concInputVal} {concInputUnit === 'pct' ? '%' : concInputUnit === 'ppm' ? 'ppm' : concInputUnit === 'gl' ? 'g/L' : 'g/m³'}
                    </span>
                  </div>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      value={concInputVal}
                      onChange={(e) => handleConcChange(e.target.value, concInputUnit)}
                      placeholder="Ej. 15"
                      className="calc-main-input"
                    />
                    <span className="calc-input-suffix">
                      {concInputUnit === 'pct' ? '%' : concInputUnit === 'ppm' ? 'ppm' : concInputUnit === 'gl' ? 'g/L' : 'g/m³'}
                    </span>
                  </div>

                  {/* Chips rápidos */}
                  <div className="calc-chip-row">
                    {[
                      { label: '0.2 ppm (mín. ACS)', val: '0.2', unit: 'ppm' },
                      { label: '2.0 ppm (máx. consumo)', val: '2.0', unit: 'ppm' },
                      { label: '20 ppm (choque torre)', val: '20', unit: 'ppm' },
                      { label: '50 ppm (choque Legionella)', val: '50', unit: 'ppm' },
                      { label: '1% (10.000 ppm)', val: '1', unit: 'pct' },
                      { label: '15% (Lejía comercial)', val: '15', unit: 'pct' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`calc-chip-btn ${concBasePpm == (p.unit === 'pct' ? p.val * 10000 : p.val) ? 'active' : ''}`}
                        onClick={() => handleConcChange(p.val, p.unit)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resultados */}
              <div className="calc-panel-results">
                <div className="calc-result-card border-optimo">
                  <span className="calc-result-badge">CONCENTRACIÓN EQUIVALENTE</span>
                  <div className="calc-result-big-number">
                    <strong>
                      {concInputUnit === 'pct'
                        ? concBasePpm.toLocaleString('es-ES')
                        : (concBasePpm / 10000).toLocaleString('es-ES', { maximumFractionDigits: 4 })}
                    </strong>
                    <span>{concInputUnit === 'pct' ? 'ppm (mg/L)' : '%'}</span>
                  </div>
                  <p className="calc-result-subtext">
                    {concInputVal} {concInputUnit === 'pct' ? '%' : concInputUnit} equivalen en disolución acuosa a:
                  </p>

                  <div className="calc-compare-row">
                    <div className="calc-compare-item">
                      <span>Porcentaje (%):</span>
                      <strong>{(concBasePpm / 10000).toLocaleString('es-ES', { maximumFractionDigits: 4 })} %</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Partes por Millón (ppm):</span>
                      <strong>{concBasePpm.toLocaleString('es-ES')} ppm</strong>
                    </div>
                  </div>

                  <div className="calc-compare-row" style={{ marginTop: '10px' }}>
                    <div className="calc-compare-item">
                      <span>Gramos por Litro (g/L):</span>
                      <strong>{(concBasePpm / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })} g/L</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Gramos por m³ (g/m³):</span>
                      <strong>{concBasePpm.toLocaleString('es-ES')} g/m³</strong>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico */}
                <div className="calc-diagnostic-card state-optimo">
                  <div className="calc-diag-top">
                    <div className="calc-diag-icon">
                      <CheckCircle2 size={24} color="#16a34a" />
                    </div>
                    <div className="calc-diag-header">
                      <h4>Regla de Oro en Diluciones</h4>
                      <p>
                        <strong>1% = 10.000 ppm = 10 g/L = 10.000 mg/L</strong>.<br />
                        Lejía comercial al 15% (150 g/L) = <strong>150.000 ppm</strong> de cloro disponible.<br />
                        1 ppm en agua equivale exactamente a <strong>1 g por cada metro cúbico (m³)</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. PRESIÓN & TEMPERATURA */}
          {conversorCat === 'presion_temp' && (
            <div className="calc-grid-2col animate-fade-in">
              {/* Panel Izquierdo: Entradas */}
              <div className="calc-panel-card">
                <h4 className="calc-panel-title">
                  <Sliders size={18} color="#0284c7" /> Circuitos Hidráulicos & Temperatura
                </h4>

                {/* Presión */}
                <div className="calc-field-group">
                  <div className="calc-field-header">
                    <label>Presión en circuito o manómetro</label>
                    <span className="calc-unit-pill">{presionInputVal} {presionInputUnit}</span>
                  </div>
                  <div className="calc-chip-row" style={{ marginBottom: '8px' }}>
                    {[
                      { id: 'bar', label: 'Bar' },
                      { id: 'psi', label: 'PSI' },
                      { id: 'mca', label: 'm.c.a. (metros agua)' },
                      { id: 'atm', label: 'Atmósferas' }
                    ].map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className={`calc-chip-btn ${presionInputUnit === u.id ? 'active' : ''}`}
                        onClick={() => changePresionUnit(u.id)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      value={presionInputVal}
                      onChange={(e) => handlePresionChange(e.target.value, presionInputUnit)}
                      className="calc-main-input"
                    />
                    <span className="calc-input-suffix">{presionInputUnit}</span>
                  </div>
                  <div className="calc-chip-row">
                    {[
                      { label: '1.5 bar (circuito)', val: '1.5', unit: 'bar' },
                      { label: '2.5 bar (red edificio)', val: '2.5', unit: 'bar' },
                      { label: '4.0 bar (alta presión)', val: '4.0', unit: 'bar' },
                      { label: '6.0 bar (bomba presión)', val: '6.0', unit: 'bar' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`calc-chip-btn ${presionBaseBar == p.val ? 'active' : ''}`}
                        onClick={() => handlePresionChange(p.val, p.unit)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperatura */}
                <div className="calc-field-group" style={{ marginTop: '24px' }}>
                  <div className="calc-field-header">
                    <label>Temperatura del agua</label>
                    <span className="calc-unit-pill">{tempInputVal} º{tempInputUnit.toUpperCase()}</span>
                  </div>
                  <div className="calc-chip-row" style={{ marginBottom: '8px' }}>
                    {[
                      { id: 'c', label: 'Celsius (ºC)' },
                      { id: 'f', label: 'Fahrenheit (ºF)' }
                    ].map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className={`calc-chip-btn ${tempInputUnit === u.id ? 'active' : ''}`}
                        onClick={() => changeTempUnit(u.id)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      value={tempInputVal}
                      onChange={(e) => handleTempChange(e.target.value, tempInputUnit)}
                      className="calc-main-input"
                    />
                    <span className="calc-input-suffix">º{tempInputUnit.toUpperCase()}</span>
                  </div>
                  <div className="calc-chip-row">
                    {[
                      { label: '18 ºC (red fría)', val: '18', unit: 'c' },
                      { label: '37 ºC (óptimo Legionella)', val: '37', unit: 'c' },
                      { label: '50 ºC (ACS retorno)', val: '50', unit: 'c' },
                      { label: '60 ºC (ACS acumulador)', val: '60', unit: 'c' },
                      { label: '70 ºC (choque térmico)', val: '70', unit: 'c' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`calc-chip-btn ${tempBaseC == p.val ? 'active' : ''}`}
                        onClick={() => handleTempChange(p.val, p.unit)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resultados */}
              <div className="calc-panel-results">
                {/* Resultado Presión */}
                <div className="calc-result-card border-optimo">
                  <span className="calc-result-badge">PRESIÓN CONVERTIDA</span>
                  <div className="calc-result-big-number">
                    <strong>{presionBaseBar.toFixed(2)}</strong>
                    <span>bar</span>
                  </div>
                  <div className="calc-compare-row">
                    <div className="calc-compare-item">
                      <span>PSI (lb/in²):</span>
                      <strong>{(presionBaseBar * 14.5038).toFixed(1)} psi</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>m.c.a. (altura agua):</span>
                      <strong>{(presionBaseBar * 10.1972).toFixed(1)} mca</strong>
                    </div>
                  </div>
                  <div className="calc-compare-row" style={{ marginTop: '10px' }}>
                    <div className="calc-compare-item">
                      <span>Atmósferas:</span>
                      <strong>{(presionBaseBar * 0.986923).toFixed(2)} atm</strong>
                    </div>
                    <div className="calc-compare-item">
                      <span>Regla rápida:</span>
                      <strong className="calc-tag-factor state-optimo">1 bar ≈ 10 mca ≈ 14,5 psi</strong>
                    </div>
                  </div>
                </div>

                {/* Resultado Temperatura & Legionella */}
                <div className="calc-result-card border-optimo">
                  <span className="calc-result-badge">TEMPERATURA & RD 487/2022</span>
                  <div className="calc-result-big-number">
                    <strong>{tempBaseC.toFixed(1)}</strong>
                    <span>ºC ({((tempBaseC * 9/5) + 32).toFixed(1)} ºF)</span>
                  </div>
                  <p className="calc-result-subtext" style={{ color: legionellaTempZona.color, fontWeight: 700 }}>
                    {legionellaTempZona.label}: {legionellaTempZona.desc}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. CHULETA DE BOLSILLO */}
          {conversorCat === 'chuleta' && (
            <div className="calc-panel-card animate-fade-in" style={{ width: '100%' }}>
              <h4 className="calc-panel-title">
                <CheckCircle2 size={18} color="#16a34a" /> Chuleta Rápida de Bolsillo (Factores Directos)
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Fórmulas directas para realizar conversiones mentales al instante en visitas técnicas e inspecciones.
              </p>

              <div className="conv-table-wrapper">
                <table className="conv-table">
                  <thead>
                    <tr>
                      <th>Magnitud</th>
                      <th>Conversión</th>
                      <th>Operación Directa</th>
                      <th>Ejemplo Práctico en Campo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Conductividad</strong></td>
                      <td>mS/cm → µS/cm</td>
                      <td><span className="conv-op-badge mult">× 1.000</span></td>
                      <td>0,46 mS/cm (sonda) = <strong>460 µS/cm</strong> (programa)</td>
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
                      <td>2 garrafas Ferrocid = <strong>50 Litros</strong></td>
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
                      <td>50 ppm = <strong>0,05 g/L</strong> (1 ppm = 1 g/m³)</td>
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

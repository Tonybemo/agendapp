import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createPortal } from 'react-dom';
import { 
  BarChart2, Droplet, MapPin, Briefcase, Bug, Wind, FlaskConical,
  Calendar, TrendingUp, Filter, Search, Download, Users, Trophy,
  ChevronDown, ChevronUp, X, Clock, Zap, Euro, Car
} from 'lucide-react';
import { mockLocalidadStats } from '../data/mockAvisomap';
import { supabase } from '../lib/supabase';
import { mockWorkappData } from '../data/mockWorkapp';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import './Estadisticas.css';

const TREATMENT_TYPES = [
  { id: 'Hipercloracion', label: 'Hipercloración', color: '#a855f7' },
  { id: 'Choque', label: 'Choque', color: '#f43f5e' },
  { id: 'LimpTorres', label: 'L. Torres', color: '#3b82f6' },
  { id: 'LimpDep', label: 'L. Depósitos', color: '#10b981' },
  { id: 'Estandar', label: 'M. Estándar', color: '#eab308' },
  { id: 'Torre', label: 'M. Torre', color: '#f97316' },
  { id: 'Piscina/Jacuzzi', label: 'M. Piscina/Jac.', color: '#06b6d4' }
];

const TREATMENT_COLOR_MAP = {
  'Hipercloracion': '#a855f7',
  'Choque': '#f43f5e',
  'LimpTorres': '#3b82f6',
  'LimpDep': '#10b981',
  'Estandar': '#eab308',
  'Torre': '#f97316',
  'Piscina/Jacuzzi': '#06b6d4',
  'Piscina': '#06b6d4',
  'Jacuzzi': '#06b6d4'
};

const TREATMENT_LABEL_MAP = {
  'Hipercloracion': 'Hipercloración',
  'Choque': 'Choque',
  'LimpTorres': 'L. Torres',
  'LimpDep': 'L. Depósitos',
  'Estandar': 'M. Estándar',
  'Torre': 'M. Torre',
  'Piscina/Jacuzzi': 'M. Piscina/Jac.'
};

const parsePlagas = (plagas) => {
  let arr = [];
  if (Array.isArray(plagas)) {
    arr = plagas;
  } else if (typeof plagas === 'string') {
    try {
      const parsed = JSON.parse(plagas);
      arr = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      let cleaned = plagas;
      if (cleaned.startsWith('{') && cleaned.endsWith('}')) cleaned = cleaned.slice(1, -1);
      if (cleaned.startsWith('[') && cleaned.endsWith(']')) cleaned = cleaned.slice(1, -1);
      arr = cleaned.split(',');
    }
  }
  
  return arr.map(p => {
    if (typeof p !== 'string') return String(p);
    let cleaned = p.trim();
    while (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      try {
        const inner = JSON.parse(cleaned);
        if (Array.isArray(inner)) cleaned = inner.join(' ');
        else cleaned = String(inner);
      } catch (e) {
        cleaned = cleaned.slice(1, -1);
      }
    }
    return cleaned.replace(/^[\[\]"'\\\s]+|[\[\]"'\\\s]+$/g, '').trim();
  }).filter(Boolean);
};

const Estadisticas = () => {
  const [activeSection, setActiveSection] = useState('aquapp');
  const [tableTooltip, setTableTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  const sections = [
    { id: 'aquapp', label: 'Muestras y Trat.', icon: Droplet, color: '#0ea5e9' },
    { id: 'avisomap', label: 'Avisos Mapfre', icon: MapPin, color: '#10b981' },
    { id: 'workapp', label: 'Jornada', icon: Briefcase, color: '#8b5cf6' },
  ];

  // Aquapp State
  const [aquappMuestrasRaw, setAquappMuestrasRaw] = useState([]);
  const [aquappTratamientosRaw, setAquappTratamientosRaw] = useState([]);
  const [aquappYearFilter, setAquappYearFilter] = useState(() => localStorage.getItem('est_aquapp_year') || new Date().getFullYear().toString());
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedTreatmentFilters, setSelectedTreatmentFilters] = useState([]);
  const [expandedClients, setExpandedClients] = useState({});
  const [aquappStats, setAquappStats] = useState({
    availableYears: [],
    muestrasChartData: [],
    tratamientosChartData: [],
    clientTableData: [],
    totalClientes: 0,
    totalTratamientos: 0,
    mesPico: '-'
  });

  const toggleTreatmentFilter = (typeId) => {
    setSelectedTreatmentFilters(prev => 
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const toggleClientExpand = (clientName) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  // Avisomap State
  const [avisomapAvisosRaw, setAvisomapAvisosRaw] = useState([]);
  const [avisomapYearFilter, setAvisomapYearFilter] = useState(() => localStorage.getItem('est_avisomap_year') || 'Todos');
  const [avisomapStats, setAvisomapStats] = useState({
    total: 0,
    plagas: [],
    localidades: [],
    availableYears: []
  });

  // Workapp State
  const [jornadas, setJornadas] = useState([]);
  const [workappFiltro, setWorkappFiltro] = useState(() => {
    const saved = localStorage.getItem('est_workapp_filtro');
    return saved ? JSON.parse(saved) : { desde: '', hasta: '' };
  });

  React.useEffect(() => { localStorage.setItem('est_aquapp_year', aquappYearFilter); }, [aquappYearFilter]);
  React.useEffect(() => { localStorage.setItem('est_avisomap_year', avisomapYearFilter); }, [avisomapYearFilter]);
  React.useEffect(() => { localStorage.setItem('est_workapp_filtro', JSON.stringify(workappFiltro)); }, [workappFiltro]);
  const [workappResultados, setWorkappResultados] = useState({
    totalHoras: '0',
    totalExtras: '0',
    importe: '0',
    chartData: [],
    monthlyExtras: []
  });

  const [jornadaSearchQuery, setJornadaSearchQuery] = useState('');

  const setDatePreset = (preset) => {
    const now = new Date();
    let start, end;
    const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    if (preset === 'este_mes') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'mes_anterior') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'ultimos_3_meses') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'este_ano') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }
    
    if (start && end) {
      setWorkappFiltro({ desde: formatYMD(start), hasta: formatYMD(end) });
    }
  };

  const parseJDateHelper = (fecha) => {
    if (!fecha) return null;
    if (fecha.includes('-')) {
      const [y, m, d] = fecha.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else if (fecha.includes('/')) {
      const [d, m, y] = fecha.split('/');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return null;
  };

  const jornadasEnRangoDetalle = useMemo(() => {
    if (!workappFiltro.desde || !workappFiltro.hasta || !jornadas || jornadas.length === 0) return [];
    
    const [dY, dM, dD] = workappFiltro.desde.split('-');
    const dateDesde = new Date(parseInt(dY), parseInt(dM) - 1, parseInt(dD));
    const [hY, hM, hD] = workappFiltro.hasta.split('-');
    const dateHasta = new Date(parseInt(hY), parseInt(hM) - 1, parseInt(hD));

    return jornadas.filter(j => {
      const jDate = parseJDateHelper(j.fecha);
      if (!jDate) return false;
      const inRange = jDate >= dateDesde && jDate <= dateHasta;
      if (!inRange) return false;

      if (jornadaSearchQuery.trim()) {
        const q = jornadaSearchQuery.toLowerCase();
        const matchFecha = (j.fecha || '').toLowerCase().includes(q);
        const matchMatricula = (j.matricula || '').toLowerCase().includes(q);
        const matchParadas = typeof j.paradas === 'string' 
          ? j.paradas.toLowerCase().includes(q) 
          : Array.isArray(j.paradas) 
            ? j.paradas.some(p => String(p).toLowerCase().includes(q)) 
            : false;
        return matchFecha || matchMatricula || matchParadas;
      }
      return true;
    }).sort((a, b) => {
      const da = parseJDateHelper(a.fecha);
      const db = parseJDateHelper(b.fecha);
      return db - da;
    });
  }, [jornadas, workappFiltro, jornadaSearchQuery]);

  React.useEffect(() => {
    const fetchJornadas = async () => {
      const { data } = await supabase.from('workapp_jornadas').select('*');
      if (data) {
        setJornadas(data);
        if (!workappFiltro.desde && !workappFiltro.hasta) {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          setWorkappFiltro({ desde: formatYMD(start), hasta: formatYMD(end) });
        }
      }
    };

    const fetchAvisos = async () => {
      const { data } = await supabase.from('avisomap_avisos').select('*');
      if (data) {
        setAvisomapAvisosRaw(data);
      }
    };

    const fetchAquapp = async () => {
      const { data: muestras } = await supabase.from('aquapp_muestras').select('fecha, cliente_nombre, tipo_muestra');
      const { data: trat } = await supabase.from('aquapp_tratamientos').select('fecha, tipo_tratamiento, cliente_nombre');
      if (muestras) setAquappMuestrasRaw(muestras);
      if (trat) setAquappTratamientosRaw(trat);
    };

    fetchJornadas();
    fetchAvisos();
    fetchAquapp();
  }, []);

  React.useEffect(() => {
    if (aquappMuestrasRaw.length >= 0 && aquappTratamientosRaw.length >= 0) {
      const yearsSet = new Set();
      const getYear = (f) => {
        if (!f) return null;
        if (f.includes('-')) return f.split('-')[0];
        if (f.includes('/')) return f.split('/')[2];
        return null;
      };
      const getMonth = (f) => {
        if (!f) return null;
        if (f.includes('-')) return parseInt(f.split('-')[1], 10) - 1;
        if (f.includes('/')) return parseInt(f.split('/')[1], 10) - 1;
        return null;
      };

      aquappMuestrasRaw.forEach(m => { const y = getYear(m.fecha); if (y) yearsSet.add(y); });
      aquappTratamientosRaw.forEach(t => { const y = getYear(t.fecha); if (y) yearsSet.add(y); });
      
      const yearsArr = Array.from(yearsSet).sort((a,b) => b.localeCompare(a));

      const filterYear = aquappYearFilter || (yearsArr.length > 0 ? yearsArr[0] : new Date().getFullYear().toString());

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mData = months.map(m => ({ mes: m, ClientesSet: new Set() }));
      const tData = months.map(m => ({ mes: m, Hipercloracion: 0, Choque: 0, LimpTorres: 0, LimpDep: 0 }));
      const clientTable = {};

      const initClient = (name) => {
         if (!clientTable[name]) clientTable[name] = Array.from({length: 12}, () => []);
      };

      const aquappAddEvent = (name, mIdx, group, rawType) => {
        if (!name) return;
        initClient(name);
        const arr = clientTable[name][mIdx];
        const tLower = (rawType || '').toLowerCase();
        let evType = rawType;
        if (group === 'tratamiento') {
          if (tLower.includes('hiper')) evType = 'Hipercloracion';
          else if (tLower.includes('choque')) evType = 'Choque';
          else if (tLower.includes('torre')) evType = 'LimpTorres';
          else if (tLower.includes('dep')) evType = 'LimpDep';
          else evType = 'Hipercloracion';
        } else {
          if (tLower.includes('torre')) evType = 'Torre';
          else if (tLower.includes('pisci') || tLower.includes('jac')) evType = 'Piscina/Jacuzzi';
          else evType = 'Estandar';
        }

        if (!arr.some(a => a.group === group && a.type === evType)) {
          arr.push({ group, type: evType, rawType });
        }
      };

      aquappMuestrasRaw.forEach(m => {
        if (getYear(m.fecha) === filterYear) {
          const mIdx = getMonth(m.fecha);
          if (mIdx !== null && mIdx >= 0 && mIdx < 12) {
            if (m.cliente_nombre) {
              mData[mIdx].ClientesSet.add(m.cliente_nombre);
              aquappAddEvent(m.cliente_nombre, mIdx, 'muestra', m.tipo_muestra || 'Estandar');
            }
          }
        }
      });

      aquappTratamientosRaw.forEach(t => {
        if (getYear(t.fecha) === filterYear) {
          const mIdx = getMonth(t.fecha);
          if (mIdx !== null && mIdx >= 0 && mIdx < 12) {
             if (t.cliente_nombre) {
               mData[mIdx].ClientesSet.add(t.cliente_nombre);
               aquappAddEvent(t.cliente_nombre, mIdx, 'tratamiento', t.tipo_tratamiento);
             }

             const tLower = (t.tipo_tratamiento || '').toLowerCase();
             if (tLower.includes('hiper')) tData[mIdx].Hipercloracion++;
             else if (tLower.includes('choque')) tData[mIdx].Choque++;
             else if (tLower.includes('torre')) tData[mIdx].LimpTorres++;
             else if (tLower.includes('dep')) tData[mIdx].LimpDep++;
          }
        }
      });

      let totalTratamientosCount = 0;
      let peakMonth = 'ENE';
      let maxActivity = 0;

      months.forEach((m, idx) => {
        const mClients = mData[idx].ClientesSet.size;
        const tCount = tData[idx].Hipercloracion + tData[idx].Choque + tData[idx].LimpTorres + tData[idx].LimpDep;
        totalTratamientosCount += tCount;
        const monthActivity = mClients + tCount;
        if (monthActivity > maxActivity) {
          maxActivity = monthActivity;
          peakMonth = m.toUpperCase();
        }
      });

      const finalMData = mData.map(d => ({ mes: d.mes, Clientes: d.ClientesSet.size }));
      const clientTableArray = Object.keys(clientTable).map(name => ({
          name,
          months: clientTable[name]
      })).sort((a,b) => a.name.localeCompare(b.name));

      setAquappStats({
        availableYears: yearsArr,
        muestrasChartData: finalMData,
        tratamientosChartData: tData,
        clientTableData: clientTableArray,
        totalClientes: clientTableArray.length,
        totalTratamientos: totalTratamientosCount,
        mesPico: maxActivity > 0 ? peakMonth : '-'
      });
    }
  }, [aquappMuestrasRaw, aquappTratamientosRaw, aquappYearFilter]);

  const filteredClientList = useMemo(() => {
    return (aquappStats.clientTableData || []).filter(client => {
      // 1. Search by name
      if (clientSearchQuery && !client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())) {
        return false;
      }
      // 2. Filter by selected treatment types
      if (selectedTreatmentFilters.length > 0) {
        const clientEvents = client.months.flat();
        const hasSelectedType = selectedTreatmentFilters.some(filterType => 
          clientEvents.some(ev => ev.type === filterType)
        );
        if (!hasSelectedType) return false;
      }
      return true;
    });
  }, [aquappStats.clientTableData, clientSearchQuery, selectedTreatmentFilters]);

  React.useEffect(() => {
    if (avisomapAvisosRaw.length > 0) {
      const yearsSet = new Set();
      avisomapAvisosRaw.forEach(a => {
        if (a.fecha) {
          const y = a.fecha.split('-')[0];
          if (y && y.length === 4) yearsSet.add(y);
        }
      });
      const yearsArr = Array.from(yearsSet).sort((a,b) => b.localeCompare(a));

      const filtered = avisomapYearFilter === 'Todos' 
        ? avisomapAvisosRaw 
        : avisomapAvisosRaw.filter(a => a.fecha && a.fecha.startsWith(avisomapYearFilter));

      const total = filtered.length;
      const pStats = {};
      const lStats = {};

      filtered.forEach(aviso => {
        const plagas = parsePlagas(aviso.plagas);

        plagas.forEach(p => {
          let cleanP = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          
          // Unificar variantes de roedores
          const lowerP = cleanP.toLowerCase();
          if (lowerP.includes('rata') || lowerP.includes('raton') || lowerP.includes('ratón') || lowerP.includes('roedor')) {
            cleanP = 'Roedores';
          }

          if (!pStats[cleanP]) pStats[cleanP] = 0;
          pStats[cleanP]++;
        });
        
        const loc = aviso.localidad || 'Desconocida';
        if (!lStats[loc]) lStats[loc] = 0;
        lStats[loc]++;
      });

      const colors = ['#f43f5e', '#3b82f6', '#eab308', '#10b981', '#8b5cf6', '#0ea5e9'];
      
      const plagasArr = Object.keys(pStats).map((name, i) => ({
        name,
        count: pStats[name],
        percentage: total > 0 ? Math.round((pStats[name] / total) * 100) : 0,
        color: colors[i % colors.length]
      })).sort((a, b) => b.count - a.count);

      const localidadesArr = Object.keys(lStats).map((name, i) => ({
        name,
        count: lStats[name],
        percentage: total > 0 ? Math.round((lStats[name] / total) * 100) : 0,
        color: colors[(i+2) % colors.length]
      })).sort((a, b) => b.count - a.count);

      setAvisomapStats({ total, plagas: plagasArr, localidades: localidadesArr, availableYears: yearsArr });
    }
  }, [avisomapAvisosRaw, avisomapYearFilter]);

  React.useEffect(() => {
    if (jornadas.length > 0 && workappFiltro.desde && workappFiltro.hasta) {
      calculateWorkappStats();
    }
  }, [jornadas, workappFiltro]);

  const calculateWorkappStats = () => {
    if (!workappFiltro.desde || !workappFiltro.hasta) return;
    
    const [dY, dM, dD] = workappFiltro.desde.split('-');
    const dateDesde = new Date(parseInt(dY), parseInt(dM) - 1, parseInt(dD));
    const [hY, hM, hD] = workappFiltro.hasta.split('-');
    const dateHasta = new Date(parseInt(hY), parseInt(hM) - 1, parseInt(hD));

    let totalHoras = 0;
    let totalExtras = 0;
    let diasList = [];

    const monthsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      monthsMap[`${d.getFullYear()}-${d.getMonth()}`] = { label: mLabel, value: 0 };
    }

    const parseJornadaDate = (fecha) => {
      if (!fecha) return null;
      if (fecha.includes('-')) {
        const [y, m, d] = fecha.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      } else if (fecha.includes('/')) {
        const [d, m, y] = fecha.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      return null;
    };

    const parseTimeStr = (t) => {
      if (!t) return 0;
      if (!t.includes(':')) return parseFloat(t) || 0;
      const parts = t.split(':');
      let h = parseInt(parts[0], 10) || 0;
      let m = parseInt(parts[1], 10) || 0;
      return h + (m / 60);
    };

    const jornadasEnRango = jornadas.filter(j => {
      const jDate = parseJornadaDate(j.fecha);
      if (!jDate) return false;
      
      const mKey = `${jDate.getFullYear()}-${jDate.getMonth()}`;
      if (monthsMap[mKey] !== undefined) {
        const ext = parseTimeStr(j.horas_extras);
        monthsMap[mKey].value += ext;
      }

      return jDate >= dateDesde && jDate <= dateHasta;
    }).sort((a, b) => {
      const aDate = parseJornadaDate(a.fecha);
      const bDate = parseJornadaDate(b.fecha);
      return aDate - bDate; 
    });

    jornadasEnRango.forEach(j => {
      const jDate = parseJornadaDate(j.fecha);
      if (!jDate) return;
      const jd = String(jDate.getDate()).padStart(2, '0');
      const jm = String(jDate.getMonth() + 1).padStart(2, '0');
      
      const horasNum = parseTimeStr(j.horas_calculadas);
      const extrasNum = parseTimeStr(j.horas_extras);
      totalHoras += horasNum;
      totalExtras += extrasNum;
      if (extrasNum > 0) {
        diasList.push({ date: `${jd}/${jm}`, value: parseFloat(extrasNum.toFixed(2)) });
      }
    });

    setWorkappResultados({
      totalHoras: totalHoras.toFixed(1),
      totalExtras: totalExtras.toFixed(1),
      importe: (totalExtras * 11).toFixed(2),
      chartData: diasList,
      monthlyExtras: Object.values(monthsMap)
    });
  };

  const renderAquappStats = () => (
    <div className="stats-section animate-fade-in">
      {/* Year Filter Header */}
      <div className="stats-chart-card stats-year-selector-card">
        <div className="stats-year-selector-inner">
          <div className="stats-year-title">
            <Filter size={18} color="#0ea5e9" />
            <h3>AÑO DE ANÁLISIS</h3>
          </div>
          <div className="stats-year-dropdown-wrap">
            <Calendar size={16} color="var(--text-muted)" style={{marginRight: '8px'}} />
            <select 
              value={aquappYearFilter} 
              onChange={(e) => setAquappYearFilter(e.target.value)}
              className="stats-year-select"
            >
              {aquappStats.availableYears?.length === 0 ? (
                 <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
              ) : (
                 aquappStats.availableYears?.map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="stats-kpi-grid">
        <div className="stats-kpi-card">
          <div className="stats-kpi-icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
            <Users size={24} />
          </div>
          <div className="stats-kpi-info">
            <span className="stats-kpi-label">CLIENTES ATENDIDOS</span>
            <span className="stats-kpi-val">{aquappStats.totalClientes || 0}</span>
          </div>
        </div>

        <div className="stats-kpi-card">
          <div className="stats-kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
            <FlaskConical size={24} />
          </div>
          <div className="stats-kpi-info">
            <span className="stats-kpi-label">TRATAMIENTOS</span>
            <span className="stats-kpi-val">{aquappStats.totalTratamientos || 0}</span>
          </div>
        </div>

        <div className="stats-kpi-card">
          <div className="stats-kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Trophy size={24} />
          </div>
          <div className="stats-kpi-info">
            <span className="stats-kpi-label">MES PICO</span>
            <span className="stats-kpi-val">{aquappStats.mesPico || '-'}</span>
          </div>
        </div>
      </div>

      {/* Modern Charts Grid (2 columns on desktop) */}
      <div className="stats-charts-row">
        {/* Actividad de Clientes */}
        <div className="stats-chart-card modern-chart-card">
          <div className="modern-chart-header">
            <Droplet size={18} color="#0ea5e9" />
            <h3>CLIENTES ATENDIDOS</h3>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aquappStats.muestrasChartData}
                margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} 
                />
                <YAxis hide={true} domain={[0, 'dataMax + 4']} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(14, 165, 233, 0.08)', radius: 6 }} 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
                />
                <Bar dataKey="Clientes" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={22}>
                  <LabelList dataKey="Clientes" position="top" fill="var(--text-secondary)" fontSize={11} fontWeight={700} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tratamientos Realizados */}
        <div className="stats-chart-card modern-chart-card">
          <div className="modern-chart-header">
            <FlaskConical size={18} color="#a855f7" />
            <h3>TRATAMIENTOS REALIZADOS</h3>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aquappStats.tratamientosChartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} 
                />
                <YAxis hide={true} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(168, 85, 247, 0.08)', radius: 6 }} 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '12px', fontSize: '0.75rem', fontWeight: 600 }} />
                <Bar dataKey="Hipercloracion" name="Hipercloración" stackId="a" fill="#a855f7" />
                <Bar dataKey="Choque" name="Choque" stackId="a" fill="#f43f5e" />
                <Bar dataKey="LimpTorres" name="L. Torres" stackId="a" fill="#3b82f6" />
                <Bar dataKey="LimpDep" name="L. Depósitos" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Resumen por Cliente (Nuevo Acordeón Interactivo) */}
      <div className="stats-chart-card client-summary-card">
        {/* Card Header with Search */}
        <div className="client-summary-header">
          <div className="client-summary-title">
            <Briefcase size={20} color="#0ea5e9" />
            <h2>RESUMEN POR CLIENTE</h2>
            <span className="client-count-pill">{filteredClientList.length}</span>
          </div>

          <div className="client-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
            />
            {clientSearchQuery && (
              <button 
                type="button" 
                className="btn-clear-search" 
                onClick={() => setClientSearchQuery('')}
                title="Borrar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Treatment Filter Chips */}
        <div className="treatment-chips-bar">
          {TREATMENT_TYPES.map(t => {
            const isSelected = selectedTreatmentFilters.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`treatment-filter-chip ${isSelected ? 'active' : ''}`}
                style={{
                  backgroundColor: isSelected ? t.color : `${t.color}18`,
                  color: isSelected ? '#ffffff' : t.color,
                  borderColor: isSelected ? t.color : `${t.color}40`
                }}
                onClick={() => toggleTreatmentFilter(t.id)}
              >
                <span className="chip-color-dot" style={{ backgroundColor: isSelected ? '#ffffff' : t.color }} />
                <span>{t.label}</span>
              </button>
            );
          })}
          {selectedTreatmentFilters.length > 0 && (
            <button 
              type="button"
              className="btn-clear-treatment-filters"
              onClick={() => setSelectedTreatmentFilters([])}
            >
              ✕ Borrar filtros
            </button>
          )}
        </div>

        {/* Client Accordion List */}
        <div className="client-accordion-list">
          {filteredClientList.length === 0 ? (
            <div className="client-empty-state">
              <p style={{ fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>No se encontraron clientes</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '4px' }}>
                Prueba a cambiar el texto de búsqueda o los filtros de tratamiento.
              </p>
            </div>
          ) : (
            filteredClientList.map(client => {
              const isExpanded = !!expandedClients[client.name];
              const allEvents = client.months.flat();
              const totalTreatments = allEvents.length;
              const distinctTypes = Array.from(new Set(allEvents.map(e => e.type)));

              return (
                <div key={client.name} className={`client-accordion-item ${isExpanded ? 'expanded' : ''}`}>
                  {/* Collapsed Header */}
                  <div 
                    className="client-accordion-header"
                    onClick={() => toggleClientExpand(client.name)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClientExpand(client.name); }}}
                  >
                    <span className="client-name-text">{client.name}</span>

                    <div className="client-header-right">
                      {/* Distinct Treatment Dots */}
                      <div className="client-treatment-dots">
                        {distinctTypes.map(tType => (
                          <span 
                            key={tType} 
                            className="client-type-dot"
                            style={{ backgroundColor: TREATMENT_COLOR_MAP[tType] || '#64748b' }}
                            title={TREATMENT_LABEL_MAP[tType] || tType}
                          />
                        ))}
                      </div>

                      {/* Badge count */}
                      <span className="client-treatment-badge">
                        {totalTreatments} {totalTreatments === 1 ? 'tratamiento' : 'tratamientos'}
                      </span>

                      {/* Chevron */}
                      <span className="client-chevron-icon">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Body: Timeline ENE-DIC */}
                  {isExpanded && (
                    <div className="client-accordion-body animate-fade-in">
                      <div className="client-timeline-container">
                        <div className="client-timeline-months-header">
                          {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].map(m => (
                            <span key={m} className="timeline-month-label">{m}</span>
                          ))}
                        </div>

                        <div className="client-timeline-grid">
                          {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].map((mStr, idx) => {
                            const mEvents = client.months[idx] || [];
                            return (
                              <div key={mStr} className={`timeline-grid-cell ${mEvents.length > 0 ? 'has-events' : ''}`}>
                                {mEvents.map((ev, eIdx) => {
                                  const color = TREATMENT_COLOR_MAP[ev.type] || '#64748b';
                                  const label = TREATMENT_LABEL_MAP[ev.type] || ev.type;
                                  return (
                                    <span 
                                      key={eIdx}
                                      className="timeline-badge-pill"
                                      style={{ backgroundColor: color }}
                                      title={`${mStr} · ${label}`}
                                    >
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderAvisomapStats = () => (
    <div className="stats-section animate-fade-in">
      <div className="stats-chart-card" style={{padding: '20px', marginBottom: '24px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#10b981'}}>
          <Filter size={18} />
          <h3 style={{margin: 0}}>FILTRO POR AÑO</h3>
        </div>
        <div style={{display: 'flex', alignItems: 'center', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px'}}>
          <Calendar size={16} color="var(--text-muted)" style={{marginRight: '8px'}} />
          <select 
            value={avisomapYearFilter} 
            onChange={(e) => setAvisomapYearFilter(e.target.value)}
            style={{border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: 'var(--text-secondary)'}}
          >
            <option value="Todos">Histórico (Todos los años)</option>
            {avisomapStats.availableYears?.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-total-banner" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
        <Bug size={20} color="white"/>
        <span>{avisomapStats.total} avisos en {avisomapYearFilter === 'Todos' ? 'total' : avisomapYearFilter}</span>
      </div>

      <div className="stats-chart-card">
        <div className="stats-card-title-row">
          <Bug size={20} color="#22c55e" />
          <div>
            <h3>Tipo de Plaga</h3>
            <p className="stats-subtitle">Distribución por tipo</p>
          </div>
        </div>
        {avisomapStats.plagas.length === 0 ? (
          <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay datos de plagas.</p>
        ) : (
          <div className="stats-bar-list">
            {avisomapStats.plagas.map(stat => (
              <div key={stat.name} className="stats-bar-item">
                <div className="stats-bar-info">
                  <span><Bug size={14} color="var(--text-muted)"/> {stat.name}</span>
                  <span className="stats-bar-numbers">{stat.count} avisos · <strong>{stat.percentage}%</strong></span>
                </div>
                <div className="stats-bar-bg">
                  <div className="stats-bar-fill" style={{width: `${stat.percentage}%`, backgroundColor: stat.color}}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="stats-chart-card">
        <div className="stats-card-title-row">
          <MapPin size={20} color="#22c55e" />
          <div>
            <h3>Por Localidad</h3>
            <p className="stats-subtitle">Distribución geográfica</p>
          </div>
        </div>
        {avisomapStats.localidades.length === 0 ? (
          <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay datos de localidades.</p>
        ) : (
          <div className="stats-bar-list">
            {avisomapStats.localidades.map(stat => (
              <div key={stat.name} className="stats-bar-item">
                <div className="stats-bar-info">
                  <span>{stat.name}</span>
                  <span className="stats-bar-numbers">{stat.count} avisos · <strong>{stat.percentage}%</strong></span>
                </div>
                <div className="stats-bar-bg">
                  <div className="stats-bar-fill" style={{width: `${stat.percentage}%`, backgroundColor: stat.color}}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const exportarJornadaPDF = () => {
    if (!workappFiltro.desde || !workappFiltro.hasta) {
      window.__toast?.error("Debes seleccionar un rango de fechas.");
      return;
    }

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen de Jornada (' + workappFiltro.desde + ' al ' + workappFiltro.hasta + ')', 14, 22);

    const [dY, dM, dD] = workappFiltro.desde.split('-');
    const dateDesde = new Date(parseInt(dY), parseInt(dM) - 1, parseInt(dD));
    const [hY, hM, hD] = workappFiltro.hasta.split('-');
    const dateHasta = new Date(parseInt(hY), parseInt(hM) - 1, parseInt(hD));

    const parseJornadaDate = (fecha) => {
      if (!fecha) return null;
      if (fecha.includes('-')) {
        const [y, m, d] = fecha.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      } else if (fecha.includes('/')) {
        const [d, m, y] = fecha.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      return null;
    };

    const jornadasEnRango = jornadas.filter(j => {
      const jDate = parseJornadaDate(j.fecha);
      if (!jDate) return false;
      return jDate >= dateDesde && jDate <= dateHasta;
    }).sort((a, b) => {
      return parseJornadaDate(a.fecha) - parseJornadaDate(b.fecha); 
    });

    if (jornadasEnRango.length === 0) {
      window.__toast?.warning("No hay jornadas en ese rango de fechas.");
      return;
    }

    const formatTime = (t) => {
      if (!t) return '0.0h';
      if (!t.includes(':')) {
        let num = parseFloat(t) || 0;
        return num.toFixed(1) + 'h';
      }
      const parts = t.split(':');
      let h = parseInt(parts[0], 10) || 0;
      let m = parseInt(parts[1], 10) || 0;
      let dec = h + (m / 60);
      return dec.toFixed(1) + 'h';
    };

    const isSameDate = (d1, d2) => {
      if (!d1 || !d2) return false;
      if (d1 === d2) return true;
      const dt1 = parseJornadaDate(d1);
      const dt2 = parseJornadaDate(d2);
      if (!dt1 || !dt2) return false;
      return dt1.getFullYear() === dt2.getFullYear() &&
             dt1.getMonth() === dt2.getMonth() &&
             dt1.getDate() === dt2.getDate();
    };

    const enrichParada = (parada, dateStr) => {
      let details = [];
      const pLower = parada.toLowerCase();

      const trats = aquappTratamientosRaw.filter(t => isSameDate(t.fecha, dateStr) && t.cliente_nombre && t.cliente_nombre.toLowerCase() === pLower);
      if (trats.length > 0) {
        const tipos = [...new Set(trats.map(t => t.tipo_tratamiento || 'Tratamiento'))];
        details.push(tipos.join('/'));
      }

      const muestras = aquappMuestrasRaw.filter(m => isSameDate(m.fecha, dateStr) && m.cliente_nombre && m.cliente_nombre.toLowerCase() === pLower);
      if (muestras.length > 0) {
        details.push('Muestras');
      }

      if (pLower.includes('aviso mapfre') || pLower.includes('mapfre')) {
        const locMatch = pLower.replace(/aviso mapfre/g, '').replace(/mapfre/g, '').trim();
        const avisos = avisomapAvisosRaw.filter(a => isSameDate(a.fecha, dateStr));
        const matchingAvisos = locMatch 
          ? avisos.filter(a => a.localidad && a.localidad.toLowerCase().includes(locMatch))
          : avisos;
        
        if (matchingAvisos.length > 0) {
          const addresses = matchingAvisos.map(a => {
            const dir = (a.direccion || '').trim();
            const loc = (a.localidad || '').trim();
            if (dir && loc && !dir.toLowerCase().includes(loc.toLowerCase())) {
              return `${dir} (${loc})`;
            }
            return dir || loc;
          }).filter(Boolean);
          if (addresses.length > 0) details.push(addresses.join(' | '));
        }
      }

      if (details.length > 0) {
        return parada + ' (' + details.join(' + ') + ')';
      }
      return parada;
    };

    const tableData = jornadasEnRango.map(j => {
      let paradasArr = [];
      if (Array.isArray(j.paradas)) {
        paradasArr = j.paradas;
      } else if (typeof j.paradas === 'string') {
        try {
          const parsed = JSON.parse(j.paradas);
          if (Array.isArray(parsed)) paradasArr = parsed;
          else paradasArr = [j.paradas];
        } catch {
          let cleaned = j.paradas.replace(/^\["?|"?]$/g, '').replace(/","/g, '|||');
          paradasArr = cleaned.split('|||');
        }
      }
      
      let ruta = paradasArr.map(p => enrichParada(p.trim(), j.fecha)).join(', ');

      let fechaFmt = j.fecha;
      const jDate = parseJornadaDate(j.fecha);
      if (jDate) {
        const dd = String(jDate.getDate()).padStart(2, '0');
        const mm = String(jDate.getMonth() + 1).padStart(2, '0');
        const yy = String(jDate.getFullYear()).slice(-2);
        fechaFmt = `${dd}/${mm}/${yy}`;
      }

      const hIni = (j.hora_inicio || '').substring(0, 5);
      const hFin = (j.hora_fin || '').substring(0, 5);
      const horario = (hIni || hFin) ? hIni + ' - ' + hFin : '';

      return [
        fechaFmt,
        horario,
        j.matricula || '',
        ruta || 'Sin paradas',
        formatTime(j.horas_calculadas),
        formatTime(j.horas_extras)
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Fecha', 'Horario', 'Vehiculo', 'Ruta / Paradas', 'Horas', 'Extras']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' }
      },
    });

    doc.save('Jornada_' + workappFiltro.desde + '_al_' + workappFiltro.hasta + '.pdf');
  };



  const renderWorkappStats = () => (
    <div className="stats-section animate-fade-in">
      {/* Filtro de Fechas y Presets */}
      <div className="stats-chart-card workapp-filter-card">
        <div className="workapp-filter-header">
          <div className="stats-year-title" style={{ color: '#8b5cf6' }}>
            <Filter size={18} color="#8b5cf6" />
            <h3>PERIODO DE ANÁLISIS</h3>
          </div>
          
          <button 
            type="button"
            onClick={exportarJornadaPDF}
            className="btn-export-pdf"
          >
            <Download size={16} />
            <span>Exportar PDF</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="workapp-presets-bar">
          <button 
            type="button" 
            className="workapp-preset-btn"
            onClick={() => setDatePreset('este_mes')}
          >
            Este Mes
          </button>
          <button 
            type="button" 
            className="workapp-preset-btn"
            onClick={() => setDatePreset('mes_anterior')}
          >
            Mes Anterior
          </button>
          <button 
            type="button" 
            className="workapp-preset-btn"
            onClick={() => setDatePreset('ultimos_3_meses')}
          >
            Últimos 3 Meses
          </button>
          <button 
            type="button" 
            className="workapp-preset-btn"
            onClick={() => setDatePreset('este_ano')}
          >
            Año Completo
          </button>
        </div>

        {/* Date Inputs */}
        <div className="workapp-dates-wrap">
          <div className="workapp-date-field">
            <label>Desde</label>
            <div className="workapp-date-input-wrap">
              <Calendar size={15} color="var(--text-muted)" />
              <input 
                type="date" 
                value={workappFiltro.desde} 
                onChange={e => setWorkappFiltro({...workappFiltro, desde: e.target.value})} 
              />
            </div>
          </div>

          <div className="workapp-date-field">
            <label>Hasta</label>
            <div className="workapp-date-input-wrap">
              <Calendar size={15} color="var(--text-muted)" />
              <input 
                type="date" 
                value={workappFiltro.hasta} 
                onChange={e => setWorkappFiltro({...workappFiltro, hasta: e.target.value})} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="stats-kpi-grid">
        <div className="stats-kpi-card">
          <div className="stats-kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Clock size={24} />
          </div>
          <div className="stats-kpi-info">
            <span className="stats-kpi-label">HORAS TRABAJADAS</span>
            <span className="stats-kpi-val">{workappResultados.totalHoras} h</span>
          </div>
        </div>

        <div className="stats-kpi-card">
          <div className="stats-kpi-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' }}>
            <Zap size={24} />
          </div>
          <div className="stats-kpi-info">
            <span className="stats-kpi-label">HORAS EXTRAS</span>
            <span className="stats-kpi-val" style={{ color: '#f43f5e' }}>{workappResultados.totalExtras} h</span>
          </div>
        </div>

        <div className="stats-kpi-card">
          <div className="stats-kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <Euro size={24} />
          </div>
          <div className="stats-kpi-info">
            <span className="stats-kpi-label">IMPORTE EXTRAS (11€/H)</span>
            <span className="stats-kpi-val" style={{ color: '#10b981' }}>{workappResultados.importe} €</span>
          </div>
        </div>
      </div>

      {/* Modern Charts Grid (2 columns on desktop) */}
      <div className="stats-charts-row">
        {/* Extras Últimos 6 Meses */}
        <div className="stats-chart-card modern-chart-card">
          <div className="modern-chart-header">
            <Calendar size={18} color="#8b5cf6" />
            <h3>EXTRAS ÚLTIMOS 6 MESES</h3>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workappResultados.monthlyExtras}
                margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} 
                />
                <YAxis hide={true} domain={[0, 'dataMax + 2']} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(139, 92, 246, 0.08)', radius: 6 }} 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
                />
                <Bar dataKey="value" name="Horas Extras" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="value" position="top" fill="var(--text-secondary)" fontSize={11} fontWeight={700} formatter={(val) => val > 0 ? `${val}h` : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Horas Extras por Día */}
        <div className="stats-chart-card modern-chart-card">
          <div className="modern-chart-header">
            <Zap size={18} color="#f43f5e" />
            <h3>HORAS EXTRAS POR DÍA</h3>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            {workappResultados.chartData.length === 0 ? (
              <div className="client-empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>Sin horas extras en el rango</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '4px' }}>No hay registros con horas extras en este periodo.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workappResultados.chartData}
                  margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} 
                  />
                  <YAxis hide={true} domain={[0, 'dataMax + 1.5']} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(244, 63, 94, 0.08)', radius: 6 }} 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
                  />
                  <Bar dataKey="value" name="Horas Extras" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={workappResultados.chartData.length > 12 ? 14 : 22}>
                    <LabelList dataKey="value" position="top" fill="var(--text-secondary)" fontSize={10} fontWeight={700} formatter={(val) => val > 0 ? `${val}h` : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detalle Diario de Jornadas (Tarjeta Interactiva) */}
      <div className="stats-chart-card client-summary-card">
        <div className="client-summary-header">
          <div className="client-summary-title">
            <Briefcase size={20} color="#8b5cf6" />
            <h2>DETALLE DE JORNADAS</h2>
            <span className="client-count-pill" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
              {jornadasEnRangoDetalle.length}
            </span>
          </div>

          <div className="client-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por matrícula, parada o fecha..." 
              value={jornadaSearchQuery}
              onChange={(e) => setJornadaSearchQuery(e.target.value)}
            />
            {jornadaSearchQuery && (
              <button 
                type="button" 
                className="btn-clear-search" 
                onClick={() => setJornadaSearchQuery('')}
                title="Borrar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="jornadas-detail-list">
          {jornadasEnRangoDetalle.length === 0 ? (
            <div className="client-empty-state">
              <p style={{ fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>No hay jornadas en el periodo seleccionado</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '4px' }}>
                Prueba a ajustar las fechas del filtro o el término de búsqueda.
              </p>
            </div>
          ) : (
            jornadasEnRangoDetalle.map((j, idx) => {
              let paradasArr = [];
              if (Array.isArray(j.paradas)) {
                paradasArr = j.paradas;
              } else if (typeof j.paradas === 'string') {
                try {
                  const parsed = JSON.parse(j.paradas);
                  if (Array.isArray(parsed)) paradasArr = parsed;
                  else paradasArr = [j.paradas];
                } catch {
                  let cleaned = j.paradas.replace(/^\["?|"?]$/g, '').replace(/","/g, '|||');
                  paradasArr = cleaned.split('|||');
                }
              }

              const jDate = parseJDateHelper(j.fecha);
              const dateLabel = jDate 
                ? jDate.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
                : j.fecha;
              const hIni = (j.hora_inicio || '').substring(0, 5);
              const hFin = (j.hora_fin || '').substring(0, 5);
              const horario = (hIni || hFin) ? `${hIni} - ${hFin}` : '';
              const extras = parseFloat(j.horas_extras) || 0;

              return (
                <div key={j.id || idx} className="jornada-item-card">
                  <div className="jornada-item-header">
                    <div className="jornada-item-left">
                      <span className="jornada-date-badge">
                        <Calendar size={14} />
                        {dateLabel}
                      </span>
                      {horario && (
                        <span className="jornada-schedule-badge">
                          <Clock size={13} />
                          {horario}
                        </span>
                      )}
                      {j.matricula && (
                        <span className="jornada-matricula-badge">
                          <Car size={13} />
                          {j.matricula}
                        </span>
                      )}
                    </div>

                    <div className="jornada-item-right">
                      <span className="jornada-hours-badge">
                        {formatTime(j.horas_calculadas)}
                      </span>
                      {extras > 0 && (
                        <span className="jornada-extras-badge">
                          <Zap size={12} />
                          +{formatTime(j.horas_extras)}
                        </span>
                      )}
                    </div>
                  </div>

                  {paradasArr.length > 0 && (
                    <div className="jornada-paradas-wrap">
                      {paradasArr.map((p, pIdx) => {
                        const trimmed = (typeof p === 'string' ? p : String(p)).trim();
                        if (!trimmed) return null;
                        return (
                          <span key={pIdx} className="jornada-parada-tag">
                            <MapPin size={11} color="#8b5cf6" />
                            {trimmed}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="estadisticas-container animate-fade-in">
      <div className="estadisticas-header">
        <BarChart2 size={28} color="#6366f1"/>
        <h1>Gráficos y Estadísticas</h1>
      </div>

      {/* Section Tabs */}
      <div className="estadisticas-tabs">
        {sections.map(sec => {
          const Icon = sec.icon;
          return (
            <button 
              key={sec.id}
              className={`est-tab ${activeSection === sec.id ? 'active' : ''}`}
              style={activeSection === sec.id ? {borderColor: sec.color, color: sec.color} : {}}
              onClick={() => setActiveSection(sec.id)}
            >
              <Icon size={18}/>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="estadisticas-content">
        {activeSection === 'aquapp' && renderAquappStats()}
        {activeSection === 'avisomap' && renderAvisomapStats()}
        {activeSection === 'workapp' && renderWorkappStats()}
      </div>

      {tableTooltip.visible && createPortal(
        <div style={{
          position: 'fixed',
          top: tableTooltip.y - 40,
          left: tableTooltip.x + 15,
          background: '#222',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          whiteSpace: 'nowrap', fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.85rem'
        }}>
          {tableTooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Estadisticas;










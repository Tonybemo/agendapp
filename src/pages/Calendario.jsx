import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Droplet, Bug, CalendarCheck, Info, FlaskConical, Building2, ThermometerSun, Waves, Zap, Box, Clock } from 'lucide-react';
import './Calendario.css';
import { supabase } from '../lib/supabase';

// Colores para los puntos del calendario (uno por cliente)
const CLIENT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'];

// Configuración visual por tipo de actividad
const ACTIVITY_CONFIG = {
  muestra_estandar:   { label: 'Muestra Estándar',     color: '#eab308', bg: '#fef9c3', icon: Droplet },
  muestra_torre:      { label: 'Muestra Torre',         color: '#f97316', bg: '#ffedd5', icon: Building2 },
  muestra_piscina:    { label: 'Muestra Piscina',       color: '#06b6d4', bg: '#cffafe', icon: Waves },
  muestra_jacuzzi:    { label: 'Muestra Jacuzzi',       color: '#06b6d4', bg: '#cffafe', icon: Waves },
  hipercloracion:     { label: 'Hipercloración',        color: '#a855f7', bg: '#f3e8ff', icon: FlaskConical },
  choque_termico:     { label: 'Choque Térmico',        color: '#ec4899', bg: '#fce7f3', icon: ThermometerSun },
  limpieza_torre:     { label: 'Limp. Torres',          color: '#3b82f6', bg: '#eff6ff', icon: Building2 },
  limpieza_deposito:  { label: 'Limp. Depósitos',       color: '#10b981', bg: '#d1fae5', icon: Waves },
  aviso:              { label: 'Aviso de Plagas',       color: '#22c55e', bg: '#dcfce7', icon: Bug },
  tarea:              { label: 'Tarea Completada',      color: '#ef4444', bg: '#fee2e2', icon: CalendarCheck },
};

const normalizeActivityKey = (type, group) => {
  if (group === 'aviso') return 'aviso';
  if (group === 'tarea') return 'tarea';
  if (group === 'tratamiento') {
    const t = (type || '').toLowerCase();
    if (t.includes('hiper')) return 'hipercloracion';
    if (t.includes('choque')) return 'choque_termico';
    if (t.includes('torre')) return 'limpieza_torre';
    if (t.includes('dep')) return 'limpieza_deposito';
    return 'hipercloracion';
  }
  // muestra
  const t = (type || '').toLowerCase();
  if (t.includes('torre')) return 'muestra_torre';
  if (t.includes('pisci')) return 'muestra_piscina';
  if (t.includes('jac')) return 'muestra_jacuzzi';
  return 'muestra_estandar';
};

const Calendario = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('mes');
  // rawEvents: { date: 'YYYY-MM-DD', client: string, actKey: string, count: number }[]
  const [rawEvents, setRawEvents] = useState([]);
  // clientColors: { [clientName]: color }
  const [clientColors, setClientColors] = useState({});

  React.useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr === 'Hoy') {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      }
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        if (y && m && d) return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      }
      if (dateStr.includes('T')) return dateStr.split('T')[0];
      if (dateStr.includes('-') && dateStr.length >= 10) return dateStr.substring(0,10);
      return dateStr;
    };

    let allRaw = [];

    // Muestras
    const { data: muestras } = await supabase.from('aquapp_muestras').select('*').limit(5000);
    if (muestras) {
      muestras.forEach(m => {
        const d = normalizeDate(m.fecha);
        if (d && m.cliente_nombre) {
          allRaw.push({ id: m.id, date: d, client: m.cliente_nombre, actKey: normalizeActivityKey(m.tipo_muestra, 'muestra'), rawItem: m });
        }
      });
    }

    // Tratamientos
    const { data: tratos } = await supabase.from('aquapp_tratamientos').select('*').limit(5000);
    if (tratos) {
      tratos.forEach(t => {
        const d = normalizeDate(t.fecha);
        if (d && t.cliente_nombre) {
          allRaw.push({ id: t.id, date: d, client: t.cliente_nombre, actKey: normalizeActivityKey(t.tipo_tratamiento, 'tratamiento'), rawItem: t });
        }
      });
    }

    // Avisos
    const { data: avisos } = await supabase.from('avisomap_avisos').select('*').limit(5000);
    if (avisos) {
      avisos.forEach(a => {
        const d = normalizeDate(a.fecha);
        if (d) {
          allRaw.push({ id: a.id, date: d, client: a.localidad || 'Aviso Mapfre', actKey: 'aviso', extra: a.plagas, rawItem: a });
        }
      });
    }

    // Tareas completadas
    const { data: tareasData } = await supabase.from('tareas_programadas').select('id, tareas_json, clientes(name)');
    if (tareasData) {
      tareasData.forEach(row => {
        if (row.tareas_json && Array.isArray(row.tareas_json)) {
          row.tareas_json.forEach(task => {
            if (task.status === 'completed') {
              const d = normalizeDate(task.date);
              if (d) allRaw.push({ id: task.id, date: d, client: row.clientes?.name || 'Tarea', actKey: 'tarea', extra: task.name, rawItem: task });
            }
          });
        }
      });
    }

    // Asignar colores únicos por cliente
    const colorsMap = {};
    let colorIdx = 0;
    allRaw.forEach(ev => {
      if (!colorsMap[ev.client]) {
        colorsMap[ev.client] = CLIENT_COLORS[colorIdx % CLIENT_COLORS.length];
        colorIdx++;
      }
    });

    setClientColors(colorsMap);
    setRawEvents(allRaw);
  };

  // Para un día dado, devuelve los clientes con sus actividades agrupadas
  const getGroupedForDay = (day) => {
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dateStr = `${currentDate.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
    const dayEvs = rawEvents.filter(e => e.date === dateStr);

    // Agrupar por cliente
    const grouped = {};
    dayEvs.forEach(ev => {
      if (!grouped[ev.client]) grouped[ev.client] = { client: ev.client, activities: {} };
      if (!grouped[ev.client].activities[ev.actKey]) {
        grouped[ev.client].activities[ev.actKey] = { count: 0, extras: [], items: [] };
      }
      grouped[ev.client].activities[ev.actKey].count++;
      if (ev.extra) grouped[ev.client].activities[ev.actKey].extras.push(ev.extra);
      if (ev.rawItem) grouped[ev.client].activities[ev.actKey].items.push(ev.rawItem);
    });

    return Object.values(grouped).sort((a,b) => a.client.localeCompare(b.client));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const handlePrev = () => {
    if (viewMode === 'semana') {
      const nd = new Date(currentDate); nd.setDate(currentDate.getDate() - 7); setCurrentDate(nd);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
    setSelectedDate(null);
    setSelectedDetailGroup(null);
  };

  const handleNext = () => {
    if (viewMode === 'semana') {
      const nd = new Date(currentDate); nd.setDate(currentDate.getDate() + 7); setCurrentDate(nd);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
    setSelectedDate(null);
    setSelectedDetailGroup(null);
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`e${i}`} className="cal-cell empty"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const grouped = getGroupedForDay(d);
      const isSelected = selectedDate?.day === d;
      const isToday = d === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      cells.push(
        <div
          key={d}
          className={`cal-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => {
            setSelectedDate({ day: d, grouped });
            setSelectedDetailGroup(null);
          }}
        >
          <span className="cal-day-num">{d}</span>
          <div className="cal-client-chips">
            {grouped.slice(0, 4).map(g => {
              const primaryActKey = Object.keys(g.activities)[0];
              const cfg = ACTIVITY_CONFIG[primaryActKey] || { bg: '#f1f5f9', color: '#64748b', label: 'Actividad' };
              const shortName = g.client.length > 10 ? g.client.substring(0, 10) : g.client;
              return (
                <span
                  key={g.client}
                  className="cal-client-chip"
                  style={{ color: cfg.color, borderColor: cfg.color }}
                  title={`${g.client} - ${cfg.label}`}
                >
                  {shortName}
                </span>
              );
            })}
            {grouped.length > 4 && (
              <div className="cal-chip-more">+{grouped.length - 4}</div>
            )}
          </div>
        </div>
      );
    }
    while (cells.length % 7 !== 0) {
      cells.push(<div key={`ee${cells.length}`} className="cal-cell empty"></div>);
    }
    if (viewMode === 'semana') {
      const targetDay = selectedDate ? selectedDate.day : currentDate.getDate();
      const targetIndex = startOffset + targetDay - 1;
      const weekStart = Math.floor(targetIndex / 7) * 7;
      return cells.slice(weekStart, weekStart + 7);
    }
    return cells;
  };

  return (
    <div className="calendario-container animate-fade-in">
      <div className="calendario-header">
        <CalendarIcon size={28} color="#6366f1" />
        <h1>Calendario Global</h1>
      </div>

      <div className="cal-layout">
        {/* Main Calendar */}
        <div className="cal-main-panel">
          <div className="cal-controls">
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <div className="cal-nav">
              <button className="cal-nav-btn" onClick={handlePrev}><ChevronLeft size={20}/></button>
              <button className={`cal-nav-btn ${viewMode === 'mes' ? 'active' : ''}`} onClick={() => setViewMode('mes')}>Mes</button>
              <button className={`cal-nav-btn ${viewMode === 'semana' ? 'active' : ''}`} onClick={() => setViewMode('semana')}>Semana</button>
              <button className="cal-nav-btn" onClick={handleNext}><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="cal-grid">
            <div className="cal-weekdays">
              <span>LUN</span><span>MAR</span><span>MIE</span><span>JUE</span><span>VIE</span><span>SAB</span><span>DOM</span>
            </div>
            <div className="cal-cells">
              {renderCells()}
            </div>
          </div>



        </div>

        {/* Sidebar panel */}
        <div className={`cal-details-panel ${selectedDate ? 'open' : ''}`}>
          {selectedDate ? (
            <>
              <div className="cal-details-header">
                {selectedDetailGroup ? (
                  <button className="back-btn" onClick={() => setSelectedDetailGroup(null)} style={{ background: 'none', border: 'none', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
                    <ChevronLeft size={20} /> {selectedDetailGroup.client}
                  </button>
                ) : (
                  <h3>{selectedDate.day} de {monthNames[currentDate.getMonth()]}</h3>
                )}
                <button className="close-btn" onClick={() => { setSelectedDate(null); setSelectedDetailGroup(null); }}><X size={20}/></button>
              </div>
              <div className="cal-details-content">
                {selectedDetailGroup ? (
                  <div className="cal-detail-cards">
                    {Object.entries(selectedDetailGroup.activities).map(([actKey, { items }]) => {
                      const cfg = ACTIVITY_CONFIG[actKey] || ACTIVITY_CONFIG.muestra_estandar;
                      const Icon = cfg.icon;
                      
                      return (items || []).map((item, idx) => {
                        const isMuestra = actKey.startsWith('muestra');
                        const isTratamiento = actKey === 'hipercloracion' || actKey === 'choque_termico' || actKey.startsWith('limpieza');
                        const isAviso = actKey === 'aviso';
                        const isTarea = actKey === 'tarea';

                        return (
                          <div key={`${actKey}-${idx}`}>
                            {isMuestra && (
                              <div className="sample-card" style={{border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', background: 'white'}}>
                                <div className="sample-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                  <div className="sample-title-badge" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <h4 style={{margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '800'}}>Muestra {item.identificador || ''}</h4>
                                    {item.tipo_muestra && (
                                      <span className="badge-tipo" style={{ backgroundColor: item.tipo_muestra === 'Torre' ? '#ffedd5' : '#fef08a', color: item.tipo_muestra === 'Torre' ? '#c2410c' : '#a16207', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                                        <Droplet size={12}/> {item.tipo_muestra}
                                      </span>
                                    )}
                                  </div>
                                  {item.identificador && <span className="sample-id" style={{fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px'}}>{item.identificador}</span>}
                                </div>
                                
                                <div className="sample-meta" style={{display: 'flex', gap: '12px', color: '#64748b', fontSize: '0.8rem', marginBottom: '12px', fontWeight: '600'}}>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora || '-'}</span>
                                  <span>•</span>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarIcon size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                </div>
                                
                                {item.tipo_muestra === 'Torre' ? (
                                  <div className="parameters-grid" style={{marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px'}}>
                                    <div className="param-box ph" style={{ flex: 1, padding: '8px 0', border: '1px solid #fef08a', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><FlaskConical size={16} color="#eab308" /><span className="param-name" style={{ color: '#eab308', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>PH</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.ph || '-'}</span></div>
                                    <div className="param-box temp" style={{ flex: 1, padding: '8px 0', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><ThermometerSun size={16} color="#ef4444" /><span className="param-name" style={{ color: '#ef4444', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TEMP</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.temp || item.temperatura ? (item.temp || item.temperatura) + 'º' : '-'}</span></div>
                                    <div className="param-box cond" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Zap size={16} color="#475569" /><span className="param-name" style={{ color: '#475569', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>COND.</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.conductividad || '-'}</span></div>
                                    <div className="param-box turb" style={{ flex: 1, padding: '8px 0', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Waves size={16} color="#0ea5e9" /><span className="param-name" style={{ color: '#0ea5e9', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TURB.</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.turbidez || '-'}</span></div>
                                    <div className="param-box hierro" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Box size={16} color="#64748b" /><span className="param-name" style={{ color: '#64748b', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>HIERRO</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.hierro || '-'}</span></div>
                                    <div className="param-box f8583" style={{ flex: 1, padding: '8px 0', border: '1px solid #bae6fd', borderRadius: '8px', background: '#f0f9ff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Droplet size={16} color="#0ea5e9" /><span className="param-name" style={{ color: '#0ea5e9', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>F-8583</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.f_8583_kit || '-'}</span></div>
                                    <div className="param-box f8580" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><FlaskConical size={16} color="#64748b" /><span className="param-name" style={{ color: '#64748b', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>F-8580</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.f_8580_total || '-'}</span></div>
                                  </div>
                                ) : (
                                  <div className="parameters-grid" style={{marginTop: '12px', display: 'flex', gap: '6px'}}>
                                    <div className="param-box ph" style={{ flex: 1, padding: '8px 0', border: '1px solid #fef08a', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><FlaskConical size={16} color="#eab308" /><span className="param-name" style={{ color: '#eab308', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>PH</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.ph || '-'}</span></div>
                                    <div className="param-box temp" style={{ flex: 1, padding: '8px 0', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><ThermometerSun size={16} color="#ef4444" /><span className="param-name" style={{ color: '#ef4444', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TEMP</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.temp || item.temperatura ? (item.temp || item.temperatura) + 'º' : '-'}</span></div>
                                    <div className="param-box cloro" style={{ flex: 1, padding: '8px 0', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Droplet size={16} color="#0ea5e9" /><span className="param-name" style={{ color: '#0ea5e9', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>CLORO</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.cloro_libre || item.cloro || '-'}</span></div>
                                    <div className="param-box hierro" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Box size={16} color="#64748b" /><span className="param-name" style={{ color: '#64748b', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>HIERRO</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.hierro || '-'}</span></div>
                                  </div>
                                )}

                                {isAdmin && (
                                  <div className="sample-actions" style={{marginTop: '12px', display: 'flex', gap: '8px'}}>
                                    <button className="action-btn-outline edit" style={{flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/aquapp'); }}>
                                      Editar
                                    </button>
                                    <button className="action-btn-outline delete" style={{flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/aquapp'); }}>
                                      Borrar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isTratamiento && (
                              <div className="tratamiento-record-card" style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', background: 'white'}}>
                                {/* Borde izquierdo decorativo */}
                                <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: actKey.includes('limpieza') ? '#10b981' : '#8b5cf6'}}></div>
                                
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                  <div style={{width: '20px', height: '20px', borderRadius: '50%', background: actKey.includes('limpieza') ? '#10b981' : '#8b5cf6'}}></div>
                                  <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.tipo_tratamiento || item.tipo_actuacion || cfg.label}</h4>
                                </div>
                                
                                <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora || '-'}</span>
                                  <span>•</span>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarIcon size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                </div>
                                
                                {item.motivo && (
                                  <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
                                    <span style={{background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{item.motivo}</span>
                                  </div>
                                )}

                                {item.producto && (
                                  <div style={{marginBottom: '12px'}}>
                                    <div style={{fontSize: '0.75rem', fontWeight: '800', color: '#64748b', marginBottom: '4px'}}>PRODUCTO</div>
                                    <div style={{fontWeight: '600', color: '#1e293b', fontSize: '0.95rem'}}>{item.producto}</div>
                                  </div>
                                )}

                                {item.dosis && (
                                  <div style={{marginBottom: '12px'}}>
                                    <div style={{fontSize: '0.75rem', fontWeight: '800', color: '#64748b', marginBottom: '4px'}}>DOSIS</div>
                                    <div style={{fontWeight: '600', color: '#1e293b', fontSize: '0.95rem'}}>{item.dosis}</div>
                                  </div>
                                )}
                                
                                {item.notas && (
                                  <div style={{background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.9rem', color: '#475569', marginBottom: '16px'}}>
                                    <div style={{fontWeight: 'bold', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px'}}>NOTAS</div>
                                    {item.notas}
                                  </div>
                                )}

                                {isAdmin && (
                                  <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/aquapp'); }}>
                                      Editar
                                    </button>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/aquapp'); }}>
                                      Borrar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isAviso && (
                              <div style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', background: 'white'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                  <div style={{padding: '8px', borderRadius: '12px', background: '#dcfce7', color: '#22c55e'}}><Bug size={20}/></div>
                                  <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>Aviso Plagas</h4>
                                </div>
                                
                                <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora || '-'}</span>
                                  <span>•</span>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarIcon size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                </div>

                                <div style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
                                  {(Array.isArray(item.plagas) ? item.plagas : (item.plagas ? item.plagas.split(',') : [])).map((p, i) => (
                                    <span key={i} style={{background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700'}}>{p.trim()}</span>
                                  ))}
                                </div>

                                {item.observaciones && (
                                  <div style={{background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.9rem', color: '#475569', marginBottom: '16px'}}>
                                    <div style={{fontWeight: 'bold', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px'}}>OBSERVACIONES</div>
                                    {item.observaciones}
                                  </div>
                                )}

                                {isAdmin && (
                                  <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/avisomap'); }}>
                                      Editar
                                    </button>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/avisomap'); }}>
                                      Borrar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isTarea && (
                              <div style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', background: 'white'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                  <div style={{padding: '8px', borderRadius: '12px', background: '#fee2e2', color: '#ef4444'}}><CalendarCheck size={20}/></div>
                                  <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.name || 'Tarea'}</h4>
                                </div>
                                
                                <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarIcon size={14}/> {item.date ? item.date.split('T')[0] : '-'}</span>
                                </div>

                                <div style={{padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
                                  <CalendarCheck size={18} color="#16a34a" />
                                  <span style={{ color: '#15803d', fontWeight: 600 }}>Completada</span>
                                </div>

                                {isAdmin && (
                                  <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/tareas'); }}>
                                      Editar
                                    </button>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/tareas'); }}>
                                      Borrar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })}
                  </div>
                ) : selectedDate.grouped.length === 0 ? (
                  <div className="cal-empty-state">
                    <Info size={32} color="#cbd5e1" />
                    <p>No hay servicios registrados para este día.</p>
                  </div>
                ) : (
                  <div className="cal-events-list">
                    {selectedDate.grouped.map(g => {
                      const primaryActKey = Object.keys(g.activities)[0];
                      const mainCfg = ACTIVITY_CONFIG[primaryActKey] || { bg: '#f1f5f9', color: '#64748b' };
                      return (
                      <div key={g.client} className="cal-client-card" style={{ borderLeftColor: mainCfg.color, backgroundColor: mainCfg.bg }}>
                        <div className="cal-client-card-header" style={{ color: '#1e293b', borderBottom: 'none', paddingBottom: '0' }}>
                          <strong style={{ fontSize: '1.05rem', fontWeight: 800 }}>{g.client}</strong>
                        </div>
                        <div className="cal-activity-list">
                          {Object.entries(g.activities).map(([actKey, { count, extras }]) => {
                            const cfg = ACTIVITY_CONFIG[actKey] || ACTIVITY_CONFIG.muestra_estandar;
                            const Icon = cfg.icon;
                            return (
                              <div key={actKey} className="cal-activity-row" style={{ backgroundColor: cfg.bg, cursor: 'pointer' }} onClick={() => {
                                setSelectedDetailGroup(g);
                              }}>
                                <div className="cal-activity-icon" style={{ color: cfg.color }}>
                                  <Icon size={14} />
                                </div>
                                <div className="cal-activity-details" style={{ flex: 1 }}>
                                  <span style={{ color: cfg.color, fontWeight: 700 }}>{count}x {cfg.label}</span>
                                  {extras.length > 0 && <small className="cal-activity-extras" style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{extras.join(', ')}</small>}
                                </div>
                                <ChevronRight size={16} color={cfg.color} style={{opacity: 0.5}} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="cal-empty-state">
              <CalendarIcon size={48} color="#e2e8f0" style={{marginBottom:'16px'}}/>
              <h3>Selecciona un día</h3>
              <p>Haz clic en cualquier día del calendario para ver los servicios realizados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendario;

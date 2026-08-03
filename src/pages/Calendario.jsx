import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Droplet, Bug, CalendarCheck, Info, FlaskConical, Building2, ThermometerSun, Waves } from 'lucide-react';
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
  const [selectedDate, setSelectedDate] = useState(null);
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
    const { data: muestras } = await supabase.from('aquapp_muestras').select('id, fecha, tipo_muestra, cliente_nombre').limit(5000);
    if (muestras) {
      muestras.forEach(m => {
        const d = normalizeDate(m.fecha);
        if (d && m.cliente_nombre) {
          allRaw.push({ date: d, client: m.cliente_nombre, actKey: normalizeActivityKey(m.tipo_muestra, 'muestra') });
        }
      });
    }

    // Tratamientos
    const { data: tratos } = await supabase.from('aquapp_tratamientos').select('id, fecha, tipo_tratamiento, cliente_nombre').limit(5000);
    if (tratos) {
      tratos.forEach(t => {
        const d = normalizeDate(t.fecha);
        if (d && t.cliente_nombre) {
          allRaw.push({ date: d, client: t.cliente_nombre, actKey: normalizeActivityKey(t.tipo_tratamiento, 'tratamiento') });
        }
      });
    }

    // Avisos
    const { data: avisos } = await supabase.from('avisomap_avisos').select('id, fecha, plagas, localidad').limit(5000);
    if (avisos) {
      avisos.forEach(a => {
        const d = normalizeDate(a.fecha);
        if (d) {
          allRaw.push({ date: d, client: a.localidad || 'Aviso Mapfre', actKey: 'aviso', extra: a.plagas });
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
              if (d) allRaw.push({ date: d, client: row.clientes?.name || 'Tarea', actKey: 'tarea', extra: task.name });
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
        grouped[ev.client].activities[ev.actKey] = { count: 0, extras: [] };
      }
      grouped[ev.client].activities[ev.actKey].count++;
      if (ev.extra) grouped[ev.client].activities[ev.actKey].extras.push(ev.extra);
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
  };

  const handleNext = () => {
    if (viewMode === 'semana') {
      const nd = new Date(currentDate); nd.setDate(currentDate.getDate() + 7); setCurrentDate(nd);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
    setSelectedDate(null);
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
          onClick={() => setSelectedDate({ day: d, grouped })}
        >
          <span className="cal-day-num">{d}</span>
          <div className="cal-client-chips">
            {grouped.slice(0, 3).map(g => {
              const primaryActKey = Object.keys(g.activities)[0];
              const cfg = ACTIVITY_CONFIG[primaryActKey] || { bg: '#f1f5f9', color: '#64748b', label: 'Actividad' };
              return (
                <div
                  key={g.client}
                  className="cal-client-chip"
                  style={{ backgroundColor: cfg.bg, borderLeft: `3px solid ${cfg.color}` }}
                  title={`${g.client} - ${cfg.label}`}
                >
                  <span className="cal-chip-dot" style={{ backgroundColor: cfg.color }}></span>
                  <span className="cal-chip-name" style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.65rem' }}>{g.client.length > 12 ? g.client.substring(0, 12) + '…' : g.client}</span>
                </div>
              );
            })}
            {grouped.length > 3 && (
              <div className="cal-chip-more">+{grouped.length - 3}</div>
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

          <div className="cal-legend">
            {Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <span key={key}>
                  <span className="cal-legend-dot" style={{ backgroundColor: cfg.color }}></span>
                  {cfg.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Sidebar panel */}
        <div className={`cal-details-panel ${selectedDate ? 'open' : ''}`}>
          {selectedDate ? (
            <>
              <div className="cal-details-header">
                <h3>{selectedDate.day} de {monthNames[currentDate.getMonth()]}</h3>
                <button className="close-btn" onClick={() => setSelectedDate(null)}><X size={20}/></button>
              </div>
              <div className="cal-details-content">
                {selectedDate.grouped.length === 0 ? (
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
                              <div key={actKey} className="cal-activity-row" style={{ backgroundColor: cfg.bg, cursor: 'pointer' }} onClick={() => alert(`Resumen:\nCliente: ${g.client}\nActividad: ${cfg.label}\nDetalles: ${extras.length > 0 ? extras.join(', ') : 'Sin detalles extra'}`)}>
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

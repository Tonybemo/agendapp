import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
                          <div key={`${actKey}-${idx}`} className="cal-detail-card" style={{ border: `1px solid ${cfg.color}40`, backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '1.1rem' }}>
                                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: cfg.bg, color: cfg.color }}>
                                  <Icon size={18} />
                                </div>
                                {isMuestra ? `Muestra ${item.identificador || ''}` : cfg.label}
                              </strong>
                              {isMuestra && item.tipo_muestra && (
                                <span style={{ backgroundColor: cfg.bg, color: cfg.color, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {item.tipo_muestra}
                                </span>
                              )}
                            </div>

                            {isMuestra && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, marginBottom: '2px' }}>PH</div>
                                  <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.ph || '-'}</div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, marginBottom: '2px' }}>TEMP</div>
                                  <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.temperatura || '-'}</div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, marginBottom: '2px' }}>CLORO</div>
                                  <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.cloro_libre || '-'}</div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, marginBottom: '2px' }}>HIERRO</div>
                                  <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.hierro || '-'}</div>
                                </div>
                              </div>
                            )}

                            {isTratamiento && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>PRODUCTO</div>
                                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{item.producto || '-'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>DOSIS</div>
                                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{item.dosis || '-'}</div>
                                </div>
                              </div>
                            )}

                            {isAviso && (
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>
                                  <strong>Plagas: </strong> {(Array.isArray(item.plagas) ? item.plagas : []).join(', ') || '-'}
                                </div>
                                {item.observaciones && (
                                  <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '8px' }}>
                                    {item.observaciones}
                                  </div>
                                )}
                              </div>
                            )}

                            {isTarea && (
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>{item.name || '-'}</div>
                                <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CalendarCheck size={18} color="#16a34a" />
                                  <span style={{ color: '#15803d', fontWeight: 600 }}>Completada</span>
                                </div>
                              </div>
                            )}

                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => {
                                  if (isMuestra || isTratamiento) navigate('/aquapp');
                                  else if (isAviso) navigate('/avisomap');
                                  else if (isTarea) navigate('/tareas');
                                }} style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                  Editar
                                </button>
                                <button onClick={() => {
                                  if (isMuestra || isTratamiento) navigate('/aquapp');
                                  else if (isAviso) navigate('/avisomap');
                                  else if (isTarea) navigate('/tareas');
                                }} style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                  Borrar
                                </button>
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

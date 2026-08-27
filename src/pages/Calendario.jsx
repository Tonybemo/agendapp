import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Droplet, Bug, CalendarCheck, Info, FlaskConical, Building2, ThermometerSun, Waves, Zap, Box, Clock, Phone, MapPin, Navigation } from 'lucide-react';
import './Calendario.css';
import { supabase } from '../lib/supabase';

// Colores para los puntos del calendario (uno por cliente)
const CLIENT_COLORS = ['#6366f1','var(--color-info)','#10b981','#f59e0b','var(--color-error)','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'];

// Configuración visual por tipo de actividad
const ACTIVITY_CONFIG = {
  muestra_estandar:   { label: 'Muestra Estándar',     color: 'var(--color-warning)', bg: '#fef9c3', icon: Droplet },
  muestra_torre:      { label: 'Muestra Torre',         color: '#f97316', bg: '#ffedd5', icon: Building2 },
  muestra_piscina:    { label: 'Muestra Piscina',       color: '#06b6d4', bg: '#cffafe', icon: Waves },
  muestra_jacuzzi:    { label: 'Muestra Jacuzzi',       color: '#06b6d4', bg: '#cffafe', icon: Waves },
  hipercloracion:     { label: 'Hipercloración',        color: '#a855f7', bg: '#f3e8ff', icon: FlaskConical },
  choque_termico:     { label: 'Choque Térmico',        color: '#ec4899', bg: '#fce7f3', icon: ThermometerSun },
  limpieza_torre:     { label: 'Limp. Torres',          color: '#3b82f6', bg: '#eff6ff', icon: Building2 },
  limpieza_deposito:  { label: 'Limp. Depósitos',       color: '#10b981', bg: '#d1fae5', icon: Waves },
  aviso:              { label: 'Aviso de Plagas',       color: '#22c55e', bg: '#dcfce7', icon: Bug },
  tarea:              { label: 'Tarea Completada',      color: 'var(--color-error)', bg: '#fee2e2', icon: CalendarCheck },
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
    const { data: tareasData } = await supabase.from('tareas_programadas').select('id, tareas_json, frecuencia, clientes(name)');
    if (tareasData) {
      tareasData.forEach(row => {
        if (row.tareas_json && Array.isArray(row.tareas_json)) {
          row.tareas_json.forEach(task => {
            if (task.status === 'completed') {
              const d = normalizeDate(task.date);
              let clientName = row.clientes?.name;
              if (!clientName && row.frecuencia) {
                const frec = row.frecuencia;
                if (frec.includes(':')) {
                  clientName = frec.split(':').slice(1).join(':').trim();
                }
              }
              if (!clientName) clientName = 'Tarea';
              // Skip auto-completed tasks (they already appear as treatments in the calendar)
              if (d && !task.auto) allRaw.push({ id: task.id, date: d, client: clientName, actKey: 'tarea', extra: task.name, rawItem: task });
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
        <CalendarIcon size={28} color="var(--accent-calendario)" />
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
                  <button className="back-btn" onClick={() => setSelectedDetailGroup(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-calendario)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
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
                            {isMuestra && (() => {
                                const tipo = item.tipo_muestra || 'Estándar';
                                const tipoBadgeClass = tipo === 'Torre' ? 'badge-tipo-torre' : tipo === 'Piscina' ? 'badge-tipo-piscina' : tipo === 'Jacuzzi' ? 'badge-tipo-jacuzzi' : 'badge-tipo-estandar';
                                const isTorre = tipo === 'Torre';
                                const displayDate = item.fecha ? (item.fecha.includes('T') ? item.fecha.split('T')[0] : item.fecha) : '-';
                                const displayTime = item.hora ? item.hora.substring(0, 5) : '-';

                                return (
                                  <div className="unified-card">
                                    <div className="unified-card-top">
                                      <div className="unified-card-top-left">
                                        <span>{item.numero_muestra || 'Muestra'}</span>
                                      </div>
                                      <div className="unified-card-top-right">
                                        <span className={`badge-tipo-pill ${tipoBadgeClass}`}>
                                          <Droplet size={12}/> {tipo}
                                        </span>
                                        {item.cod_envase && (
                                          <span className="badge-envase-pill">
                                            #{item.cod_envase}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <h3 className="unified-card-title">
                                      {item.descripcion || 'Sin descripción'}
                                    </h3>

                                    <div className="unified-card-meta">
                                      <span className="unified-card-meta-item">
                                        <Clock size={13}/> {displayTime}
                                      </span>
                                      <span className="unified-card-meta-item">
                                        <CalendarIcon size={13}/> {displayDate}
                                      </span>
                                    </div>

                                    {isTorre ? (
                                      <div className="sample-capsules-grid">
                                        <div className="sample-capsule ph">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><FlaskConical size={15}/></div>
                                            <span className="capsule-label">PH</span>
                                          </div>
                                          <span className="capsule-value">{item.ph || '-'}</span>
                                        </div>
                                        <div className="sample-capsule temp">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><ThermometerSun size={15}/></div>
                                            <span className="capsule-label">TEMP</span>
                                          </div>
                                          <span className="capsule-value">{item.temp ? `${item.temp}°` : '-'}</span>
                                        </div>
                                        <div className="sample-capsule cond">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><Zap size={15}/></div>
                                            <span className="capsule-label">COND.</span>
                                          </div>
                                          <span className="capsule-value">{item.conductividad || '-'}</span>
                                        </div>
                                        <div className="sample-capsule turb">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><Waves size={15}/></div>
                                            <span className="capsule-label">TURB.</span>
                                          </div>
                                          <span className="capsule-value">{item.turbidez || '-'}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="sample-capsules-grid">
                                        <div className="sample-capsule ph">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><FlaskConical size={15}/></div>
                                            <span className="capsule-label">PH</span>
                                          </div>
                                          <span className="capsule-value">{item.ph || '-'}</span>
                                        </div>
                                        <div className="sample-capsule temp">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><ThermometerSun size={15}/></div>
                                            <span className="capsule-label">TEMP</span>
                                          </div>
                                          <span className="capsule-value">{item.temp || item.temperatura ? `${item.temp || item.temperatura}°` : '-'}</span>
                                        </div>
                                        <div className="sample-capsule cloro">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><Droplet size={15}/></div>
                                            <span className="capsule-label">CLORO</span>
                                          </div>
                                          <span className="capsule-value">{item.cloro_libre || item.cloro || '-'}</span>
                                        </div>
                                        <div className="sample-capsule hierro">
                                          <div className="capsule-left">
                                            <div className="capsule-icon-circle"><Box size={15}/></div>
                                            <span className="capsule-label">HIERRO</span>
                                          </div>
                                          <span className="capsule-value">{item.hierro || '0'}</span>
                                        </div>
                                      </div>
                                    )}

                                    {isAdmin && (
                                      <div className="unified-card-footer admin-only">
                                        <button 
                                          className="card-action-icon-btn edit" 
                                          title="Editar en Muestras"
                                          onClick={(e) => { e.stopPropagation(); navigate('/aquapp'); }}
                                        >
                                          <Edit3 size={15}/>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                            {isTratamiento && (() => {
                              const isRecuentoAlto = (item.motivo || '').toLowerCase().includes('recuento') || (item.motivo || '').toLowerCase().includes('alto');
                              const displayDate = item.fecha ? (item.fecha.includes('T') ? item.fecha.split('T')[0] : item.fecha) : '-';
                              const displayTime = item.hora ? item.hora.substring(0, 5) : '-';

                              return (
                                <div className="unified-card">
                                  <div className="unified-card-top">
                                    <div className="unified-card-top-left">
                                      <div className="unified-card-dot" style={{ backgroundColor: actKey.includes('limpieza') ? '#10b981' : '#8b5cf6' }} />
                                      <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                                        {item.cliente_nombre || item.tipo_tratamiento || item.tipo_actuacion || cfg.label}
                                      </span>
                                    </div>
                                    <div className="unified-card-meta" style={{ margin: 0 }}>
                                      <span>{displayDate}</span>
                                      {displayTime !== '-' && <span>{displayTime}</span>}
                                    </div>
                                  </div>

                                  <div className="trat-badges-row" style={{ marginTop: '8px' }}>
                                    <span className="trat-badge-tipo" style={{ background: actKey.includes('limpieza') ? '#d1fae5' : '#f3e8ff', color: actKey.includes('limpieza') ? '#047857' : '#7c3aed' }}>
                                      {item.tipo_tratamiento || item.tipo_actuacion || cfg.label}
                                    </span>
                                    {item.motivo && (
                                      <span className={`trat-badge-motivo ${isRecuentoAlto ? 'recuento-alto' : 'prevencion'}`}>
                                        {isRecuentoAlto ? 'Recuento Alto ⚠️' : item.motivo}
                                      </span>
                                    )}
                                  </div>

                                  {item.notas && (
                                    <div className="unified-card-notes">
                                      <strong>Notas:</strong> {item.notas}
                                    </div>
                                  )}

                                  {isAdmin && (
                                    <div className="unified-card-footer admin-only">
                                      <button 
                                        className="card-action-icon-btn edit" 
                                        title="Editar en Tratamientos"
                                        onClick={(e) => { e.stopPropagation(); navigate('/aquapp'); }}
                                      >
                                        <Edit3 size={15}/>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {isAviso && (
                              <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', boxShadow: 'var(--shadow-md)', background: 'var(--bg-card)'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                                  <h4 style={{margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '800'}}>
                                    {item.direccion}{item.portal ? `, ${item.portal}` : ''}
                                  </h4>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px'}}>
                                  <MapPin size={14} color="var(--color-success)" />
                                  <span style={{fontWeight: 700}}>{item.localidad || 'Localidad desconocida'}</span>
                                </div>
                                
                                <div style={{display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora || '-'}</span>
                                  <span>•</span>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarIcon size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                </div>

                                <div style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
                                  {(Array.isArray(item.plagas) ? item.plagas : (item.plagas ? String(item.plagas).split(',') : [])).map((p, i) => (
                                    <span key={i} style={{background: 'var(--bg-main)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                      <Bug size={14}/> {p.trim()}
                                    </span>
                                  ))}
                                </div>

                                {item.contacto && (
                                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px'}}>
                                    <Phone size={14} color="var(--text-muted)" />
                                    <span>{item.contacto}</span>
                                  </div>
                                )}

                                {item.observaciones && (
                                  <div style={{background: 'var(--bg-card-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
                                    <div style={{fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '4px'}}>OBSERVACIONES</div>
                                    {item.observaciones}
                                  </div>
                                )}

                                <div style={{marginBottom: '12px'}}>
                                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.direccion || '') + ' ' + (item.portal || '') + ', ' + (item.localidad || ''))}`, '_blank')} style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'}}>
                                    <Navigation size={14}/> Ruta GPS
                                  </button>
                                </div>

                                {isAdmin && (
                                  <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', color: 'var(--primary-hover)', border: '1px solid #bfdbfe', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/avisomap'); }}>
                                      Editar
                                    </button>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/avisomap'); }}>
                                      Borrar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isTarea && (
                              <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', boxShadow: 'var(--shadow-md)', background: 'var(--bg-card)'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                  <div style={{padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-error-light)', color: 'var(--color-error)'}}><CalendarCheck size={20}/></div>
                                  <h4 style={{margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '800'}}>{item.name || 'Tarea'}</h4>
                                </div>
                                
                                <div style={{display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarIcon size={14}/> {item.date ? item.date.split('T')[0] : '-'}</span>
                                </div>

                                <div style={{padding: '8px', backgroundColor: 'var(--color-success-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
                                  <CalendarCheck size={18} color="var(--color-success)" />
                                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Completada</span>
                                </div>

                                {isAdmin && (
                                  <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', color: 'var(--primary-hover)', border: '1px solid #bfdbfe', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/tareas'); }}>
                                      Editar
                                    </button>
                                    <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate('/tareas'); }}>
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
                    <Info size={32} color="var(--text-faint)" />
                    <p>No hay servicios registrados para este día.</p>
                  </div>
                ) : (
                  <div className="cal-events-list">
                    {selectedDate.grouped.map(g => {
                      const primaryActKey = Object.keys(g.activities)[0];
                      const mainCfg = ACTIVITY_CONFIG[primaryActKey] || { bg: 'var(--bg-main)', color: 'var(--text-muted)' };
                      return (
                      <div key={g.client} className="cal-client-card" style={{ borderLeftColor: mainCfg.color, backgroundColor: mainCfg.bg }}>
                        <div className="cal-client-card-header" style={{ color: 'var(--text-main)', borderBottom: 'none', paddingBottom: '0' }}>
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
                                  {extras.length > 0 && <small className="cal-activity-extras" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{extras.join(', ')}</small>}
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
              <CalendarIcon size={48} color="var(--border)" style={{marginBottom:'16px'}}/>
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

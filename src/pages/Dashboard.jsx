import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Droplet, MapPin, Briefcase, CalendarCheck, ChevronRight, ChevronLeft, 
  FlaskConical, Clock, TrendingUp, Settings, Plus, Sparkles, Calendar, CheckCircle2, X, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const getTratamientoBadge = (tipo) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('hiper')) return { label: 'Hipercloración', color: '#a855f7', bg: '#f3e8ff' };
  if (t.includes('choque')) return { label: 'Choque Térmico', color: '#ec4899', bg: '#fce7f3' };
  if (t.includes('torre') || t.includes('limptorres')) return { label: 'Limp. Torres', color: '#3b82f6', bg: '#eff6ff' };
  if (t.includes('dep') || t.includes('limpdep')) return { label: 'Limp. Depósitos', color: '#10b981', bg: '#d1fae5' };
  return { label: tipo || 'Tratamiento', color: '#0284c7', bg: '#e0f2fe' };
};

const getMotivoBadge = (motivo) => {
  const m = (motivo || '').toLowerCase();
  if (m.includes('recuento') || m.includes('alto')) return { label: 'Recuento Alto ⚠️', color: '#b91c1c', bg: '#fee2e2' };
  return { label: 'Prevención', color: '#15803d', bg: '#dcfce7' };
};

const formatDatePretty = (fechaStr) => {
  if (!fechaStr) return '';
  let d = fechaStr;
  if (d.includes('T')) d = d.split('T')[0];
  if (d.includes('-')) {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (d.includes('/')) return d;
  return d;
};

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [monthStats, setMonthStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [recurrentData, setRecurrentData] = useState({ prevYears: [], thisYear: [] });
  const [dismissedKeys, setDismissedKeys] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dash_dismissed_treatments') || '{}');
    } catch { return {}; }
  });
  const [showDismissed, setShowDismissed] = useState(false);

  const parseDateForSort = (fechaStr) => {
    if (!fechaStr) return new Date(0);
    if (fechaStr.includes('T')) return new Date(fechaStr);
    if (fechaStr.includes('/')) {
      const [d,m,y] = fechaStr.split('/');
      return new Date(y, m-1, d);
    }
    return new Date(fechaStr);
  };

  const parseTimeToHours = (t) => {
    if (!t) return 0;
    if (!String(t).includes(':')) return parseFloat(t) || 0;
    const parts = String(t).split(':');
    return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
  };

  const isInMonth = (fechaStr, year, month) => {
    if (!fechaStr) return false;
    const d = parseDateForSort(fechaStr);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === year && d.getMonth() === month;
  };

  const fetchMonthStats = useCallback(async (year, month) => {
    setLoadingStats(true);
    try {
      const [tratRes, muestrasRes, avisosRes, jornadasRes, tareasRes] = await Promise.all([
        supabase.from('aquapp_tratamientos').select('id, cliente_id, cliente_nombre, tipo_tratamiento, motivo, fecha, hora, notas'),
        supabase.from('aquapp_muestras').select('fecha'),
        supabase.from('avisomap_avisos').select('fecha'),
        supabase.from('workapp_jornadas').select('fecha, horas_calculadas, horas_extras'),
        supabase.from('tareas_programadas').select('mes, año, tareas_json'),
      ]);

      const allTrats = tratRes.data || [];
      const trat = allTrats.filter(r => isInMonth(r.fecha, year, month));
      const muestras = (muestrasRes.data || []).filter(r => isInMonth(r.fecha, year, month));
      const avisos = (avisosRes.data || []).filter(r => isInMonth(r.fecha, year, month));
      const jornadas = (jornadasRes.data || []).filter(r => isInMonth(r.fecha, year, month));

      let totalHoras = 0;
      let totalExtras = 0;
      jornadas.forEach(j => {
        totalHoras += parseTimeToHours(j.horas_calculadas);
        totalExtras += parseTimeToHours(j.horas_extras);
      });

      const monthName = MONTH_NAMES[month];
      let tareasTotal = 0;
      let tareasCompletadas = 0;
      (tareasRes.data || []).forEach(row => {
        const rowMes = (row.mes || '').trim().toLowerCase();
        const targetMes = monthName.toLowerCase();
        const matchMes = rowMes === targetMes;
        const matchAno = !row.año || String(row.año).trim() === String(year);
        if (matchMes && matchAno) {
          let tasks = [];
          try { tasks = typeof row.tareas_json === 'string' ? JSON.parse(row.tareas_json) : (row.tareas_json || []); } catch {}
          tasks.forEach(t => {
            tareasTotal++;
            if (t.status === 'completed' || t.status === 'skipped') {
              tareasCompletadas++;
            }
          });
        }
      });
      const tareasPct = tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0;

      // Group recurring treatments by month
      const prevYearsMap = new Map();
      const thisYearMap = new Map();
      // Track ALL treatments done this year (any month) for cross-referencing
      const doneThisYearAll = new Set();

      allTrats.forEach(item => {
        if (!item.fecha) return;
        const d = parseDateForSort(item.fecha);
        if (isNaN(d.getTime())) return;
        const itemYear = d.getFullYear();

        // Track all treatments done this year (any month)
        if (itemYear === year) {
          const cliName = (item.cliente_nombre || 'Cliente puntual').toLowerCase();
          const tipo = (item.tipo_tratamiento || '').toLowerCase();
          doneThisYearAll.add(`${cliName}::${tipo}`);
        }

        if (d.getMonth() === month) {
          const cliName = item.cliente_nombre || 'Cliente puntual';
          const targetMap = itemYear < year ? prevYearsMap : (itemYear === year ? thisYearMap : null);
          
          if (targetMap) {
            if (!targetMap.has(cliName)) {
              targetMap.set(cliName, {
                clienteNombre: cliName,
                clienteId: item.cliente_id,
                treatments: []
              });
            }
            targetMap.get(cliName).treatments.push({ ...item, year: itemYear });
          }
        }
      });

      const sortGroup = (map) => {
        return Array.from(map.values())
          .map(group => ({
            ...group,
            treatments: group.treatments.sort((a, b) => parseDateForSort(b.fecha) - parseDateForSort(a.fecha))
          }))
          .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre));
      };

      setRecurrentData({
        prevYears: sortGroup(prevYearsMap),
        thisYear: sortGroup(thisYearMap),
        doneThisYearAll: doneThisYearAll
      });

      setMonthStats({
        tratamientos: trat.length,
        muestras: muestras.length,
        avisos: avisos.length,
        jornadasDias: jornadas.length,
        totalHoras: totalHoras.toFixed(1),
        totalExtras: totalExtras.toFixed(1),
        importe: (totalExtras * 11).toFixed(0),
        tareasPct,
        tareasCompletadas,
        tareasTotal,
      });
    } catch (e) {
      console.error('Error fetching month stats', e);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => {
    fetchMonthStats(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchMonthStats]);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const goToday = () => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth()); };

  const statCards = [
    {
      id: 'tratamientos',
      title: 'Tratamientos',
      value: monthStats ? monthStats.tratamientos : '...',
      icon: <FlaskConical size={28} color="#0284c7" />,
      path: '/aquapp?tab=tratamientos',
      bgColor: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      badgeColor: '#0284c7'
    },
    {
      id: 'muestras',
      title: 'Muestras',
      value: monthStats ? monthStats.muestras : '...',
      icon: <Droplet size={28} color="#059669" />,
      path: '/aquapp',
      bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      badgeColor: '#059669'
    },
    {
      id: 'avisomap',
      title: 'Avisos Mapfre',
      value: monthStats ? monthStats.avisos : '...',
      icon: <MapPin size={28} color="#16a34a" />,
      path: '/avisomap',
      bgColor: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
      badgeColor: '#16a34a'
    },
    {
      id: 'tareas',
      title: 'Tareas',
      value: monthStats ? `${monthStats.tareasPct}%` : '...',
      icon: <CalendarCheck size={28} color="var(--accent-tareas)" />,
      path: '/tareas',
      bgColor: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
      badgeColor: '#e11d48'
    }
  ];

  // Use the pre-built set of ALL treatments done this year (any month)
  const doneThisYearSet = recurrentData.doneThisYearAll || new Set();

  // Dismiss helpers
  const makeDismissKey = (clienteName, tipoTrat) => `${selectedMonth}::${clienteName.toLowerCase()}::${(tipoTrat || '').toLowerCase()}`;
  
  const toggleDismiss = (clienteName, tipoTrat) => {
    const key = makeDismissKey(clienteName, tipoTrat);
    setDismissedKeys(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = true;
      localStorage.setItem('dash_dismissed_treatments', JSON.stringify(next));
      return next;
    });
  };

  // Build unified checklist from prevYears
  const checklistGroups = recurrentData.prevYears.map(group => {
    // Deduplicate by tipo_tratamiento (take the most recent one per type)
    const byTipo = new Map();
    group.treatments.forEach(t => {
      const tipo = (t.tipo_tratamiento || '').toLowerCase();
      if (!byTipo.has(tipo) || t.year > byTipo.get(tipo).year) {
        byTipo.set(tipo, t);
      }
    });

    const items = Array.from(byTipo.entries()).map(([tipo, t]) => {
      const doneKey = `${group.clienteNombre.toLowerCase()}::${tipo}`;
      const dismissKey = makeDismissKey(group.clienteNombre, t.tipo_tratamiento);
      const isDone = doneThisYearSet.has(doneKey);
      const isDismissed = !!dismissedKeys[dismissKey];
      return { ...t, isDone, isDismissed, tipoKey: tipo };
    });

    return { ...group, checklistItems: items };
  });

  // Count stats
  const totalItems = checklistGroups.reduce((acc, g) => acc + g.checklistItems.length, 0);
  const doneItems = checklistGroups.reduce((acc, g) => acc + g.checklistItems.filter(i => i.isDone).length, 0);
  const dismissedItems = checklistGroups.reduce((acc, g) => acc + g.checklistItems.filter(i => i.isDismissed && !i.isDone).length, 0);
  const pendingItems = totalItems - doneItems - dismissedItems;

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Top Bar with Modern Month Navigator and Settings */}
      <div className="dashboard-top-nav">
        <div className="month-selector-modern">
          <button className="month-nav-btn-modern" onClick={prevMonth} title="Mes anterior">
            <ChevronLeft size={22} />
          </button>
          <div className="month-display-modern">
            <h2>{MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
            {(selectedYear !== now.getFullYear() || selectedMonth !== now.getMonth()) && (
              <button className="month-today-badge" onClick={goToday}>
                Hoy
              </button>
            )}
          </div>
          <button className="month-nav-btn-modern" onClick={nextMonth} title="Mes siguiente">
            <ChevronRight size={22} />
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate('/gestor')}
            className="dashboard-settings-btn"
            title="Gestor Global (Avanzado)"
          >
            <Settings size={22} />
          </button>
        )}
      </div>

      {/* Grid of 4 Cards */}
      <div className="dashboard-grid-summary">
        {statCards.map((card) => (
          <div
            key={card.id}
            className="dash-card dash-card-stat"
            onClick={() => navigate(card.path)}
          >
            <div className="dash-card-header-stat">
              <div className="dash-card-icon-wrapper" style={{ background: card.bgColor }}>
                {card.icon}
              </div>
              <div className="dash-stat-number" style={{ color: card.badgeColor }}>
                {card.value}
              </div>
            </div>
            <div className="dash-card-content">
              <h3>{card.title}</h3>
            </div>
          </div>
        ))}

        {/* Featured Wide Card: Workapp & Hours Summary */}
        <div
          className="dash-card dash-card-workapp-banner"
          onClick={() => navigate('/workapp')}
        >
          <div className="dash-card-workapp-top">
            <div className="dash-card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
              <Briefcase size={28} color="var(--accent-workapp)" />
            </div>
            <div className="dash-card-content" style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Workapp · Jornada</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="dash-stat-number" style={{ color: '#7c3aed', fontSize: '1.5rem', fontWeight: 900 }}>
                {monthStats ? `${monthStats.jornadasDias} días` : '...'}
              </span>
              <ChevronRight size={20} color="var(--text-muted)" strokeWidth={2.5} />
            </div>
          </div>

          {/* Detailed Hours Row */}
          {monthStats && (
            <div className="dash-workapp-metrics-row">
              <div className="dash-metric-chip">
                <Clock size={16} color="var(--text-muted)" />
                <div>
                  <span className="dash-metric-value">{monthStats.totalHoras}h</span>
                  <span className="dash-metric-label">Trabajadas</span>
                </div>
              </div>

              <div className="dash-metric-chip dash-metric-chip-extras">
                <TrendingUp size={16} color="#f43f5e" />
                <div>
                  <span className="dash-metric-value text-extras">{monthStats.totalExtras}h</span>
                  <span className="dash-metric-label label-extras">Horas Extras</span>
                </div>
              </div>

              <div className="dash-metric-chip dash-metric-chip-money">
                <span className="dash-metric-euro">€</span>
                <div>
                  <span className="dash-metric-value text-money">{monthStats.importe}€</span>
                  <span className="dash-metric-label label-money">Importe Extras</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN: CHECKLIST DE TRATAMIENTOS DEL MES ── */}
      <div className="dash-recurrent-card">
        <div className="dash-recurrent-header">
          <div className="dash-recurrent-title-block">
            <div className="dash-recurrent-icon-pill">
              <FlaskConical size={22} color="#0284c7" />
            </div>
            <div>
              <h3 className="dash-recurrent-title">
                Tratamientos · {MONTH_NAMES[selectedMonth]}
              </h3>
              <p className="dash-recurrent-subtitle">
                {totalItems > 0 
                  ? `${doneItems} de ${totalItems} realizados${dismissedItems > 0 ? ` · ${dismissedItems} descartados` : ''}${pendingItems > 0 ? ` · ${pendingItems} pendientes` : ''}`
                  : `No hay tratamientos previstos en ${MONTH_NAMES[selectedMonth]}`
                }
              </p>
            </div>
          </div>

          {dismissedItems > 0 && (
            <button 
              className={`dash-recurrent-toggle-dismissed ${showDismissed ? 'active' : ''}`}
              onClick={() => setShowDismissed(v => !v)}
              title={showDismissed ? 'Ocultar descartados' : 'Ver descartados'}
            >
              {showDismissed ? <EyeOff size={14} /> : <Eye size={14} />}
              {showDismissed ? 'Ocultar' : 'Ver'} descartados ({dismissedItems})
            </button>
          )}
        </div>

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="dash-recurrent-progress-bar-wrap">
            <div className="dash-recurrent-progress-bar">
              <div 
                className="dash-recurrent-progress-fill done" 
                style={{ width: `${(doneItems / totalItems) * 100}%` }}
              />
              <div 
                className="dash-recurrent-progress-fill dismissed" 
                style={{ width: `${(dismissedItems / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}

        {loadingStats ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            Cargando tratamientos...
          </div>
        ) : checklistGroups.length === 0 ? (
          <div className="dash-recurrent-empty">
            <FlaskConical size={40} color="var(--text-faint)" />
            <p className="dash-recurrent-empty-title">
              No hay tratamientos de años anteriores registrados en {MONTH_NAMES[selectedMonth]}.
            </p>
          </div>
        ) : (
          <div className="dash-recurrent-grid">
            {checklistGroups.map(group => {
              const visibleItems = group.checklistItems.filter(i => 
                showDismissed || !i.isDismissed || i.isDone
              );
              if (visibleItems.length === 0) return null;

              const groupDone = visibleItems.filter(i => i.isDone).length;
              const groupTotal = group.checklistItems.filter(i => !i.isDismissed || i.isDone).length;
              const allDone = groupDone === groupTotal && groupTotal > 0;

              return (
                <div key={group.clienteNombre} className={`dash-recurrent-item ${allDone ? 'all-done' : ''}`}>
                  <div className="dash-recurrent-client-header">
                    <div className={`dash-recurrent-avatar ${allDone ? 'avatar-done' : ''}`}>
                      {allDone ? <CheckCircle2 size={18} /> : group.clienteNombre.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dash-recurrent-client-name" title={group.clienteNombre}>
                        {group.clienteNombre}
                      </div>
                      <div className="dash-recurrent-client-count">
                        {allDone 
                          ? '✅ Todo completado'
                          : `${groupDone} de ${groupTotal} realizados`
                        }
                      </div>
                    </div>
                    {!allDone && (
                      <button
                        className="dash-recurrent-add-action-btn"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-universal-form', { 
                            detail: { 
                              type: 'muestra', 
                              mode: 'tratamiento',
                              clienteId: group.clienteId || null
                            } 
                          }));
                        }}
                        title={`Registrar nuevo tratamiento para ${group.clienteNombre}`}
                      >
                        <Plus size={15} /> Añadir
                      </button>
                    )}
                  </div>

                  <div className="dash-recurrent-treatments-stack">
                    {visibleItems.map(t => {
                      const tStyle = getTratamientoBadge(t.tipo_tratamiento);
                      const mStyle = getMotivoBadge(t.motivo);
                      return (
                        <div 
                          key={`${t.tipoKey}-${t.id}`} 
                          className={`dash-recurrent-row ${t.isDone ? 'row-done' : ''} ${t.isDismissed && !t.isDone ? 'row-dismissed' : ''}`}
                        >
                          <div className="dash-recurrent-row-main">
                            <div className={`dash-recurrent-check ${t.isDone ? 'checked' : ''}`}>
                              {t.isDone ? <CheckCircle2 size={16} /> : <div className="dash-recurrent-check-empty" />}
                            </div>
                            <div className="dash-recurrent-badges-wrap">
                              <span className="dash-recurrent-badge-tipo" style={{ background: tStyle.bg, color: tStyle.color }}>
                                {tStyle.label}
                              </span>
                              {t.motivo && (
                                <span className="dash-recurrent-badge-motivo" style={{ background: mStyle.bg, color: mStyle.color }}>
                                  {mStyle.label}
                                </span>
                              )}
                            </div>
                            <div className="dash-recurrent-row-actions">
                              {!t.isDone && (
                                <button 
                                  className={`dash-recurrent-dismiss-btn ${t.isDismissed ? 'is-dismissed' : ''}`}
                                  onClick={() => toggleDismiss(group.clienteNombre, t.tipo_tratamiento)}
                                  title={t.isDismissed ? 'Restaurar tratamiento' : 'Descartar (no se hará este año)'}
                                >
                                  {t.isDismissed ? <Eye size={13} /> : <X size={13} />}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="dash-recurrent-date-info">
                            <span className="dash-recurrent-year-tag">{t.year}</span>
                            <span className="dash-recurrent-date">{formatDatePretty(t.fecha)}</span>
                            {t.isDone && <span className="dash-recurrent-done-label">✅ Hecho en {selectedYear}</span>}
                            {t.isDismissed && !t.isDone && <span className="dash-recurrent-dismissed-label">Descartado</span>}
                          </div>

                          {t.notas && t.notas !== 'null' && t.notas.trim() !== '' && (
                            <div className="dash-recurrent-notes" title={t.notas}>
                              💬 {t.notas}
                            </div>
                          )}
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
    </div>
  );
};

export default Dashboard;

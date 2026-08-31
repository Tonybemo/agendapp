import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Droplet, MapPin, Briefcase, CalendarCheck, ChevronRight, ChevronLeft, 
  FlaskConical, Clock, TrendingUp, Settings, Plus, Sparkles, Calendar, CheckCircle2
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
  const [recurrentTab, setRecurrentTab] = useState('prev'); // 'prev' = previsiones (años anteriores), 'this' = hechos este año

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

      allTrats.forEach(item => {
        if (!item.fecha) return;
        const d = parseDateForSort(item.fecha);
        if (isNaN(d.getTime())) return;
        if (d.getMonth() === month) {
          const itemYear = d.getFullYear();
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
        thisYear: sortGroup(thisYearMap)
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

  const displayedRecurrent = recurrentTab === 'prev' ? recurrentData.prevYears : recurrentData.thisYear;
  const totalPrevTreatments = recurrentData.prevYears.reduce((acc, g) => acc + g.treatments.length, 0);
  const totalThisTreatments = recurrentData.thisYear.reduce((acc, g) => acc + g.treatments.length, 0);

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

      {/* ── SECCIÓN: TRATAMIENTOS RECURRENTES DEL MES ── */}
      <div className="dash-recurrent-card">
        <div className="dash-recurrent-header">
          <div className="dash-recurrent-title-block">
            <div className="dash-recurrent-icon-pill">
              <FlaskConical size={22} color="#0284c7" />
            </div>
            <div>
              <h3 className="dash-recurrent-title">
                Previsión de Tratamientos · {MONTH_NAMES[selectedMonth]}
              </h3>
              <p className="dash-recurrent-subtitle">
                Tratamientos realizados históricamente en {MONTH_NAMES[selectedMonth]} para planificar este mes
              </p>
            </div>
          </div>

          <div className="dash-recurrent-tabs">
            <button
              className={`dash-recurrent-tab-btn ${recurrentTab === 'prev' ? 'active' : ''}`}
              onClick={() => setRecurrentTab('prev')}
            >
              Histórico ({totalPrevTreatments})
            </button>
            <button
              className={`dash-recurrent-tab-btn ${recurrentTab === 'this' ? 'active' : ''}`}
              onClick={() => setRecurrentTab('this')}
            >
              Hechos en {selectedYear} ({totalThisTreatments})
            </button>
          </div>
        </div>

        {loadingStats ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            Cargando tratamientos...
          </div>
        ) : displayedRecurrent.length === 0 ? (
          <div className="dash-recurrent-empty">
            <FlaskConical size={40} color="var(--text-faint)" />
            <p className="dash-recurrent-empty-title">
              {recurrentTab === 'prev' 
                ? `No hay tratamientos de años anteriores registrados en ${MONTH_NAMES[selectedMonth]}.`
                : `Aún no se han registrado tratamientos en ${MONTH_NAMES[selectedMonth]} de ${selectedYear}.`
              }
            </p>
            {recurrentTab === 'this' && (
              <button
                className="dash-recurrent-new-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('open-universal-form', { detail: { type: 'muestra', mode: 'tratamiento' } }))}
              >
                <Plus size={16} /> Registrar nuevo tratamiento
              </button>
            )}
          </div>
        ) : (
          <div className="dash-recurrent-grid">
            {displayedRecurrent.map(group => (
              <div key={group.clienteNombre} className="dash-recurrent-item">
                <div className="dash-recurrent-client-header">
                  <div className="dash-recurrent-avatar">
                    {group.clienteNombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-recurrent-client-name" title={group.clienteNombre}>
                      {group.clienteNombre}
                    </div>
                    <div className="dash-recurrent-client-count">
                      {group.treatments.length} {group.treatments.length === 1 ? 'tratamiento' : 'tratamientos'}
                    </div>
                  </div>
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
                </div>

                <div className="dash-recurrent-treatments-stack">
                  {group.treatments.map(t => {
                    const tStyle = getTratamientoBadge(t.tipo_tratamiento);
                    const mStyle = getMotivoBadge(t.motivo);
                    return (
                      <div key={t.id} className="dash-recurrent-row">
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

                        <div className="dash-recurrent-date-info">
                          <span className="dash-recurrent-year-tag">{t.year}</span>
                          <span className="dash-recurrent-date">{formatDatePretty(t.fecha)}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Droplet, MapPin, Briefcase, CalendarCheck, ChevronRight, ChevronLeft, 
  FlaskConical, Clock, TrendingUp, Settings, Search, User, X, Navigation,
  Calculator, BookOpen, Calendar, BarChart2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { openMapsForClient } from '../utils/navigation';
import './Dashboard.css';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [monthStats, setMonthStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Estado del buscador rápido de clientes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});

  const parseDateForSort = (fechaStr) => {
    if (!fechaStr) return new Date(0);
    if (fechaStr.includes('T')) return new Date(fechaStr);
    if (fechaStr.includes('/')) {
      const [d,m,y] = fechaStr.split('/');
      return new Date(y, m-1, d);
    }
    return new Date(fechaStr);
  };

  const formatDatePretty = (fechaStr) => {
    if (!fechaStr) return '';
    const d = parseDateForSort(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
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

  // Búsqueda rápida de clientes (con fallback offline)
  useEffect(() => {
    const searchClientes = async () => {
      const q = searchQuery.trim();
      if (!q || q.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        if (navigator.onLine) {
          const { data, error } = await supabase
            .from('clientes')
            .select('id, name, address, contact')
            .ilike('name', `%${q}%`)
            .limit(6);
          if (!error && data) {
            setSearchResults(data);
            setIsSearching(false);
            return;
          }
        }
      } catch (e) {}

      // Fallback a caché local si no hay cobertura
      try {
        const rawFull = localStorage.getItem('offline_cache_clientes_full') || localStorage.getItem('offline_cache_clientes');
        if (rawFull) {
          const cached = JSON.parse(rawFull);
          const filtered = cached
            .filter(c => (c.name || '').toLowerCase().includes(q.toLowerCase()))
            .slice(0, 6);
          setSearchResults(filtered);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(searchClientes, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectClient = async (cliente) => {
    setSelectedClient(cliente);
    setSearchQuery('');
    setSearchResults([]);
    setLoadingDetails(true);

    try {
      const [muestrasRes, tratRes] = await Promise.all([
        supabase.from('aquapp_muestras').select('fecha').eq('cliente_id', cliente.id),
        supabase.from('aquapp_tratamientos').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: false }).limit(3)
      ]);

      let resumenMuestras = [];
      if (muestrasRes.data) {
        const conteoMap = new Map();

        muestrasRes.data.forEach(m => {
          const d = parseDateForSort(m.fecha);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear().toString();
            const sortKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = MONTH_NAMES[d.getMonth()];

            if (!conteoMap.has(year)) {
              conteoMap.set(year, new Map());
            }

            const yearMap = conteoMap.get(year);
            if (!yearMap.has(sortKey)) {
              yearMap.set(sortKey, { label, count: 0, sortKey });
            }
            yearMap.get(sortKey).count++;
          }
        });

        const yearsSorted = Array.from(conteoMap.keys()).sort((a, b) => b.localeCompare(a));
        resumenMuestras = yearsSorted.map(year => {
          const months = Array.from(conteoMap.get(year).values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
          return { year, months };
        });
      }

      setExpandedYears({});
      setClientDetails({
        muestrasResumen: resumenMuestras,
        tratamientos: tratRes.data || []
      });
    } catch (e) {
      setClientDetails({ muestrasResumen: [], tratamientos: [] });
    }
    setLoadingDetails(false);
  };

  const fetchMonthStats = useCallback(async (year, month) => {
    setLoadingStats(true);
    try {
      const [tratRes, muestrasRes, avisosRes, jornadasRes, tareasRes] = await Promise.all([
        supabase.from('aquapp_tratamientos').select('fecha'),
        supabase.from('aquapp_muestras').select('fecha'),
        supabase.from('avisomap_avisos').select('fecha'),
        supabase.from('workapp_jornadas').select('fecha, horas_calculadas, horas_extras'),
        supabase.from('tareas_programadas').select('mes, año, tareas_json'),
      ]);

      const trat = (tratRes.data || []).filter(r => isInMonth(r.fecha, year, month));
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
      id: 'muestras',
      title: 'Muestras',
      value: monthStats ? monthStats.muestras : '...',
      icon: <Droplet size={28} color="#059669" />,
      path: '/aquapp',
      bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      badgeColor: '#059669'
    },
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

  const toolCards = [
    {
      id: 'calculadora',
      title: 'Calculadora Técnica',
      subtitle: 'Cloro, neutralización y conversor',
      icon: <Calculator size={24} color="#0284c7" />,
      path: '/calculadora',
      bgColor: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)',
      public: true
    },
    {
      id: 'catalogo',
      title: 'Productos',
      subtitle: 'Catálogo, fichas y registros',
      icon: <BookOpen size={24} color="var(--accent-catalogo)" />,
      path: '/catalogo',
      bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      public: false
    },
    {
      id: 'calendario',
      title: 'Calendario Global',
      subtitle: 'Agenda y actividad diaria',
      icon: <Calendar size={24} color="var(--accent-calendario)" />,
      path: '/calendario',
      bgColor: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
      public: true
    },
    {
      id: 'estadisticas',
      title: 'Estadísticas',
      subtitle: 'Gráficas y métricas anuales',
      icon: <BarChart2 size={24} color="var(--accent-estadisticas)" />,
      path: '/estadisticas',
      bgColor: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      public: false
    }
  ];

  const visibleToolCards = isAdmin ? toolCards : toolCards.filter(t => t.public);

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

      {/* Buscador Rápido de Clientes y Ruta GPS */}
      <div className="dashboard-search-wrapper" style={{
        margin: '0 0 22px 0',
        position: 'relative',
        zIndex: 50
      }}>
        <div className="dash-search-box">
          <Search size={20} color="var(--accent-aquapp)" style={{ marginRight: '12px', flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="Buscar cliente para ver ficha o cómo llegar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dash-search-input"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="dash-search-clear-btn"
              title="Limpiar búsqueda"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {searchQuery.length >= 2 && (
          <div className="dash-search-dropdown">
            {isSearching ? (
              <div style={{padding: '16px', textAlign: 'center', color: 'var(--text-muted)'}}>Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div style={{padding: '16px', textAlign: 'center', color: 'var(--text-muted)'}}>No se encontraron clientes</div>
            ) : (
              searchResults.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => handleSelectClient(c)}
                  className="dash-search-result-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                    <User size={18} color="var(--text-muted)" style={{marginRight: '12px', flexShrink: 0}} />
                    <span style={{fontWeight: '700', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{c.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMapsForClient(c.name, c.address);
                    }}
                    className="dash-search-maps-btn"
                    title={`Cómo llegar a ${c.name} en Google Maps`}
                  >
                    <Navigation size={13} /> Cómo llegar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Grid of 4 Monthly KPI Cards + Workapp Wide Card */}
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

      {/* Sección de Herramientas y Consulta Rápida */}
      <div className="dashboard-tools-section">
        <div className="dashboard-section-label">Herramientas y Consulta</div>
        <div className="dashboard-tools-grid">
          {visibleToolCards.map((tool) => (
            <div
              key={tool.id}
              className="dash-card dash-card-tool"
              onClick={() => navigate(tool.path)}
            >
              <div className="dash-card-icon-wrapper dash-tool-icon" style={{ background: tool.bgColor }}>
                {tool.icon}
              </div>
              <div className="dash-card-content dash-tool-content">
                <h3>{tool.title}</h3>
                <p>{tool.subtitle}</p>
              </div>
              <ChevronRight size={18} color="var(--text-faint)" className="dash-tool-chevron" />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Ficha Rápida de Cliente */}
      {selectedClient && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }} onClick={() => setSelectedClient(null)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px',
            maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)',
            border: '1px solid #F1F5F9',
            display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0,
              background: 'var(--bg-card)', zIndex: 10, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <User size={22} color="var(--accent-aquapp)" />
                  {selectedClient.name}
                </h2>
                <button
                  type="button"
                  onClick={() => openMapsForClient(selectedClient.name, selectedClient.address)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                    color: '#ffffff',
                    borderRadius: '999px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(14, 165, 233, 0.35)'
                  }}
                  title={`Iniciar ruta hacia ${selectedClient.name} en Google Maps o Waze`}
                >
                  <Navigation size={14} /> Cómo llegar
                </button>
              </div>
              <button onClick={() => setSelectedClient(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><X size={24}/></button>
            </div>

            <div style={{padding: '24px'}}>
              {loadingDetails ? (
                <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0'}}>Cargando ficha...</div>
              ) : clientDetails && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><Droplet size={16} color="var(--accent-aquapp)"/> Últimos Tratamientos</h3>
                    {clientDetails.tratamientos.length === 0 ? <p style={{color: 'var(--text-faint)', fontSize: '0.9rem', margin: 0}}>No hay tratamientos recientes.</p> : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {clientDetails.tratamientos.map(t => (
                          <div key={t.id} style={{background: 'var(--bg-card-hover)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.9rem'}}>
                            <strong style={{color: '#0F172A'}}>{formatDatePretty(t.fecha)}</strong> - <span style={{color: 'var(--text-secondary)'}}>{(t.tipo_tratamiento || '').replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><Droplet size={16} color="var(--accent-avisomap)"/> Resumen de Muestras</h3>
                    {clientDetails.muestrasResumen.length === 0 ? <p style={{color: 'var(--text-faint)', fontSize: '0.9rem', margin: 0}}>No hay muestras registradas.</p> : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {clientDetails.muestrasResumen.map((yearGroup) => {
                          const isExpanded = expandedYears[yearGroup.year];
                          return (
                            <div key={yearGroup.year} style={{background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                              <div 
                                onClick={() => setExpandedYears(prev => ({...prev, [yearGroup.year]: !prev[yearGroup.year]}))}
                                style={{
                                  padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  cursor: 'pointer', background: isExpanded ? 'var(--bg-main)' : 'transparent', transition: 'background 0.2s'
                                }}
                              >
                                <strong style={{color: '#0F172A'}}>Año {yearGroup.year}</strong>
                                <span style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold'}}>
                                  {yearGroup.months.reduce((acc, curr) => acc + curr.count, 0)} muestras
                                  <ChevronRight size={18} style={{transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}} />
                                </span>
                              </div>

                              {isExpanded && (
                                <div style={{padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                  {yearGroup.months.map((m, idx) => (
                                    <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: idx === 0 ? 'none' : '1px solid var(--border)'}}>
                                      <span style={{textTransform: 'capitalize', color: 'var(--text-secondary)'}}>{m.label}</span>
                                      <span style={{background: 'var(--color-success-border)', color: '#0F172A', padding: '4px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 'bold', fontSize: '0.85rem'}}>
                                        {m.count} {m.count === 1 ? 'muestra' : 'muestras'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Droplet, MapPin, Briefcase, CalendarCheck, ChevronRight, ChevronLeft, 
  FlaskConical, Settings, Search, User, X, Navigation,
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

  // Cuadrícula unificada 3x3: todas las tarjetas con el mismo tamaño y su propio tono pastel único
  const allModuleCards = [
    {
      id: 'muestras',
      title: 'Muestras',
      subtitle: 'Recogida y analíticas de agua',
      value: monthStats ? monthStats.muestras : '...',
      icon: <Droplet size={24} color="#0284c7" />,
      path: '/aquapp',
      cardBg: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)',
      cardBorder: '#bae6fd',
      accentColor: '#0284c7',
      public: true
    },
    {
      id: 'tratamientos',
      title: 'Tratamientos',
      subtitle: 'Desinfección, limpiezas y torres',
      value: monthStats ? monthStats.tratamientos : '...',
      icon: <FlaskConical size={24} color="#059669" />,
      path: '/aquapp?tab=tratamientos',
      cardBg: 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)',
      cardBorder: '#a7f3d0',
      accentColor: '#059669',
      public: true
    },
    {
      id: 'avisomap',
      title: 'Avisos Mapfre',
      subtitle: 'Avisos de control de plagas',
      value: monthStats ? monthStats.avisos : '...',
      icon: <MapPin size={24} color="#dc2626" />,
      path: '/avisomap',
      cardBg: 'linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%)',
      cardBorder: '#fecaca',
      accentColor: '#dc2626',
      public: true
    },
    {
      id: 'tareas',
      title: 'Tareas',
      subtitle: monthStats ? `${monthStats.tareasCompletadas} de ${monthStats.tareasTotal} completadas` : 'Visitas mensuales',
      value: monthStats ? `${monthStats.tareasPct}%` : '...',
      icon: <CalendarCheck size={24} color="#4f46e5" />,
      path: '/tareas',
      cardBg: 'linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)',
      cardBorder: '#c7d2fe',
      accentColor: '#4f46e5',
      public: false
    },
    {
      id: 'workapp',
      title: 'Workapp · Jornada',
      isWorkapp: true,
      subtitle: 'Jornada laboral y horas extras',
      value: monthStats ? `${monthStats.jornadasDias}d` : '...',
      icon: <Briefcase size={24} color="#7c3aed" />,
      path: '/workapp',
      cardBg: 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%)',
      cardBorder: '#ddd6fe',
      accentColor: '#7c3aed',
      public: false
    },
    {
      id: 'calculadora',
      title: 'Calculadora Técnica',
      subtitle: 'Cloro, neutralización y conversor',
      value: null,
      icon: <Calculator size={24} color="#0d9488" />,
      path: '/calculadora',
      cardBg: 'linear-gradient(145deg, #f0fdfa 0%, #ccfbf1 100%)',
      cardBorder: '#99f6E4',
      accentColor: '#0d9488',
      public: true
    },
    {
      id: 'catalogo',
      title: 'Productos',
      subtitle: 'Catálogo, fichas y registros',
      value: null,
      icon: <BookOpen size={24} color="#d97706" />,
      path: '/catalogo',
      cardBg: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)',
      cardBorder: '#fde68a',
      accentColor: '#d97706',
      public: false
    },
    {
      id: 'calendario',
      title: 'Calendario Global',
      subtitle: 'Agenda y actividad por día',
      value: null,
      icon: <Calendar size={24} color="#db2777" />,
      path: '/calendario',
      cardBg: 'linear-gradient(145deg, #fdf2f8 0%, #fce7f3 100%)',
      cardBorder: '#fbcfe8',
      accentColor: '#db2777',
      public: true
    },
    {
      id: 'estadisticas',
      title: 'Estadísticas',
      subtitle: 'Gráficas y métricas anuales',
      value: null,
      icon: <BarChart2 size={24} color="#9333ea" />,
      path: '/estadisticas',
      cardBg: 'linear-gradient(145deg, #faf5ff 0%, #f3e8ff 100%)',
      cardBorder: '#e9d5ff',
      accentColor: '#9333ea',
      public: false
    }
  ];

  const visibleCards = isAdmin ? allModuleCards : allModuleCards.filter(c => c.public);

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
                    <span style={{fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{c.name}</span>
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

      {/* Cuadrícula Uniforme 3x3 de Módulos con Color Tenue Diferenciado */}
      <div className="dashboard-unified-grid">
        {visibleCards.map((card) => (
          <div
            key={card.id}
            className="dash-card dash-unified-card"
            style={{
              background: card.cardBg,
              borderColor: card.cardBorder
            }}
            onClick={() => navigate(card.path)}
          >
            <div className="dash-unified-top">
              <div
                className="dash-unified-icon-box"
                style={{ borderColor: card.cardBorder }}
              >
                {card.icon}
              </div>

              {card.value !== null ? (
                <div className="dash-unified-stat" style={{ color: card.accentColor }}>
                  {card.value}
                </div>
              ) : (
                <div className="dash-unified-arrow" style={{ color: card.accentColor }}>
                  <ChevronRight size={20} strokeWidth={2.5} />
                </div>
              )}
            </div>

            <div className="dash-unified-bottom">
              <h3>{card.title}</h3>
              {card.isWorkapp && monthStats ? (
                <div className="dash-workapp-compact-pills">
                  <span className="dash-wa-pill">{monthStats.totalHoras}h trab.</span>
                  <span className="dash-wa-pill extras">+{monthStats.totalExtras}h ext.</span>
                  <span className="dash-wa-pill money">{monthStats.importe}€</span>
                </div>
              ) : (
                <p>{card.subtitle}</p>
              )}
            </div>
          </div>
        ))}
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
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0,
              background: 'var(--bg-card)', zIndex: 10, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px'}}>
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
                            <strong style={{color: 'var(--text-main)'}}>{formatDatePretty(t.fecha)}</strong> - <span style={{color: 'var(--text-secondary)'}}>{(t.tipo_tratamiento || '').replace(/_/g, ' ')}</span>
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
                                <strong style={{color: 'var(--text-main)'}}>Año {yearGroup.year}</strong>
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

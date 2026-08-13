import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Droplet, MapPin, Briefcase, BookOpen, CalendarCheck, ChevronRight, BarChart2, Calendar, LayoutDashboard, Settings, Search, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});

  useEffect(() => {
    const searchClientes = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase
        .from('clientes')
        .select('id, name')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);
      setSearchResults(data || []);
      setIsSearching(false);
    };
    
    const timer = setTimeout(searchClientes, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleSelectClient = async (cliente) => {
    setSelectedClient(cliente);
    setSearchQuery('');
    setSearchResults([]);
    setLoadingDetails(true);
    
    const [muestrasRes, tratRes] = await Promise.all([
      supabase.from('aquapp_muestras').select('fecha').eq('cliente_id', cliente.id),
      supabase.from('aquapp_tratamientos').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: false }).limit(3)
    ]);
    
    let resumenMuestras = [];
    if (muestrasRes.data) {
      const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const conteoMap = new Map();
      
      muestrasRes.data.forEach(m => {
        const d = parseDateForSort(m.fecha);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear().toString();
          const sortKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = mesesNombres[d.getMonth()];
          
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
    setLoadingDetails(false);
  };

  const accessCards = [
    {
      id: 'aquapp',
      title: 'Aquapp',
      description: 'Gestión integral de muestras, torres y tratamientos.',
      icon: <Droplet size={28} color="var(--accent-aquapp)" />,
      path: '/aquapp',
      bgColor: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      featured: true
    },
    {
      id: 'tareas',
        adminOnly: true,
      title: 'Tareas',
      description: 'Visitas mensuales.',
      icon: <CalendarCheck size={28} color="var(--accent-tareas)" />,
      path: '/tareas',
      bgColor: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
      featured: true
    },
    {
      id: 'workapp',
        adminOnly: true,
      title: 'Workapp',
      description: 'Jornada laboral y descansos.',
      icon: <Briefcase size={28} color="var(--accent-workapp)" />,
      path: '/workapp',
      bgColor: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
      featured: true
    },
    {
      id: 'avisomap',
      title: 'Avisomap',
      description: 'Registro de avisos de plagas.',
      icon: <MapPin size={24} color="var(--accent-avisomap)" />,
      path: '/avisomap',
      bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    },
    {
      id: 'catalogo',
        adminOnly: true,
      title: 'Catálogo',
      description: 'Fichas y productos.',
      icon: <BookOpen size={24} color="var(--accent-catalogo)" />,
      path: '/catalogo',
      bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    },
    {
      id: 'estadisticas',
        adminOnly: true,
      title: 'Estadísticas',
      description: 'Métricas globales.',
      icon: <BarChart2 size={24} color="var(--accent-estadisticas)" />,
      path: '/estadisticas',
      bgColor: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    },
    {
      id: 'calendario',
      title: 'Calendario',
      description: 'Agenda global.',
      icon: <Calendar size={24} color="var(--accent-calendario)" />,
      path: '/calendario',
      bgColor: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
    }
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header" style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start'}}>
        <button 
          onClick={() => navigate('/gestor')}
          style={{
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '10px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--text-muted)',
            transition: 'all 0.2s'
          }}
          title="Gestor Global (Avanzado)"
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border-input)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <Settings size={24} />
        </button>
      </div>

        <div className="dashboard-search-wrapper" style={{
          maxWidth: '680px',
          margin: '0 auto 32px auto',
          position: 'relative',
          zIndex: 50
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--bg-card-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-md)',
            padding: '14px 20px', transition: 'all 0.3s ease'
          }}>
            <Search size={22} color="var(--accent-aquapp)" style={{ marginRight: '14px', flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder="Buscar cliente para ver ficha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none',
                background: 'transparent', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '500'
              }}
            />
          </div>
          
          {/* Resultados flotantes */}
          {searchQuery.length >= 2 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', border: '1px solid var(--border)'
            }}>
              {isSearching ? (
                <div style={{padding: '16px', textAlign: 'center', color: 'var(--text-muted)'}}>Buscando...</div>
              ) : searchResults.length === 0 ? (
                <div style={{padding: '16px', textAlign: 'center', color: 'var(--text-muted)'}}>No se encontraron clientes</div>
              ) : (
                searchResults.map(c => (
                  <div key={c.id} 
                    onClick={() => handleSelectClient(c)}
                    style={{
                      padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                  >
                    <User size={18} color="var(--text-muted)" style={{marginRight: '12px'}} />
                    <span style={{fontWeight: '600', color: 'var(--text-main)'}}>{c.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      <div className="dashboard-grid">
        {accessCards.map((card) => (
          <div 
            key={card.id} 
            className={`dash-card ${card.featured ? 'featured' : ''}`} 
            onClick={() => navigate(card.path)}
          >
            <div className="dash-card-icon-wrapper" style={{ background: card.bgColor }}>
              {card.icon}
            </div>
            <div className="dash-card-content">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            {card.featured && (
              <div className="dash-card-arrow">
                <ChevronRight size={20} color="var(--text-muted)" strokeWidth={3} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Ficha Cliente */}
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
            display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0,
              background: 'var(--bg-card)', zIndex: 10, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
            }}>
              <h2 style={{margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <User size={24} color="var(--accent-aquapp)" />
                {selectedClient.name}
              </h2>
              <button onClick={() => setSelectedClient(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><X size={24}/></button>
            </div>
            
            <div style={{padding: '24px'}}>
              {loadingDetails ? (
                <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0'}}>Cargando ficha...</div>
              ) : clientDetails && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  
                  {/* Tratamientos */}
                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><Droplet size={16} color="var(--accent-aquapp)"/> Últimos Tratamientos</h3>
                    {clientDetails.tratamientos.length === 0 ? <p style={{color: 'var(--text-faint)', fontSize: '0.9rem', margin: 0}}>No hay tratamientos recientes.</p> : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {clientDetails.tratamientos.map(t => (
                          <div key={t.id} style={{background: 'var(--bg-card-hover)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.9rem'}}>
                            <strong style={{color: 'var(--text-main)'}}>{formatDatePretty(t.fecha)}</strong> - <span style={{color: 'var(--text-secondary)'}}>{t.tipo_tratamiento.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Muestras (Resumen) */}
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
                                      <span style={{background: 'var(--color-success-border)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 'bold', fontSize: '0.85rem'}}>
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

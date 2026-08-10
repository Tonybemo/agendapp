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

  const handleSelectClient = async (cliente) => {
    setSelectedClient(cliente);
    setSearchQuery('');
    setSearchResults([]);
    setLoadingDetails(true);
    
    const currentYear = new Date().getFullYear().toString();
    
    const [muestrasRes, tratRes, tareasRes] = await Promise.all([
      supabase.from('aquapp_muestras').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: false }).limit(3),
      supabase.from('aquapp_tratamientos').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: false }).limit(3),
      supabase.from('tareas_programadas').select('*').eq('cliente_id', cliente.id).eq('año', currentYear)
    ]);
    
    setClientDetails({
      muestras: muestrasRes.data || [],
      tratamientos: tratRes.data || [],
      tareas: tareasRes.data || []
    });
    setLoadingDetails(false);
  };

  const accessCards = [
    {
      id: 'aquapp',
      title: 'Aquapp',
      description: 'Gestión integral de muestras, torres y tratamientos.',
      icon: <Droplet size={28} color="#0284c7" />,
      path: '/aquapp',
      bgColor: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      featured: true
    },
    {
      id: 'tareas',
        adminOnly: true,
      title: 'Tareas',
      description: 'Visitas mensuales.',
      icon: <CalendarCheck size={28} color="#e11d48" />,
      path: '/tareas',
      bgColor: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
      featured: true
    },
    {
      id: 'workapp',
        adminOnly: true,
      title: 'Workapp',
      description: 'Jornada laboral y descansos.',
      icon: <Briefcase size={28} color="#7c3aed" />,
      path: '/workapp',
      bgColor: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
      featured: true
    },
    {
      id: 'avisomap',
      title: 'Avisomap',
      description: 'Registro de avisos de plagas.',
      icon: <MapPin size={24} color="#059669" />,
      path: '/avisomap',
      bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    },
    {
      id: 'catalogo',
        adminOnly: true,
      title: 'Catálogo',
      description: 'Fichas y productos.',
      icon: <BookOpen size={24} color="#d97706" />,
      path: '/catalogo',
      bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    },
    {
      id: 'estadisticas',
        adminOnly: true,
      title: 'Estadísticas',
      description: 'Métricas globales.',
      icon: <BarChart2 size={24} color="#4f46e5" />,
      path: '/estadisticas',
      bgColor: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    },
    {
      id: 'calendario',
      title: 'Calendario',
      description: 'Agenda global.',
      icon: <Calendar size={24} color="#db2777" />,
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
            background: 'white', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '10px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            color: '#64748b',
            transition: 'all 0.2s'
          }}
          title="Gestor Global (Avanzado)"
          onMouseOver={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
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
            background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 1)',
            padding: '14px 20px', transition: 'all 0.3s ease'
          }}>
            <Search size={22} color="#0284c7" style={{ marginRight: '14px', flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder="Buscar cliente para ver ficha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none',
                background: 'transparent', fontSize: '1rem', color: '#1e293b', fontWeight: '500'
              }}
            />
          </div>
          
          {/* Resultados flotantes */}
          {searchQuery.length >= 2 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              background: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden', border: '1px solid #e2e8f0'
            }}>
              {isSearching ? (
                <div style={{padding: '16px', textAlign: 'center', color: '#64748b'}}>Buscando...</div>
              ) : searchResults.length === 0 ? (
                <div style={{padding: '16px', textAlign: 'center', color: '#64748b'}}>No se encontraron clientes</div>
              ) : (
                searchResults.map(c => (
                  <div key={c.id} 
                    onClick={() => handleSelectClient(c)}
                    style={{
                      padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9', background: 'white'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <User size={18} color="#64748b" style={{marginRight: '12px'}} />
                    <span style={{fontWeight: '600', color: '#0f172a'}}>{c.name}</span>
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
                <ChevronRight size={20} color="#64748b" strokeWidth={3} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Ficha Cliente */}
      {selectedClient && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }} onClick={() => setSelectedClient(null)}>
          <div style={{
            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px',
            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0,
              background: 'white', zIndex: 10, borderRadius: '24px 24px 0 0'
            }}>
              <h2 style={{margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <User size={24} color="#0ea5e9" />
                {selectedClient.name}
              </h2>
              <button onClick={() => setSelectedClient(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'}}><X size={24}/></button>
            </div>
            
            <div style={{padding: '24px'}}>
              {loadingDetails ? (
                <div style={{textAlign: 'center', color: '#64748b', padding: '40px 0'}}>Cargando ficha...</div>
              ) : clientDetails && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  
                  {/* Tratamientos */}
                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><Droplet size={16} color="#0ea5e9"/> Últimos Tratamientos</h3>
                    {clientDetails.tratamientos.length === 0 ? <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: 0}}>No hay tratamientos recientes.</p> : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {clientDetails.tratamientos.map(t => (
                          <div key={t.id} style={{background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem'}}>
                            <strong>{t.fecha}</strong> - {t.tipo_tratamiento}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Muestras */}
                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><Droplet size={16} color="#10b981"/> Últimas Muestras</h3>
                    {clientDetails.muestras.length === 0 ? <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: 0}}>No hay muestras recientes.</p> : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {clientDetails.muestras.map(m => (
                          <div key={m.id} style={{background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem'}}>
                            <strong>{m.fecha}</strong> - {m.tipo_muestra} (Envase: {m.cod_envase || 'N/A'})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Tareas */}
                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><CalendarCheck size={16} color="#f59e0b"/> Tareas Asignadas ({new Date().getFullYear()})</h3>
                    {clientDetails.tareas.length === 0 ? <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: 0}}>No tiene tareas programadas este año.</p> : (
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {clientDetails.tareas.map(t => (
                          <span key={t.id} style={{background: '#fffbeb', color: '#b45309', padding: '6px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fde68a'}}>
                            {t.mes}
                          </span>
                        ))}
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

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Cloud, RefreshCw, LogOut, 
  List, PlusCircle, BarChart2, Calendar, ChevronDown, ChevronRight, 
  MapPin, Clock, Navigation, Eye, Share2, Edit3, Trash2, Camera,
  Bug, Hexagon, XCircle, Phone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Avisomap.css';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const plagaColors = {
  'Cucarachas': { color: '#b91c1c', bg: '#fee2e2' },
  'Avispas': { color: '#d97706', bg: '#fef3c7' },
  'Roedores': { color: '#c2410c', bg: '#ffedd5' },
  'Hormigas': { color: '#4338ca', bg: '#e0e7ff' },
  'Termitas': { color: '#78350f', bg: '#ffedd5' },
  'Procesionaria': { color: '#047857', bg: '#d1fae5' },
  'Chinches': { color: '#15803d', bg: '#dcfce7' },
};

const Avisomap = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('historial');
  const [expandedYears, setExpandedYears] = useState(() => {
    const year = new Date().getFullYear().toString();
    return { [year]: true };
  });
  const [expandedMonths, setExpandedMonths] = useState(() => {
    const now = new Date();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const key = `${now.getFullYear()}-${monthNames[now.getMonth()]}`;
    return { [key]: true };
  });
  
  // Data State
  const [avisosData, setAvisosData] = useState({ total: 0, years: [] });
  const [plagasStats, setPlagasStats] = useState([]);
  const [localidadStats, setLocalidadStats] = useState([]);
  const [loading, setLoading] = useState(true);
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [localidadFilter, setLocalidadFilter] = useState('');
  const [plagaFilter, setPlagaFilter] = useState('');
  
  // Edit State
  const [editingAviso, setEditingAviso] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avisoFileName, setAvisoFileName] = useState('');

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let adjuntoUrl = editingAviso.adjunto;
    const fileField = e.target.elements.adjuntoEdit;
    if (fileField && fileField.files && fileField.files.length > 0) {
      const file = fileField.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `avisos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('adjuntos').upload(filePath, file);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('adjuntos').getPublicUrl(filePath);
        adjuntoUrl = publicUrlData.publicUrl;
      } else {
        console.error("Error subiendo archivo:", uploadError);
        alert("Aviso: No se pudo subir el nuevo archivo adjunto. (" + uploadError.message + ")");
      }
    }

    const plagasArray = editingAviso.plagasStr.split(',').map(s => s.trim()).filter(s => s !== '');
    
    const { error } = await supabase.from('avisomap_avisos').update({
      direccion: editingAviso.direccion,
      portal: editingAviso.portal,
      localidad: editingAviso.localidad,
      fecha: editingAviso.fecha,
      hora: editingAviso.hora,
      contacto: editingAviso.contacto,
      comentarios: editingAviso.comentarios,
      plagas: plagasArray,
      adjunto: adjuntoUrl
    }).eq('id', editingAviso.id);
    
    setIsUploading(false);

    if (!error) {
      setEditingAviso(null);
      setAvisoFileName('');
      fetchData();
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (year, month) => {
    const key = `${year}-${month}`;
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAviso = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este aviso permanentemente?")) {
      const { error } = await supabase.from('avisomap_avisos').delete().eq('id', id);
      if (!error) {
        fetchData();
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('avisomap_avisos').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false });
    
    if (data && !error) {
      const total = data.length;
      const yearsMap = {};
      const pStats = {};
      const lStats = {};

      data.forEach(aviso => {
        let y = "1970";
        let m = "Enero";
        if (aviso.fecha) {
          const parts = aviso.fecha.split('-');
          if(parts.length === 3) {
            y = parts[0];
            const mIndex = parseInt(parts[1], 10) - 1;
            if(mIndex >= 0 && mIndex < 12) m = monthNames[mIndex];
          }
        }
        
        if (!yearsMap[y]) yearsMap[y] = { count: 0, months: {} };
        yearsMap[y].count++;
        
        if (!yearsMap[y].months[m]) yearsMap[y].months[m] = { count: 0, avisos: [] };
        yearsMap[y].months[m].count++;
        yearsMap[y].months[m].avisos.push(aviso);
        
        const plagas = Array.isArray(aviso.plagas) ? aviso.plagas : [];
        plagas.forEach(p => {
          if (!pStats[p]) pStats[p] = 0;
          pStats[p]++;
        });
        
        const loc = aviso.localidad || 'Desconocida';
        if (!lStats[loc]) lStats[loc] = 0;
        lStats[loc]++;
      });
      
      const yearsArray = Object.keys(yearsMap).sort((a,b) => b - a).map(yStr => {
        const yData = yearsMap[yStr];
        const monthsArray = Object.keys(yData.months).map(mStr => {
           return { month: mStr, count: yData.months[mStr].count, avisos: yData.months[mStr].avisos };
        });
        return { year: yStr, count: yData.count, months: monthsArray };
      });
      
      setAvisosData({ total, years: yearsArray });
      setPlagasStats(Object.keys(pStats).map(name => ({ name, count: pStats[name] })).sort((a,b) => b.count - a.count));
      setLocalidadStats(Object.keys(lStats).map(name => ({ name, count: lStats[name] })).sort((a,b) => b.count - a.count));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('refresh-avisomap', fetchData);
    return () => window.removeEventListener('refresh-avisomap', fetchData);
  }, []);

  const renderMisAvisos = () => (
    <div className="tab-content animate-fade-in">
      <div className="filters-bar">
        <div className="registros-badge">
          <span className="reg-label">REGISTROS:</span>
          <span className="reg-count">{avisosData.total}</span>
        </div>
        <div className="dropdowns">
          <select 
            className="av-select" 
            value={localidadFilter}
            onChange={(e) => setLocalidadFilter(e.target.value)}
          >
            <option value="">Localidad (Todas)</option>
            {localidadStats.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
          </select>
          <select 
            className="av-select"
            value={plagaFilter}
            onChange={(e) => setPlagaFilter(e.target.value)}
          >
            <option value="">Plaga (Todas)</option>
            {plagasStats.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="years-container">
        {avisosData.years.map(yearData => {
          const isYearExpanded = expandedYears[yearData.year];
          return (
            <div key={yearData.year} className="year-section">
              <div 
                className="year-header" 
                onClick={() => toggleYear(yearData.year)}
              >
                <div className="year-header-left">
                  <Calendar size={20} />
                  <h2>Año {yearData.year}</h2>
                  <span className="year-count-badge">{yearData.count} avisos</span>
                </div>
                {isYearExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>

              {isYearExpanded && (
                <div className="months-container">
                  {yearData.months.map(monthData => {
                    const monthKey = `${yearData.year}-${monthData.month}`;
                    const isMonthExpanded = expandedMonths[monthKey];

                    return (
                      <div key={monthData.month} className="month-section">
                        <div className="month-header" onClick={() => toggleMonth(yearData.year, monthData.month)}>
                          <div className="month-header-left">
                            <Calendar size={16} color="var(--text-muted)" />
                            <h3>{monthData.month}</h3>
                            <span className="month-count">({monthData.count} avisos)</span>
                          </div>
                          {isMonthExpanded ? <ChevronDown size={16} color="var(--text-faint)"/> : <ChevronRight size={16} color="var(--text-faint)"/>}
                        </div>

                        {isMonthExpanded && monthData.avisos && monthData.avisos.length > 0 && (
                          <div className="avisos-grid">
                            {monthData.avisos.filter(aviso => {
                              if (localidadFilter && aviso.localidad !== localidadFilter) return false;
                              const plagasArray = Array.isArray(aviso.plagas) ? aviso.plagas : [];
                              if (plagaFilter && !plagasArray.includes(plagaFilter)) return false;
                              if (searchQuery) {
                                const searchLower = searchQuery.toLowerCase();
                                const plagasStr = plagasArray.join(' ').toLowerCase();
                                return (
                                  aviso.direccion?.toLowerCase().includes(searchLower) ||
                                  aviso.localidad?.toLowerCase().includes(searchLower) ||
                                  plagasStr.includes(searchLower)
                                );
                              }
                              return true;
                            }).map(aviso => (
                              <div key={aviso.id} className="aviso-map-card">
                                <h4>{aviso.direccion}{aviso.portal ? `, ${aviso.portal}` : ''}</h4>
                                <div className="aviso-loc">
                                  <MapPin size={14} color="var(--accent-avisomap)" />
                                  <span>{aviso.localidad}</span>
                                </div>
                                <div style={{position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%'}}>
                                  {(Array.isArray(aviso.plagas) ? aviso.plagas : []).map(p => {
                                    const pc = plagaColors[p] || { color: '#334155', bg: '#f1f5f9' };
                                    return (
                                      <div key={p} className="plaga-pill" style={{backgroundColor: pc.bg, color: pc.color, margin: 0, padding: '4px 10px'}}>
                                        <Bug size={14} /> {p}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="aviso-datetime" style={{marginTop: '12px'}}>
                                  <span><Calendar size={14} /> {aviso.fecha}</span>
                                  <span><Clock size={14} /> {aviso.hora}</span>
                                </div>
                                {aviso.contacto && (
                                  <div className="aviso-loc" style={{marginTop: '8px', color: 'var(--text-muted)'}}>
                                    <Phone size={14} color="var(--text-muted)" />
                                    <span>{aviso.contacto}</span>
                                  </div>
                                )}
                                {aviso.comentarios && (
                                  <div style={{marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #cbd5e1', whiteSpace: 'pre-wrap'}}>
                                    {aviso.comentarios}
                                  </div>
                                )}
                                <div className="aviso-card-footer">
                                  <button className="btn-ruta" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(aviso.direccion + (aviso.portal ? ' ' + aviso.portal : '') + ', ' + aviso.localidad)}`, '_blank')}><Navigation size={14}/> Ruta GPS</button>
                                  <div className="aviso-actions">
                                    {aviso.adjunto ? (
                                      <a href={aviso.adjunto} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center'}}>
                                        <Eye size={18} color="#0ea5e9" style={{cursor:'pointer'}} />
                                      </a>
                                    ) : (
                                      <Eye size={18} color="var(--text-faint)" style={{cursor:'not-allowed'}} />
                                      )}
                                      {isAdmin && (
                                      <div className="admin-only" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                        <Edit3 size={18} color="#14b8a6" style={{cursor: 'pointer'}} onClick={() => {
                                      setEditingAviso({...aviso, plagasStr: (Array.isArray(aviso.plagas) ? aviso.plagas.join(', ') : String(aviso.plagas || ''))});
                                        setAvisoFileName('');
                                      }} />
                                      <Trash2 size={18} color="#ef4444" style={{cursor: 'pointer'}} onClick={() => handleDeleteAviso(aviso.id)} />
                                      </div>
                                      )}
                                    </div>
                                </div>
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
          );
        })}
      </div>
    </div>
  );

  const renderEstadisticas = () => (
    <div className="tab-content animate-fade-in">
      <div className="stats-header">
        <h2>Estadísticas</h2>
        <span className="stats-total-badge">{avisosData.total} avisos totales</span>
      </div>

      <div className="stats-cards-container">
        <div className="stats-card">
          <div className="stats-card-title">
            <Bug size={20} color="var(--accent-avisomap)" />
            <div>
              <h3>Tipo de Plaga</h3>
              <p>Toca una fila para filtrar</p>
            </div>
          </div>
          <div className="stats-list">
            {plagasStats.map(stat => (
              <div key={stat.name} className="stat-row">
                <div className="stat-info">
                  <span className="stat-name"><Bug size={14} color="var(--text-muted)"/> {stat.name}</span>
                  <span className="stat-numbers">{stat.count} avisos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-title">
            <MapPin size={20} color="var(--accent-avisomap)" />
            <div>
              <h3>Por Localidad</h3>
              <p>Toca una fila para filtrar</p>
            </div>
          </div>
          <div className="stats-list">
            {localidadStats.map(stat => (
              <div key={stat.name} className="stat-row">
                <div className="stat-info">
                  <span className="stat-name">{stat.name}</span>
                  <span className="stat-numbers">{stat.count} avisos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="avisomap-wrapper animate-fade-in">
      {/* Top Header */}
      <header className="avisomap-topbar">
        <div className="am-logo">
          <div className="shield-icon"><ShieldCheck size={24} color="white" /></div>
          <h1>Avisomap</h1>
        </div>
        
        <div className="am-search">
          <Search size={18} color="var(--text-faint)" />
          <input 
            type="text" 
            placeholder="Buscar por calle, localidad, plaga..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>


      </header>

      {/* Main Content */}
      <div className="aviso-map-content">
        {activeTab === 'historial' ? renderMisAvisos() : renderEstadisticas()}
      </div>

      {editingAviso && (
        <div className="uf-overlay" onClick={() => setEditingAviso(null)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="uf-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h2 style={{margin: 0}}>Editar Aviso</h2>
              <XCircle size={24} color="var(--text-muted)" style={{cursor: 'pointer'}} onClick={() => setEditingAviso(null)} />
            </div>
            <form onSubmit={handleSaveEdit} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <div style={{display: 'flex', gap: '12px'}}>
                <div style={{flex: 2}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>DIRECCIÓN</label>
                  <input type="text" value={editingAviso.direccion || ''} onChange={e => setEditingAviso({...editingAviso, direccion: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} required />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>PORTAL</label>
                  <input type="text" value={editingAviso.portal || ''} onChange={e => setEditingAviso({...editingAviso, portal: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                </div>
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>LOCALIDAD</label>
                <input type="text" value={editingAviso.localidad} onChange={e => setEditingAviso({...editingAviso, localidad: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} required />
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>FECHA</label>
                  <input type="date" value={editingAviso.fecha} onChange={e => setEditingAviso({...editingAviso, fecha: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} required />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>HORA</label>
                  <input type="time" value={editingAviso.hora} onChange={e => setEditingAviso({...editingAviso, hora: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} required />
                </div>
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>CONTACTO</label>
                <input type="text" value={editingAviso.contacto || ''} onChange={e => setEditingAviso({...editingAviso, contacto: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>PLAGAS (Separadas por comas)</label>
                <input type="text" value={editingAviso.plagasStr} onChange={e => setEditingAviso({...editingAviso, plagasStr: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} required />
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>NOTAS / COMENTARIOS</label>
                <textarea value={editingAviso.comentarios || ''} onChange={e => setEditingAviso({...editingAviso, comentarios: e.target.value})} rows="3" style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}}></textarea>
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>FOTO / ALBARÁN (Opcional)</label>
                <div style={{position: 'relative', cursor: 'pointer', background: avisoFileName ? 'var(--color-success-light)' : 'var(--bg-input)', border: avisoFileName ? '2px dashed var(--accent-avisomap)' : '1px solid var(--border-input)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Camera size={16} color={avisoFileName ? "var(--accent-avisomap)" : "var(--text-muted)"} />
                  <strong style={{color: avisoFileName ? "#15803d" : "var(--text-secondary)", fontSize: '0.9rem'}}>{avisoFileName || (editingAviso.adjunto ? 'Cambiar archivo adjunto' : 'Adjuntar archivo nuevo')}</strong>
                  <input name="adjuntoEdit" type="file" onChange={(e) => setAvisoFileName(e.target.files[0]?.name || '')} style={{opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer'}} />
                </div>
              </div>
              <button type="submit" disabled={isUploading} style={{padding: '12px', background: 'linear-gradient(135deg, var(--accent-avisomap), #047857)', color: 'var(--text-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', marginTop: '8px', opacity: isUploading ? 0.7 : 1}}>
                {isUploading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Avisomap;

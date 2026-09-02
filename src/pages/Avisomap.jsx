import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Search, List, BarChart2, Calendar, 
  MapPin, Clock, Navigation, Eye, Edit3, Trash2, Camera,
  Bug, Phone, X, XCircle, Plus
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

const getMonthColor = (month) => {
  const colors = {
    '01': '#0ea5e9', '02': '#8b5cf6', '03': '#10b981', '04': '#f59e0b',
    '05': '#ef4444', '06': '#3b82f6', '07': '#ec4899', '08': '#14b8a6',
    '09': '#f97316', '10': '#6366f1', '11': '#84cc16', '12': '#06b6d4',
    'Enero': '#0ea5e9', 'Febrero': '#8b5cf6', 'Marzo': '#10b981', 'Abril': '#f59e0b',
    'Mayo': '#ef4444', 'Junio': '#3b82f6', 'Julio': '#ec4899', 'Agosto': '#14b8a6',
    'Septiembre': '#f97316', 'Octubre': '#6366f1', 'Noviembre': '#84cc16', 'Diciembre': '#06b6d4',
  };
  return colors[month] || '#64748b';
};

const getMonthAbbr = (monthName) => {
  const map = {
    'Enero': 'Ene', 'Febrero': 'Feb', 'Marzo': 'Mar', 'Abril': 'Abr',
    'Mayo': 'May', 'Junio': 'Jun', 'Julio': 'Jul', 'Agosto': 'Ago',
    'Septiembre': 'Sep', 'Octubre': 'Oct', 'Noviembre': 'Nov', 'Diciembre': 'Dic'
  };
  return map[monthName] || (monthName ? monthName.substring(0, 3) : '');
};

const parsePlagas = (plagas) => {
  let arr = [];
  if (Array.isArray(plagas)) {
    arr = plagas;
  } else if (typeof plagas === 'string') {
    try {
      const parsed = JSON.parse(plagas);
      arr = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      let cleaned = plagas;
      if (cleaned.startsWith('{') && cleaned.endsWith('}')) cleaned = cleaned.slice(1, -1);
      if (cleaned.startsWith('[') && cleaned.endsWith(']')) cleaned = cleaned.slice(1, -1);
      arr = cleaned.split(',');
    }
  }
  
  return arr.map(p => {
    if (typeof p !== 'string') return String(p);
    let cleaned = p.trim();
    if (cleaned.startsWith('[')) {
      try { 
        const inner = JSON.parse(cleaned);
        if (Array.isArray(inner)) cleaned = inner.join(' ');
      } catch (e) {}
    }
    return cleaned.replace(/^\[?["'\\]+|["'\\]+\]?$/g, '').trim();
  }).filter(Boolean);
};

const Avisomap = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('historial');
  
  // Year & Month selection (pill navigation)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('Todos');

  // Raw data & stats
  const [allAvisos, setAllAvisos] = useState([]);
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
        window.__toast?.error("Aviso: No se pudo subir el nuevo archivo adjunto. (" + uploadError.message + ")");
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
      window.__toast?.success("Aviso actualizado correctamente");
    } else {
      window.__toast?.error("Error al actualizar: " + error.message);
    }
  };

  const handleDeleteAviso = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este aviso permanentemente?")) {
      const { error } = await supabase.from('avisomap_avisos').delete().eq('id', id);
      if (!error) {
        fetchData();
        window.__toast?.success("Aviso eliminado");
      } else {
        window.__toast?.error("Error al eliminar: " + error.message);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('avisomap_avisos').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false });
    
    if (data && !error) {
      setAllAvisos(data);
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
        
        const plagas = parsePlagas(aviso.plagas);
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
        const monthsArray = Object.keys(yData.months)
          .sort((a, b) => monthNames.indexOf(b) - monthNames.indexOf(a))
          .map(mStr => {
            return { month: mStr, count: yData.months[mStr].count, avisos: yData.months[mStr].avisos };
          });
        return { year: yStr, count: yData.count, months: monthsArray };
      });
      
      setAvisosData({ total, years: yearsArray });
      setPlagasStats(Object.keys(pStats).map(name => ({ name, count: pStats[name] })).sort((a,b) => b.count - a.count));
      setLocalidadStats(Object.keys(lStats).map(name => ({ name, count: lStats[name] })).sort((a,b) => b.count - a.count));
      
      // Auto-set selected year to latest if current selection doesn't exist
      if (yearsArray.length > 0) {
        const currentYearExists = yearsArray.some(y => y.year === selectedYear);
        if (!currentYearExists && selectedYear !== 'Todos') {
          setSelectedYear(yearsArray[0].year);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('refresh-avisomap', fetchData);
    return () => window.removeEventListener('refresh-avisomap', fetchData);
  }, []);

  // Months available for selected year
  const activeYearData = useMemo(() => {
    if (selectedYear === 'Todos') return null;
    return avisosData.years.find(y => y.year === selectedYear);
  }, [avisosData.years, selectedYear]);

  // Filtered avisos list for display
  const filteredAvisos = useMemo(() => {
    return allAvisos.filter(aviso => {
      // 1. Year filter
      if (selectedYear !== 'Todos' && aviso.fecha) {
        const y = aviso.fecha.split('-')[0];
        if (y !== selectedYear) return false;
      }

      // 2. Month filter
      if (selectedMonth !== 'Todos' && aviso.fecha) {
        const parts = aviso.fecha.split('-');
        if (parts.length === 3) {
          const mIndex = parseInt(parts[1], 10) - 1;
          const mName = monthNames[mIndex];
          if (mName !== selectedMonth) return false;
        }
      }

      // 3. Localidad filter
      if (localidadFilter && aviso.localidad !== localidadFilter) return false;

      // 4. Plagas filter
      const plagasArray = parsePlagas(aviso.plagas);
      if (plagaFilter && !plagasArray.includes(plagaFilter)) return false;

      // 5. Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const plagasStr = plagasArray.join(' ').toLowerCase();
        const dirStr = (aviso.direccion || '').toLowerCase();
        const locStr = (aviso.localidad || '').toLowerCase();
        const portalStr = (aviso.portal || '').toLowerCase();
        const comStr = (aviso.comentarios || '').toLowerCase();

        return (
          dirStr.includes(q) ||
          locStr.includes(q) ||
          portalStr.includes(q) ||
          plagasStr.includes(q) ||
          comStr.includes(q)
        );
      }

      return true;
    });
  }, [allAvisos, selectedYear, selectedMonth, localidadFilter, plagaFilter, searchQuery]);

  const renderMisAvisos = () => (
    <div className="tab-content animate-fade-in">
      {/* 1. Year Pills Row */}
      <div className="am-pills-row am-years-row">
        <button 
          type="button" 
          className={`am-pill-year ${selectedYear === 'Todos' ? 'active' : ''}`}
          onClick={() => { setSelectedYear('Todos'); setSelectedMonth('Todos'); }}
        >
          <span>Todos los años</span>
          <span className="am-pill-badge">{avisosData.total}</span>
        </button>
        {avisosData.years.map(yData => (
          <button 
            key={yData.year}
            type="button" 
            className={`am-pill-year ${selectedYear === yData.year ? 'active' : ''}`}
            onClick={() => { setSelectedYear(yData.year); setSelectedMonth('Todos'); }}
          >
            <span>{yData.year}</span>
            <span className="am-pill-badge">{yData.count}</span>
          </button>
        ))}
      </div>

      {/* 2. Month Pills Row */}
      <div className="am-pills-row am-months-row animate-fade-in">
        <button 
          type="button" 
          className={`am-pill-month ${selectedMonth === 'Todos' ? 'active' : ''}`}
          onClick={() => setSelectedMonth('Todos')}
          style={{ '--month-color': '#2563eb' }}
        >
          <span>Todos los meses</span>
        </button>

        {activeYearData ? (
          activeYearData.months.map(mGroup => (
            <button 
              key={mGroup.month}
              type="button" 
              className={`am-pill-month ${selectedMonth === mGroup.month ? 'active' : ''}`}
              style={{ '--month-color': getMonthColor(mGroup.month) }}
              onClick={() => setSelectedMonth(mGroup.month)}
              title={`${mGroup.month} (${mGroup.count} avisos)`}
            >
              <span className="am-month-name">{getMonthAbbr(mGroup.month)}</span>
              <span className="am-month-badge">{mGroup.count}</span>
            </button>
          ))
        ) : (
          monthNames.map(mName => (
            <button 
              key={mName}
              type="button" 
              className={`am-pill-month ${selectedMonth === mName ? 'active' : ''}`}
              style={{ '--month-color': getMonthColor(mName) }}
              onClick={() => setSelectedMonth(mName)}
            >
              <span className="am-month-name">{getMonthAbbr(mName)}</span>
            </button>
          ))
        )}
      </div>

      {/* 3. Filters Toolbar (Localidad, Plaga, Reset) */}
      <div className="am-filters-toolbar">
        <div className="am-filters-left">
          <div className="am-filter-select-wrap">
            <MapPin size={15} color="var(--text-muted)" />
            <select 
              className="am-select" 
              value={localidadFilter}
              onChange={(e) => setLocalidadFilter(e.target.value)}
            >
              <option value="">Localidad (Todas)</option>
              {localidadStats.map(l => <option key={l.name} value={l.name}>{l.name} ({l.count})</option>)}
            </select>
          </div>

          <div className="am-filter-select-wrap">
            <Bug size={15} color="var(--text-muted)" />
            <select 
              className="am-select"
              value={plagaFilter}
              onChange={(e) => setPlagaFilter(e.target.value)}
            >
              <option value="">Plaga (Todas)</option>
              {plagasStats.map(p => <option key={p.name} value={p.name}>{p.name} ({p.count})</option>)}
            </select>
          </div>

          {(localidadFilter || plagaFilter || searchQuery) && (
            <button 
              type="button"
              className="am-btn-reset-filters"
              onClick={() => {
                setLocalidadFilter('');
                setPlagaFilter('');
                setSearchQuery('');
              }}
            >
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>

        <div className="am-count-tag">
          Mostrando <strong>{filteredAvisos.length}</strong> avisos
        </div>
      </div>

      {/* 4. Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando avisos...
        </div>
      ) : filteredAvisos.length === 0 ? (
        <div className="am-empty-state animate-fade-in">
          <ShieldCheck size={48} color="var(--text-faint)" />
          <h3>No se encontraron avisos</h3>
          <p>Prueba a cambiar el año, mes o los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="am-avisos-grid animate-fade-in">
          {filteredAvisos.map(aviso => {
            const plagasArray = parsePlagas(aviso.plagas);

            return (
              <div key={aviso.id} className="aviso-map-card">
                {/* Header: Dirección y Localidad */}
                <div className="aviso-card-top">
                  <div>
                    <h4 className="aviso-address">
                      {aviso.direccion}{aviso.portal ? `, ${aviso.portal}` : ''}
                    </h4>
                    <div className="aviso-loc">
                      <MapPin size={14} color="#2563eb" />
                      <span>{aviso.localidad}</span>
                    </div>
                  </div>

                  {/* Plagas Badges */}
                  <div className="aviso-plagas-wrap">
                    {plagasArray.map(p => {
                      const pc = plagaColors[p] || { color: '#475569', bg: '#f1f5f9' };
                      return (
                        <span 
                          key={p} 
                          className="plaga-pill" 
                          style={{ backgroundColor: pc.bg, color: pc.color }}
                        >
                          <Bug size={13} /> {p}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Metadata: Fecha, Hora, Tipo de Contacto */}
                <div className="aviso-datetime">
                  <span><Calendar size={13} /> {aviso.fecha}</span>
                  <span><Clock size={13} /> {aviso.hora}</span>
                  {aviso.contacto && (
                    <span className="aviso-contact-badge">
                      {aviso.contacto === 'Telefónicamente' ? <Phone size={13} /> : <MapPin size={13} />}
                      {aviso.contacto}
                    </span>
                  )}
                </div>

                {/* Comentarios / Observaciones */}
                {aviso.comentarios && (
                  <div className="aviso-notes-box">
                    <strong>Notas:</strong> {aviso.comentarios}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="aviso-card-footer">
                  <button 
                    type="button"
                    className="btn-ruta" 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(aviso.direccion + (aviso.portal ? ' ' + aviso.portal : '') + ', ' + aviso.localidad)}`, '_blank')}
                    title="Abrir ubicación en Google Maps"
                  >
                    <Navigation size={13} /> Ruta GPS
                  </button>

                  <div className="aviso-actions">
                    {aviso.adjunto ? (
                      <a 
                        href={aviso.adjunto} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="aviso-action-btn view"
                        title="Ver foto / albarán adjunto"
                      >
                        <Eye size={16} /> Foto
                      </a>
                    ) : null}

                    {isAdmin && (
                      <div className="admin-actions-group">
                        <button 
                          type="button"
                          className="aviso-action-icon edit"
                          title="Editar aviso"
                          onClick={() => {
                            setEditingAviso({ ...aviso, plagasStr: plagasArray.join(', ') });
                            setAvisoFileName('');
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          type="button"
                          className="aviso-action-icon delete"
                          title="Eliminar aviso"
                          onClick={() => handleDeleteAviso(aviso.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderEstadisticas = () => (
    <div className="tab-content animate-fade-in">
      <div className="stats-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Estadísticas Globales</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Distribución de incidencias y avisos registrados</p>
        </div>
        <span className="stats-total-badge">{avisosData.total} avisos totales</span>
      </div>

      <div className="stats-cards-container">
        <div className="stats-card">
          <div className="stats-card-title">
            <div className="stats-icon-circle" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <Bug size={20} />
            </div>
            <div>
              <h3>Por Tipo de Plaga</h3>
              <p>Haz clic para filtrar en el historial</p>
            </div>
          </div>
          <div className="stats-list">
            {plagasStats.map(stat => {
              const pc = plagaColors[stat.name] || { color: '#2563eb', bg: '#eff6ff' };
              const pct = avisosData.total > 0 ? Math.round((stat.count / avisosData.total) * 100) : 0;

              return (
                <div 
                  key={stat.name} 
                  className="stat-row"
                  onClick={() => {
                    setPlagaFilter(stat.name);
                    setActiveTab('historial');
                  }}
                  title={`Filtrar por ${stat.name}`}
                >
                  <div className="stat-info">
                    <span className="stat-name">
                      <span className="stat-dot" style={{ backgroundColor: pc.color }} />
                      {stat.name}
                    </span>
                    <span className="stat-numbers">
                      <strong>{stat.count}</strong> <span style={{ opacity: 0.6 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="stat-bar-bg">
                    <div className="stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: pc.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-title">
            <div className="stats-icon-circle" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              <MapPin size={20} />
            </div>
            <div>
              <h3>Por Localidad</h3>
              <p>Haz clic para filtrar en el historial</p>
            </div>
          </div>
          <div className="stats-list">
            {localidadStats.map(stat => {
              const pct = avisosData.total > 0 ? Math.round((stat.count / avisosData.total) * 100) : 0;

              return (
                <div 
                  key={stat.name} 
                  className="stat-row"
                  onClick={() => {
                    setLocalidadFilter(stat.name);
                    setActiveTab('historial');
                  }}
                  title={`Filtrar por ${stat.name}`}
                >
                  <div className="stat-info">
                    <span className="stat-name">
                      <MapPin size={13} color="var(--text-muted)" style={{ marginRight: '6px' }} />
                      {stat.name}
                    </span>
                    <span className="stat-numbers">
                      <strong>{stat.count}</strong> <span style={{ opacity: 0.6 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="stat-bar-bg">
                    <div className="stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: '#2563eb' }} />
                  </div>
                </div>
              );
            })}
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
          <div className="shield-icon">
            <ShieldCheck size={22} color="white" />
          </div>
          <div>
            <h1>Avisomap</h1>
            <span className="am-subtitle">Gestión de Avisos Mapfre</span>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="am-search">
          <Search size={18} color="var(--text-faint)" />
          <input 
            type="text" 
            placeholder="Buscar por calle, localidad, plaga..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Action Button: Nuevo Aviso */}
        <button
          type="button"
          className="btn-nuevo-aviso-top"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-universal-form', { 
              detail: { type: 'avisomap', mode: 'create' } 
            }));
          }}
          title="Crear un nuevo aviso"
        >
          <Plus size={16} /> Nuevo Aviso
        </button>
      </header>

      {/* Tabs Menu */}
      <div className="avisomap-tabs-menu">
        <button 
          type="button"
          className={`tab-btn-menu ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          <List size={16} /> Mis Avisos ({avisosData.total})
        </button>
        <button 
          type="button"
          className={`tab-btn-menu ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart2 size={16} /> Estadísticas
        </button>
      </div>

      {/* Main Content */}
      <div className="avisomap-main-content">
        {activeTab === 'historial' ? renderMisAvisos() : renderEstadisticas()}
      </div>

      {/* Modal Editar Aviso */}
      {editingAviso && (
        <div className="uf-overlay" onClick={() => setEditingAviso(null)}>
          <div className="uf-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="uf-modal-header">
              <h2>Editar Aviso Mapfre</h2>
              <button type="button" className="icon-btn-close" onClick={() => setEditingAviso(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="am-edit-form">
              <div className="am-form-row">
                <div style={{ flex: 2 }}>
                  <label>DIRECCIÓN</label>
                  <input 
                    type="text" 
                    value={editingAviso.direccion || ''} 
                    onChange={e => setEditingAviso({...editingAviso, direccion: e.target.value})} 
                    required 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>PORTAL / PISO</label>
                  <input 
                    type="text" 
                    value={editingAviso.portal || ''} 
                    onChange={e => setEditingAviso({...editingAviso, portal: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label>LOCALIDAD</label>
                <input 
                  type="text" 
                  value={editingAviso.localidad || ''} 
                  onChange={e => setEditingAviso({...editingAviso, localidad: e.target.value})} 
                  required 
                />
              </div>

              <div className="am-form-row">
                <div style={{ flex: 1 }}>
                  <label>FECHA</label>
                  <input 
                    type="date" 
                    value={editingAviso.fecha || ''} 
                    onChange={e => setEditingAviso({...editingAviso, fecha: e.target.value})} 
                    required 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>HORA</label>
                  <input 
                    type="time" 
                    value={editingAviso.hora || ''} 
                    onChange={e => setEditingAviso({...editingAviso, hora: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label>TIPO DE RESOLUCIÓN</label>
                <select 
                  value={editingAviso.contacto || 'Presencial'} 
                  onChange={e => setEditingAviso({...editingAviso, contacto: e.target.value})}
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Telefónicamente">Telefónicamente</option>
                </select>
              </div>

              <div>
                <label>PLAGAS (Separadas por comas)</label>
                <input 
                  type="text" 
                  value={editingAviso.plagasStr} 
                  onChange={e => setEditingAviso({...editingAviso, plagasStr: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label>NOTAS / COMENTARIOS</label>
                <textarea 
                  value={editingAviso.comentarios || ''} 
                  onChange={e => setEditingAviso({...editingAviso, comentarios: e.target.value})} 
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label>FOTO / ALBARÁN (Opcional)</label>
                <div className="am-file-upload-box">
                  <Camera size={18} color="#2563eb" />
                  <span>{avisoFileName || (editingAviso.adjunto ? 'Cambiar archivo adjunto' : 'Adjuntar archivo nuevo')}</span>
                  <input 
                    name="adjuntoEdit" 
                    type="file" 
                    onChange={(e) => setAvisoFileName(e.target.files[0]?.name || '')} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUploading} 
                className="am-btn-submit-edit"
              >
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


import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Settings, History, 
  ChevronDown, ChevronRight, Edit3, Trash2, Clock, Car, 
  Search as SearchIcon, Wallet, MoreVertical, 
  Paperclip, Plus, Calendar, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Workapp.css';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Strips seconds from time strings like "9:30:00" -> "9:30"
const formatTime = (t) => {
  if (!t) return '-';
  const parts = t.split(':');
  return `${parts[0]}:${parts[1] || '00'}`;
};

// Converts stored hour values like "8.0h", "+1.5h ext", "8:00:00", "07:30" to "HH:MM" display format
const formatHoursDisplay = (val) => {
  if (!val || val === '-') return null;
  let totalMinutes = 0;
  const str = String(val).trim();
  
  // Format: "HH:MM:SS" or "HH:MM" (time-like)
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    totalMinutes = h * 60 + m;
  } else {
    // Format: "8.0h", "+1.5h ext", "0.0h", plain number
    const num = parseFloat(str.replace(/[^0-9.\-]/g, '')) || 0;
    totalMinutes = Math.round(num * 60);
  }
  
  if (totalMinutes <= 0) return null;
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

// Pastel accent colors for nómina cards
const NOMINA_ACCENTS = [
  { bg: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', border: '#93c5fd' },  // pastel blue
  { bg: 'linear-gradient(135deg, #dcfce7, #d1fae5)', border: '#86efac' },  // pastel green
  { bg: 'linear-gradient(135deg, #ede9fe, #e8e0fe)', border: '#c4b5fd' },  // pastel purple
  { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#fbbf24' },  // pastel amber
  { bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', border: '#f9a8d4' },  // pastel pink
  { bg: 'linear-gradient(135deg, #ccfbf1, #c7f9e2)', border: '#5eead4' },  // pastel teal
];

// Removed mockNominas

const Workapp = () => {
  const [currentView, setCurrentView] = useState('historial');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tarifaHora, setTarifaHora] = useState(11);
  const [modoOscuro, setModoOscuro] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  
  // Supabase Data
  const [jornadas, setJornadas] = useState([]);
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingNominas, setLoadingNominas] = useState(true);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Accordion
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});


  // Nóminas year filter
  const [nominaYearFilter, setNominaYearFilter] = useState(new Date().getFullYear().toString());

  // Edit Jornada State
  const [editForm, setEditForm] = useState({});
  const [editParadas, setEditParadas] = useState([]);
  const [editAdjuntoFile, setEditAdjuntoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Nómina State
  const [nominaAdjuntoFile, setNominaAdjuntoFile] = useState(null);
  const [cuadrarForm, setCuadrarForm] = useState({ importe: '', fechaCierre: '2026-07-26', mes: '', base: '0.00', liquido: '0.00', irpf: '0.00', ss: '0.00' });
  const [prediccion, setPrediccion] = useState(null);



  // ---- Data Fetching ----
  const fetchJornadas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workapp_jornadas')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (data) {
      setJornadas(data);
      setTotalRegistros(data.length);
      
      // Auto-expand current year and month
      if (data.length > 0) {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = monthNames[now.getMonth()];
        setExpandedYears(prev => ({ ...prev, [currentYear]: true }));
        setExpandedMonths(prev => ({ ...prev, [`${currentYear}-${currentMonth}`]: true }));
      }
    }
    setLoading(false);
  };

  const fetchNominas = async () => {
    setLoadingNominas(true);
    const { data, error } = await supabase
      .from('workapp_nominas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setNominas(data);
    }
    setLoadingNominas(false);
  };

  useEffect(() => {
    fetchJornadas();
    fetchNominas();
    const handleRefresh = () => {
      fetchJornadas();
      fetchNominas();
    };
    window.addEventListener('refresh-workapp', handleRefresh);
    return () => window.removeEventListener('refresh-workapp', handleRefresh);
  }, []);

  // ---- Group by Year/Month ----
  const getGroupedData = () => {
    const filtered = jornadas.filter(j => {

      // Text search filter
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      // Safely handle paradas being a string (from old DB) or array (from new DB)
      let paradasStr = '';
      if (typeof j.paradas === 'string') {
        paradasStr = j.paradas.toLowerCase();
      } else if (Array.isArray(j.paradas)) {
        paradasStr = j.paradas.join(' ').toLowerCase();
      }
      return (
        (j.fecha || '').toLowerCase().includes(q) ||
        (j.matricula || '').toLowerCase().includes(q) ||
        paradasStr.includes(q)
      );
    });

    const years = [];
    filtered.forEach(j => {
      // fecha format: "27/07/2026" (dd/mm/yyyy)
      let year = 'Desconocido';
      let month = 'Desconocido';
      
      if (j.fecha && j.fecha.includes('/')) {
        const parts = j.fecha.split('/');
        year = parts[2];
        const mi = parseInt(parts[1], 10) - 1;
        month = monthNames[mi] || 'Desconocido';
      } else if (j.fecha && j.fecha.includes('-')) {
        const parts = j.fecha.split('-');
        year = parts[0];
        const mi = parseInt(parts[1], 10) - 1;
        month = monthNames[mi] || 'Desconocido';
      }

      let yObj = years.find(y => y.year === year);
      if (!yObj) { yObj = { year, months: [] }; years.push(yObj); }
      
      let mObj = yObj.months.find(m => m.month === month);
      if (!mObj) { mObj = { month, items: [] }; yObj.months.push(mObj); }
      
      mObj.items.push(j);
    });

    return years;
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro permanentemente?')) {
      const { error } = await supabase.from('workapp_jornadas').delete().eq('id', id);
      if (!error) fetchJornadas();
      else alert('Error al eliminar: ' + error.message);
    }
    setActiveMenuId(null);
  };

  const handleDeleteNomina = async (id) => {
    if (window.confirm('¿Eliminar esta nómina permanentemente?')) {
      const { error } = await supabase.from('workapp_nominas').delete().eq('id', id);
      if (!error) fetchNominas();
      else alert('Error al eliminar nómina: ' + error.message);
    }
  };

  const handleOpenEditNomina = (nom) => {
    setCuadrarForm({
      importe: nom.total_extra ? nom.total_extra.replace(' €', '') : '',
      fechaCierre: nom.fecha_cierre || '',
      mes: nom.mes || '',
      base: nom.base ? nom.base.replace(' €', '') : '0.00',
      liquido: nom.liquido ? nom.liquido.replace(' €', '') : '0.00',
      irpf: nom.irpf ? nom.irpf.replace(' €', '') : '0.00',
      ss: nom.ss ? nom.ss.replace(' €', '') : '0.00'
    });
    setPrediccion({
      inicio_estimado: nom.fecha_inicio_rango || '',
      suma_interna: '',
      rango: nom.rango || ''
    });
    setNominaAdjuntoFile(null);
    setModalType('edit-nomina');
    setModalData(nom);
  };

  const handleSaveNomina = async () => {
    setIsSaving(true);
    let finalAdjuntoUrl = modalData?.adjunto || null;
    
    if (nominaAdjuntoFile) {
      const fileExt = nominaAdjuntoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `workapp/nominas/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('adjuntos').upload(filePath, nominaAdjuntoFile);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('adjuntos').getPublicUrl(filePath);
        finalAdjuntoUrl = publicUrlData.publicUrl;
      }
    }
    
    const payload = {
      mes: cuadrarForm.mes || 'Sin especificar',
      rango: prediccion?.rango || '',
      fecha_cierre: cuadrarForm.fechaCierre || null,
      fecha_inicio_rango: prediccion?.inicio_estimado || null,
      total_extra: cuadrarForm.importe + ' €',
      base: cuadrarForm.base + ' €',
      liquido: cuadrarForm.liquido + ' €',
      irpf: cuadrarForm.irpf + ' €',
      ss: cuadrarForm.ss + ' €',
      adjunto: finalAdjuntoUrl
    };

    let error;
    if (modalType === 'edit-nomina' && modalData) {
      const res = await supabase.from('workapp_nominas').update(payload).eq('id', modalData.id);
      error = res.error;
    } else {
      const res = await supabase.from('workapp_nominas').insert([payload]);
      error = res.error;
    }

    setIsSaving(false);
    if (!error) {
      setModalType(null);
      setNominaAdjuntoFile(null);
      fetchNominas();
    } else {
      alert("Error guardando la nómina: " + error.message);
    }
  };

  const handleOpenEdit = (jornada) => {
    let fechaInput = jornada.fecha || '';
    if (fechaInput.includes('/')) {
      const parts = fechaInput.split('/');
      fechaInput = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    let parsedParadas = [];
    if (typeof jornada.paradas === 'string') {
      try {
        const parsed = JSON.parse(jornada.paradas);
        if (Array.isArray(parsed)) {
          parsedParadas = parsed;
        } else {
          parsedParadas = [jornada.paradas];
        }
      } catch (e) {
        parsedParadas = jornada.paradas.split(/[,-]+/).map(p => p.trim()).filter(p => p !== '');
      }
    } else if (Array.isArray(jornada.paradas)) {
      parsedParadas = jornada.paradas;
    }

    setEditForm({
      id: jornada.id,
      fecha: fechaInput,
      hora_inicio: jornada.hora_inicio,
      hora_fin: jornada.hora_fin,
      matricula: jornada.matricula,
      adjunto: jornada.adjunto
    });
    setEditParadas(parsedParadas);
    setEditAdjuntoFile(null);
    setModalType('edit-jornada');
    setModalData(jornada);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    // Recalculate hours
    const [hI, mI] = (editForm.hora_inicio || '07:00').split(':').map(Number);
    const [hF, mF] = (editForm.hora_fin || '15:00').split(':').map(Number);
    const totalMinutos = (hF * 60 + mF) - (hI * 60 + mI);
    const totalHoras = totalMinutos / 60;
    const horasCalc = totalHoras.toFixed(1) + 'h';
    let fechaToCalc = editForm.fecha; // Está en formato YYYY-MM-DD del input
    const [y, m, d] = fechaToCalc.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayOfWeek = dateObj.getDay();
    
    let jornadaBase = 8;
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      jornadaBase = 8; // Lunes a Jueves
    } else if (dayOfWeek === 5) {
      jornadaBase = 6.5; // Viernes
    } else {
      jornadaBase = 0; // Sábado y Domingo
    }

    const extras = Math.max(0, totalHoras - jornadaBase);
    const horasExtras = extras > 0 ? '+' + extras.toFixed(1) + 'h ext' : '0.0h';

    let fechaGuardar = editForm.fecha;
    if (fechaGuardar && fechaGuardar.includes('-')) {
      const parts = fechaGuardar.split('-');
      fechaGuardar = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    let finalAdjuntoUrl = editForm.adjunto;
    if (editAdjuntoFile) {
      const fileExt = editAdjuntoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `workapp/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('adjuntos').upload(filePath, editAdjuntoFile);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('adjuntos').getPublicUrl(filePath);
        finalAdjuntoUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from('workapp_jornadas').update({
      fecha: fechaGuardar,
      hora_inicio: editForm.hora_inicio,
      hora_fin: editForm.hora_fin,
      matricula: editForm.matricula,
      paradas: editParadas,
      horas_calculadas: horasCalc,
      horas_extras: horasExtras,
      adjunto: finalAdjuntoUrl
    }).eq('id', editForm.id);

    setIsSaving(false);
    if (!error) {
      setModalType(null);
      fetchJornadas();
    } else {
      alert('Error al actualizar: ' + error.message);
    }
  };

  const calculateInicio = () => {
    if (!cuadrarForm.importe || parseFloat(cuadrarForm.importe) <= 0) return;
    if (!cuadrarForm.fechaCierre) {
      alert("Por favor, selecciona la fecha de cierre.");
      return;
    }
    
    const targetExtraHours = parseFloat(cuadrarForm.importe) / tarifaHora;
    let accumulatedHours = 0;
    let startDate = '';
    
    const [fcY, fcM, fcD] = cuadrarForm.fechaCierre.split('-');
    const fechaCierreObj = new Date(parseInt(fcY), parseInt(fcM) - 1, parseInt(fcD));
    
    const jornadasAnteriores = jornadas.filter(j => {
      if (!j.fecha) return false;
      let jDate;
      if (j.fecha.includes('/')) {
          const [jd, jm, jy] = j.fecha.split('/');
          jDate = new Date(parseInt(jy), parseInt(jm) - 1, parseInt(jd));
      } else if (j.fecha.includes('-')) {
          const [jy, jm, jd] = j.fecha.split('-');
          jDate = new Date(parseInt(jy), parseInt(jm) - 1, parseInt(jd));
      } else {
          return false;
      }
      return jDate <= fechaCierreObj;
    }).sort((a, b) => {
      let dateA, dateB;
      if (a.fecha.includes('/')) { const p = a.fecha.split('/'); dateA = new Date(p[2], p[1]-1, p[0]); }
      else { const p = a.fecha.split('-'); dateA = new Date(p[0], p[1]-1, p[2]); }
      if (b.fecha.includes('/')) { const p = b.fecha.split('/'); dateB = new Date(p[2], p[1]-1, p[0]); }
      else { const p = b.fecha.split('-'); dateB = new Date(p[0], p[1]-1, p[2]); }
      return dateB - dateA;
    });

    for (const j of jornadasAnteriores) {
      let extraNum = 0;
      const val = String(j.horas_extras || '0').trim();
      if (val.includes(':')) {
        // Handle "HH:MM:SS" or "HH:MM" format, possibly with leading "+"
        const cleaned = val.replace(/^\+/, '');
        const parts = cleaned.split(':');
        extraNum = Math.abs(parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
      } else {
        // Handle "+1.5h ext", "0.0h", plain number — strip everything except digits, dot, minus
        extraNum = Math.abs(parseFloat(val.replace(/[^0-9.\-]/g, '')) || 0);
      }

      if (extraNum > 0) {
        accumulatedHours += extraNum;
        startDate = j.fecha;
      }
      
      if (accumulatedHours >= targetExtraHours) {
         break;
      }
    }
    
    setPrediccion({
      inicio_estimado: startDate || 'No hay suficientes horas',
      suma_interna: (accumulatedHours * tarifaHora).toFixed(2),
      rango: startDate ? `${startDate} - ${fechaCierreObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : ''
    });

    if (startDate && !cuadrarForm.mes) {
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      setCuadrarForm(prev => ({ ...prev, mes: `${meses[fechaCierreObj.getMonth()]} de ${fechaCierreObj.getFullYear()}` }));
    }
  };



  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const formatFechaDisplay = (fecha) => {
    if (!fecha) return fecha;
    let d, m, y;
    if (fecha.includes('/')) {
      const parts = fecha.split('/');
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    } else if (fecha.includes('-')) {
      const parts = fecha.split('-');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      return fecha;
    }
    const date = new Date(y, m, d);
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${dias[date.getDay()]}, ${d} DE ${meses[m]}`;
  };

  // ---- Renders ----
  const renderHeader = () => (
    <header className="workapp-header">
      <div className="wa-logo-container">
        <div className="wa-logo-icon">
          <Briefcase size={20} color="white" />
        </div>
        <div className="wa-logo-text">
          <h1>WorkApp <span className="wa-version">v1.3</span></h1>
        </div>
      </div>
      <div className="wa-header-actions">
        <button className="icon-btn-round" onClick={() => setIsSettingsOpen(true)}><Settings size={18}/></button>
      </div>
    </header>
  );

  const renderHistorial = () => {
    const grouped = getGroupedData();

    return (
      <div className="wa-historial animate-fade-in">
        <div className="wa-page-header">
          <h2>Historial <span className="light-text">({totalRegistros} registros)</span></h2>
        </div>

        <div className="wa-search-box">
          <SearchIcon size={18} color="#8b5cf6" />
          <input 
            type="text" 
            placeholder="Buscar por ruta o matrícula..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>



        {loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando jornadas...</div>
        ) : grouped.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
            {searchQuery ? 'No se encontraron resultados.' : 'Aún no hay jornadas registradas. Pulsa el botón + para crear la primera.'}
          </div>
        ) : (
          <div style={{marginTop: '16px'}}>
            {grouped.map(yearData => {
              const isYearExpanded = expandedYears[yearData.year];
              return (
                <div key={yearData.year}>
                  <div 
                    className="wa-accordion bg-pink"
                    onClick={() => setExpandedYears(prev => ({...prev, [yearData.year]: !prev[yearData.year]}))}
                    style={{cursor: 'pointer'}}
                  >
                    <span>AÑO {yearData.year}</span>
                    {isYearExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>

                  {isYearExpanded && yearData.months.map(monthData => {
                    const monthKey = `${yearData.year}-${monthData.month}`;
                    const isMonthExpanded = expandedMonths[monthKey];
                    return (
                      <div key={monthKey}>
                        <div 
                          className="wa-accordion bg-light-purple"
                          onClick={() => setExpandedMonths(prev => ({...prev, [monthKey]: !prev[monthKey]}))}
                          style={{cursor: 'pointer'}}
                        >
                          <span>{monthData.month.toUpperCase()} ({monthData.items.length})</span>
                          {isMonthExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>

                        {isMonthExpanded && (
                          <div className="wa-record-list">
                            {monthData.items.map(reg => (
                              <div key={reg.id} className="wa-card">
                                <div className="wa-card-header">
                                  <span className="wa-date-pill">{formatFechaDisplay(reg.fecha)}</span>
                                  <div className="wa-hours-group">
                                    <span className="wa-hour-pill base">
                                      {formatHoursDisplay(reg.horas_calculadas) || '?'}h
                                    </span>
                                    {formatHoursDisplay(reg.horas_extras) && (
                                      <span className="wa-hour-pill extra">
                                        +{formatHoursDisplay(reg.horas_extras)}h ext
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {(() => {
                                  let finalParadas = [];
                                  if (typeof reg.paradas === 'string') {
                                    try {
                                      const parsed = JSON.parse(reg.paradas);
                                      if (Array.isArray(parsed)) finalParadas = parsed;
                                      else finalParadas = [reg.paradas.trim()];
                                    } catch(e) {
                                      if (reg.paradas.trim() !== '') {
                                        // Split by comma or hyphen for older plain-text data
                                        finalParadas = reg.paradas.split(/[,-]+/).map(p => p.trim()).filter(p => p !== '');
                                      }
                                    }
                                  } else if (Array.isArray(reg.paradas)) {
                                    finalParadas = reg.paradas;
                                  }
                                  
                                  if (finalParadas.length === 0) return null;
                                  
                                  return (
                                    <div className="wa-paradas-grid">
                                      {finalParadas.map((parada, idx) => (
                                        <span key={idx} className="wa-parada-pill">{parada}</span>
                                      ))}
                                    </div>
                                  );
                                })()}

                                <div className="wa-card-footer">
                                  <div className="wa-card-meta">
                                    <span><Clock size={16}/> {formatTime(reg.hora_inicio)} - {formatTime(reg.hora_fin)}</span>
                                    <span><Car size={16}/> {reg.matricula}</span>
                                  </div>
                                  
                                  <div className="wa-card-actions">
                                    {reg.adjunto && (
                                      <a href={reg.adjunto} target="_blank" rel="noopener noreferrer" className="wa-action-btn" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                                        <Paperclip size={16} color="#8b5cf6" />
                                      </a>
                                    )}
                                    <button className="wa-action-btn" onClick={() => handleOpenEdit(reg)}>
                                      <Edit3 size={16} />
                                    </button>
                                    <button className="wa-action-btn" onClick={(e) => { e.stopPropagation(); toggleMenu(reg.id); }}>
                                      <MoreVertical size={16} />
                                    </button>
                                    
                                    {activeMenuId === reg.id && (
                                      <div className="wa-dropdown-menu">
                                        <button className="wa-dropdown-item danger" onClick={() => handleDelete(reg.id)}>
                                          <Trash2 size={16} /> Eliminar
                                        </button>
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
              );
            })}
          </div>
        )}
      </div>
    );
  };



  const renderNominas = () => (
    <div className="wa-estadisticas animate-fade-in">
      <div className="wa-page-header" style={{marginBottom: '32px'}}>
        <h2>Mis Nóminas</h2>
        <button className="wa-btn-cuadrar" onClick={() => { 
          setCuadrarForm({ importe: '', fechaCierre: '', mes: '', base: '0.00', liquido: '0.00', irpf: '0.00', ss: '0.00' });
          setPrediccion(null);
          setNominaAdjuntoFile(null);
          setModalType('cuadrar'); 
          setModalData(null); 
        }}>
          <Plus size={20} /> CUADRAR
        </button>
      </div>

      <div style={{display: 'inline-block', marginBottom: '24px'}}>
        <div className="wa-date-pill" style={{display: 'flex', alignItems: 'center', gap: '8px', background: '#6d28d9', color: 'white', position: 'relative'}}>
          <Calendar size={16} />
          <select
            value={nominaYearFilter}
            onChange={(e) => setNominaYearFilter(e.target.value)}
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'transparent', border: 'none', color: 'white',
              fontWeight: 800, fontSize: '1rem', cursor: 'pointer', outline: 'none',
              paddingRight: '20px'
            }}
          >
            <option value="all" style={{color: '#0f172a'}}>Todos</option>
            {[...new Set([new Date().getFullYear().toString(), ...nominas.map(n => {
                const parts = (n.mes || '').split('-');
                return parts[0] || '';
            })])].filter(Boolean).sort().reverse().map(y => (
                <option key={y} value={y} style={{color: '#0f172a'}}>{y}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{pointerEvents: 'none'}} />
        </div>
      </div>

      <div className="wa-record-list" style={{marginTop: 0}}>
        {loadingNominas ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando nóminas...</div>
        ) : (() => {
          const filteredNominas = nominaYearFilter === 'all' 
            ? nominas 
            : nominas.filter(n => (n.mes || '').includes(nominaYearFilter));
          return filteredNominas.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
              {nominas.length === 0 
                ? 'Aún no hay nóminas registradas. Pulsa CUADRAR para añadir una.'
                : `No hay nóminas para el año ${nominaYearFilter}.`}
            </div>
          ) : filteredNominas.map((nom, idx) => (
          <div key={nom.id} className="wa-nomina-card">
            <div className="wa-nom-header" style={{
              background: NOMINA_ACCENTS[idx % NOMINA_ACCENTS.length].bg,
              borderBottom: `2px solid ${NOMINA_ACCENTS[idx % NOMINA_ACCENTS.length].border}`
            }}>
              <div className="wa-nom-title">
                <h3>{nom.mes}</h3>
                <p><Calendar size={14}/> {nom.rango}</p>
              </div>
              <div className="wa-nom-total">
                <h3>{nom.total_extra}</h3>
                <p>Total Horas Extra</p>
              </div>
            </div>
            
            <div className="wa-nom-grid">
              <div className="wa-nom-item">
                <label>Base Imponible</label>
                <strong>{nom.base}</strong>
              </div>
              <div className="wa-nom-item">
                <label>Líquido a Cobrar</label>
                <strong className="green">{nom.liquido}</strong>
              </div>
              <div className="wa-nom-item">
                <label>IRPF</label>
                <strong className="red">{nom.irpf}</strong>
              </div>
              <div className="wa-nom-item">
                <label>Seguridad Social</label>
                <strong className="red">{nom.ss}</strong>
              </div>
            </div>

            <div className="wa-nom-footer">
              {nom.adjunto ? (
                <a href={nom.adjunto} target="_blank" rel="noopener noreferrer" className="wa-btn-archivo" style={{display:'flex',alignItems:'center',gap:'6px',textDecoration:'none'}}>
                  <Paperclip size={18} /> Ver Archivo
                </a>
              ) : (
                <div style={{width: '120px'}}></div>
              )}
              
              <div className="wa-card-actions">
                <button className="wa-action-btn" onClick={() => handleOpenEditNomina(nom)}>
                  <Edit3 size={16} />
                </button>
                <button className="wa-action-btn delete" onClick={() => handleDeleteNomina(nom.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ));
        })()
        }
      </div>
    </div>
  );

  return (
    <div className="workapp-container" onClick={() => setActiveMenuId(null)}>
      {renderHeader()}
      <main className="workapp-main">
        {currentView === 'historial' && renderHistorial()}
        {currentView === 'nominas' && renderNominas()}
      </main>
      
      {/* Bottom Nav */}
      <nav className="wa-bottom-nav">
        <button 
          className={`wa-nav-btn ${currentView === 'historial' ? 'active' : ''}`}
          onClick={() => setCurrentView('historial')}
        >
          <History size={20} />
          <span>Historial</span>
        </button>
        <button 
          className={`wa-nav-btn ${currentView === 'nominas' ? 'active' : ''}`}
          onClick={() => setCurrentView('nominas')}
        >
          <Wallet size={20} />
          <span>Nóminas</span>
        </button>
      </nav>

      {/* Modals */}
      {modalType && (
        <div className="wa-modal-overlay" onClick={() => setModalType(null)}>
          <div className="wa-modal-content animate-fade-in" style={{maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>
                {modalType === 'cuadrar' && 'Cuadrar Nómina'}
                {modalType === 'edit-nomina' && 'Editar Nómina'}
                {modalType === 'edit-jornada' && 'Editar Jornada'}
                {modalType === 'file' && 'Archivo Adjunto'}
              </h2>
              <button style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b'}} onClick={() => setModalType(null)}>&times;</button>
            </div>
            
            {/* Cuadrar / Editar Nómina */}
            {(modalType === 'cuadrar' || modalType === 'edit-nomina') && (
              <div>
                <p style={{fontSize: '0.85rem', color: '#475569', marginBottom: '24px'}}>Introduce el dinero exacto cobrado por horas extras y el día de cierre.</p>
                
                <div className="wa-form-group">
                  <label>Importe Extras Nómina (€)</label>
                  <div style={{display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0 16px', background: 'white'}}>
                    <span style={{color: '#64748b', marginRight: '8px', fontSize: '1.2rem'}}>€</span>
                    <input 
                      type="number" 
                      className="wa-form-input" 
                      style={{border: 'none', padding: '12px 0'}} 
                      value={cuadrarForm.importe} 
                      onChange={e => setCuadrarForm({...cuadrarForm, importe: e.target.value})} 
                      placeholder="Ej: 125"
                    />
                  </div>
                </div>

                <div className="wa-form-group">
                  <label>Fecha de Cierre (Día final pagado)</label>
                  <input 
                    type="date" 
                    className="wa-form-input" 
                    value={cuadrarForm.fechaCierre}
                    onChange={e => setCuadrarForm({...cuadrarForm, fechaCierre: e.target.value})}
                  />
                </div>

                <button 
                  onClick={calculateInicio}
                  style={{width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #0f172a', background: 'white', color: '#4338ca', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px'}}
                >
                  <Calendar size={20} /> CALCULAR INICIO
                </button>

                {prediccion && (
                  <div style={{background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '24px'}}>
                    <p style={{color: '#059669', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '1px', margin: '0 0 8px 0'}}>RESULTADO PREDICCIÓN</p>
                    <p style={{color: '#0f172a', fontWeight: '800', fontSize: '1.1rem', margin: '0 0 4px 0'}}>Inicio Estimado: <span style={{color: '#4338ca'}}>{prediccion.inicio_estimado}</span></p>
                    <p style={{color: '#64748b', fontSize: '0.85rem', margin: 0}}>Suma interna: <strong>{prediccion.suma_interna}€</strong></p>
                  </div>
                )}

                <div className="wa-form-group">
                  <label>Nombre del Mes (Ej: Julio 2026)</label>
                  <input type="text" className="wa-form-input" placeholder="Opcional. Por defecto usa la fecha de cierre." value={cuadrarForm.mes} onChange={e => setCuadrarForm({...cuadrarForm, mes: e.target.value})} />
                </div>

                <div style={{marginTop: '32px', marginBottom: '16px'}}>
                  <p style={{color: '#4338ca', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '1px', margin: '0 0 4px 0'}}>DATOS EXTRA (OPCIONALES)</p>
                  <p style={{color: '#64748b', fontSize: '0.8rem', margin: 0}}>Añade estos datos si quieres verlos de un vistazo en la lista.</p>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="wa-form-group">
                    <label>Base Imponible</label>
                    <input type="number" step="0.01" className="wa-form-input" value={cuadrarForm.base} onChange={e => setCuadrarForm({...cuadrarForm, base: e.target.value})} />
                  </div>
                  <div className="wa-form-group">
                    <label>Líquido a Cobrar</label>
                    <input type="number" step="0.01" className="wa-form-input" value={cuadrarForm.liquido} onChange={e => setCuadrarForm({...cuadrarForm, liquido: e.target.value})} />
                  </div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="wa-form-group">
                    <label>Retención IRPF</label>
                    <input type="number" step="0.01" className="wa-form-input" value={cuadrarForm.irpf} onChange={e => setCuadrarForm({...cuadrarForm, irpf: e.target.value})} />
                  </div>
                  <div className="wa-form-group">
                    <label>S. Social</label>
                    <input type="number" step="0.01" className="wa-form-input" value={cuadrarForm.ss} onChange={e => setCuadrarForm({...cuadrarForm, ss: e.target.value})} />
                  </div>
                </div>

                <div className="wa-form-group" style={{marginTop: '24px'}}>
                  <label>Adjuntar Nómina (Opcional)</label>
                  <div style={{display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', background: 'white', gap: '12px', position: 'relative', cursor: 'pointer'}}>
                    <Paperclip size={20} color="#64748b" />
                    <span style={{color: '#0f172a', fontWeight: '700', fontSize: '0.9rem'}}>{nominaAdjuntoFile ? nominaAdjuntoFile.name : (modalData?.adjunto ? "Cambiar archivo adjunto actual" : "Elegir archivo")}</span>
                    <input 
                      type="file" 
                      style={{opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer'}} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNominaAdjuntoFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveNomina}
                  disabled={isSaving}
                  style={{width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px'}}
                >
                  {isSaving ? 'GUARDANDO...' : 'GUARDAR NÓMINA Y ADJUNTO'}
                </button>
              </div>
            )}

            {/* Editar Jornada */}
            {modalType === 'edit-jornada' && (
              <div>
                <div className="wa-form-group">
                  <label>Fecha</label>
                  <input type="date" className="wa-form-input" value={editForm.fecha || ''} onChange={e => setEditForm({...editForm, fecha: e.target.value})} required />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="wa-form-group">
                    <label>Hora Inicio</label>
                    <input type="time" className="wa-form-input" value={editForm.hora_inicio || ''} onChange={e => setEditForm({...editForm, hora_inicio: e.target.value})} />
                  </div>
                  <div className="wa-form-group">
                    <label>Hora Fin</label>
                    <input type="time" className="wa-form-input" value={editForm.hora_fin || ''} onChange={e => setEditForm({...editForm, hora_fin: e.target.value})} />
                  </div>
                </div>
                <div className="wa-form-group">
                  <label>Matrícula Vehículo</label>
                  <input type="text" className="wa-form-input" value={editForm.matricula || ''} onChange={e => setEditForm({...editForm, matricula: e.target.value})} />
                </div>
                <div className="wa-form-group">
                  <label>Paradas (separadas por comas)</label>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px'}}>
                    {editParadas.map((p, i) => (
                      <span key={i} className="wa-parada-pill" style={{cursor: 'pointer'}} onClick={() => setEditParadas(prev => prev.filter((_, idx) => idx !== i))}>
                        {p} <X size={12} />
                      </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    className="wa-form-input" 
                    placeholder="Escribe una parada y pulsa Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.target.value.trim();
                        if (val) {
                          setEditParadas(prev => [...prev, val]);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
                <div className="wa-form-group">
                  <label>Archivo Adjunto (Albaranes/Notas)</label>
                  <div className="wa-form-input" style={{position: 'relative', cursor: 'pointer', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white'}}>
                    <Paperclip size={16} color="#64748b" />
                    <strong style={{color: '#0f172a', fontWeight: '500'}}>{editAdjuntoFile ? editAdjuntoFile.name : (editForm.adjunto ? "Cambiar archivo adjunto actual" : "Elegir archivo")}</strong>
                    <input 
                      type="file" 
                      style={{opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer'}} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditAdjuntoFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="wa-modal-actions">
                  <button className="wa-btn-cancel" onClick={() => setModalType(null)}>Cancelar</button>
                  <button className="wa-btn-save" disabled={isSaving} onClick={handleSaveEdit}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            )}

            {modalType === 'file' && (
              <div style={{textAlign: 'center', padding: '20px 0'}}>
                <Paperclip size={48} color="#cbd5e1" style={{marginBottom: '16px'}} />
                <p style={{color: '#64748b', fontSize: '1rem', fontWeight: '500'}}>Aún no hay ningún archivo subido o la conexión con la nube está pendiente.</p>
                <button className="wa-btn-save" style={{marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
                   <Plus size={18} /> Subir Documento
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="wa-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="wa-modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto'}}>
            <div className="wa-modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Configuración</h2>
              <button style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b'}} onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            
            <div className="wa-form-group">
              <label>Tarifa Hora Extra (€/h)</label>
              <div style={{display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0 16px'}}>
                <span style={{color: '#64748b', marginRight: '8px'}}>€</span>
                <input 
                  type="number" 
                  value={tarifaHora} 
                  onChange={(e) => setTarifaHora(e.target.value)}
                  style={{border: 'none', outline: 'none', width: '100%', fontSize: '1.2rem', color: '#0f172a', padding: '12px 0'}}
                />
              </div>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)}
              style={{width: '100%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '32px'}}
            >
              ✓ GUARDAR AJUSTES
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Workapp;

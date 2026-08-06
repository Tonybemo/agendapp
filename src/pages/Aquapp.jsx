import React, { useState, useEffect } from 'react';
import { 
  Droplet, Lock, Bell, Settings, WifiOff, Home, 
  Wind, Thermometer, Calendar, Search, ChevronDown, ChevronUp, ChevronRight,
  FlaskConical, Factory, SprayCan, Edit3, Trash2, Clock, Plus, BookOpen, Bug, Box, Download, BarChart2, CheckCircle2, Zap, Waves, Folder
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Aquapp.css';

const IconMap = {
  Estandar: FlaskConical,
  Torre: Factory,
  Piscina: Droplet,
  Jacuzzi: Thermometer,
  Tratamiento: Wind,
  Plagas: Bug
};

const ColorMap = {
  Estandar: '#0ea5e9',
  Torre: '#f97316',
  Piscina: '#3b82f6',
  Jacuzzi: '#eab308',
  Tratamiento: '#a855f7',
  Plagas: '#10b981'
};

const Aquapp = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('historial');
  const [currentView, setCurrentView] = useState('historial'); 
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Supabase states
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

  const getTratamientoStyle = (tipo) => {
    const t = (tipo || '').toLowerCase();
    if (t.includes('hiper')) return { label: 'Hipercloración', color: '#a855f7', bg: '#f3e8ff' };
    if (t.includes('choque')) return { label: 'Choque Térmico', color: '#ec4899', bg: '#fce7f3' };
    if (t.includes('torre') || t.includes('limptorres')) return { label: 'Limp. Torres', color: '#3b82f6', bg: '#eff6ff' };
    if (t.includes('dep') || t.includes('limpdep')) return { label: 'Limp. Depósitos', color: '#10b981', bg: '#d1fae5' };
    return { label: tipo || 'Tratamiento', color: '#6366f1', bg: '#eef2ff' };
  };

  const getMotivoStyle = (motivo) => {
    const m = (motivo || '').toLowerCase();
    if (m.includes('prev')) return { label: 'Prevención', color: '#166534', bg: '#dcfce7' };
    if (m.includes('recuento') || m.includes('alto')) return { label: 'Recuento Alto', color: '#991b1b', bg: '#fef2f2' };
    return { label: motivo || 'Motivo', color: '#475569', bg: '#f1f5f9' };
  };

  const getAvatarColor = (name) => {
    const hash = Array.from(name || 'X').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
    return colors[hash % colors.length];
  };

  const [clientes, setClientes] = useState([]);
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Accordion state
  const [expandedCategories, setExpandedCategories] = useState({});
  const [recentTratamientos, setRecentTratamientos] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Tratamiento List view state
  const [selectedTratamientoType, setSelectedTratamientoType] = useState(null);
  const [tratamientosList, setTratamientosList] = useState([]);
  const [tratamientosSearch, setTratamientosSearch] = useState('');
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  // Nuevo tab Tratamientos
  const [selectedFiltroTrat, setSelectedFiltroTrat] = useState(null); // null = todos
  const [tratamientosTab, setTratamientosTab] = useState([]);
  const [tratamientosTabSearch, setTratamientosTabSearch] = useState('');
  const [loadingTratTab, setLoadingTratTab] = useState(false);
  const [expandedYearsTab, setExpandedYearsTab] = useState({});
  const [expandedMonthsTab, setExpandedMonthsTab] = useState({});

  // Nuevo tab Torres
  const [torresClients, setTorresClients] = useState([]);
  const [selectedTorreClient, setSelectedTorreClient] = useState(null);
  const [selectedTorreYear, setSelectedTorreYear] = useState(new Date().getFullYear().toString());
  const [torresData, setTorresData] = useState(Array(12).fill(null));
  const [loadingTorres, setLoadingTorres] = useState(false);

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleYear = (id) => setExpandedYears(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleMonth = (id) => setExpandedMonths(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    fetchClientes();
    if (activeTab === 'tratamientos') {
      handleCargarTratamientos(selectedFiltroTrat);
    }
    if (activeTab === 'torres') {
      fetchTorresClients();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'torres' && selectedTorreClient && selectedTorreYear) {
      handleCargarTorres(selectedTorreClient, selectedTorreYear);
    }
  }, [selectedTorreClient, selectedTorreYear]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchClientes();
      if (activeTab === 'tratamientos') {
        handleCargarTratamientos(selectedFiltroTrat);
      }
      if (activeTab === 'torres') {
        fetchTorresClients();
        if (selectedTorreClient && selectedTorreYear) {
           handleCargarTorres(selectedTorreClient, selectedTorreYear);
        }
      }
      if (currentView === 'client_detail' && selectedClient) {
        fetchClientDetails(selectedClient);
      }
    };
    window.addEventListener('aquapp-refresh-data', handleRefresh);
    return () => window.removeEventListener('aquapp-refresh-data', handleRefresh);
  }, [activeTab, currentView, selectedClient, selectedTorreClient, selectedTorreYear]);

  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    const { data } = await supabase
      .from('aquapp_tratamientos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRecentTratamientos(data);
    setLoadingDashboard(false);
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('name');
    const { data: muestras } = await supabase.from('aquapp_muestras').select('cliente_id, fecha').order('fecha', { ascending: false }).limit(50000);
    const { data: tratamientos } = await supabase.from('aquapp_tratamientos').select('cliente_id, fecha').order('fecha', { ascending: false }).limit(50000);
    
    if (data) {
      const latestDates = {};
      const parseFecha = (fecha) => {
        if (!fecha) return null;
        let d = fecha;
        if (d.includes('T')) d = d.split('T')[0];
        if (d.includes('-')) {
          const parts = d.split('-');
          return { raw: new Date(parts[0], parts[1]-1, parts[2]), display: `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}` };
        }
        if (d.includes('/')) {
          const parts = d.split('/');
          return { raw: new Date(parts[2], parts[1]-1, parts[0]), display: d };
        }
        return null;
      };

      const processRecords = (records) => {
        if (!records) return;
        records.forEach(r => {
          if (!r.cliente_id || !r.fecha) return;
          const parsed = parseFecha(r.fecha);
          if (!parsed) return;
          if (!latestDates[r.cliente_id] || parsed.raw > latestDates[r.cliente_id].raw) {
            latestDates[r.cliente_id] = parsed;
          }
        });
      };

      processRecords(muestras);
      processRecords(tratamientos);

      const enhancedData = data.map(c => ({
        ...c,
        ultima_muestra: latestDates[c.id] ? latestDates[c.id].display : 'Sin datos'
      }));
      setClientes(enhancedData);
    }
  };

  const fetchTorresClients = async () => {
    const { data } = await supabase
      .from('aquapp_muestras')
      .select('cliente_id, cliente_nombre')
      .ilike('tipo_muestra', 'Torre');
    
    if (data) {
      const uniqueClients = [];
      const map = new Map();
      for (const item of data) {
        if (item.cliente_id && !map.has(item.cliente_id)) {
          map.set(item.cliente_id, true);
          uniqueClients.push({ id: item.cliente_id, name: item.cliente_nombre });
        }
      }
      setTorresClients(uniqueClients);
      if (uniqueClients.length > 0 && !selectedTorreClient) {
        setSelectedTorreClient(uniqueClients[0].id);
      }
    }
  };

  const handleCargarTorres = async (clientId, year) => {
    if (!clientId) return;
    setLoadingTorres(true);
    
    const { data } = await supabase
      .from('aquapp_muestras')
      .select('*')
      .eq('cliente_id', clientId)
      .ilike('tipo_muestra', 'Torre')
      .ilike('fecha', `%${year}%`);

    const monthsData = Array(12).fill(null);
    if (data) {
      data.forEach(item => {
        if (item.fecha && item.fecha.includes('/')) {
          const parts = item.fecha.split('/');
          const monthIndex = parseInt(parts[1], 10) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
             monthsData[monthIndex] = item;
          }
        } else if (item.fecha && item.fecha.includes('-')) {
          const parts = item.fecha.split('-');
          const monthIndex = parseInt(parts[1], 10) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
             monthsData[monthIndex] = item;
          }
        }
      });
    }
    setTorresData(monthsData);
    setLoadingTorres(false);
  };

  const fetchClientDetails = async (client) => {
    setSelectedClient(client);
    setCurrentView('client_detail');
    setLoading(true);

    const { data: muestras } = await supabase
      .from('aquapp_muestras')
      .select('*')
      .eq('cliente_id', client.id)
      .order('created_at', { ascending: false });

    const { data: tratamientos } = await supabase
      .from('aquapp_tratamientos')
      .select('*')
      .eq('cliente_id', client.id)
      .order('created_at', { ascending: false });

    const { data: plagas } = await supabase
      .from('aquapp_plagas')
      .select('*')
      .eq('cliente_id', client.id)
      .order('created_at', { ascending: false });

    // Agrupar por tipo (Muestra Estandar, Torre, Tratamientos...)
    const grouped = [
      { id: 'Estandar', name: 'Muestras Estándar', iconType: 'Estandar', items: [] },
      { id: 'Torre', name: 'Muestras de Torre', iconType: 'Torre', items: [] },
      { id: 'Piscina', name: 'Muestras de Piscina', iconType: 'Piscina', items: [] },
      { id: 'Jacuzzi', name: 'Muestras de Jacuzzi', iconType: 'Jacuzzi', items: [] },
      { id: 'Tratamiento', name: 'Tratamientos Realizados', iconType: 'Tratamiento', items: [] },
      { id: 'Plagas', name: 'Avisos de Plagas', iconType: 'Bug', items: [] }
    ];

    (muestras || []).forEach(m => {
      const g = grouped.find(x => x.id.toLowerCase() === (m.tipo_muestra || '').toLowerCase());
      if (g) {
        // Normalize the capitalization so badges display correctly
        m.tipo_muestra = g.id;
        g.items.push(m);
      }
    });

    (tratamientos || []).forEach(t => {
      grouped.find(x => x.id === 'Tratamiento').items.push(t);
    });

    (plagas || []).forEach(p => {
      grouped.find(x => x.id === 'Plagas').items.push(p);
    });

    setClientData(grouped.filter(g => g.items.length > 0));
    setLoading(false);
  };

  const handleDeleteMuestra = async (id) => {
    if(!window.confirm("¿Seguro que quieres borrar esta muestra?")) return;
    await supabase.from('aquapp_muestras').delete().eq('id', id);
    fetchClientDetails(selectedClient);
  };

  const handleDeleteTratamiento = async (id) => {
    if(!window.confirm("¿Seguro que quieres borrar este tratamiento?")) return;
    await supabase.from('aquapp_tratamientos').delete().eq('id', id);
    fetchClientDetails(selectedClient);
  };

  const handleDeletePlaga = async (id) => {
    if(!window.confirm("¿Seguro que quieres borrar este aviso de plaga?")) return;
    await supabase.from('aquapp_plagas').delete().eq('id', id);
    fetchClientDetails(selectedClient);
  };

  const renderHistorial = () => {
    const filteredClients = clientes.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="animate-fade-in">
        <div className="view-header">
          <h2>Historial de Clientes (Nube)</h2>
        </div>

        <div className="search-box">
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="client-list" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          {filteredClients.map(client => (
            <div 
              key={client.id} 
              className="client-card"
              style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px 20px', borderRadius: '14px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
              onClick={() => fetchClientDetails(client)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 10px -3px rgba(0, 0, 0, 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.05)'; }}
            >
              <div className="client-avatar" style={{ width: '50px', height: '50px', borderRadius: '14px', backgroundColor: getAvatarColor(client.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0, boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)' }}>
                {client.name.substring(0,2).toUpperCase()}
              </div>
              <div className="client-info" style={{ flex: 1 }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '700' }}>{client.name}</h3>
                  <span className="admin-only"><Edit3 size={14} color="#94a3b8" /></span>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: '500' }}>Último registro: {client.ultima_muestra}</p>
              </div>
              <ChevronDown size={18} color="#cbd5e1" style={{ transform: 'rotate(-90deg)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderClientDetail = () => {
    if (!selectedClient) return null;

    return (
      <div className="animate-fade-in">
        <div className="view-header">
          <button className="icon-btn" onClick={() => setCurrentView('historial')}>
            <ChevronDown style={{ transform: 'rotate(90deg)' }} size={24} />
          </button>
          <h2>Detalle Cliente</h2>
        </div>

        <div className="client-detail-header">
          <div className="client-avatar" style={{ backgroundColor: getAvatarColor(selectedClient?.name) }}>
            {selectedClient?.name ? selectedClient.name.substring(0,2).toUpperCase() : '??'}
          </div>
          <div className="client-info">
            <h3>{selectedClient.name}</h3>
            <p>{selectedClient.address}</p>
          </div>
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando registros...</div>
        ) : clientData.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No hay registros para este cliente. Añade uno pulsando el botón +</div>
        ) : (
          <div className="accordion-list">
            {clientData.map(category => {
              const CatIcon = IconMap[category.iconType] || Box;
              const isExpanded = expandedCategories[category.id];

              return (
                <div key={category.id} className="accordion-item">
                  <div className="accordion-header" onClick={() => toggleCategory(category.id)}>
                    <div style={{ backgroundColor: ColorMap[category.iconType] || '#333', padding: '8px', borderRadius: '50%', color: 'white', display: 'flex' }}>
                      <CatIcon size={20} />
                    </div>
                    <h3>{category.name} ({category.items.length})</h3>
                    {isExpanded ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                  </div>

                  {isExpanded && (
                    <div className="accordion-content animate-fade-in">
                      {(() => {
                        const grouped = [];
                        category.items.forEach(item => {
                          let year = "Desconocido";
                          let month = "Desconocido";
                          if (item.fecha && item.fecha.includes('/')) {
                            const parts = item.fecha.split('/');
                            year = parts[2];
                            const monthIndex = parseInt(parts[1], 10) - 1;
                            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                            month = monthNames[monthIndex] || "Desconocido";
                          } else if (item.fecha && item.fecha.includes('-')) {
                            const parts = item.fecha.split('T')[0].split('-');
                            year = parts[0];
                            const monthIndex = parseInt(parts[1], 10) - 1;
                            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                            month = monthNames[monthIndex] || "Desconocido";
                          } else if (item.fecha && item.fecha.includes('-')) {
                            const parts = item.fecha.split('-');
                            year = parts[0];
                            const monthIndex = parseInt(parts[1], 10) - 1;
                            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                            month = monthNames[monthIndex] || "Desconocido";
                          }
                          let yearObj = grouped.find(y => y.year === year);
                          if (!yearObj) { yearObj = { year, months: [] }; grouped.push(yearObj); }
                          let monthObj = yearObj.months.find(m => m.month === month);
                          if (!monthObj) { monthObj = { month, items: [] }; yearObj.months.push(monthObj); }
                          monthObj.items.push(item);
                        });

                        // Sort items within each month by numero_muestra
                        grouped.forEach(yGroup => {
                          const monthOrder = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                          yGroup.months.sort((a, b) => {
                            return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
                          });
                          
                          yGroup.months.forEach(mGroup => {
                            mGroup.items.sort((a, b) => {
                              const numA = parseInt((a.numero_muestra || '0').replace(/\D/g, ''), 10) || 0;
                              const numB = parseInt((b.numero_muestra || '0').replace(/\D/g, ''), 10) || 0;
                              return numA - numB;
                            });
                          });
                        });
                        
                        grouped.sort((a, b) => {
                          if (a.year === 'Desconocido') return 1;
                          if (b.year === 'Desconocido') return -1;
                          return parseInt(b.year) - parseInt(a.year);
                        });

                        return grouped.map(yGroup => {
                          const yId = `client-year-${category.id}-${yGroup.year}`;
                          const isYearExpanded = expandedYears[yId];
                          const totalItems = yGroup.months.reduce((acc, m) => acc + m.items.length, 0);
                          
                          return (
                          <div key={yGroup.year} style={{marginBottom: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', overflow: 'hidden'}}>
                            <div 
                              onClick={() => toggleYear(yId)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: '#f8fafc', cursor: 'pointer', userSelect: 'none'
                              }}
                            >
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Calendar size={18} color="#64748b" />
                                <h4 style={{margin: 0, color: '#334155', fontSize: '1.1rem'}}>{yGroup.year}</h4>
                                <span style={{background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                                  {totalItems} {totalItems === 1 ? 'registro' : 'registros'}
                                </span>
                              </div>
                              {isYearExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                            </div>
                            
                            {isYearExpanded && (
                              <div style={{padding: '16px'}}>
                                {yGroup.months.map(mGroup => {
                                  const monthId = mGroup.month + '-' + category.id + '-' + yGroup.year;
                                  const isMonthExpanded = expandedMonths[monthId];
                                  return (
                              <div key={mGroup.month} style={{marginBottom: '16px', marginLeft: '12px'}}>
                                <div onClick={() => toggleMonth(monthId)} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', userSelect: 'none'}}>
                                  {isMonthExpanded ? <ChevronDown size={18} color="#64748b"/> : <ChevronRight size={18} color="#64748b"/>}
                                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}>
                                    <Folder fill={getMonthColor(mGroup.month)} color={getMonthColor(mGroup.month)} size={18} /> <span style={{color: '#1e293b'}}>{mGroup.month}</span> <span style={{background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem'}}>{mGroup.items.length}</span>
                                  </div>
                                </div>
                                {isMonthExpanded && mGroup.items.map(item => category.id === 'Tratamiento' ? (
                                  <div key={item.id} className="tratamiento-record-card" style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', background: 'white'}}>
                                    {/* Borde izquierdo decorativo */}
                                    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: '#8b5cf6'}}></div>
                                    
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                      <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#8b5cf6'}}></div>
                                      <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.cliente_nombre || 'Cliente Desconocido'}</h4>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora}</span>
                                      <span>•</span>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
                                      <span style={{background: getTratamientoStyle(item.tipo_tratamiento).bg, color: getTratamientoStyle(item.tipo_tratamiento).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{item.tipo_tratamiento}</span>
                                      <span style={{background: getMotivoStyle(item.motivo).bg, color: getMotivoStyle(item.motivo).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{item.motivo}</span>
                                    </div>
                                    
                                    {item.notas && (
                                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontWeight: '500', color: '#475569', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid #f1f5f9' }}>
                                        <strong style={{color: '#1e293b'}}>Notas:</strong> {item.notas}
                                      </div>
                                    )}


                                    <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('edit-record', { detail: { ...item, editType: 'tratamiento' } }));
                                      }}>
                                        <Edit3 size={16}/> Editar
                                      </button>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeleteTratamiento(item.id); 
                                      }}>
                                        <Trash2 size={16}/> Borrar
                                      </button>
                                    </div>
                                  </div>
                                ) : category.id === 'Plagas' ? (
                                  <div key={item.id} className="tratamiento-record-card" style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', background: 'white'}}>
                                    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: '#10b981'}}></div>
                                    
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                      <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#10b981'}}></div>
                                      <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.cliente_nombre || 'Cliente Desconocido'}</h4>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora ? item.hora.substring(0, 5) : '-'}</span>
                                      <span>•</span>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
                                      <span style={{background: '#d1fae5', color: '#047857', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{item.tipo_actuacion}</span>
                                    </div>

                                    <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('edit-record', { detail: { ...item, editType: 'plaga' } }));
                                      }}>
                                        <Edit3 size={16}/> Editar
                                      </button>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeletePlaga(item.id); 
                                      }}>
                                        <Trash2 size={16}/> Borrar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div key={item.id} className="sample-card" style={{border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', background: 'white'}}>
                                    <div className="sample-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                      <div className="sample-title-badge" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <h4 style={{margin: 0, fontSize: '1rem', color: '#0ea5e9', fontWeight: '800'}}>{item.numero_muestra || 'Muestra'}</h4>
                                        <span className="badge-tipo" style={{ backgroundColor: item.tipo_muestra === 'Torre' ? '#ffedd5' : '#fef08a', color: item.tipo_muestra === 'Torre' ? '#c2410c' : '#a16207', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                                          <Droplet size={12}/> {item.tipo_muestra}
                                        </span>
                                      </div>
                                      <span className="sample-id" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}>
                                        {item.cod_envase || 'Sin Cód.'}
                                      </span>
                                    </div>
                                    
                                    <div className="sample-meta" style={{ display: 'flex', gap: '8px', color: '#64748b', fontSize: '0.75rem', marginBottom: '10px', fontWeight: '600' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {item.hora ? item.hora.substring(0, 5) : '-'}</span>
                                      <span>•</span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                    </div>
                                    
                                    <div className="sample-location" style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', fontSize: '0.9rem' }}>
                                      {item.descripcion || 'Sin descripción'}
                                    </div>
                                    
                                    {item.tipo_muestra === 'Torre' ? (
                                      <div className="parameters-grid" style={{marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px'}}>
                                        <div className="param-box ph" style={{ flex: 1, padding: '8px 0', border: '1px solid #fef08a', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><FlaskConical size={16} color="#eab308" /><span className="param-name" style={{ color: '#eab308', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>PH</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.ph || '-'}</span></div>
                                        <div className="param-box temp" style={{ flex: 1, padding: '8px 0', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Thermometer size={16} color="#ef4444" /><span className="param-name" style={{ color: '#ef4444', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TEMP</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.temp ? item.temp + 'º' : '-'}</span></div>
                                        <div className="param-box cond" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Zap size={16} color="#475569" /><span className="param-name" style={{ color: '#475569', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>COND.</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.conductividad || '-'}</span></div>
                                        <div className="param-box turb" style={{ flex: 1, padding: '8px 0', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Waves size={16} color="#0ea5e9" /><span className="param-name" style={{ color: '#0ea5e9', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TURB.</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.turbidez || '-'}</span></div>
                                        <div className="param-box hierro" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Box size={16} color="#64748b" /><span className="param-name" style={{ color: '#64748b', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>HIERRO</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.hierro || '-'}</span></div>
                                        <div className="param-box f8583" style={{ flex: 1, padding: '8px 0', border: '1px solid #bae6fd', borderRadius: '8px', background: '#f0f9ff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Droplet size={16} color="#0ea5e9" /><span className="param-name" style={{ color: '#0ea5e9', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>F-8583</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.f_8583_kit || '-'}</span></div>
                                        <div className="param-box f8580" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><FlaskConical size={16} color="#64748b" /><span className="param-name" style={{ color: '#64748b', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>F-8580</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.f_8580_total || '-'}</span></div>
                                      </div>
                                    ) : (
                                      <div className="parameters-grid" style={{marginTop: '12px', display: 'flex', gap: '6px'}}>
                                        <div className="param-box ph" style={{ flex: 1, padding: '8px 0', border: '1px solid #fef08a', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><FlaskConical size={16} color="#eab308" /><span className="param-name" style={{ color: '#eab308', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>PH</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.ph || '-'}</span></div>
                                        <div className="param-box temp" style={{ flex: 1, padding: '8px 0', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Thermometer size={16} color="#ef4444" /><span className="param-name" style={{ color: '#ef4444', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TEMP</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.temp ? item.temp + 'º' : '-'}</span></div>
                                        <div className="param-box cloro" style={{ flex: 1, padding: '8px 0', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Droplet size={16} color="#0ea5e9" /><span className="param-name" style={{ color: '#0ea5e9', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>CLORO</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.cloro || '-'}</span></div>
                                        <div className="param-box hierro" style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Box size={16} color="#64748b" /><span className="param-name" style={{ color: '#64748b', marginTop: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>HIERRO</span><span className="param-value" style={{ fontSize: '0.95rem', marginTop: '2px', fontWeight: 'bold', color: '#1e293b' }}>{item.hierro || '-'}</span></div>
                                      </div>
                                    )}

                                    <div className="sample-actions" style={{marginTop: '12px', display: 'flex', gap: '8px'}}>
                                      <button className="action-btn-outline edit" style={{flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer'}} onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('edit-record', { detail: { ...item, editType: 'muestra' } }));
                                      }}>
                                        <Edit3 size={16}/> Editar
                                      </button>
                                      <button className="action-btn-outline delete" style={{flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer'}} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeleteMuestra(item.id); 
                                      }}>
                                        <Trash2 size={16}/> Borrar
                                      </button>
                                    </div>
                                  </div>
                                ))} 
                              </div>
                            )
                          })} 
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleCargarTratamientos = async (filtro) => {
    setLoadingTratTab(true);
    setExpandedYearsTab({});
    setExpandedMonthsTab({});
    let query = supabase.from('aquapp_tratamientos').select('*');
    if (filtro) query = query.ilike('tipo_tratamiento', `%${filtro}%`);
    const { data } = await query.order('created_at', { ascending: false });

    const grouped = [];
    (data || []).forEach(item => {
      let year = 'Desconocido', month = 'Desconocido';
      if (item.fecha && item.fecha.includes('/')) {
        const parts = item.fecha.split('/');
        year = parts[2];
        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        month = monthNames[parseInt(parts[1], 10) - 1] || 'Desconocido';
      } else if (item.fecha && item.fecha.includes('-')) {
        const parts = item.fecha.split('-');
        year = parts[0];
        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        month = monthNames[parseInt(parts[1], 10) - 1] || 'Desconocido';
      }
      let yObj = grouped.find(y => y.year === year);
      if (!yObj) { yObj = { year, total: 0, months: [] }; grouped.push(yObj); }
      let mObj = yObj.months.find(m => m.month === month);
      if (!mObj) { mObj = { month, items: [] }; yObj.months.push(mObj); }
      mObj.items.push(item);
      yObj.total++;
    });
    
    grouped.sort((a, b) => {
      if (a.year === 'Desconocido') return 1;
      if (b.year === 'Desconocido') return -1;
      return parseInt(b.year) - parseInt(a.year);
    });

    const monthOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    grouped.forEach(yGroup => {
      yGroup.months.sort((a, b) => monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month));
    });

    setTratamientosTab(grouped);
    setLoadingTratTab(false);
  };

  const renderTratamientosTab = () => {
    const filtros = [
      { label: 'Todos', value: null, color: '#6366f1', bg: '#eef2ff' },
      { label: 'Hipercloración', value: 'hiper', color: '#a855f7', bg: '#f3e8ff' },
      { label: 'Choque Térmico', value: 'choque', color: '#ec4899', bg: '#fce7f3' },
      { label: 'Limp. Torres', value: 'torre', color: '#3b82f6', bg: '#eff6ff' },
      { label: 'Limp. Depósitos', value: 'dep', color: '#10b981', bg: '#d1fae5' },
    ];

    return (
      <div className="animate-fade-in" style={{paddingBottom: '40px'}}>
        <div className="view-header"><h2>Historial de Tratamientos</h2></div>

        {/* Botones filtro */}
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px'}}>
          {filtros.map(f => (
            <button
              key={f.label}
              onClick={() => { setSelectedFiltroTrat(f.value); handleCargarTratamientos(f.value); }}
              style={{
                padding: '8px 16px', borderRadius: '24px', fontWeight: '700', fontSize: '0.85rem',
                border: `2px solid ${selectedFiltroTrat === f.value ? f.color : '#e2e8f0'}`,
                background: selectedFiltroTrat === f.value ? f.bg : 'white',
                color: selectedFiltroTrat === f.value ? f.color : '#64748b',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="search-box" style={{marginBottom: '16px'}}>
          <Search size={20} color="#64748b" />
          <input type="text" placeholder="Buscar cliente..." value={tratamientosTabSearch} onChange={(e) => setTratamientosTabSearch(e.target.value)} />
        </div>

        {/* Listado */}
        {loadingTratTab ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando...</div>
        ) : tratamientosTab.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No hay tratamientos registrados.</div>
        ) : (
          <div className="accordion-list">
            {tratamientosTab.map(yGroup => {
              const yId = `tab-year-${yGroup.year}`;
              const isYearExpanded = expandedYearsTab[yId];
              return (
                <div key={yGroup.year} className="accordion-item" style={{background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '12px'}}>
                  <div className="accordion-header" onClick={() => setExpandedYearsTab(prev => ({...prev, [yId]: !prev[yId]}))} style={{background: '#f8fafc', padding: '16px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <Calendar size={20} color="#6366f1" />
                      <h3 style={{margin: 0, fontSize: '1.1rem'}}>{yGroup.year}</h3>
                      <span style={{background: '#fee2e2', color: '#e11d48', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'}}>{yGroup.total} tratamientos</span>
                    </div>
                    {isYearExpanded ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                  </div>

                  {isYearExpanded && (
                    <div style={{padding: '0 16px 16px'}}>
                      {yGroup.months.map(mGroup => {
                          const mId = `tab-month-${yGroup.year}-${mGroup.month}`;
                          const isMonthExpanded = expandedMonthsTab[mId];
                          const itemsFiltrados = mGroup.items.filter(i => {
                            const q = tratamientosTabSearch.toLowerCase();
                            return (i.cliente_nombre||'').toLowerCase().includes(q) ||
                                   (i.tipo_tratamiento||'').toLowerCase().includes(q) ||
                                   (i.motivo||'').toLowerCase().includes(q);
                          });
                          return (
                          <div key={mGroup.month} style={{marginTop: '16px'}}>
                            <div onClick={() => setExpandedMonthsTab(prev => ({...prev, [mId]: !prev[mId]}))} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}>
                                <Folder fill={getMonthColor(mGroup.month)} color={getMonthColor(mGroup.month)} size={18} /> <span style={{color: '#1e293b'}}>{mGroup.month}</span> <span style={{background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem'}}>{itemsFiltrados.length}</span>
                              </div>
                              {isMonthExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                            </div>

                            {isMonthExpanded && (
                              <div style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                {itemsFiltrados.map(item => (
                                  <div key={item.id} style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                                    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: '#8b5cf6'}}></div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                      <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#8b5cf6'}}></div>
                                      <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.cliente_nombre || 'Cliente Desconocido'}</h4>
                                    </div>
                                    <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora}</span>
                                      <span>•</span>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                    </div>
                                    <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
                                      <span style={{background: getTratamientoStyle(item.tipo_tratamiento).bg, color: getTratamientoStyle(item.tipo_tratamiento).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{getTratamientoStyle(item.tipo_tratamiento).label}</span>
                                      <span style={{background: getMotivoStyle(item.motivo).bg, color: getMotivoStyle(item.motivo).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{getMotivoStyle(item.motivo).label}</span>
                                    </div>
                                    
                                    {item.notas && (
                                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontWeight: '500', color: '#475569', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid #f1f5f9' }}>
                                        <strong style={{color: '#1e293b'}}>Notas:</strong> {item.notas}
                                      </div>
                                    )}
                                    <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('edit-record', { detail: { ...item, editType: 'tratamiento' } })); }}>
                                        <Edit3 size={16}/> Editar
                                      </button>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); handleDeleteTratamiento(item.id); handleCargarTratamientos(selectedFiltroTrat); }}>
                                        <Trash2 size={16}/> Borrar
                                      </button>
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
        )}
      </div>
    );
  };

  const renderTorreRow = (label, valueExtractor, cellStyle = {}, customRenderer = null) => {
    return (
      <tr>
        <td style={{position: 'sticky', left: 0, zIndex: 10}}>{label}</td>
        {torresData.map((item, idx) => {
          const val = valueExtractor(item);
          return (
            <td key={idx} style={{...cellStyle}}>
              {customRenderer ? customRenderer(val) : val}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderTorresTab = () => {
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return (
      <div className="animate-fade-in" style={{paddingBottom: '40px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}><Factory size={24}/> Torres</h2>
          <button style={{background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => window.print()}>
            <Download size={18}/> PDF
          </button>
        </div>

        {/* Client Tabs */}
        <div style={{display: 'flex', gap: '12px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px'}}>
          {torresClients.length === 0 ? (
            <div style={{color: '#64748b'}}>No hay clientes con muestras de Torre.</div>
          ) : (
            torresClients.map(c => (
              <button 
                key={c.id}
                onClick={() => setSelectedTorreClient(c.id)}
                style={{
                  flex: 1, minWidth: '150px', padding: '12px', borderRadius: '24px', fontWeight: 'bold', border: '2px solid',
                  borderColor: selectedTorreClient === c.id ? '#0ea5e9' : '#e2e8f0',
                  background: selectedTorreClient === c.id ? '#0ea5e9' : 'white',
                  color: selectedTorreClient === c.id ? 'white' : '#64748b',
                  cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                 {selectedTorreClient === c.id ? <CheckCircle2 size={18} /> : <div style={{width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #94a3b8'}} />}
                 {c.name}
              </button>
            ))
          )}
        </div>

        {/* Year Selector */}
        <div style={{background: 'white', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}>
            <Calendar size={20} /> Año de Registro
          </div>
          <select 
            value={selectedTorreYear}
            onChange={(e) => setSelectedTorreYear(e.target.value)}
            style={{padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', fontWeight: 'bold', outline: 'none', background: '#f8fafc', color: '#1e293b'}}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Table */}
        {loadingTorres ? (
           <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando datos...</div>
        ) : (
          <div style={{background: 'white', borderRadius: '16px', overflowX: 'auto', overflowY: 'auto', maxHeight: '65vh', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0'}}>
            <table className="torres-table" style={{width: '100%', borderCollapse: 'collapse', minWidth: '800px', backgroundColor: 'white'}}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <th style={{position: 'sticky', top: 0, left: 0, zIndex: 12, textAlign: 'left', padding: '16px', color: '#64748b', backgroundColor: '#f8fafc'}}>PARÁMETROS</th>
                  {months.map(m => (
                    <th key={m} style={{position: 'sticky', top: 0, zIndex: 11, backgroundColor: '#f8fafc', textAlign: 'center', minWidth: '100px', padding: '16px', color: '#1e293b', fontWeight: 'bold'}}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderTorreRow('Recogida', item => {
                  if (!item) return '-';
                  let datePart = item.fecha;
                  if (datePart.includes('T')) datePart = datePart.split('T')[0];
                  datePart = datePart.includes('-') ? datePart.split('-')[2] : datePart.split('/')[0];
                  let timePart = item.hora ? item.hora.substring(0, 5) : '';
                  return `Día ${datePart} ${timePart}`;
                }, {color: '#0ea5e9', fontWeight: 'bold'})}
                {renderTorreRow('pH', item => item ? item.ph : '-')}
                {renderTorreRow('Temp', item => item ? item.temp : '-')}
                {renderTorreRow('Cond.', item => item ? item.conductividad : '-')}
                {renderTorreRow('Turbidez', item => item ? item.turbidez : '-')}
                {renderTorreRow('Hierro', item => item ? item.hierro : '-')}
                {renderTorreRow('F-8583', item => item ? item.f_8583_kit : '-')}
                {renderTorreRow('F-8580', item => item ? item.f_8580_total : '-')}
                
                {renderTorreRow('F-8583 (Entrega)', item => item ? item.mat_f_8583 : '-', {}, (val) => val && val !== '-' ? <div style={{background: '#fce7f3', color: '#be185d', padding: '4px 8px', borderRadius: '8px', display: 'inline-block'}}>📦 {val}</div> : val)}
                {renderTorreRow('F-8580 (Entrega)', item => item ? item.mat_f_8580 : '-', {}, (val) => val && val !== '-' ? <div style={{background: '#fce7f3', color: '#be185d', padding: '4px 8px', borderRadius: '8px', display: 'inline-block'}}>📦 {val}</div> : val)}
                {renderTorreRow('F-8481 (Entrega)', item => item ? item.mat_f_8481 : '-', {}, (val) => val && val !== '-' ? <div style={{background: '#fce7f3', color: '#be185d', padding: '4px 8px', borderRadius: '8px', display: 'inline-block'}}>📦 {val}</div> : val)}
                {renderTorreRow('A-4170 (Entrega)', item => item ? item.mat_a_4170 : '-', {}, (val) => val && val !== '-' ? <div style={{background: '#fce7f3', color: '#be185d', padding: '4px 8px', borderRadius: '8px', display: 'inline-block'}}>📦 {val}</div> : val)}
                {renderTorreRow('A-645 (Entrega)', item => item ? item.mat_a_645 : '-', {}, (val) => val && val !== '-' ? <div style={{background: '#fce7f3', color: '#be185d', padding: '4px 8px', borderRadius: '8px', display: 'inline-block'}}>📦 {val}</div> : val)}
                
                {renderTorreRow('Limpieza', item => item ? item.limpieza : '-', {color: '#0ea5e9', fontWeight: 'bold'})}
                {renderTorreRow('Notas', item => item ? item.descripcion : '-', {}, (val) => val && val !== '-' ? <div style={{background: '#fef3c7', color: '#92400e', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', textAlign: 'left'}}>📝 {val}</div> : '')}
                {renderTorreRow('Envase', item => item ? item.cod_envase : '-', {color: '#0ea5e9'})}
                
                <tr>
                  <td style={{position: 'sticky', left: 0, zIndex: 10, color: '#0ea5e9'}}>Acciones</td>
                  {torresData.map((item, idx) => (
                    <td key={idx} style={{textAlign: 'center'}}>
                      {item ? (
                        <div className="admin-only" style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                          <button onClick={() => window.dispatchEvent(new CustomEvent('edit-record', {detail: {...item, editType: 'muestra'}}))} style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer'}}><Edit3 size={16}/></button>
                          <button onClick={async () => {
                            if(window.confirm("¿Borrar esta muestra?")) {
                              await supabase.from('aquapp_muestras').delete().eq('id', item.id);
                              window.dispatchEvent(new CustomEvent('aquapp-refresh-data'));
                            }
                          }} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer'}}><Trash2 size={16}/></button>
                        </div>
                      ) : null}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const handleOpenTratamientoList = async (tipoLabel, tipoValue) => {
    setSelectedTratamientoType(tipoLabel);
    setCurrentView('tratamiento_list');
    setLoadingDashboard(true);
    
    // Asumimos que tipoValue coincide con el valor guardado en Supabase (ej: 'Hipercloracion', 'Choque', 'LimpTorres')
    let query = supabase.from('aquapp_tratamientos').select('*');
    if (tipoValue) {
      query = query.eq('tipo_tratamiento', tipoValue);
     } else if (tipoLabel === 'Control Plagas') {
       // Plagas están en tabla separada, cargar desde aquapp_plagas
       const { data: plagasData } = await supabase.from('aquapp_plagas').select('*').order('fecha', { ascending: false });
       
       const groupedPlagas = [];
       if (plagasData) {
         plagasData.forEach(item => {
           let year = "Desconocido";
           let month = "Desconocido";
           if (item.fecha && item.fecha.includes('/')) {
             const parts = item.fecha.split('/');
             year = parts[2];
             const monthIndex = parseInt(parts[1], 10) - 1;
             const mNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
             month = mNames[monthIndex] || "Desconocido";
           }
           let yearObj = groupedPlagas.find(y => y.year === year);
           if (!yearObj) { yearObj = { year, total: 0, months: [] }; groupedPlagas.push(yearObj); }
           let monthObj = yearObj.months.find(m => m.month === month);
           if (!monthObj) { monthObj = { month, items: [] }; yearObj.months.push(monthObj); }
           monthObj.items.push(item);
           yearObj.total++;
         });
       }
       setTratamientosList(groupedPlagas);
       setLoadingDashboard(false);
       return;
    }
    
    const { data } = await query.order('fecha', { ascending: false });
    
    // Group by Year -> Month
    const grouped = [];
    if (data) {
      data.forEach(item => {
        // item.fecha es "21/07/2026"
        let year = "Desconocido";
        let month = "Desconocido";
        if (item.fecha && item.fecha.includes('/')) {
          const parts = item.fecha.split('/');
          year = parts[2];
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
          month = monthNames[monthIndex] || "Desconocido";
        }

        let yearObj = grouped.find(y => y.year === year);
        if (!yearObj) {
          yearObj = { year, total: 0, months: [] };
          grouped.push(yearObj);
        }
        
        let monthObj = yearObj.months.find(m => m.month === month);
        if (!monthObj) {
          monthObj = { month, items: [] };
          yearObj.months.push(monthObj);
        }
        
        monthObj.items.push(item);
        yearObj.total++;
      });
    }

    setTratamientosList(grouped);
    setLoadingDashboard(false);
  };

  const renderTratamientoList = () => {
    // Filtrar por búsqueda si es necesario
    return (
      <div className="animate-fade-in" style={{paddingBottom: '40px'}}>
        <div className="view-header" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
          <button className="icon-btn" style={{background: 'white', padding: '8px 16px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold'}} onClick={() => setCurrentView('historial')}>
            <ChevronDown style={{ transform: 'rotate(90deg)' }} size={18} /> Volver
          </button>
          <h2 style={{margin: 0, fontSize: '1.2rem'}}>{selectedTratamientoType}</h2>
        </div>

        <div className="search-box" style={{marginBottom: '16px'}}>
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={tratamientosSearch}
            onChange={(e) => setTratamientosSearch(e.target.value)}
          />
        </div>

        <button 
          style={{width: '100%', background: '#f43f5e', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px', cursor: 'pointer'}}
          onClick={() => {
            let tipoVal = 'Hipercloracion';
            if (selectedTratamientoType === 'Choques Térmicos') tipoVal = 'Choque';
            if (selectedTratamientoType === 'Limpieza de Torres') tipoVal = 'LimpTorres';
            
            window.dispatchEvent(new CustomEvent('open-universal-form', { 
              detail: { type: 'muestra', mode: 'tratamiento', tipoTratamiento: tipoVal } 
            }));
          }}
        >
          <PlusCircle size={22} /> NUEVO TRATAMIENTO
        </button>

        {loadingDashboard ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando datos...</div>
        ) : tratamientosList.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No hay tratamientos de este tipo registrados.</div>
        ) : (
          <div className="accordion-list">
            {tratamientosList.map(yGroup => {
              const yId = `year-${yGroup.year}`;
              const isYearExpanded = expandedYears[yId];

              return (
                <div key={yGroup.year} className="accordion-item" style={{background: 'white', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}}>
                  <div className="accordion-header" onClick={() => toggleYear(yId)} style={{background: '#f8fafc', padding: '16px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <Calendar size={20} color="#6366f1" />
                      <h3 style={{margin: 0, fontSize: '1.1rem'}}>{yGroup.year}</h3>
                      <span style={{background: '#fee2e2', color: '#e11d48', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'}}>{yGroup.total} tratamientos</span>
                    </div>
                    {isYearExpanded ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                  </div>

                  {isYearExpanded && (
                    <div style={{padding: '0 16px 16px 16px'}}>
                      {yGroup.months.map(mGroup => {
                        const mId = `month-${yGroup.year}-${mGroup.month}`;
                        const isMonthExpanded = expandedMonths[mId];

                        return (
                          <div key={mGroup.month} style={{marginTop: '16px'}}>
                            <div 
                              onClick={() => toggleMonth(mId)}
                              style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9'}}
                            >
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}>
                                <Folder fill={getMonthColor(mGroup.month)} color={getMonthColor(mGroup.month)} size={18} /> <span style={{color: '#1e293b'}}>{mGroup.month}</span> <span style={{background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem'}}>{mGroup.items.length}</span>
                              </div>
                              {isMonthExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                            </div>

                            {isMonthExpanded && (
                              <div style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                {mGroup.items.filter(i => (i.cliente_nombre||'').toLowerCase().includes(tratamientosSearch.toLowerCase())).map(item => (
                                  <div key={item.id} style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden', background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}}>
                                    {/* Borde izquierdo decorativo */}
                                    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: '#8b5cf6'}}></div>
                                    
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                                      <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#8b5cf6'}}></div>
                                      <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.cliente_nombre || 'Cliente Desconocido'}</h4>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora}</span>
                                      <span>•</span>
                                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
                                      <span style={{background: getTratamientoStyle(item.tipo_tratamiento).bg, color: getTratamientoStyle(item.tipo_tratamiento).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{item.tipo_tratamiento}</span>
                                      <span style={{background: getMotivoStyle(item.motivo).bg, color: getMotivoStyle(item.motivo).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{item.motivo}</span>
                                    </div>

                                    <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('edit-record', { detail: { ...item, editType: 'tratamiento' } }));
                                      }}>
                                        <Edit3 size={16}/> Editar
                                      </button>
                                      <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeleteTratamiento(item.id); 
                                      }}>
                                        <Trash2 size={16}/> Borrar
                                      </button>
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
        )}
      </div>
    );
  };

  const renderDashboard = () => {
    return (
      <div className="animate-fade-in" style={{paddingBottom: '40px'}}>
        <div className="view-header"><h2>Acciones Rápidas</h2></div>
        <div className="dashboard-grid" style={{marginBottom: '32px'}}>
           <div className="action-card" style={{borderColor: '#a855f7', cursor: 'pointer'}} onClick={() => handleOpenTratamientoList('Hipercloraciones', 'Hipercloracion')}><div className="icon-wrapper" style={{background:'#a855f715'}}><Droplet size={28} color="#a855f7"/></div><h3>Hipercloraciones</h3></div>
           <div className="action-card" style={{borderColor: '#ec4899', cursor: 'pointer'}} onClick={() => handleOpenTratamientoList('Choques Térmicos', 'Choque')}><div className="icon-wrapper" style={{background:'#ec489915'}}><Thermometer size={28} color="#ec4899"/></div><h3>Choques Térmicos</h3></div>
           <div className="action-card" style={{borderColor: '#3b82f6', cursor: 'pointer'}} onClick={() => handleOpenTratamientoList('Limpieza de Torres', 'LimpTorres')}><div className="icon-wrapper" style={{background:'#3b82f615'}}><Wind size={28} color="#3b82f6"/></div><h3>Limp. Torres</h3></div>
           <div className="action-card" style={{borderColor: '#22c55e', cursor: 'pointer'}} onClick={() => handleOpenTratamientoList('Control de Plagas', null)}><div className="icon-wrapper" style={{background:'#22c55e15'}}><Bug size={28} color="#22c55e"/></div><h3>Control Plagas</h3></div>
        </div>

        <div className="view-header"><h2>Últimos Tratamientos</h2></div>
        
        {loadingDashboard ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>Cargando dashboard...</div>
        ) : recentTratamientos.length === 0 ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>Aún no hay tratamientos registrados.</div>
        ) : (
          <div className="accordion-list">
            {recentTratamientos.map(item => (
              <div key={item.id} className="tratamiento-record-card" style={{border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', background: 'white'}}>
                {/* Borde izquierdo decorativo */}
                <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: '#8b5cf6'}}></div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                  <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#8b5cf6'}}></div>
                  <h4 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{item.cliente_nombre || 'Cliente Desconocido'}</h4>
                </div>
                
                <div style={{display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600'}}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={14}/> {item.hora}</span>
                  <span>•</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={14}/> {item.fecha ? item.fecha.split('T')[0] : '-'}</span>
                </div>
                
                <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
                  <span style={{background: getTratamientoStyle(item.tipo_tratamiento).bg, color: getTratamientoStyle(item.tipo_tratamiento).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{getTratamientoStyle(item.tipo_tratamiento).label}</span>
                  <span style={{background: getMotivoStyle(item.motivo).bg, color: getMotivoStyle(item.motivo).color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700'}}>{getMotivoStyle(item.motivo).label}</span>
                </div>
                
                {item.notas && (
                  <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontWeight: '500', color: '#475569', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid #f1f5f9' }}>
                    <strong style={{color: '#1e293b'}}>Notas:</strong> {item.notas}
                  </div>
                )}

                <div className="admin-only" style={{display: 'flex', gap: '12px'}}>
                  <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('edit-record', { detail: { ...item, editType: 'tratamiento' } }));
                  }}>
                    <Edit3 size={16}/> Editar
                  </button>
                  <button style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}} onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDeleteTratamiento(item.id); 
                  }}>
                    <Trash2 size={16}/> Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="aquapp-container">
      {currentView === 'historial' && (
        <div className="aquapp-tabs" style={{overflowX: 'auto', display: 'flex', gap: '8px', paddingBottom: '8px'}}>
          <button className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
            <BookOpen size={20} /> <span>Historial</span>
          </button>
          <button className={`tab-btn ${activeTab === 'torres' ? 'active' : ''}`} onClick={() => setActiveTab('torres')}>
            <Factory size={20} /> <span>Torres</span>
          </button>
          <button className={`tab-btn ${activeTab === 'tratamientos' ? 'active' : ''}`} onClick={() => { setActiveTab('tratamientos'); handleCargarTratamientos(selectedFiltroTrat); }}>
            <Wind size={20} /> <span>Tratamientos</span>
          </button>
        </div>
      )}

      <div className="aq-content">
        {currentView === 'historial' && activeTab === 'historial' && renderHistorial()}
        {currentView === 'historial' && activeTab === 'torres' && renderTorresTab()}
        {currentView === 'historial' && activeTab === 'tratamientos' && renderTratamientosTab()}
        {currentView === 'client_detail' && renderClientDetail()}
        {currentView === 'tratamiento_list' && renderTratamientoList()}
      </div>
    </div>
  );
};

export default Aquapp;

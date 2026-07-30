import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart2, Droplet, MapPin, Briefcase, Bug, Wind, FlaskConical,
  Calendar, TrendingUp, Filter, Search
} from 'lucide-react';
import { mockLocalidadStats } from '../data/mockAvisomap';
import { supabase } from '../lib/supabase';
import { mockWorkappData } from '../data/mockWorkapp';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import './Estadisticas.css';

const Estadisticas = () => {
  const [activeSection, setActiveSection] = useState('aquapp');
  const [tableTooltip, setTableTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  const sections = [
    { id: 'aquapp', label: 'Muestras y Trat.', icon: Droplet, color: '#0ea5e9' },
    { id: 'avisomap', label: 'Avisos Mapfre', icon: MapPin, color: '#10b981' },
    { id: 'workapp', label: 'Jornada', icon: Briefcase, color: '#8b5cf6' },
  ];

  // Aquapp State
  const [aquappMuestrasRaw, setAquappMuestrasRaw] = useState([]);
  const [aquappTratamientosRaw, setAquappTratamientosRaw] = useState([]);
  const [aquappYearFilter, setAquappYearFilter] = useState(new Date().getFullYear().toString());
  const [aquappStats, setAquappStats] = useState({
    availableYears: [],
    muestrasChartData: [],
    tratamientosChartData: [],
    clientTableData: []
  });

  // Avisomap State
  const [avisomapAvisosRaw, setAvisomapAvisosRaw] = useState([]);
  const [avisomapYearFilter, setAvisomapYearFilter] = useState('Todos');
  const [avisomapStats, setAvisomapStats] = useState({
    total: 0,
    plagas: [],
    localidades: [],
    availableYears: []
  });

  // Workapp State
  const [jornadas, setJornadas] = useState([]);
  const [workappFiltro, setWorkappFiltro] = useState({ desde: '', hasta: '' });
  const [workappResultados, setWorkappResultados] = useState({
    totalHoras: '0',
    totalExtras: '0',
    importe: '0',
    chartData: [],
    monthlyExtras: []
  });

  React.useEffect(() => {
    const fetchJornadas = async () => {
      const { data } = await supabase.from('workapp_jornadas').select('*');
      if (data) {
        setJornadas(data);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        setWorkappFiltro({ desde: formatYMD(start), hasta: formatYMD(end) });
      }
    };

    const fetchAvisos = async () => {
      const { data } = await supabase.from('avisomap_avisos').select('*');
      if (data) {
        setAvisomapAvisosRaw(data);
      }
    };

    const fetchAquapp = async () => {
      const { data: muestras } = await supabase.from('aquapp_muestras').select('fecha, cliente_nombre, tipo_muestra');
      const { data: trat } = await supabase.from('aquapp_tratamientos').select('fecha, tipo_tratamiento, cliente_nombre');
      if (muestras) setAquappMuestrasRaw(muestras);
      if (trat) setAquappTratamientosRaw(trat);
    };

    fetchJornadas();
    fetchAvisos();
    fetchAquapp();
  }, []);

  React.useEffect(() => {
    if (aquappMuestrasRaw.length >= 0 && aquappTratamientosRaw.length >= 0) {
      const yearsSet = new Set();
      const getYear = (f) => {
        if (!f) return null;
        if (f.includes('-')) return f.split('-')[0];
        if (f.includes('/')) return f.split('/')[2];
        return null;
      };
      const getMonth = (f) => {
        if (!f) return null;
        if (f.includes('-')) return parseInt(f.split('-')[1], 10) - 1;
        if (f.includes('/')) return parseInt(f.split('/')[1], 10) - 1;
        return null;
      };

      aquappMuestrasRaw.forEach(m => { const y = getYear(m.fecha); if (y) yearsSet.add(y); });
      aquappTratamientosRaw.forEach(t => { const y = getYear(t.fecha); if (y) yearsSet.add(y); });
      
      const yearsArr = Array.from(yearsSet).sort((a,b) => b.localeCompare(a));

      const filterYear = aquappYearFilter || (yearsArr.length > 0 ? yearsArr[0] : new Date().getFullYear().toString());

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mData = months.map(m => ({ mes: m, ClientesSet: new Set() }));
      const tData = months.map(m => ({ mes: m, Hipercloracion: 0, Choque: 0, LimpTorres: 0, LimpDep: 0 }));
      const clientTable = {};

      const initClient = (name) => {
         if (!clientTable[name]) clientTable[name] = Array.from({length: 12}, () => []);
      };

      const aquappAddEvent = (name, mIdx, group, rawType) => {
        if (!name) return;
        initClient(name);
        const arr = clientTable[name][mIdx];
        const tLower = (rawType || '').toLowerCase();
        let evType = rawType;
        if (group === 'tratamiento') {
          if (tLower.includes('hiper')) evType = 'Hipercloracion';
          else if (tLower.includes('choque')) evType = 'Choque';
          else if (tLower.includes('torre')) evType = 'LimpTorres';
          else if (tLower.includes('dep')) evType = 'LimpDep';
        } else {
          if (tLower.includes('torre')) evType = 'Torre';
          else if (tLower.includes('pisci') || tLower.includes('jac')) evType = 'Piscina/Jacuzzi';
          else evType = 'Estandar';
        }

        if (!arr.some(a => a.group === group && a.type === evType)) {
          arr.push({ group, type: evType });
        }
      };

      aquappMuestrasRaw.forEach(m => {
        if (getYear(m.fecha) === filterYear) {
          const mIdx = getMonth(m.fecha);
          if (mIdx !== null && mIdx >= 0 && mIdx < 12) {
            if (m.cliente_nombre) {
              mData[mIdx].ClientesSet.add(m.cliente_nombre);
              aquappAddEvent(m.cliente_nombre, mIdx, 'muestra', m.tipo_muestra || 'Estandar');
            }
          }
        }
      });

      aquappTratamientosRaw.forEach(t => {
        if (getYear(t.fecha) === filterYear) {
          const mIdx = getMonth(t.fecha);
          if (mIdx !== null && mIdx >= 0 && mIdx < 12) {
             if (t.cliente_nombre) {
               mData[mIdx].ClientesSet.add(t.cliente_nombre);
               aquappAddEvent(t.cliente_nombre, mIdx, 'tratamiento', t.tipo_tratamiento);
             }

             const tLower = (t.tipo_tratamiento || '').toLowerCase();
             if (tLower.includes('hiper')) tData[mIdx].Hipercloracion++;
             else if (tLower.includes('choque')) tData[mIdx].Choque++;
             else if (tLower.includes('torre')) tData[mIdx].LimpTorres++;
             else if (tLower.includes('dep')) tData[mIdx].LimpDep++;
          }
        }
      });

      const finalMData = mData.map(d => ({ mes: d.mes, Clientes: d.ClientesSet.size }));
      const clientTableArray = Object.keys(clientTable).map(name => ({
          name,
          months: clientTable[name]
      })).sort((a,b) => a.name.localeCompare(b.name));

      setAquappStats({
        availableYears: yearsArr,
        muestrasChartData: finalMData,
        tratamientosChartData: tData,
        clientTableData: clientTableArray
      });
    }
  }, [aquappMuestrasRaw, aquappTratamientosRaw, aquappYearFilter]);

  React.useEffect(() => {
    if (avisomapAvisosRaw.length > 0) {
      const yearsSet = new Set();
      avisomapAvisosRaw.forEach(a => {
        if (a.fecha) {
          const y = a.fecha.split('-')[0];
          if (y && y.length === 4) yearsSet.add(y);
        }
      });
      const yearsArr = Array.from(yearsSet).sort((a,b) => b.localeCompare(a));

      const filtered = avisomapYearFilter === 'Todos' 
        ? avisomapAvisosRaw 
        : avisomapAvisosRaw.filter(a => a.fecha && a.fecha.startsWith(avisomapYearFilter));

      const total = filtered.length;
      const pStats = {};
      const lStats = {};

      filtered.forEach(aviso => {
        let plagas = [];
        if (Array.isArray(aviso.plagas)) plagas = aviso.plagas;
        else if (typeof aviso.plagas === 'string') plagas = aviso.plagas.split(',').map(s => s.trim()).filter(Boolean);

        plagas.forEach(p => {
          let cleanP = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          
          // Unificar variantes de roedores
          const lowerP = cleanP.toLowerCase();
          if (lowerP.includes('rata') || lowerP.includes('raton') || lowerP.includes('ratón') || lowerP.includes('roedor')) {
            cleanP = 'Roedores';
          }

          if (!pStats[cleanP]) pStats[cleanP] = 0;
          pStats[cleanP]++;
        });
        
        const loc = aviso.localidad || 'Desconocida';
        if (!lStats[loc]) lStats[loc] = 0;
        lStats[loc]++;
      });

      const colors = ['#f43f5e', '#3b82f6', '#eab308', '#10b981', '#8b5cf6', '#0ea5e9'];
      
      const plagasArr = Object.keys(pStats).map((name, i) => ({
        name,
        count: pStats[name],
        percentage: total > 0 ? Math.round((pStats[name] / total) * 100) : 0,
        color: colors[i % colors.length]
      })).sort((a, b) => b.count - a.count);

      const localidadesArr = Object.keys(lStats).map((name, i) => ({
        name,
        count: lStats[name],
        percentage: total > 0 ? Math.round((lStats[name] / total) * 100) : 0,
        color: colors[(i+2) % colors.length]
      })).sort((a, b) => b.count - a.count);

      setAvisomapStats({ total, plagas: plagasArr, localidades: localidadesArr, availableYears: yearsArr });
    }
  }, [avisomapAvisosRaw, avisomapYearFilter]);

  React.useEffect(() => {
    if (jornadas.length > 0 && workappFiltro.desde && workappFiltro.hasta) {
      calculateWorkappStats();
    }
  }, [jornadas, workappFiltro]);

  const calculateWorkappStats = () => {
    if (!workappFiltro.desde || !workappFiltro.hasta) return;
    
    const [dY, dM, dD] = workappFiltro.desde.split('-');
    const dateDesde = new Date(parseInt(dY), parseInt(dM) - 1, parseInt(dD));
    const [hY, hM, hD] = workappFiltro.hasta.split('-');
    const dateHasta = new Date(parseInt(hY), parseInt(hM) - 1, parseInt(hD));

    let totalHoras = 0;
    let totalExtras = 0;
    let diasList = [];

    const monthsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      monthsMap[`${d.getFullYear()}-${d.getMonth()}`] = { label: mLabel, value: 0 };
    }

    const parseJornadaDate = (fecha) => {
      if (!fecha) return null;
      if (fecha.includes('-')) {
        const [y, m, d] = fecha.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      } else if (fecha.includes('/')) {
        const [d, m, y] = fecha.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      return null;
    };

    const parseTimeStr = (t) => {
      if (!t) return 0;
      if (!t.includes(':')) return parseFloat(t) || 0;
      const parts = t.split(':');
      let h = parseInt(parts[0], 10) || 0;
      let m = parseInt(parts[1], 10) || 0;
      return h + (m / 60);
    };

    const jornadasEnRango = jornadas.filter(j => {
      const jDate = parseJornadaDate(j.fecha);
      if (!jDate) return false;
      
      const mKey = `${jDate.getFullYear()}-${jDate.getMonth()}`;
      if (monthsMap[mKey] !== undefined) {
        const ext = parseTimeStr(j.horas_extras);
        monthsMap[mKey].value += ext;
      }

      return jDate >= dateDesde && jDate <= dateHasta;
    }).sort((a, b) => {
      const aDate = parseJornadaDate(a.fecha);
      const bDate = parseJornadaDate(b.fecha);
      return aDate - bDate; 
    });

    jornadasEnRango.forEach(j => {
      const jDate = parseJornadaDate(j.fecha);
      if (!jDate) return;
      const jd = String(jDate.getDate()).padStart(2, '0');
      const jm = String(jDate.getMonth() + 1).padStart(2, '0');
      
      const horasNum = parseTimeStr(j.horas_calculadas);
      const extrasNum = parseTimeStr(j.horas_extras);
      totalHoras += horasNum;
      totalExtras += extrasNum;
      if (extrasNum > 0) {
        diasList.push({ date: `${jd}/${jm}`, value: parseFloat(extrasNum.toFixed(2)) });
      }
    });

    setWorkappResultados({
      totalHoras: totalHoras.toFixed(1),
      totalExtras: totalExtras.toFixed(1),
      importe: (totalExtras * 11).toFixed(2),
      chartData: diasList,
      monthlyExtras: Object.values(monthsMap)
    });
  };

  const renderAquappStats = () => (
    <div className="stats-section animate-fade-in">
      
      <div className="stats-chart-card" style={{padding: '20px', marginBottom: '24px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0ea5e9'}}>
          <Filter size={18} />
          <h3 style={{margin: 0}}>FILTRO POR AÑO</h3>
        </div>
        <div style={{display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px'}}>
          <Calendar size={16} color="#64748b" style={{marginRight: '8px'}} />
          <select 
            value={aquappYearFilter} 
            onChange={(e) => setAquappYearFilter(e.target.value)}
            style={{border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#334155'}}
          >
            {aquappStats.availableYears?.length === 0 ? (
               <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
            ) : (
               aquappStats.availableYears?.map(y => (
                 <option key={y} value={y}>{y}</option>
               ))
            )}
          </select>
        </div>
      </div>

      {/* Actividad de Clientes */}
      <div className="stats-chart-card" style={{height: '350px'}}>
        <h3 style={{color: '#0ea5e9', textTransform: 'uppercase'}}><Droplet size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} /> Clientes Atendidos</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart
            data={aquappStats.muestrasChartData}
            margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
          >
            <XAxis dataKey="mes" tick={{fontSize: 12}} />
            <YAxis allowDecimals={false} />
            <RechartsTooltip 
              cursor={{fill: 'rgba(0,0,0,0.05)'}} 
              contentStyle={{backgroundColor: '#222', color: '#fff', borderRadius: '6px', border: 'none'}}
              itemStyle={{color: '#fff'}}
            />
            <Bar dataKey="Clientes" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tratamientos Realizados */}
      <div className="stats-chart-card" style={{height: '350px'}}>
        <h3 style={{color: '#0ea5e9', textTransform: 'uppercase'}}><FlaskConical size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} /> Tratamientos Realizados</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart
            data={aquappStats.tratamientosChartData}
            margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
          >
            <XAxis dataKey="mes" tick={{fontSize: 12}} />
            <YAxis allowDecimals={false} />
            <RechartsTooltip 
              cursor={{fill: 'rgba(0,0,0,0.05)'}} 
              contentStyle={{backgroundColor: '#222', color: '#fff', borderRadius: '6px', border: 'none'}}
            />
            <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px', fontSize: '0.85rem'}} />
            <Bar dataKey="Hipercloracion" stackId="a" fill="#a855f7" />
            <Bar dataKey="Choque" stackId="a" fill="#f43f5e" />
            <Bar dataKey="LimpTorres" stackId="a" fill="#3b82f6" />
            <Bar dataKey="LimpDep" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen Tratamientos por Cliente (Tabla Dinámica) */}
      <div className="stats-chart-card" style={{overflowX: 'auto'}}>
        <h3 style={{color: '#0ea5e9', textTransform: 'uppercase'}}><Briefcase size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} /> Resumen por Cliente</h3>
        <div className="stats-legend" style={{marginBottom: '16px'}}>
          <span><div className="legend-dot" style={{background:'#a855f7'}}></div> Hipercloración</span>
          <span><div className="legend-dot" style={{background:'#f43f5e'}}></div> Choque</span>
          <span><div className="legend-dot" style={{background:'#3b82f6'}}></div> L. Torres</span>
          <span><div className="legend-dot" style={{background:'#10b981'}}></div> L. Depósitos</span>
          <span><div className="legend-dot" style={{background:'#fcd34d'}}></div> M. Estándar</span>
          <span><div className="legend-dot" style={{background:'#f97316'}}></div> M. Torre</span>
          <span><div className="legend-dot" style={{background:'#06b6d4'}}></div> M. Piscina/Jac.</span>
        </div>
        <div className="stats-table-responsive">
          <table className="stats-mini-table">
            <thead>
              <tr>
                <th style={{minWidth: '150px'}}>CLIENTE</th>
                {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].map(m => (
                  <th key={m} style={{minWidth: '40px', textAlign: 'center'}}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aquappStats.clientTableData?.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{textAlign: 'center', color: '#64748b'}}>No hay datos para el año {aquappYearFilter}</td>
                </tr>
              ) : (
                aquappStats.clientTableData?.map((client, idx) => (
                  <tr key={idx}>
                    <td style={{fontWeight: '600', color: '#334155'}}>{client.name}</td>
                    {client.months.map((events, mIdx) => (
                      <td key={mIdx} style={{textAlign: 'center'}}>
                        <div style={{display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap'}}>
                          {events.map((ev, eIdx) => {
                            let bg = '#cbd5e1';
                            if (ev.group === 'tratamiento') {
                              if (ev.type === 'Hipercloracion') bg = '#a855f7';
                              else if (ev.type === 'Choque') bg = '#f43f5e';
                              else if (ev.type === 'LimpTorres') bg = '#3b82f6';
                              else if (ev.type === 'LimpDep') bg = '#10b981';
                            } else {
                              if (ev.type === 'Estandar') bg = '#fcd34d';
                              else if (ev.type === 'Torre') bg = '#f97316';
                              else if (ev.type === 'Piscina' || ev.type === 'Jacuzzi') bg = '#06b6d4';
                            }
                            return <div 
                              key={eIdx} 
                              className="legend-dot-cell" 
                              style={{background: bg, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block'}}
                              onMouseEnter={(e) => setTableTooltip({ visible: true, x: e.clientX, y: e.clientY, text: `${ev.group === 'tratamiento' ? 'Tratamiento' : 'Muestra'}: ${ev.type}` })}
                              onMouseLeave={() => setTableTooltip(prev => ({ ...prev, visible: false }))}
                            ></div>;
                          })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAvisomapStats = () => (
    <div className="stats-section animate-fade-in">
      <div className="stats-chart-card" style={{padding: '20px', marginBottom: '24px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#10b981'}}>
          <Filter size={18} />
          <h3 style={{margin: 0}}>FILTRO POR AÑO</h3>
        </div>
        <div style={{display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px'}}>
          <Calendar size={16} color="#64748b" style={{marginRight: '8px'}} />
          <select 
            value={avisomapYearFilter} 
            onChange={(e) => setAvisomapYearFilter(e.target.value)}
            style={{border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#334155'}}
          >
            <option value="Todos">Histórico (Todos los años)</option>
            {avisomapStats.availableYears?.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-total-banner" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
        <Bug size={20} color="white"/>
        <span>{avisomapStats.total} avisos en {avisomapYearFilter === 'Todos' ? 'total' : avisomapYearFilter}</span>
      </div>

      <div className="stats-chart-card">
        <div className="stats-card-title-row">
          <Bug size={20} color="#22c55e" />
          <div>
            <h3>Tipo de Plaga</h3>
            <p className="stats-subtitle">Distribución por tipo</p>
          </div>
        </div>
        {avisomapStats.plagas.length === 0 ? (
          <p style={{textAlign: 'center', color: '#64748b'}}>No hay datos de plagas.</p>
        ) : (
          <div className="stats-bar-list">
            {avisomapStats.plagas.map(stat => (
              <div key={stat.name} className="stats-bar-item">
                <div className="stats-bar-info">
                  <span><Bug size={14} color="#64748b"/> {stat.name}</span>
                  <span className="stats-bar-numbers">{stat.count} avisos · <strong>{stat.percentage}%</strong></span>
                </div>
                <div className="stats-bar-bg">
                  <div className="stats-bar-fill" style={{width: `${stat.percentage}%`, backgroundColor: stat.color}}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="stats-chart-card">
        <div className="stats-card-title-row">
          <MapPin size={20} color="#22c55e" />
          <div>
            <h3>Por Localidad</h3>
            <p className="stats-subtitle">Distribución geográfica</p>
          </div>
        </div>
        {avisomapStats.localidades.length === 0 ? (
          <p style={{textAlign: 'center', color: '#64748b'}}>No hay datos de localidades.</p>
        ) : (
          <div className="stats-bar-list">
            {avisomapStats.localidades.map(stat => (
              <div key={stat.name} className="stats-bar-item">
                <div className="stats-bar-info">
                  <span>{stat.name}</span>
                  <span className="stats-bar-numbers">{stat.count} avisos · <strong>{stat.percentage}%</strong></span>
                </div>
                <div className="stats-bar-bg">
                  <div className="stats-bar-fill" style={{width: `${stat.percentage}%`, backgroundColor: stat.color}}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkappStats = () => (
    <div className="stats-section animate-fade-in">
      
      {/* Filtro de Fechas */}
      <div className="stats-chart-card" style={{padding: '20px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#6366f1'}}>
          <Filter size={18} />
          <h3 style={{margin: 0}}>FILTRO DE FECHAS</h3>
        </div>
        <div style={{display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap'}}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px'}}>Desde</label>
            <div style={{display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px'}}>
              <input type="date" value={workappFiltro.desde} onChange={e => setWorkappFiltro({...workappFiltro, desde: e.target.value})} style={{border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem'}} />
            </div>
          </div>
          <div style={{flex: '1 1 200px'}}>
            <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px'}}>Hasta</label>
            <div style={{display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px'}}>
              <input type="date" value={workappFiltro.hasta} onChange={e => setWorkappFiltro({...workappFiltro, hasta: e.target.value})} style={{border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem'}} />
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="stats-totals-row">
        <div className="stats-total-card">
          <span className="stats-total-value">{workappResultados.totalHoras}</span>
          <span className="stats-total-label">TOTAL HORAS</span>
        </div>
        <div className="stats-total-card">
          <span className="stats-total-value" style={{color: '#f43f5e'}}>{workappResultados.totalExtras}</span>
          <span className="stats-total-label">HORAS EXTRAS</span>
        </div>
        <div className="stats-total-card">
          <span className="stats-total-value" style={{color: '#10b981'}}>{workappResultados.importe}</span>
          <span className="stats-total-label">IMPORTE (11€/H)</span>
        </div>
      </div>

      {/* Extras últimos 6 meses */}
      <div className="stats-chart-card" style={{height: '350px'}}>
        <h3 style={{color: '#6366f1', textTransform: 'uppercase'}}><Calendar size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} /> Extras Últimos 6 Meses</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart
            data={workappResultados.monthlyExtras}
            margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
          >
            <XAxis dataKey="label" tick={{fontSize: 12}} />
            <YAxis />
            <RechartsTooltip 
              cursor={{fill: 'rgba(0,0,0,0.05)'}} 
              contentStyle={{backgroundColor: '#222', color: '#fff', borderRadius: '6px', border: 'none'}}
              itemStyle={{color: '#fff'}}
            />
            <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
            <Bar dataKey="value" name="Horas Extras" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

        {/* Horas extras por día */}
      <div className="stats-chart-card" style={{height: '350px'}}>
        <h3 style={{color: '#6366f1', textTransform: 'uppercase'}}><BarChart2 size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} /> Horas Extras por Día</h3>
        {workappResultados.chartData.length === 0 ? (
          <p style={{textAlign: 'center', color: '#64748b'}}>No hay horas extras en este rango.</p>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart
              data={workappResultados.chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis dataKey="date" type="category" width={60} tick={{fontSize: 12}} />
              <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend />
              <Bar dataKey="value" name="Horas Extras" fill="#fb7185" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Importe por día */}
      <div className="stats-chart-card" style={{height: '350px'}}>
        <h3 style={{color: '#6366f1', textTransform: 'uppercase'}}><span style={{fontWeight: 'bold', fontSize: '1.2rem', marginRight: '8px'}}>$</span> Importe (€) por Día</h3>
        {workappResultados.chartData.length === 0 ? (
          <p style={{textAlign: 'center', color: '#64748b'}}>Sin importe en este rango.</p>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart
              data={workappResultados.chartData.map(d => ({...d, importe: d.value * 11}))}
              margin={{ top: 20, right: 10, left: -20, bottom: 40 }}
            >
              <XAxis dataKey="date" tick={{fontSize: 12, angle: -45, textAnchor: 'end'}} interval={0} />
              <YAxis />
              <RechartsTooltip 
                cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                contentStyle={{backgroundColor: '#222', color: '#fff', borderRadius: '6px', border: 'none'}}
                itemStyle={{color: '#fff'}}
              />
              <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
              <Bar dataKey="importe" name="Importe (€)" fill="#34d399" radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <div className="estadisticas-container animate-fade-in">
      <div className="estadisticas-header">
        <BarChart2 size={28} color="#6366f1"/>
        <h1>Gráficos y Estadísticas</h1>
      </div>

      {/* Section Tabs */}
      <div className="estadisticas-tabs">
        {sections.map(sec => {
          const Icon = sec.icon;
          return (
            <button 
              key={sec.id}
              className={`est-tab ${activeSection === sec.id ? 'active' : ''}`}
              style={activeSection === sec.id ? {borderColor: sec.color, color: sec.color} : {}}
              onClick={() => setActiveSection(sec.id)}
            >
              <Icon size={18}/>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="estadisticas-content">
        {activeSection === 'aquapp' && renderAquappStats()}
        {activeSection === 'avisomap' && renderAvisomapStats()}
        {activeSection === 'workapp' && renderWorkappStats()}
      </div>

      {tableTooltip.visible && createPortal(
        <div style={{
          position: 'fixed',
          top: tableTooltip.y - 40,
          left: tableTooltip.x + 15,
          background: '#222',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          whiteSpace: 'nowrap'
        }}>
          {tableTooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Estadisticas;

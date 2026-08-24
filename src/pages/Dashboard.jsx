import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Droplet, MapPin, Briefcase, BookOpen, CalendarCheck, ChevronRight, BarChart2, Calendar, Settings, Search, User, X, ChevronLeft, FlaskConical, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
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

  const fetchMonthStats = useCallback(async (year, month) => {
    setLoadingStats(true);
    try {
      const [tratRes, muestrasRes, avisosRes, jornadasRes, tareasRes] = await Promise.all([
        supabase.from('aquapp_tratamientos').select('fecha'),
        supabase.from('aquapp_muestras').select('fecha'),
        supabase.from('avisomap_avisos').select('fecha'),
        supabase.from('workapp_jornadas').select('fecha, horas_calculadas, horas_extras'),
        supabase.from('tareas_programadas').select('tareas_json'),
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

      let tareasTotal = 0;
      let tareasCompletadas = 0;
      (tareasRes.data || []).forEach(row => {
        let tasks = [];
        try { tasks = typeof row.tareas_json === 'string' ? JSON.parse(row.tareas_json) : (row.tareas_json || []); } catch {}
        tasks.forEach(t => {
          tareasTotal++;
          if (t.status === 'completed') tareasCompletadas++;
        });
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

  useEffect(() => {
    const searchClientes = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      const { data } = await supabase.from('clientes').select('id, name').ilike('name', `%${searchQuery}%`).limit(5);
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
          if (!conteoMap.has(year)) conteoMap.set(year, new Map());
          const yearMap = conteoMap.get(year);
          if (!yearMap.has(sortKey)) yearMap.set(sortKey, { label, count: 0, sortKey });
          yearMap.get(sortKey).count++;
        }
      });
      const yearsSorted = Array.from(conteoMap.keys()).sort((a, b) => b.localeCompare(a));
      resumenMuestras = yearsSorted.map(year => ({
        year,
        months: Array.from(conteoMap.get(year).values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      }));
    }
    setExpandedYears({});
    setClientDetails({ muestrasResumen: resumenMuestras, tratamientos: tratRes.data || [] });
    setLoadingDetails(false);
  };

  const accessCards = [
    { id: 'aquapp', title: 'Aquapp', description: 'Gestión integral de muestras, torres y tratamientos.', icon: <Droplet size={28} color="var(--accent-aquapp)" />, path: '/aquapp', bgColor: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', featured: true },
    { id: 'tareas', adminOnly: true, title: 'Tareas', description: 'Visitas mensuales.', icon: <CalendarCheck size={28} color="var(--accent-tareas)" />, path: '/tareas', bgColor: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', featured: true },
    { id: 'workapp', adminOnly: true, title: 'Workapp', description: 'Jornada laboral y descansos.', icon: <Briefcase size={28} color="var(--accent-workapp)" />, path: '/workapp', bgColor: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', featured: true },
    { id: 'avisomap', title: 'Avisomap', description: 'Registro de avisos de plagas.', icon: <MapPin size={24} color="var(--accent-avisomap)" />, path: '/avisomap', bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
    { id: 'catalogo', adminOnly: true, title: 'Catálogo', description: 'Fichas y productos.', icon: <BookOpen size={24} color="var(--accent-catalogo)" />, path: '/catalogo', bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
    { id: 'estadisticas', adminOnly: true, title: 'Estadísticas', description: 'Métricas globales.', icon: <BarChart2 size={24} color="var(--accent-estadisticas)" />, path: '/estadisticas', bgColor: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' },
    { id: 'calendario', title: 'Calendario', description: 'Agenda global.', icon: <Calendar size={24} color="var(--accent-calendario)" />, path: '/calendario', bgColor: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }
  ];

  const statCards = monthStats ? [
    { label: 'Tratamientos', value: monthStats.tratamientos, icon: <FlaskConical size={20} color="#0ea5e9" />, color: '#0ea5e9', bg: '#e0f2fe', path: '/aquapp' },
    { label: 'Muestras', value: monthStats.muestras, icon: <Droplet size={20} color="#10b981" />, color: '#10b981', bg: '#d1fae5', path: '/aquapp' },
    { label: 'Avisos', value: monthStats.avisos, icon: <MapPin size={20} color="#22c55e" />, color: '#22c55e', bg: '#dcfce7', path: '/avisomap' },
    { label: 'Jornadas', value: monthStats.jornadasDias, icon: <Briefcase size={20} color="#8b5cf6" />, color: '#8b5cf6', bg: '#ede9fe', path: '/workapp' },
    { label: 'Tareas', value: `${monthStats.tareasPct}%`, icon: <CalendarCheck size={20} color="#f43f5e" />, color: '#f43f5e', bg: '#ffe4e6', path: '/tareas' },
  ] : [];

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header" style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start'}}>
        <button
          onClick={() => navigate('/gestor')}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', color: 'var(--text-muted)', transition: 'all 0.2s' }}
          title="Gestor Global (Avanzado)"
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border-input)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="monthly-summary-card">
        <div className="monthly-selector">
          <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
          <span className="month-label">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
          <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
          {(selectedYear !== now.getFullYear() || selectedMonth !== now.getMonth()) && (
            <button className="month-today-btn" onClick={goToday}>Hoy</button>
          )}
        </div>

        <div className="monthly-stat-cards">
          {loadingStats ? (
            <div style={{padding: '24px', color: 'var(--text-muted)', textAlign: 'center', gridColumn: '1/-1'}}>Cargando...</div>
          ) : statCards.map(s => (
            <div
              key={s.label}
              className="monthly-stat-item"
              style={{'--stat-color': s.color, '--stat-bg': s.bg}}
              onClick={() => navigate(s.path)}
            >
              <div className="monthly-stat-icon">{s.icon}</div>
              <div className="monthly-stat-value">{s.value}</div>
              <div className="monthly-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {monthStats && (
          <div className="monthly-hours-bar">
            <div className="monthly-hours-item">
              <Clock size={15} color="var(--text-muted)" />
              <span className="monthly-hours-main">{monthStats.totalHoras}h</span>
              <span className="monthly-hours-label">trabajadas</span>
            </div>
            <div className="monthly-hours-divider" />
            <div className="monthly-hours-item monthly-hours-extras-group">
              <TrendingUp size={15} color="#f43f5e" />
              <span className="monthly-hours-extras">{monthStats.totalExtras}h</span>
              <span className="monthly-hours-label extras-label">extras</span>
            </div>
            <div className="monthly-hours-divider" />
            <div className="monthly-hours-item">
              <span className="euro-icon">€</span>
              <span className="monthly-hours-importe">{monthStats.importe}</span>
              <span className="monthly-hours-label">importe</span>
            </div>
          </div>
        )}
      </div>

      {/* Client search */}
    </div>
  );
};

export default Dashboard;

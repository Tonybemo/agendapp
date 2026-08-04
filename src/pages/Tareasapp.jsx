import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, Circle, Edit3, Trash2, Plus, Search, 
  Settings, MessageSquare, MoreVertical, LayoutGrid, Calendar as CalendarIcon,
  MinusCircle
} from 'lucide-react';
import { mockTareas, months } from '../data/mockTareas';
import { supabase } from '../lib/supabase';
import './Tareasapp.css';

// Removed static clientesGlobales, we fetch them from DB

// standard tasks are fetched dynamically

const getRealWeeksForMonth = (monthName, year = 2026) => {
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthIndex = monthNames.indexOf(monthName.toLowerCase());
  if (monthIndex === -1) return [];

  let currentDate = new Date(year, monthIndex, 1);
  const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  currentDate = new Date(currentDate.setDate(diffToMonday));

  const weeks = [];
  let weekNum = 1;

  while (true) {
    const startOfWeek = new Date(currentDate);
    const endOfWeek = new Date(currentDate);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Sunday
    
    const startStr = `${startOfWeek.getDate().toString().padStart(2, '0')}/${(startOfWeek.getMonth() + 1).toString().padStart(2, '0')}`;
    const endStr = `${endOfWeek.getDate().toString().padStart(2, '0')}/${(endOfWeek.getMonth() + 1).toString().padStart(2, '0')}`;
    
    weeks.push({
      id: Date.now() + weekNum.toString() + Math.random().toString().slice(2, 6),
      name: `Semana ${weekNum} (Del ${startStr} al ${endStr})`,
      status: 'pending',
      date: null
    });

    currentDate.setDate(currentDate.getDate() + 7);
    weekNum++;

    // Stop if the next Monday is strictly in the next month or later
    if (currentDate.getMonth() !== monthIndex && currentDate.getFullYear() >= year) {
       break;
    }
  }
  
  return weeks;
};

const Tareasapp = () => {
  const [tareas, setTareas] = useState([]);
  const [clientesGlobales, setClientesGlobales] = useState([]);
  const [defaultTasksList, setDefaultTasksList] = useState([]);
  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [currentMonth, setCurrentMonth] = useState(mesesNombres[new Date().getMonth()]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState('Todos'); // 'Todos' | 'Pendientes' | 'Completos'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ id: '', name: '', frecuencia: 'mensual', month: 'Julio' });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(false);

  React.useEffect(() => {
    fetchData();
  }, [currentYear]);

  const fetchData = async () => {
    setLoading(true);
    // Cargar clientes (ordenados alfabéticamente)
    const { data: clientesData } = await supabase.from('clientes').select('*').order('name', { ascending: true });
    if (clientesData) setClientesGlobales(clientesData);

    const { data: estandarData } = await supabase.from('tareas_estandar').select('name');
    if (estandarData) setDefaultTasksList(estandarData.map(t => t.name));

    // Cargar tareas programadas filtradas por año
    const { data: tareasData } = await supabase.from('tareas_programadas').select('*, clientes(name)').eq('año', currentYear);
    if (tareasData) {
      const mapped = tareasData.map(t => ({
        id: t.id,
        clientId: t.cliente_id,
        clientName: t.clientes?.name || 'Cliente Borrado',
        month: t.mes,
        año: t.año,
        frecuencia: t.frecuencia,
        tasks: t.tareas_json,
        notas: t.notas || ''
      }));
      setTareas(mapped);
    }
    setLoading(false);
  };

  const toggleModalTask = (taskName) => {
    setSelectedTasks(prev => 
      prev.includes(taskName) ? prev.filter(t => t !== taskName) : [...prev, taskName]
    );
  };

  // Update default month when currentMonth changes if modal is closed
  React.useEffect(() => {
    if (!isModalOpen) setNewClientData(prev => ({ ...prev, month: currentMonth }));
  }, [currentMonth, isModalOpen]);

  const handleSavePlanning = async () => {
    if (!newClientData.id) {
      alert('Selecciona un cliente válido');
      return;
    }
    
    // Función helper para generar tareas según frecuencia y mes
    const generateTasksForMonth = (frecuencia, monthName) => {
      if (frecuencia === 'semanal') {
        return getRealWeeksForMonth(monthName, 2026);
      } else {
        // Mensual o puntual usa las tareas seleccionadas en los checkboxes
        return selectedTasks.map((tName, i) => ({
          id: Date.now() + 't' + i + Math.random().toString().slice(2, 6),
          name: tName,
          status: 'pending',
          date: null
        }));
      }
    };

    let toInsert = [];

    if (newClientData.frecuencia === 'puntual') {
      toInsert.push({
        cliente_id: newClientData.id,
        mes: newClientData.month,
        año: currentYear,
        frecuencia: 'puntual',
        tareas_json: generateTasksForMonth('puntual', newClientData.month)
      });
    } else {
      toInsert = months.map(m => ({
        cliente_id: newClientData.id,
        mes: m.id,
        año: currentYear,
        frecuencia: newClientData.frecuencia,
        tareas_json: generateTasksForMonth(newClientData.frecuencia, m.id)
      }));
    }

    const { error } = await supabase.from('tareas_programadas').insert(toInsert);
    if (!error) {
      fetchData();
      setIsModalOpen(false);
      setNewClientData({ id: '', name: '', frecuencia: 'mensual', month: currentMonth });
      setSelectedTasks([]);
    } else {
      alert("Error guardando en Supabase: " + error.message);
    }
  };

  const updateTaskInSupabase = async (tareaId, newTasksArray) => {
    await supabase.from('tareas_programadas').update({ tareas_json: newTasksArray }).eq('id', tareaId);
    // fetchData() removed to prevent UI flicker and delay. State is already updated optimistically.
  };

  const toggleTask = (tareaId, taskId) => {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return;
    const newTasks = tarea.tasks.map(t => {
      if (t.id === taskId) {
        if (t.status === 'pending') return { ...t, status: 'completed', date: 'Hoy' };
        if (t.status === 'completed') return { ...t, status: 'skipped', date: null };
        return { ...t, status: 'pending', date: null };
      }
      return t;
    });
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, tasks: newTasks } : t)); // optimista
    updateTaskInSupabase(tareaId, newTasks);
  };

  const addTask = (tareaId, taskName) => {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return;
    const newTasks = [...tarea.tasks, { id: Date.now().toString(), name: taskName, status: 'pending', date: null }];
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, tasks: newTasks } : t));
    updateTaskInSupabase(tareaId, newTasks);
  };

  const deleteTask = (tareaId, taskId) => {
    if (window.confirm('¿Seguro que quieres eliminar esta tarea?')) {
      const tarea = tareas.find(t => t.id === tareaId);
      if (!tarea) return;
      const newTasks = tarea.tasks.filter(t => t.id !== taskId);
      setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, tasks: newTasks } : t));
      updateTaskInSupabase(tareaId, newTasks);
    }
  };

  const deleteCard = async (tareaId) => {
    if (window.confirm('¿Seguro que quieres eliminar toda la ficha de este cliente para este mes?')) {
      const { error } = await supabase.from('tareas_programadas').delete().eq('id', tareaId);
      if (!error) fetchData();
    }
  };

  const changeTaskDate = (tareaId, taskId, rawDate) => {
    if (!rawDate) return;
    const parts = rawDate.split('-');
    const newDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return;
    const newTasks = tarea.tasks.map(t => t.id === taskId ? { ...t, date: newDate } : t);
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, tasks: newTasks } : t));
    updateTaskInSupabase(tareaId, newTasks);
  };

  const addNote = async (tareaId) => {
    const tarea = tareas.find(t => t.id === tareaId);
    const newNote = window.prompt('Añade una nota para este cliente:', tarea.notas || '');
    if (newNote !== null) {
      setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, notas: newNote } : t));
      await supabase.from('tareas_programadas').update({ notas: newNote }).eq('id', tareaId);
    }
  };

  const getProgressInfo = (tarea) => {
    const total = tarea.tasks.length;
    const completedOrSkipped = tarea.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
    const completed = tarea.tasks.filter(t => t.status === 'completed').length;
    const percentage = total === 0 ? 0 : Math.round((completedOrSkipped / total) * 100);
    return { total, completed, completedOrSkipped, percentage };
  };

  const tareasDelMes = tareas.filter(t => t.month === currentMonth);
  
  // Stats calculations based ONLY on current month
  const totalActuaciones = tareasDelMes.reduce((acc, t) => acc + t.tasks.length, 0);
  const totalClientes = tareasDelMes.length;
  
  const completadosCount = tareasDelMes.filter(t => getProgressInfo(t).percentage === 100).length;
  const pendientesCount = totalClientes - completadosCount;
  const globalProgress = totalClientes === 0 ? 0 : Math.round((completadosCount / totalClientes) * 100);

  // Apply visual filter and search
  const currentTareas = tareasDelMes.filter(t => {
    // 1. Search filter
    if (searchQuery && !t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) && !t.tasks.some(task => task.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    
    // 2. Status filter
    if (filter === 'Todos') return true;
    const isCompleted = getProgressInfo(t).percentage === 100;
    if (filter === 'Completos') return isCompleted;
    if (filter === 'Pendientes') return !isCompleted;
    return true;
  });

  return (
    <div className="taskflow-container animate-fade-in">
      {/* Secondary Sidebar for Months */}
      <aside className="taskflow-sidebar">
        <p className="sidebar-subtitle">PLANIFICACIÓN MENSUAL</p>
        
        <div className="year-selector" style={{position: 'relative', padding: 0}}>
          <select 
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            style={{width: '100%', appearance: 'none', background: 'transparent', border: 'none', padding: '12px', fontSize: '1rem', fontWeight: '700', color: '#0f172a', outline: 'none', cursor: 'pointer'}}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <div style={{position: 'absolute', right: '12px', top: '14px', pointerEvents: 'none', color: '#64748b'}}>
            <ChevronDownIcon />
          </div>
        </div>

        <div className="months-list">
          <p className="section-label">MESES</p>
          {months.map(m => {
            const tareasDelMesIter = tareas.filter(t => t.month === m.id);
            const totalC = tareasDelMesIter.length;
            const completadosC = tareasDelMesIter.filter(t => getProgressInfo(t).percentage === 100).length;
            const progressStr = totalC === 0 ? '0%' : Math.round((completadosC / totalC) * 100) + '%';
            
            return (
              <div 
                key={m.id} 
                className={`month-item ${currentMonth === m.id ? 'active' : ''}`}
                onClick={() => setCurrentMonth(m.id)}
              >
                <span>{m.label}</span>
                <span className="month-badge">{progressStr}</span>
              </div>
            );
          })}
        </div>

        <button 
          className="btn-nueva-planificacion" 
          onClick={() => setIsModalOpen(true)}
          style={{background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)', marginTop: '20px', width: '100%'}}
        >
          <Plus size={20} /> Añadir Planificación
        </button>

      </aside>

      {/* Main Content Area */}
      <main className="taskflow-main">
        {/* Top Header */}
        <header className="taskflow-header">
          <div className="header-left">
            <h1>{currentMonth} {currentYear}</h1>
            <p className="subtitle-stats">
              Actualmente tienes <strong>{totalActuaciones} actuaciones</strong> pendientes desglosadas entre <strong>{totalClientes} clientes</strong>
            </p>
          </div>
          
          <div className="header-right" style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
            <div className="global-progress">
              <div className="progress-texts">
                <span className="prog-label">Progreso Mensual</span>
                <span className="prog-value-green">{globalProgress}% Clientes</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{width: `${globalProgress}%`}}></div>
              </div>
              <p className="prog-subtext">{completadosCount} de {totalClientes} completados al 100%</p>
            </div>
            <div className="big-percentage">{globalProgress}%</div>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="taskflow-filters">
          <div className="search-bar">
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Buscar cliente o actuación..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <button 
              className={`pill-btn ${filter === 'Todos' ? 'active' : ''}`}
              onClick={() => setFilter('Todos')}
            >
              Todos ({totalClientes})
            </button>
            <button 
              className={`pill-btn ${filter === 'Pendientes' ? 'active' : ''}`}
              onClick={() => setFilter('Pendientes')}
            >
              Pendientes ({pendientesCount})
            </button>
            <button 
              className={`pill-btn ${filter === 'Completos' ? 'active' : ''}`}
              onClick={() => setFilter('Completos')}
            >
              Completos ({completadosCount})
            </button>
          </div>
        </div>

        {/* Grid of Cards */}
        <div className="taskflow-grid">
          {currentTareas.map(tarea => {
            const { total, completed, completedOrSkipped, percentage } = getProgressInfo(tarea);
            const isFullyCompleted = total > 0 && percentage === 100;
            
            let cardColorClass = '';
            if (isFullyCompleted) {
              cardColorClass = 'completed-card';
            } else if (tarea.frecuencia === 'semanal') {
              cardColorClass = 'weekly-card'; // Yellow
            } else {
              cardColorClass = 'monthly-card'; // Red/Normal
            }

            return (
              <div key={tarea.id} className={`tf-card ${cardColorClass}`}>
                <div className="tf-card-header">
                  <div className="tf-card-title">
                    <h3>{tarea.clientName} {isFullyCompleted && <CheckCircle2 size={16} color="#22c55e" className="inline-check"/>}</h3>
                    <p className={isFullyCompleted ? 'text-green' : 'text-purple'}>
                      {completed} de {total} completadas ({percentage}%)
                    </p>
                  </div>
                  <div className="tf-card-actions">
                    <MessageSquare size={16} color={tarea.notas ? "#10b981" : "#cbd5e1"} style={{cursor: 'pointer'}} onClick={() => addNote(tarea.id)}/>
                    <MoreVertical size={16} color="#cbd5e1" style={{cursor: 'pointer'}} onClick={() => deleteCard(tarea.id)}/>
                  </div>
                </div>

                <div className="tf-tasks">
                  {tarea.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`tf-task-row ${task.status === 'completed' ? 'completed' : task.status === 'skipped' ? 'skipped' : ''}`}
                    >
                      <div className="tf-task-left" onClick={() => toggleTask(tarea.id, task.id)}>
                        {task.status === 'completed' ? (
                          <CheckCircle2 size={20} color="#22c55e" className="check-icon" />
                        ) : task.status === 'skipped' ? (
                          <MinusCircle size={20} color="#94a3b8" className="check-icon" />
                        ) : (
                          <div className="empty-circle"></div>
                        )}
                        <span className="tf-task-name">{task.name}</span>
                        {task.date && (
                          <input 
                            type="date" 
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#4f46e5',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              outline: 'none',
                              fontFamily: 'inherit',
                              marginLeft: '8px'
                            }}
                            value={(() => {
                              if (task.date === 'Hoy') return new Date().toISOString().split('T')[0];
                              const parts = task.date.split('/');
                              if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                              return '';
                            })()}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => changeTaskDate(tarea.id, task.id, e.target.value)} 
                          />
                        )}
                      </div>
                      <div className="tf-task-right">
                        <Trash2 size={14} className="action-icon" style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); deleteTask(tarea.id, task.id); }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="btn-add-actuacion" style={{position: 'relative', padding: 0}}>
                  <select 
                    style={{width: '100%', appearance: 'none', background: 'transparent', border: 'none', padding: '12px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', outline: 'none', cursor: 'pointer', textAlign: 'center'}}
                    onChange={(e) => {
                      if (e.target.value) {
                        addTask(tarea.id, e.target.value);
                        e.target.value = ""; // Reset
                      }
                    }}
                  >
                    <option value="">+ Añadir actuación desglosada</option>
                    <option value="Recogida Muestras">Recogida Muestras</option>
                    <option value="Mantenimiento Torres">Mantenimiento Torres</option>
                    <option value="Revisión Portacebos">Revisión Portacebos</option>
                    <option value="Revisión Insectocutores">Revisión Insectocutores</option>
                    <option value="Auditoría Sanitaria">Auditoría Sanitaria</option>
                    <option value="Limpieza Depósitos">Limpieza Depósitos</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal Nueva Planificación */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div className="modal-content animate-fade-in" style={{background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.8)', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}}>
            <h2 style={{color: '#0f172a', marginBottom: '20px', fontSize: '1.3rem', fontWeight: '800'}}>Nueva Planificación</h2>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

              {/* 1. CLIENTE */}
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#475569'}}>NOMBRE DEL CLIENTE</label>
                <select 
                  value={newClientData.id}
                  onChange={(e) => {
                    const client = clientesGlobales.find(c => c.id === e.target.value);
                    setNewClientData({...newClientData, id: e.target.value, name: client ? client.name : ''});
                  }}
                  style={{width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', background: 'white'}}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientesGlobales.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* 2. TAREAS (collapsible) */}
              {newClientData.frecuencia !== 'semanal' && (
                <div>
                  <button
                    type="button"
                    onClick={() => setTasksOpen(o => !o)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: tasksOpen ? '12px 12px 0 0' : '12px',
                      border: '1px solid #cbd5e1', background: tasksOpen ? '#f1f5f9' : 'white',
                      cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', color: '#475569'
                    }}
                  >
                    <span>TAREAS A REALIZAR {selectedTasks.length > 0 && <span style={{background:'#e11d48', color:'white', borderRadius:'999px', padding:'1px 8px', fontSize:'0.75rem', marginLeft:'6px'}}>{selectedTasks.length}</span>}</span>
                    <span style={{transition: 'transform 0.2s', display:'inline-block', transform: tasksOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}><ChevronDownIcon /></span>
                  </button>
                  {tasksOpen && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '0 0 12px 12px', border: '1px solid #cbd5e1', borderTop: 'none'}}>
                      {defaultTasksList.map((tName) => (
                        <label key={tName} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155'}}>
                          <input 
                            type="checkbox" 
                            checked={selectedTasks.includes(tName)}
                            onChange={() => toggleModalTask(tName)}
                            style={{width: '18px', height: '18px', accentColor: '#e11d48'}}
                          /> {tName}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. FRECUENCIA */}
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#475569'}}>FRECUENCIA DE VISITA</label>
                <select 
                  value={newClientData.frecuencia}
                  onChange={(e) => setNewClientData({...newClientData, frecuencia: e.target.value})}
                  style={{width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', background: 'white'}}
                >
                  <option value="mensual">Mensual Fijo (Se añade a todos los meses)</option>
                  <option value="semanal">Semanal (Se divide en 4 semanas automáticamente)</option>
                  <option value="puntual">Puntual (Añadir solo a un mes específico)</option>
                </select>
              </div>

              {/* 4. MES ESPECÍFICO (solo si puntual) */}
              {newClientData.frecuencia === 'puntual' && (
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#475569'}}>MES ESPECÍFICO</label>
                  <select 
                    value={newClientData.month}
                    onChange={(e) => setNewClientData({...newClientData, month: e.target.value})}
                    style={{width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', background: 'white'}}
                  >
                    {months.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              )}

            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px'}}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: '700', cursor: 'pointer'}}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSavePlanning}
                style={{padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)'}}
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default Tareasapp;

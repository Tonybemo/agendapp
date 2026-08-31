import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, Circle, Edit3, Trash2, Plus, Search, 
  Settings, MessageSquare, MoreVertical, LayoutGrid, Calendar as CalendarIcon,
  MinusCircle, X
} from 'lucide-react';
import { mockTareas, months } from '../data/mockTareas';
import { supabase } from '../lib/supabase';
import './Tareasapp.css';

// Mini Calendar Component for filtering tasks by completed day
const MiniCalendar = ({ currentMonth, currentYear, completedTasksByDay, selectedDayFilter, onSelectDay }) => {
  const monthNamesList = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthIdx = monthNamesList.indexOf(currentMonth);
  const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
  
  let firstDayIndex = new Date(currentYear, monthIdx, 1).getDay(); // 0 is Sun, 1 is Mon...
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0=Mon, 6=Sun

  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="mini-cal-widget">
      <div className="mini-cal-header">
        <span>{currentMonth.toLowerCase()} {currentYear}</span>
        {selectedDayFilter && (
          <button 
            type="button"
            className="mini-cal-clear" 
            onClick={(e) => { e.stopPropagation(); onSelectDay(null); }} 
            title="Limpiar filtro de día"
          >
            ✕ Limpiar
          </button>
        )}
      </div>
      <div className="mini-cal-weekdays">
        <span>l</span><span>m</span><span>x</span><span>j</span><span>v</span><span>s</span><span>d</span>
      </div>
      <div className="mini-cal-grid">
        {blanks.map(b => (
          <div key={`b-${b}`} className="mini-cal-cell blank" />
        ))}
        {days.map(d => {
          const count = completedTasksByDay[d] || 0;
          const isSelected = selectedDayFilter === d;
          return (
            <button
              key={d}
              type="button"
              className={`mini-cal-cell day ${count > 0 ? 'has-tasks' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectDay(isSelected ? null : d)}
              title={count > 0 ? `${d} de ${currentMonth}: ${count} actuación(es)` : `${d} de ${currentMonth}`}
            >
              <span>{d}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

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
  const [selectedDayFilter, setSelectedDayFilter] = useState(null);
  const [showMobileCal, setShowMobileCal] = useState(false);

  // Reset day filter when month or year changes
  React.useEffect(() => {
    setSelectedDayFilter(null);
  }, [currentMonth, currentYear]);

  const availableTaskOptions = useMemo(() => {
    const set = new Set(defaultTasksList);
    tareas.forEach(t => {
      (t.tasks || []).forEach(item => {
        if (item.name && !item.name.startsWith('Semana ')) {
          set.add(item.name);
        }
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [defaultTasksList, tareas]);

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
      const mapped = tareasData.map(t => {
        let cName = t.clientes?.name || 'Cliente Borrado';
        let frec = t.frecuencia;
        if (frec && (frec.startsWith('puntual:') || frec.startsWith('mensual:') || frec.startsWith('semanal:'))) {
          const parts = frec.split(':');
          frec = parts[0];
          cName = parts.slice(1).join(':').trim();
        }
        return {
          id: t.id,
          clientId: t.cliente_id,
          clientName: cName,
          month: t.mes,
          año: t.año,
          frecuencia: frec,
          tasks: t.tareas_json,
          notas: t.notas || ''
        };
      });
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
      window.__toast?.success('Selecciona un cliente válido');
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
    const isCustom = newClientData.id === '_custom_';
    const cid = isCustom ? null : newClientData.id;

    if (newClientData.frecuencia === 'puntual') {
      toInsert.push({
        cliente_id: cid,
        mes: newClientData.month,
        año: currentYear,
        frecuencia: isCustom ? `puntual: ${newClientData.name}` : 'puntual',
        tareas_json: generateTasksForMonth('puntual', newClientData.month)
      });
    } else {
      toInsert = months.map(m => ({
        cliente_id: cid,
        mes: m.id,
        año: currentYear,
        frecuencia: isCustom ? `${newClientData.frecuencia}: ${newClientData.name}` : newClientData.frecuencia,
        tareas_json: generateTasksForMonth(newClientData.frecuencia, m.id)
      }));
    }

    const { data: insertedData, error } = await supabase.from('tareas_programadas').insert(toInsert).select();
    if (!error) {
      // === ESCENARIO B: Auto-completar si ya existen tratamientos ===
      try {
        const taskToTreatmentMap = {
          'hipercloracion': 'Hipercloracion', 'hipercloración': 'Hipercloracion',
          'choque termico': 'Choque', 'choque térmico': 'Choque',
          'limpieza torres': 'LimpTorres', 'limp. torres': 'LimpTorres',
          'limpieza depositos': 'LimpDep', 'limp. depositos': 'LimpDep', 'limpieza depósitos': 'LimpDep'
        };
        const clientName = newClientData.name;
        const now = new Date();
        const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Buscar tratamientos del cliente en este mes
        let treatQuery = supabase.from('aquapp_tratamientos').select('*');
        if (cid) {
          treatQuery = treatQuery.eq('cliente_id', cid);
        } else if (clientName) {
          treatQuery = treatQuery.ilike('cliente_nombre', clientName);
        }
        const { data: treatments } = await treatQuery;

        if (treatments && treatments.length > 0 && insertedData) {
          // Filtrar tratamientos del mes actual
          const mesActualIdx = now.getMonth();
          const añoActual = now.getFullYear();
          const treatThisMonth = treatments.filter(tr => {
            if (!tr.fecha) return false;
            let d;
            if (tr.fecha.includes('/')) {
              const parts = tr.fecha.split('/');
              d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
            } else {
              d = new Date(tr.fecha);
            }
            return d.getMonth() === mesActualIdx && d.getFullYear() === añoActual;
          });

          if (treatThisMonth.length > 0) {
            const treatTypes = treatThisMonth.map(t => t.tipo_tratamiento);
            
            for (const inserted of insertedData) {
              const mesInserted = inserted.mes;
              if (mesInserted !== mesesNombres[mesActualIdx]) continue;
              
              const tasks = inserted.tareas_json || [];
              let updated = false;
              const newTasks = tasks.map(task => {
                const taskLower = task.name.toLowerCase();
                for (const [keyword, treatType] of Object.entries(taskToTreatmentMap)) {
                  if (taskLower.includes(keyword) && treatTypes.includes(treatType) && task.status === 'pending') {
                    updated = true;
                    const treatDate = treatThisMonth.find(t => t.tipo_tratamiento === treatType);
                    let dateStr = null;
                    if (treatDate && treatDate.fecha) {
                      dateStr = treatDate.fecha.includes('-') 
                        ? treatDate.fecha.split('-').reverse().join('/') 
                        : treatDate.fecha;
                    }
                    return { ...task, status: 'completed', date: dateStr, auto: true };
                  }
                }
                return task;
              });
              if (updated) {
                await supabase.from('tareas_programadas').update({ tareas_json: newTasks }).eq('id', inserted.id);
              }
            }
          }
        }
      } catch (autoErr) {
        console.error('Error en auto-completar retroactivo:', autoErr);
      }

      // === ESCENARIO B (MUESTRAS): Auto-completar si ya existen muestras ===
      try {
        const clientName = newClientData.name;
        const now = new Date();
        const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const mesActualIdx = now.getMonth();
        const añoActual = now.getFullYear();

        // Buscar muestras del cliente
        let muestraQuery = supabase.from('aquapp_muestras').select('*');
        if (cid) {
          muestraQuery = muestraQuery.eq('cliente_id', cid);
        } else if (clientName) {
          muestraQuery = muestraQuery.ilike('cliente_nombre', clientName);
        }
        const { data: muestras } = await muestraQuery;

        if (muestras && muestras.length > 0 && insertedData) {
          const muestrasThisMonth = muestras.filter(m => {
            if (!m.fecha) return false;
            let d;
            if (m.fecha.includes('/')) {
              const parts = m.fecha.split('/');
              d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
            } else {
              d = new Date(m.fecha);
            }
            return d.getMonth() === mesActualIdx && d.getFullYear() === añoActual;
          });

          if (muestrasThisMonth.length > 0) {
            const lastMuestra = muestrasThisMonth[muestrasThisMonth.length - 1];
            let dateStr = lastMuestra.fecha;
            if (dateStr && dateStr.includes('-')) {
              dateStr = dateStr.split('-').reverse().join('/');
            }

            for (const inserted of insertedData) {
              if (inserted.mes !== mesesNombres[mesActualIdx]) continue;
              const tasks = inserted.tareas_json || [];
              let updated = false;
              const newTasks = tasks.map(task => {
                if (task.status === 'pending' && task.name.toLowerCase().includes('muestra')) {
                  updated = true;
                  return { ...task, status: 'completed', date: dateStr, auto: true };
                }
                return task;
              });
              if (updated) {
                await supabase.from('tareas_programadas').update({ tareas_json: newTasks }).eq('id', inserted.id);
              }
            }
          }
        }
      } catch (autoErr) {
        console.error('Error en auto-completar retroactivo muestras:', autoErr);
      }
      // === FIN AUTO-COMPLETAR ===

      fetchData();
      setIsModalOpen(false);
      setNewClientData({ id: '', name: '', frecuencia: 'mensual', month: currentMonth });
      setSelectedTasks([]);
    } else {
      window.__toast?.error("Error guardando en Supabase: " + error.message);
    }
  };

  const updateTaskInSupabase = async (tareaId, newTasksArray) => {
    await supabase.from('tareas_programadas').update({ tareas_json: newTasksArray }).eq('id', tareaId);
    // fetchData() removed to prevent UI flicker and delay. State is already updated optimistically.
  };

  const toggleTask = (tareaId, taskId) => {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return;

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTasks = tarea.tasks.map(t => {
      if (t.id === taskId) {
        if (t.status === 'pending') return { ...t, status: 'completed', date: todayStr };
        if (t.status === 'completed') return { ...t, status: 'skipped', date: null };
        return { ...t, status: 'pending', date: null };
      }
      return t;
    });
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, tasks: newTasks } : t));
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
  const monthIdx = mesesNombres.indexOf(currentMonth);

  // Map of completed tasks per day of the selected month
  const completedTasksByDay = useMemo(() => {
    const map = {};
    tareasDelMes.forEach(t => {
      (t.tasks || []).forEach(task => {
        if (task.status === 'completed' && task.date) {
          const cleanDate = task.date.replace(/-/g, '/');
          const parts = cleanDate.split('/');
          if (parts.length === 3) {
            const dayNum = parseInt(parts[0], 10);
            const mNum = parseInt(parts[1], 10) - 1;
            const yNum = parseInt(parts[2], 10);
            if (mNum === monthIdx && (!yNum || yNum === currentYear)) {
              map[dayNum] = (map[dayNum] || 0) + 1;
            }
          }
        }
      });
    });
    return map;
  }, [tareasDelMes, monthIdx, currentYear]);

  // Stats calculations based ONLY on current month
  const totalActuaciones = tareasDelMes.reduce((acc, t) => acc + t.tasks.length, 0);
  const actuacionesCompletadas = tareasDelMes.reduce((acc, t) => acc + getProgressInfo(t).completedOrSkipped, 0);
  const totalClientes = tareasDelMes.length;
  
  const completadosCount = actuacionesCompletadas;
  const pendientesCount = totalActuaciones - actuacionesCompletadas;
  const globalProgress = totalActuaciones === 0 ? 0 : Math.round((actuacionesCompletadas / totalActuaciones) * 100);

  // Apply visual filter, day filter, and search
  const currentTareas = tareasDelMes.filter(t => {
    // 1. Search filter
    if (searchQuery && !t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) && !t.tasks.some(task => task.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }

    // 2. Day filter (if a specific day is clicked in mini calendar)
    if (selectedDayFilter) {
      const hasTaskOnDay = t.tasks.some(task => {
        if (task.status !== 'completed' || !task.date) return false;
        const cleanDate = task.date.replace(/-/g, '/');
        const parts = cleanDate.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return d === selectedDayFilter && m === monthIdx && (!y || y === currentYear);
        }
        return false;
      });
      if (!hasTaskOnDay) return false;
    }
    
    // 3. Status filter
    if (filter === 'Todos') return true;
    const isCompleted = getProgressInfo(t).percentage === 100;
    if (filter === 'Completos') return isCompleted;
    if (filter === 'Pendientes') return !isCompleted;
    return true;
  });

  return (
    <div className="taskflow-container animate-fade-in">
      {/* Secondary Sidebar for Months & Mini Calendar */}
      <aside className="taskflow-sidebar">
        <p className="sidebar-subtitle">PLANIFICACIÓN MENSUAL</p>
        
        <div className="year-selector" style={{position: 'relative', padding: 0}}>
          <select 
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            style={{width: '100%', appearance: 'none', background: 'transparent', border: 'none', padding: '12px', fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', outline: 'none', cursor: 'pointer'}}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <div style={{position: 'absolute', right: '12px', top: '14px', pointerEvents: 'none', color: 'var(--text-muted)'}}>
            <ChevronDownIcon />
          </div>
        </div>

        <div className="months-list">
          <p className="section-label">MESES</p>
          {months.map(m => {
            const tareasDelMesIter = tareas.filter(t => t.month === m.id);
            const totalActuacionesMes = tareasDelMesIter.reduce((acc, t) => acc + t.tasks.length, 0);
            const actuacionesCompletadasMes = tareasDelMesIter.reduce((acc, t) => acc + getProgressInfo(t).completedOrSkipped, 0);
            const progressStr = totalActuacionesMes === 0 ? '0%' : Math.round((actuacionesCompletadasMes / totalActuacionesMes) * 100) + '%';
            
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

        {/* Desktop Mini Calendar Widget */}
        <div className="desktop-mini-cal-wrapper">
          <p className="section-label" style={{ marginTop: '16px' }}>CALENDARIO DEL MES</p>
          <MiniCalendar 
            currentMonth={currentMonth} 
            currentYear={currentYear} 
            completedTasksByDay={completedTasksByDay} 
            selectedDayFilter={selectedDayFilter} 
            onSelectDay={setSelectedDayFilter} 
          />
        </div>

        <button 
          className="btn-nueva-planificacion" 
          onClick={() => setIsModalOpen(true)}
          style={{background: 'var(--accent-workapp)', color: 'var(--text-on-primary)', border: 'none', padding: '12px 16px', borderRadius: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: 'var(--shadow-md)', marginTop: '16px', width: 'calc(100% - 40px)', margin: '16px 20px 0 20px'}}
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
                <span className="prog-value-green">{globalProgress}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{width: `${globalProgress}%`}}></div>
              </div>
              <p className="prog-subtext">{completadosCount} de {totalActuaciones} actuaciones completadas</p>
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

          <div className="filter-pills">
            <button 
              className={`pill-btn ${filter === 'Todos' && !selectedDayFilter ? 'active' : ''}`}
              onClick={() => { setFilter('Todos'); setSelectedDayFilter(null); }}
            >
              Todos ({totalActuaciones})
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

            {/* Mobile Mini Calendar Toggle Button */}
            <button 
              type="button"
              className={`pill-btn mobile-cal-btn ${selectedDayFilter || showMobileCal ? 'active' : ''}`}
              onClick={() => setShowMobileCal(!showMobileCal)}
            >
              <CalendarIcon size={14} style={{ marginRight: '6px' }} />
              {selectedDayFilter ? `Día ${selectedDayFilter}` : 'Calendario'}
              {Object.keys(completedTasksByDay).length > 0 && (
                <span className="cal-days-badge">{Object.keys(completedTasksByDay).length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Mini Calendar dropdown */}
        {showMobileCal && (
          <div className="mobile-mini-cal-container animate-fade-in">
            <MiniCalendar 
              currentMonth={currentMonth} 
              currentYear={currentYear} 
              completedTasksByDay={completedTasksByDay} 
              selectedDayFilter={selectedDayFilter} 
              onSelectDay={(day) => {
                setSelectedDayFilter(day);
                if (day !== null) setShowMobileCal(false);
              }} 
            />
          </div>
        )}

        {/* Day Filter Banner */}
        {selectedDayFilter && (
          <div className="day-filter-banner animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={18} color="var(--accent-tareas)" />
              <span>
                Mostrando actuaciones realizadas el <strong>{selectedDayFilter} de {currentMonth} {currentYear}</strong>
                {' '}(<strong>{completedTasksByDay[selectedDayFilter] || 0}</strong> {completedTasksByDay[selectedDayFilter] === 1 ? 'actuación' : 'actuaciones'})
              </span>
            </div>
            <button 
              type="button"
              className="btn-clear-day-filter" 
              onClick={() => setSelectedDayFilter(null)}
            >
              <X size={14} /> Ver todo el mes
            </button>
          </div>
        )}

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
                    <MessageSquare size={16} color={tarea.notas ? "var(--color-danger)" : "var(--text-faint)"} style={{cursor: 'pointer'}} onClick={() => addNote(tarea.id)}/>
                    <MoreVertical size={16} color="var(--text-faint)" style={{cursor: 'pointer'}} onClick={() => deleteCard(tarea.id)}/>
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
                          <CheckCircle2 size={18} color="#22c55e" className="check-icon" />
                        ) : task.status === 'skipped' ? (
                          <MinusCircle size={18} color="#94a3b8" className="check-icon" />
                        ) : (
                          <div className="empty-circle"></div>
                        )}
                        <span className="tf-task-name">{task.name}</span>
                      </div>
                      {task.date && (
                        <input 
                          type="date" 
                          className="tf-task-date-input"
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
                      <div className="tf-task-right">
                        <Trash2 size={14} className="action-icon" style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); deleteTask(tarea.id, task.id); }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="btn-add-actuacion" style={{position: 'relative', padding: 0}}>
                  <select 
                    style={{width: '100%', appearance: 'none', background: 'transparent', border: 'none', padding: '12px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', outline: 'none', cursor: 'pointer', textAlign: 'center'}}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        const customTask = window.prompt('Introduce el nombre de la nueva actuación:');
                        if (customTask && customTask.trim()) {
                          addTask(tarea.id, customTask.trim());
                        }
                        e.target.value = "";
                      } else if (e.target.value) {
                        addTask(tarea.id, e.target.value);
                        e.target.value = ""; // Reset
                      }
                    }}
                  >
                    <option value="">+ Añadir actuación desglosada</option>
                    {availableTaskOptions.map((tName) => (
                      <option key={tName} value={tName}>{tName}</option>
                    ))}
                    <option value="__custom__">✏️ Otra actuación personalizada...</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal Nueva Planificación */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div className="modal-content animate-fade-in" style={{background: 'var(--bg-card-glass)', border: '1px solid var(--border-light)', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)'}}>
            <h2 style={{color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.3rem', fontWeight: '800'}}>Nueva Planificación</h2>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

              {/* 1. CLIENTE */}
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)'}}>NOMBRE DEL CLIENTE</label>
                <select 
                  value={newClientData.id}
                  onChange={(e) => {
                    let val = e.target.value;
                    let cName = '';
                    if (val === '_custom_') {
                      const manual = window.prompt("Introduce el nombre del cliente puntual:");
                      if (manual && manual.trim()) {
                        val = '_custom_';
                        cName = manual.trim();
                      } else {
                        val = '';
                      }
                    } else if (val) {
                      const client = clientesGlobales.find(c => c.id === val);
                      cName = client ? client.name : '';
                    }
                    setNewClientData({...newClientData, id: val, name: cName});
                  }}
                  style={{width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-input)', outline: 'none', background: 'var(--bg-input)'}}
                >
                  <option value="">Seleccionar cliente...</option>
                  <option value="_custom_" style={{fontWeight: 'bold', color: 'var(--accent-estadisticas)'}}>+ Escribir cliente puntual...</option>
                  {clientesGlobales.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {newClientData.id === '_custom_' && (
                  <div style={{marginTop: '8px', padding: '8px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                    <span style={{fontWeight: 'bold'}}>Puntual:</span> {newClientData.name}
                  </div>
                )}
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
                      border: '1px solid var(--border-input)', background: tasksOpen ? 'var(--bg-main)' : 'var(--bg-card)',
                      cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-secondary)'
                    }}
                  >
                    <span>TAREAS A REALIZAR {selectedTasks.length > 0 && <span style={{background:'var(--accent-workapp)', color:'var(--text-on-primary)', borderRadius:'999px', padding:'1px 8px', fontSize:'0.75rem', marginLeft:'6px'}}>{selectedTasks.length}</span>}</span>
                    <span style={{transition: 'transform 0.2s', display:'inline-block', transform: tasksOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}><ChevronDownIcon /></span>
                  </button>
                  {tasksOpen && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-input)', borderRadius: '0 0 12px 12px', border: '1px solid var(--border-input)', borderTop: 'none'}}>
                      {defaultTasksList.map((tName) => (
                        <label key={tName} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
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
                <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)'}}>FRECUENCIA DE VISITA</label>
                <select 
                  value={newClientData.frecuencia}
                  onChange={(e) => setNewClientData({...newClientData, frecuencia: e.target.value})}
                  style={{width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-input)', outline: 'none', background: 'var(--bg-input)'}}
                >
                  <option value="mensual">Mensual Fijo (Se añade a todos los meses)</option>
                  <option value="semanal">Semanal (Se divide en 4 semanas automáticamente)</option>
                  <option value="puntual">Puntual (Añadir solo a un mes específico)</option>
                </select>
              </div>

              {/* 4. MES ESPECÍFICO (solo si puntual) */}
              {newClientData.frecuencia === 'puntual' && (
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)'}}>MES ESPECÍFICO</label>
                  <select 
                    value={newClientData.month}
                    onChange={(e) => setNewClientData({...newClientData, month: e.target.value})}
                    style={{width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-input)', outline: 'none', background: 'var(--bg-input)'}}
                  >
                    {months.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              )}

            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px'}}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer'}}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSavePlanning}
                style={{padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'var(--accent-workapp)', color: 'var(--text-on-primary)', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)'}}
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

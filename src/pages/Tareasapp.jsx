import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, Circle, Edit3, Trash2, Plus, Search, 
  Settings, MessageSquare, MoreVertical, LayoutGrid, Calendar as CalendarIcon,
  MinusCircle, X, FileDown, FileText, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState('mes'); // 'mes' | 'dia'
  const [exportDay, setExportDay] = useState(1);
  const [exportIncludePending, setExportIncludePending] = useState(false);
  const [activeView, setActiveView] = useState('clientes'); // 'clientes' | 'dias'

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

  const parseTaskDate = (dateStr) => {
    if (!dateStr) return null;
    let str = String(dateStr).trim();
    if (str.includes('T')) str = str.split('T')[0];
    str = str.replace(/-/g, '/');
    const parts = str.split('/');
    
    let d, m, y;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
      }
    } else {
      return null;
    }

    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    const dateObj = new Date(y, m, d);
    if (isNaN(dateObj.getTime())) return null;

    return {
      d,
      m,
      y,
      dateObj,
      formatted: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`
    };
  };

  const getDayOfWeekName = (dateObj) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dateObj.getDay()];
  };

  const handleExportPDF = () => {
    // 1. Gather all tasks in currentMonth
    const monthTasks = tareas.filter(t => t.month === currentMonth && (!t.año || Number(t.año) === currentYear));

    // 2. Build grouped data by day
    const dayGroups = new Map();
    const undatedTasks = [];
    const pendingClients = [];

    monthTasks.forEach(item => {
      const cName = item.clientName || 'Cliente';
      const notas = item.notas || '';

      const completedTasks = (item.tasks || []).filter(t => t.status === 'completed');
      const pendingTasks = (item.tasks || []).filter(t => t.status === 'pending');

      if (exportIncludePending && pendingTasks.length > 0) {
        pendingClients.push({
          clientName: cName,
          tasks: pendingTasks.map(t => t.name),
          notas: notas
        });
      }

      completedTasks.forEach(task => {
        const parsed = parseTaskDate(task.date);
        if (parsed) {
          if (exportMode === 'dia' && exportDay !== null && parsed.d !== Number(exportDay)) {
            return;
          }

          const sortKey = `${parsed.y}-${String(parsed.m + 1).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
          if (!dayGroups.has(sortKey)) {
            const dayName = getDayOfWeekName(parsed.dateObj);
            dayGroups.set(sortKey, {
              sortKey,
              dayNum: parsed.d,
              dateStr: parsed.formatted,
              dayName: dayName,
              clients: new Map()
            });
          }

          const dayEntry = dayGroups.get(sortKey);
          if (!dayEntry.clients.has(cName)) {
            dayEntry.clients.set(cName, {
              clientName: cName,
              tasks: [],
              notas: notas
            });
          }
          dayEntry.clients.get(cName).tasks.push(task.name);
        } else {
          if (exportMode === 'mes') {
            undatedTasks.push({
              clientName: cName,
              taskName: task.name,
              notas: notas
            });
          }
        }
      });
    });

    if (dayGroups.size === 0 && undatedTasks.length === 0 && (!exportIncludePending || pendingClients.length === 0)) {
      window.__toast?.warning(
        exportMode === 'dia' 
          ? `No hay tareas completadas registradas en el día ${exportDay} de ${currentMonth}.`
          : `No hay tareas completadas registradas con fecha en ${currentMonth} ${currentYear}.`
      );
      return;
    }

    // 3. Build jsPDF document
    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('AGENDAPP · REGISTRO DE TAREAS Y ACTUACIONES', 14, 13);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(224, 231, 255);
    const subTitleText = exportMode === 'dia' && exportDay !== null
      ? `Informe Diario de Actuaciones — Día ${exportDay} de ${currentMonth} ${currentYear}`
      : `Informe Mensual de Actuaciones — ${currentMonth} ${currentYear}`;
    doc.text(subTitleText, 14, 21);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 33, pageWidth - 28, 20, 2, 2, 'FD');

    const totalDaysWithWork = dayGroups.size;
    let totalTasksDone = 0;
    const uniqueClientsSet = new Set();
    dayGroups.forEach(d => {
      d.clients.forEach(c => {
        uniqueClientsSet.add(c.clientName);
        totalTasksDone += c.tasks.length;
      });
    });

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');

    const now = new Date();
    const dateEmitted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    doc.text(`Período: ${currentMonth} ${currentYear}`, 18, 41);
    doc.text(`Días con actividad: ${totalDaysWithWork}`, 75, 41);
    doc.text(`Clientes atendidos: ${uniqueClientsSet.size}`, 130, 41);

    doc.setFont('helvetica', 'normal');
    doc.text(`Actuaciones realizadas: ${totalTasksDone}`, 18, 48);
    doc.text(`Fecha de emisión: ${dateEmitted}`, 75, 48);

    // 4. Build Table Rows with Day Section Banners
    const sortedDayKeys = Array.from(dayGroups.keys()).sort();
    const tableData = [];

    sortedDayKeys.forEach(sortKey => {
      const dayEntry = dayGroups.get(sortKey);
      const clientEntries = Array.from(dayEntry.clients.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
      const totalActuacionesDia = clientEntries.reduce((acc, c) => acc + c.tasks.length, 0);

      // Section Banner Row for the Day
      tableData.push([
        {
          content: `📅 DÍA ${dayEntry.dayNum} · ${dayEntry.dayName.toUpperCase()}, ${dayEntry.dateStr}  (${clientEntries.length} ${clientEntries.length === 1 ? 'cliente' : 'clientes'} · ${totalActuacionesDia} ${totalActuacionesDia === 1 ? 'actuación' : 'actuaciones'})`,
          colSpan: 4,
          styles: {
            fillColor: [238, 242, 255],
            textColor: [67, 56, 202],
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: 4
          }
        }
      ]);

      clientEntries.forEach((c) => {
        const taskListFormatted = c.tasks.map(t => `• ${t}`).join('\n');
        tableData.push([
          dayEntry.dateStr,
          c.clientName,
          taskListFormatted,
          c.notas || '-'
        ]);
      });
    });

    if (undatedTasks.length > 0) {
      const undatedByClient = new Map();
      undatedTasks.forEach(u => {
        if (!undatedByClient.has(u.clientName)) undatedByClient.set(u.clientName, { tasks: [], notas: u.notas });
        undatedByClient.get(u.clientName).tasks.push(u.taskName);
      });

      undatedByClient.forEach((val, cName) => {
        tableData.push([
          'Sin fecha fija',
          cName,
          val.tasks.map(t => `• ${t}`).join('\n'),
          val.notas || '-'
        ]);
      });
    }

    autoTable(doc, {
      startY: 58,
      head: [['Fecha / Día', 'Cliente', 'Actuaciones Realizadas', 'Observaciones']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        valign: 'top',
        lineColor: [226, 232, 240],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold', halign: 'center', textColor: [30, 41, 59] },
        1: { cellWidth: 46, fontStyle: 'bold', textColor: [15, 23, 42] },
        2: { cellWidth: 'auto', textColor: [30, 41, 59] },
        3: { cellWidth: 42, textColor: [100, 116, 139], fontStyle: 'italic' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount} · Agendapp`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });

    // 5. Optional Pending Annex
    if (exportIncludePending && pendingClients.length > 0) {
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 60;
      
      if (finalY > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
      }

      const currentY = finalY > doc.internal.pageSize.getHeight() - 60 ? 20 : finalY;

      doc.setFontSize(11);
      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'bold');
      doc.text('Anexo: Actuaciones Pendientes del Mes', 14, currentY);

      const pendingTableData = pendingClients.map(c => [
        c.clientName,
        c.tasks.map(t => `⏳ ${t}`).join('\n'),
        c.notas || '-'
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Cliente', 'Tareas Pendientes', 'Observaciones']],
        body: pendingTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [239, 68, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          valign: 'top'
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 45, textColor: [100, 116, 139] }
        }
      });
    }

    const filename = exportMode === 'dia' && exportDay !== null
      ? `Tareas_Dia_${exportDay}_${currentMonth}_${currentYear}.pdf`
      : `Tareas_${currentMonth}_${currentYear}.pdf`;

    doc.save(filename);
    setIsExportModalOpen(false);
    window.__toast?.success(`PDF descargado: ${filename}`);
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

  // Chronological grouped data for "Vista por Días"
  const daysChronological = useMemo(() => {
    const map = new Map();
    tareasDelMes.forEach(t => {
      (t.tasks || []).forEach(task => {
        if (task.status === 'completed' && task.date) {
          const parsed = parseTaskDate(task.date);
          if (parsed && parsed.m === monthIdx && (!parsed.y || parsed.y === currentYear)) {
            const dayNum = parsed.d;
            if (!map.has(dayNum)) {
              map.set(dayNum, {
                dayNum,
                dateFormatted: parsed.formatted,
                dayOfWeek: getDayOfWeekName(parsed.dateObj),
                clients: new Map()
              });
            }
            const dayEntry = map.get(dayNum);
            if (!dayEntry.clients.has(t.clientName)) {
              dayEntry.clients.set(t.clientName, {
                tareaId: t.id,
                clientName: t.clientName,
                frecuencia: t.frecuencia,
                notas: t.notas,
                tasks: []
              });
            }
            dayEntry.clients.get(t.clientName).tasks.push(task);
          }
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => a.dayNum - b.dayNum)
      .map(d => ({
        ...d,
        clientsList: Array.from(d.clients.values())
      }));
  }, [tareasDelMes, monthIdx, currentYear]);

  const filteredDaysChronological = useMemo(() => {
    if (!searchQuery) return daysChronological;
    const q = searchQuery.toLowerCase();
    return daysChronological.filter(d => 
      d.clientsList.some(c => 
        c.clientName.toLowerCase().includes(q) || 
        c.tasks.some(t => t.name.toLowerCase().includes(q))
      )
    );
  }, [daysChronological, searchQuery]);

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
          <div className="view-toggles">
            <button 
              type="button"
              className={`toggle-btn ${activeView === 'clientes' ? 'active' : ''}`}
              onClick={() => setActiveView('clientes')}
              title="Vista de fichas por cliente"
            >
              <LayoutGrid size={14} /> Clientes
            </button>
            <button 
              type="button"
              className={`toggle-btn ${activeView === 'dias' ? 'active' : ''}`}
              onClick={() => setActiveView('dias')}
              title="Vista cronológica por días"
            >
              <CalendarIcon size={14} /> Por Días {daysChronological.length > 0 && <span style={{ background: activeView === 'dias' ? '#4f46e5' : '#e0e7ff', color: activeView === 'dias' ? '#fff' : '#4338ca', padding: '1px 6px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '800', marginLeft: '4px' }}>{daysChronological.length}</span>}
            </button>
          </div>

          <div className="search-bar">
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder={activeView === 'clientes' ? "Buscar cliente o actuación..." : "Buscar en días..."}
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

            {/* PDF Export Button */}
            <button 
              type="button"
              className="pill-btn btn-export-pdf-tareas"
              onClick={() => {
                if (selectedDayFilter) {
                  setExportMode('dia');
                  setExportDay(selectedDayFilter);
                } else {
                  setExportMode('mes');
                  const daysWithTasks = Object.keys(completedTasksByDay).map(Number).sort((a, b) => a - b);
                  setExportDay(daysWithTasks[0] || new Date().getDate());
                }
                setIsExportModalOpen(true);
              }}
              title="Exportar informe de actuaciones a PDF"
            >
              <FileDown size={14} style={{ marginRight: '6px' }} />
              Exportar PDF
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

        {/* Content Views: "Por Días" vs "Clientes" */}
        {activeView === 'dias' ? (
          <div className="taskflow-days-view">
            {filteredDaysChronological.length === 0 ? (
              <div className="dash-recurrent-empty animate-fade-in" style={{ margin: '32px' }}>
                <CalendarIcon size={44} color="var(--text-faint)" />
                <p style={{ margin: '8px 0 0', fontWeight: '700', color: 'var(--text-main)', fontSize: '1.05rem' }}>
                  {searchQuery 
                    ? `No se encontraron actuaciones para "${searchQuery}"`
                    : `Aún no hay actuaciones completadas en ${currentMonth} ${currentYear}`
                  }
                </p>
                <p style={{ margin: '4px 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {searchQuery 
                    ? 'Prueba a buscar otro cliente o actuación.'
                    : 'Ve a la pestaña Clientes y completa las tareas que vayas realizando.'
                  }
                </p>
                {!searchQuery && (
                  <button 
                    type="button" 
                    className="pill-btn active"
                    onClick={() => setActiveView('clientes')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <LayoutGrid size={15} /> Ver Fichas de Clientes
                  </button>
                )}
              </div>
            ) : (
              filteredDaysChronological.map(day => {
                const totalTasksDay = day.clientsList.reduce((acc, c) => acc + c.tasks.length, 0);
                return (
                  <div key={day.dayNum} className="tf-day-card animate-fade-in">
                    {/* Day Header */}
                    <div className="tf-day-header">
                      <div className="tf-day-title-wrap">
                        <div className="tf-day-badge">
                          <span className="tf-day-num">{day.dayNum}</span>
                          <span className="tf-day-month">{currentMonth.substring(0, 3)}</span>
                        </div>
                        <div>
                          <h3 className="tf-day-name">{day.dayOfWeek}, {day.dateFormatted}</h3>
                          <p className="tf-day-subtitle">
                            {day.clientsList.length} {day.clientsList.length === 1 ? 'cliente atendido' : 'clientes atendidos'} · <strong>{totalTasksDay}</strong> {totalTasksDay === 1 ? 'actuación realizada' : 'actuaciones realizadas'}
                          </p>
                        </div>
                      </div>

                      <button 
                        type="button"
                        className="tf-day-pdf-btn"
                        onClick={() => {
                          setExportMode('dia');
                          setExportDay(day.dayNum);
                          setIsExportModalOpen(true);
                        }}
                        title={`Exportar actuaciones del día ${day.dayNum} a PDF`}
                      >
                        <FileDown size={14} /> PDF Día {day.dayNum}
                      </button>
                    </div>

                    {/* Clients for this Day */}
                    <div className="tf-day-clients-grid">
                      {day.clientsList.map(c => (
                        <div key={c.clientName} className="tf-day-client-item">
                          <div className="tf-day-client-top">
                            <div className="tf-day-client-avatar">
                              {c.clientName.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 className="tf-day-client-title" title={c.clientName}>{c.clientName}</h4>
                              <span className="tf-day-client-count">{c.tasks.length} {c.tasks.length === 1 ? 'actuación' : 'actuaciones'}</span>
                            </div>
                            {c.notas && (
                              <div title={c.notas} style={{ cursor: 'help' }}>
                                <MessageSquare size={16} color="var(--color-danger)" />
                              </div>
                            )}
                          </div>

                          <div className="tf-day-tasks-list">
                            {c.tasks.map(task => (
                              <div key={task.id} className="tf-day-task-chip">
                                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                                <span>{task.name}</span>
                              </div>
                            ))}
                          </div>

                          {c.notas && (
                            <div className="tf-day-notes">
                              💬 {c.notas}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Grid of Cards (Vista Clientes) */
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
        )}
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

      {/* Modal Exportar PDF */}
      {isExportModalOpen && createPortal(
        <div 
          className="modal-overlay" 
          style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'}}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div 
            className="modal-content animate-fade-in" 
            style={{background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px', borderRadius: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)'}}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5'}}>
                  <FileDown size={22} />
                </div>
                <div>
                  <h2 style={{margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)'}}>
                    Exportar Informe PDF
                  </h2>
                  <p style={{margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                    {currentMonth} {currentYear} · Actuaciones por día
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'}}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scope Selection */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px'}}>
              <label style={{fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)'}}>
                SELECCIONA EL ALCANCE DEL INFORME
              </label>

              {/* Option 1: Mes completo */}
              <div 
                onClick={() => setExportMode('mes')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: exportMode === 'mes' ? '2px solid #4f46e5' : '1px solid var(--border)',
                  background: exportMode === 'mes' ? '#f5f3ff' : 'var(--bg-input)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  border: exportMode === 'mes' ? '6px solid #4f46e5' : '2px solid var(--border-input)',
                  background: '#fff',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{fontWeight: '700', fontSize: '0.92rem', color: exportMode === 'mes' ? '#4f46e5' : 'var(--text-main)'}}>
                    Mes Completo ({currentMonth} {currentYear})
                  </div>
                  <div style={{fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px'}}>
                    Desglose cronológico día a día con todos los clientes y tareas
                  </div>
                </div>
              </div>

              {/* Option 2: Día específico */}
              <div 
                onClick={() => setExportMode('dia')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: exportMode === 'dia' ? '2px solid #4f46e5' : '1px solid var(--border)',
                  background: exportMode === 'dia' ? '#f5f3ff' : 'var(--bg-input)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: exportMode === 'dia' ? '6px solid #4f46e5' : '2px solid var(--border-input)',
                    background: '#fff',
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{fontWeight: '700', fontSize: '0.92rem', color: exportMode === 'dia' ? '#4f46e5' : 'var(--text-main)'}}>
                      Día Específico
                    </div>
                    <div style={{fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px'}}>
                      Solo las actuaciones realizadas en una fecha concreta
                    </div>
                  </div>
                </div>

                {exportMode === 'dia' && (
                  <div style={{paddingLeft: '32px'}} onClick={e => e.stopPropagation()}>
                    <select
                      value={exportDay}
                      onChange={(e) => setExportDay(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #c7d2fe',
                        background: '#fff',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                        outline: 'none'
                      }}
                    >
                      {Array.from({ length: new Date(currentYear, monthIdx + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                        const count = completedTasksByDay[d] || 0;
                        return (
                          <option key={d} value={d}>
                            Día {d} de {currentMonth} {count > 0 ? `· (${count} actuaciones realizadas)` : '(Sin actuaciones)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Extra: Incluir pendientes */}
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 4px', fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: '600'}}>
                <input 
                  type="checkbox"
                  checked={exportIncludePending}
                  onChange={(e) => setExportIncludePending(e.target.checked)}
                  style={{width: '18px', height: '18px', accentColor: '#4f46e5'}}
                />
                Incluir anexo con clientes y tareas pendientes del mes
              </label>
            </div>

            {/* Actions */}
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-light)'}}>
              <button 
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleExportPDF}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                <FileDown size={17} /> Descargar PDF
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

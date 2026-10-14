import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, CalendarCheck, Search, PlusCircle, Edit3, Trash2, 
  MapPin, Phone, User, AlignLeft, CheckCircle2, Download, X,
  Navigation, Building2, CheckSquare, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { openMapsForClient } from '../utils/navigation';
import './GestorGlobal.css';

// Helper para extraer de forma segura personas de contacto y teléfonos (uno o varios)
const parseContact = (contactRaw) => {
  if (!contactRaw || contactRaw === 'null') return { contactos: [], persona: '', telefono: '' };
  const str = String(contactRaw).trim();
  if (!str) return { contactos: [], persona: '', telefono: '' };
  
  // 1. JSON Array o JSON Object
  if ((str.startsWith('[') && str.endsWith(']')) || (str.startsWith('{') && str.endsWith('}'))) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        const contactos = parsed
          .map(c => ({ persona: String(c.persona || c.name || '').trim(), telefono: String(c.telefono || c.phone || '').trim() }))
          .filter(c => c.persona || c.telefono);
        return {
          contactos,
          persona: contactos[0]?.persona || '',
          telefono: contactos[0]?.telefono || ''
        };
      }
      if (parsed.contactos && Array.isArray(parsed.contactos)) {
        const contactos = parsed.contactos
          .map(c => ({ persona: String(c.persona || c.name || '').trim(), telefono: String(c.telefono || c.phone || '').trim() }))
          .filter(c => c.persona || c.telefono);
        return {
          contactos,
          persona: contactos[0]?.persona || parsed.persona || '',
          telefono: contactos[0]?.telefono || parsed.telefono || ''
        };
      }
      if (parsed.persona || parsed.telefono || parsed.name || parsed.phone) {
        const p = String(parsed.persona || parsed.name || '').trim();
        const t = String(parsed.telefono || parsed.phone || '').trim();
        return {
          contactos: (p || t) ? [{ persona: p, telefono: t }] : [],
          persona: p,
          telefono: t
        };
      }
    } catch (e) {}
  }

  // 2. Si es un texto plano, intentamos detectar teléfono por expresión regular
  const phoneMatch = str.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/);
  if (phoneMatch) {
    const telefono = phoneMatch[0].trim();
    const persona = str.replace(phoneMatch[0], '').replace(/[-–·|(),]/g, '').trim();
    return {
      contactos: [{ persona, telefono }],
      persona,
      telefono
    };
  }

  return {
    contactos: [{ persona: str, telefono: '' }],
    persona: str,
    telefono: ''
  };
};

const GestorGlobal = () => {
  const [activeTab, setActiveTab] = useState('clientes'); // 'clientes' o 'tareas'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [clientes, setClientes] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Estado del Modal integrado para Añadir / Editar
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    type: 'cliente', // 'cliente' o 'tarea'
    mode: 'add',     // 'add' o 'edit'
    item: null 
  });

  const [clientForm, setClientForm] = useState({ 
    name: '', 
    address: '', 
    contactos: [{ persona: '', telefono: '' }]
  });
  
  const [tareaForm, setTareaForm] = useState({ 
    name: '', 
    description: '' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Cargar clientes
    const { data: clientesData, error: errorClientes } = await supabase
      .from('clientes')
      .select('*')
      .order('name');
      
    if (clientesData) setClientes(clientesData);
    if (errorClientes) console.error("Error al cargar clientes:", errorClientes);

    // Cargar tareas
    const { data: tareasData, error: errorTareas } = await supabase
      .from('tareas_estandar')
      .select('*')
      .order('name');
      
    if (tareasData) setTareas(tareasData);
    if (errorTareas) console.error("Error al cargar tareas:", errorTareas);
    
    setLoading(false);
  };

  const handleExportBackup = async () => {
    if (!window.confirm("¿Descargar copia de seguridad de la base de datos (CSV)?")) return;
    setIsExporting(true);
    try {
      const tables = [
        'clientes', 'tareas_estandar', 'tareas_programadas', 
        'aquapp_muestras', 'aquapp_tratamientos', 'aquapp_plagas', 
        'avisomap_avisos', 'workapp_nominas', 'workapp_jornadas', 'productos'
      ];
      let csvContent = "";
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        csvContent += `\n--- TABLA: ${table.toUpperCase()} ---\n`;

        if (error) {
          console.error(`Error al consultar tabla ${table}:`, error);
          csvContent += `Error: ${error.message || 'No se pudo acceder a la tabla'}\n`;
          continue;
        }
        
        if (data && data.length > 0) {
          const headers = Object.keys(data[0]);
          csvContent += headers.join(",") + "\n";
          
          data.forEach(row => {
            const rowData = headers.map(header => {
              let cell = row[header] === null ? "" : String(row[header]);
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            });
            csvContent += rowData.join(",") + "\n";
          });
        } else {
          csvContent += "Sin datos\n";
        }
      }

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `agendapp_backup_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error general exportando CSV:", err);
      window.__toast?.error("Error al exportar la copia de seguridad: " + (err.message || "Error desconocido"));
    } finally {
      setIsExporting(false);
    }
  };

  // Manejo de filas dinámicas de contactos en el modal de cliente
  const handleContactChange = (index, field, value) => {
    setClientForm(prev => {
      const updated = [...prev.contactos];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, contactos: updated };
    });
  };

  const handleAddContactRow = () => {
    setClientForm(prev => ({
      ...prev,
      contactos: [...prev.contactos, { persona: '', telefono: '' }]
    }));
  };

  const handleRemoveContactRow = (index) => {
    setClientForm(prev => {
      const updated = prev.contactos.filter((_, i) => i !== index);
      return {
        ...prev,
        contactos: updated.length > 0 ? updated : [{ persona: '', telefono: '' }]
      };
    });
  };

  // Apertura de Modales
  const openAddModal = (type) => {
    if (type === 'cliente') {
      setClientForm({ name: '', address: '', contactos: [{ persona: '', telefono: '' }] });
      setModalConfig({ isOpen: true, type: 'cliente', mode: 'add', item: null });
    } else {
      setTareaForm({ name: '', description: '' });
      setModalConfig({ isOpen: true, type: 'tarea', mode: 'add', item: null });
    }
  };

  const openEditModal = (item, type) => {
    if (type === 'cliente') {
      const { contactos } = parseContact(item.contact);
      setClientForm({
        name: item.name || '',
        address: (item.address && item.address !== 'null') ? item.address : '',
        contactos: contactos.length > 0 ? contactos : [{ persona: '', telefono: '' }]
      });
      setModalConfig({ isOpen: true, type: 'cliente', mode: 'edit', item });
    } else {
      setTareaForm({
        name: item.name || '',
        description: (item.description && item.description !== 'null') ? item.description : ''
      });
      setModalConfig({ isOpen: true, type: 'tarea', mode: 'edit', item });
    }
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: 'cliente', mode: 'add', item: null });
  };

  // Guardado de Cliente
  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      window.__toast?.error("El nombre del cliente es obligatorio");
      return;
    }

    const validContactos = clientForm.contactos
      .map(c => ({ persona: (c.persona || '').trim(), telefono: (c.telefono || '').trim() }))
      .filter(c => c.persona || c.telefono);

    let contactString = null;
    if (validContactos.length > 0) {
      contactString = JSON.stringify({
        persona: validContactos[0].persona,
        telefono: validContactos[0].telefono,
        contactos: validContactos
      });
    }

    const payload = {
      name: clientForm.name.trim(),
      address: clientForm.address.trim() || null,
      contact: contactString
    };

    if (modalConfig.mode === 'add') {
      const { error } = await supabase.from('clientes').insert([payload]);
      if (!error) {
        window.__toast?.success("Cliente añadido correctamente");
        closeModal();
        fetchData();
      } else {
        window.__toast?.error("Error al añadir cliente: " + error.message);
      }
    } else {
      const { error } = await supabase.from('clientes').update(payload).eq('id', modalConfig.item.id);
      if (!error) {
        window.__toast?.success("Cliente actualizado");
        closeModal();
        fetchData();
      } else {
        window.__toast?.error("Error al actualizar cliente: " + error.message);
      }
    }
  };

  // Guardado de Tarea
  const handleSaveTarea = async (e) => {
    e.preventDefault();
    if (!tareaForm.name.trim()) {
      window.__toast?.error("El nombre de la tarea es obligatorio");
      return;
    }

    const payload = {
      name: tareaForm.name.trim(),
      description: tareaForm.description.trim() || null
    };

    if (modalConfig.mode === 'add') {
      const { error } = await supabase.from('tareas_estandar').insert([payload]);
      if (!error) {
        window.__toast?.success("Tarea añadida correctamente");
        closeModal();
        fetchData();
      } else {
        window.__toast?.error("Error al añadir tarea: " + error.message);
      }
    } else {
      const { error } = await supabase.from('tareas_estandar').update(payload).eq('id', modalConfig.item.id);
      if (!error) {
        window.__toast?.success("Tarea actualizada");
        closeModal();
        fetchData();
      } else {
        window.__toast?.error("Error al actualizar tarea: " + error.message);
      }
    }
  };

  // Eliminación
  const handleDeleteCliente = async (id, name) => {
    if (window.confirm(`¿Seguro que deseas eliminar a "${name}"?\nSe borrarán también las planificaciones vinculadas.`)) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (!error) {
        window.__toast?.success("Cliente eliminado");
        fetchData();
      } else {
        window.__toast?.error("Error al eliminar cliente: " + error.message);
      }
    }
  };

  const handleDeleteTarea = async (id, name) => {
    if (window.confirm(`¿Seguro que deseas eliminar la tarea global "${name}"?`)) {
      const { error } = await supabase.from('tareas_estandar').delete().eq('id', id);
      if (!error) {
        window.__toast?.success("Tarea eliminada");
        fetchData();
      } else {
        window.__toast?.error("Error al eliminar tarea: " + error.message);
      }
    }
  };

  // Filtrado de Clientes
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientes;
    const q = searchQuery.toLowerCase().trim();
    return clientes.filter(c => {
      const { contactos } = parseContact(c.contact);
      const matchesContact = contactos.some(ct => 
        (ct.persona && ct.persona.toLowerCase().includes(q)) || 
        (ct.telefono && ct.telefono.toLowerCase().includes(q))
      );
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.address && c.address !== 'null' && c.address.toLowerCase().includes(q)) ||
        matchesContact
      );
    });
  }, [clientes, searchQuery]);

  // Filtrado de Tareas
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tareas;
    const q = searchQuery.toLowerCase().trim();
    return tareas.filter(t => 
      t.name?.toLowerCase().includes(q) ||
      (t.description && t.description !== 'null' && t.description.toLowerCase().includes(q))
    );
  }, [tareas, searchQuery]);

  return (
    <div className="gg-container">
      {/* Cabecera Principal */}
      <div className="gg-header">
        <div className="gg-header-info">
          <div className="gg-header-title">
            <div className="gg-title-badge">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1>Gestor Global</h1>
              <p className="gg-subtitle">Administra tu base de clientes y actuaciones sincronizadas en la nube</p>
            </div>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="gg-btn-backup"
          title="Exportar todas las tablas a un archivo CSV para Excel"
        >
          <Download size={17} />
          <span>{isExporting ? 'Exportando...' : 'Backup CSV'}</span>
        </button>
      </div>

      {/* Selector de Pestañas */}
      <div className="gg-tabs">
        <button 
          type="button"
          className={`gg-tab ${activeTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('clientes')}
        >
          <Users size={18} />
          <span>CLIENTES</span>
          <span className="gg-tab-counter">{clientes.length}</span>
        </button>
        <button 
          type="button"
          className={`gg-tab ${activeTab === 'tareas' ? 'active' : ''}`}
          onClick={() => setActiveTab('tareas')}
        >
          <CalendarCheck size={18} />
          <span>TAREAS</span>
          <span className="gg-tab-counter">{tareas.length}</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Acción */}
      <div className="gg-toolbar">
        <div className="gg-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={activeTab === 'clientes' ? "Buscar cliente por nombre, dirección, teléfono o contacto..." : "Buscar tarea por nombre o descripción..."} 
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

        <button 
          type="button"
          className="gg-add-btn"
          onClick={() => openAddModal(activeTab === 'clientes' ? 'cliente' : 'tarea')}
        >
          <PlusCircle size={18} />
          <span>AÑADIR {activeTab === 'clientes' ? 'CLIENTE' : 'TAREA'}</span>
        </button>
      </div>

      {/* Contador de Resultados si hay búsqueda */}
      {searchQuery && (
        <div className="gg-search-feedback">
          Mostrando {activeTab === 'clientes' ? filteredClients.length : filteredTasks.length} de {activeTab === 'clientes' ? clientes.length : tareas.length} {activeTab}
        </div>
      )}

      {/* Contenido / Cuadrícula de Tarjetas */}
      <div className="gg-content">
        {loading ? (
          <div className="gg-loading-state">
            <div className="gg-spinner"></div>
            <p>Cargando datos desde Supabase...</p>
          </div>
        ) : activeTab === 'clientes' ? (
          filteredClients.length === 0 ? (
            <div className="gg-empty-state">
              <Building2 size={40} className="empty-icon" />
              <h3>No se encontraron clientes</h3>
              <p>{searchQuery ? 'Prueba con otro término de búsqueda' : 'Añade tu primer cliente con el botón superior'}</p>
            </div>
          ) : (
            <div className="gg-grid animate-fade-in">
              {filteredClients.map(client => {
                const { contactos } = parseContact(client.contact);
                const hasAddress = client.address && client.address !== 'null' && client.address.trim() !== '';
                const phonesList = contactos.filter(c => c.telefono);

                return (
                  <div key={client.id} className="gg-card client-card">
                    {/* Cabecera Tarjeta */}
                    <div className="gg-card-header">
                      <div className="gg-card-title-group">
                        <div className="gg-card-avatar client">
                          <Building2 size={18} />
                        </div>
                        <div className="gg-card-title-container">
                          <h3 className="gg-card-title" title={client.name}>{client.name}</h3>
                          {contactos.length > 0 && contactos.some(c => c.persona) && (
                            <div className="gg-card-contacts-badges">
                              {contactos.map((ct, idx) => ct.persona ? (
                                <span key={idx} className="gg-card-contact-badge" title={`Persona de contacto: ${ct.persona}${ct.telefono ? ' (' + ct.telefono + ')' : ''}`}>
                                  <User size={11} /> {ct.persona}
                                </span>
                              ) : null)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="gg-card-actions">
                        <button 
                          type="button" 
                          className="icon-btn-edit" 
                          onClick={() => openEditModal(client, 'cliente')}
                          title={`Editar datos de ${client.name}`}
                        >
                          <Edit3 size={15}/>
                        </button>
                        <button 
                          type="button" 
                          className="icon-btn-delete" 
                          onClick={() => handleDeleteCliente(client.id, client.name)}
                          title={`Eliminar ${client.name}`}
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>

                    {/* Cuerpo Tarjeta */}
                    <div className="gg-card-body">
                      {/* Dirección */}
                      <div className={`gg-info-row ${hasAddress ? 'address' : 'empty'}`}>
                        <MapPin size={15} className={`info-icon ${hasAddress ? 'text-primary' : 'faint'}`} />
                        <span className="info-text">
                          {hasAddress ? client.address : 'Sin dirección guardada'}
                        </span>
                      </div>

                      {/* Teléfono / Contactos */}
                      {contactos.length === 0 ? (
                        <div className="gg-info-row empty">
                          <Phone size={15} className="info-icon faint" />
                          <span className="info-text">Sin teléfono guardado</span>
                        </div>
                      ) : (
                        <div className="gg-card-contacts-group">
                          {contactos.map((ct, idx) => (
                            <div key={idx} className={`gg-info-row ${ct.telefono ? 'phone' : 'empty'}`}>
                              <Phone size={14} className={`info-icon ${ct.telefono ? 'text-success' : 'faint'}`} />
                              <div className="gg-contact-cell">
                                {ct.persona && <span className="gg-contact-label">{ct.persona}:</span>}
                                {ct.telefono ? (
                                  <a 
                                    href={`tel:${ct.telefono.replace(/\s+/g, '')}`} 
                                    className="phone-link"
                                    title={`Llamar a ${ct.persona || client.name} (${ct.telefono})`}
                                  >
                                    {ct.telefono}
                                  </a>
                                ) : (
                                  <span className="info-text faint">Sin teléfono</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pie Tarjeta / Acciones directas */}
                    <div className="gg-card-footer">
                      <button
                        type="button"
                        className="btn-como-llegar"
                        onClick={() => openMapsForClient(client.name, client.address)}
                        title={`Cómo llegar a ${client.name} (Google Maps / Waze)`}
                      >
                        <Navigation size={14} />
                        <span>Cómo llegar</span>
                      </button>

                      {phonesList.length === 0 ? (
                        <button
                          type="button"
                          className="btn-add-contact-hint"
                          onClick={() => openEditModal(client, 'cliente')}
                          title="Añadir teléfono y persona de contacto"
                        >
                          + Añadir contacto
                        </button>
                      ) : (
                        <div className="gg-card-footer-calls">
                          {phonesList.map((ct, idx) => (
                            <a 
                              key={idx}
                              href={`tel:${ct.telefono.replace(/\s+/g, '')}`} 
                              className="btn-llamar-quick"
                              title={`Llamar a ${ct.persona ? `${ct.persona} (${client.name})` : client.name} (${ct.telefono})`}
                            >
                              <Phone size={13} />
                              <span>Llamar {ct.persona ? `(${ct.persona})` : ''}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Pestaña Tareas */
          filteredTasks.length === 0 ? (
            <div className="gg-empty-state">
              <CheckSquare size={40} className="empty-icon" />
              <h3>No se encontraron tareas</h3>
              <p>{searchQuery ? 'Prueba con otro término de búsqueda' : 'Añade tu primera tarea con el botón superior'}</p>
            </div>
          ) : (
            <div className="gg-grid animate-fade-in">
              {filteredTasks.map(task => {
                const hasDesc = task.description && task.description !== 'null' && task.description.trim() !== '';

                return (
                  <div key={task.id} className="gg-card task-card">
                    {/* Cabecera Tarjeta */}
                    <div className="gg-card-header">
                      <div className="gg-card-title-group">
                        <div className="gg-card-avatar task">
                          <CheckSquare size={18} />
                        </div>
                        <div className="gg-card-title-container">
                          <h3 className="gg-card-title" title={task.name}>{task.name}</h3>
                          <span className="gg-card-type-tag">Tarea estándar</span>
                        </div>
                      </div>

                      <div className="gg-card-actions">
                        <button 
                          type="button" 
                          className="icon-btn-edit" 
                          onClick={() => openEditModal(task, 'tarea')}
                          title={`Editar tarea "${task.name}"`}
                        >
                          <Edit3 size={15}/>
                        </button>
                        <button 
                          type="button" 
                          className="icon-btn-delete" 
                          onClick={() => handleDeleteTarea(task.id, task.name)}
                          title={`Eliminar tarea "${task.name}"`}
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>

                    {/* Cuerpo Tarjeta */}
                    <div className="gg-card-body">
                      <div className={`gg-info-row ${hasDesc ? 'description' : 'empty'}`}>
                        <AlignLeft size={15} className={`info-icon ${hasDesc ? 'text-primary' : 'faint'}`} />
                        <span className="info-text">
                          {hasDesc ? task.description : 'Sin descripción adicional'}
                        </span>
                      </div>
                    </div>

                    {/* Pie Tarjeta */}
                    <div className="gg-card-footer task-footer">
                      <div className="gg-task-status-pill">
                        <CheckCircle2 size={13} className="text-success" />
                        <span>Disponible en Planificación</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── MODAL FORMULARIO PROFESIONAL INTEGRADO (Añadir / Editar) ── */}
      {modalConfig.isOpen && (
        <div className="gg-modal-overlay animate-fade-in" onClick={closeModal}>
          <div className="gg-modal-card" onClick={e => e.stopPropagation()}>
            {/* Cabecera del modal */}
            <div className="gg-modal-header">
              <div className="gg-modal-header-title">
                <div className={`gg-modal-icon-badge ${modalConfig.type}`}>
                  {modalConfig.type === 'cliente' ? <Building2 size={20} /> : <CheckSquare size={20} />}
                </div>
                <div>
                  <h2>
                    {modalConfig.mode === 'add' ? 'Añadir ' : 'Editar '}
                    {modalConfig.type === 'cliente' ? 'Cliente' : 'Tarea Estándar'}
                  </h2>
                  <p>
                    {modalConfig.type === 'cliente' 
                      ? 'Guarda la ficha completa con dirección y contacto directo' 
                      : 'Define el nombre y descripción de la actuación global'}
                  </p>
                </div>
              </div>
              <button type="button" className="gg-modal-close" onClick={closeModal} title="Cerrar ventana">
                <X size={20} />
              </button>
            </div>

            {/* Formulario Cliente */}
            {modalConfig.type === 'cliente' ? (
              <form onSubmit={handleSaveClient} className="gg-modal-form">
                <div className="gg-form-group">
                  <label htmlFor="client-name">
                    NOMBRE DEL CLIENTE <span className="required">*</span>
                  </label>
                  <div className="gg-input-wrapper">
                    <Building2 size={16} className="input-icon" />
                    <input 
                      id="client-name"
                      type="text" 
                      required
                      placeholder="Ej. Hotel Reconquista / Café Central"
                      value={clientForm.name}
                      onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="gg-contacts-form-section">
                  <div className="gg-contacts-form-header">
                    <label>PERSONAS DE CONTACTO Y TELÉFONOS</label>
                    <button 
                      type="button" 
                      className="gg-btn-add-contact-row"
                      onClick={handleAddContactRow}
                      title="Añadir otra persona o teléfono de contacto"
                    >
                      <PlusCircle size={14} /> Añadir contacto
                    </button>
                  </div>

                  <div className="gg-contacts-rows-container">
                    {clientForm.contactos.map((ct, idx) => (
                      <div key={idx} className="gg-contact-form-row">
                        <div className="gg-contact-row-num">#{idx + 1}</div>
                        <div className="gg-input-wrapper flex-1">
                          <User size={15} className="input-icon" />
                          <input 
                            type="text" 
                            placeholder="Persona / Cargo (ej. María)"
                            value={ct.persona}
                            onChange={e => handleContactChange(idx, 'persona', e.target.value)}
                          />
                        </div>
                        <div className="gg-input-wrapper flex-1">
                          <Phone size={15} className="input-icon" />
                          <input 
                            type="tel" 
                            placeholder="Teléfono (ej. 654 98 73 21)"
                            value={ct.telefono}
                            onChange={e => handleContactChange(idx, 'telefono', e.target.value)}
                          />
                        </div>
                        {clientForm.contactos.length > 1 && (
                          <button 
                            type="button" 
                            className="gg-btn-remove-contact-row"
                            onClick={() => handleRemoveContactRow(idx)}
                            title="Eliminar este contacto"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="gg-form-group">
                  <label htmlFor="client-address">DIRECCIÓN FÍSICA</label>
                  <div className="gg-input-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input 
                      id="client-address"
                      type="text" 
                      placeholder="Ej. C/ San Francisco 4, Oviedo"
                      value={clientForm.address}
                      onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                    />
                  </div>
                  <span className="gg-form-hint">
                    💡 La dirección se usará para iniciar la ruta en Google Maps y Waze.
                  </span>
                </div>

                <div className="gg-modal-actions">
                  <button type="button" className="gg-btn-cancel" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="gg-btn-save">
                    {modalConfig.mode === 'add' ? 'Guardar Cliente' : 'Actualizar Cliente'}
                  </button>
                </div>
              </form>
            ) : (
              /* Formulario Tarea */
              <form onSubmit={handleSaveTarea} className="gg-modal-form">
                <div className="gg-form-group">
                  <label htmlFor="tarea-name">
                    NOMBRE DE LA TAREA / ACTUACIÓN <span className="required">*</span>
                  </label>
                  <div className="gg-input-wrapper">
                    <CheckSquare size={16} className="input-icon" />
                    <input 
                      id="tarea-name"
                      type="text" 
                      required
                      placeholder="Ej. Choque Térmico / Limpieza Depósito"
                      value={tareaForm.name}
                      onChange={e => setTareaForm({ ...tareaForm, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="gg-form-group">
                  <label htmlFor="tarea-desc">DESCRIPCIÓN / OBSERVACIONES</label>
                  <textarea 
                    id="tarea-desc"
                    rows={4}
                    placeholder="Detalles sobre el protocolo de trabajo o especificaciones..."
                    value={tareaForm.description}
                    onChange={e => setTareaForm({ ...tareaForm, description: e.target.value })}
                    className="gg-textarea"
                  />
                </div>

                <div className="gg-modal-actions">
                  <button type="button" className="gg-btn-cancel" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="gg-btn-save">
                    {modalConfig.mode === 'add' ? 'Guardar Tarea' : 'Actualizar Tarea'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GestorGlobal;

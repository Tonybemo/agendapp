import React, { useState, useEffect } from 'react';
import { 
  Users, CalendarCheck, Search, PlusCircle, Edit3, Trash2, 
  MapPin, Mail, AlignLeft, CheckCircle2, Download 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './GestorGlobal.css';

const GestorGlobal = () => {
  const [activeTab, setActiveTab] = useState('clientes'); // 'clientes' o 'tareas'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [clientes, setClientes] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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
    if(!window.confirm("¿Descargar copia de seguridad de la base de datos (CSV)?")) return;
    setIsExporting(true);
    try {
      const tables = ['clientes', 'tareas_estandar', 'aquapp_muestras', 'aquapp_tratamientos', 'avisos_mapfre', 'nominas'];
      let csvContent = "data:text/csv;charset=utf-8,\n";
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        
        csvContent += `\n--- TABLA: ${table.toUpperCase()} ---\n`;
        if (data && data.length > 0) {
          const headers = Object.keys(data[0]);
          csvContent += headers.join(",") + "\n";
          
          data.forEach(row => {
            const rowData = headers.map(header => {
              let cell = row[header] === null ? "" : String(row[header]);
              // Escape quotes and wrap in quotes if contains comma
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

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `agendapp_backup_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Error al exportar la copia de seguridad.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddCliente = async () => {
    const name = prompt("Nombre del cliente:");
    if (!name) return;
    const address = prompt("Dirección:");
    const contact = prompt("Contacto (email/tlf):");

    const { error } = await supabase
      .from('clientes')
      .insert([{ name, address, contact }]);
      
    if (!error) {
      fetchData(); // Recargar
    } else {
      alert("Error al añadir cliente");
      console.error(error);
    }
  };

  const handleAddTarea = async () => {
    const name = prompt("Nombre de la tarea:");
    if (!name) return;
    const description = prompt("Descripción:");

    const { error } = await supabase
      .from('tareas_estandar')
      .insert([{ name, description }]);
      
    if (!error) {
      fetchData(); // Recargar
    } else {
      alert("Error al añadir tarea");
      console.error(error);
    }
  };

  const handleDeleteCliente = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este cliente? Se borrarán sus tareas asociadas.")) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (!error) fetchData();
      else alert("Error al eliminar cliente");
    }
  };

  const handleEditCliente = async (client) => {
    const newName = prompt("Nuevo nombre (dejar en blanco para no cambiar):", client.name) || client.name;
    const newAddress = prompt("Nueva dirección:", client.address) || client.address;
    const newContact = prompt("Nuevo contacto:", client.contact) || client.contact;

    const { error } = await supabase.from('clientes').update({ name: newName, address: newAddress, contact: newContact }).eq('id', client.id);
    if (!error) fetchData();
    else alert("Error al editar cliente");
  };

  const handleDeleteTarea = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta tarea global?")) {
      const { error } = await supabase.from('tareas_estandar').delete().eq('id', id);
      if (!error) fetchData();
      else alert("Error al eliminar tarea");
    }
  };

  const handleEditTarea = async (task) => {
    const newName = prompt("Nuevo nombre (dejar en blanco para no cambiar):", task.name) || task.name;
    const newDescription = prompt("Nueva descripción:", task.description) || task.description;

    const { error } = await supabase.from('tareas_estandar').update({ name: newName, description: newDescription }).eq('id', task.id);
    if (!error) fetchData();
    else alert("Error al editar tarea");
  };

  const renderClientes = () => {
    const filteredClients = clientes.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="gg-list animate-fade-in">
        {filteredClients.map(client => (
          <div key={client.id} className="gg-card">
            <div className="gg-card-header">
              <h3>{client.name}</h3>
              <div className="gg-card-actions">
                <button className="icon-btn-edit" onClick={() => handleEditCliente(client)}><Edit3 size={16}/></button>
                <button className="icon-btn-delete" onClick={() => handleDeleteCliente(client.id)}><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="gg-card-body">
              {client.address && <p><MapPin size={14} color="#64748b"/> {client.address}</p>}
              {client.contact && <p><Mail size={14} color="#64748b"/> {client.contact}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTareas = () => {
    const filteredTasks = tareas.filter(t => 
      t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="gg-list animate-fade-in">
        {filteredTasks.map(task => (
          <div key={task.id} className="gg-card task-card">
            <div className="gg-card-header">
              <h3>{task.name}</h3>
              <div className="gg-card-actions">
                <button className="icon-btn-edit" onClick={() => handleEditTarea(task)}><Edit3 size={16}/></button>
                <button className="icon-btn-delete" onClick={() => handleDeleteTarea(task.id)}><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="gg-card-body">
              {task.description && <p><AlignLeft size={14} color="#64748b"/> {task.description}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="gg-container">
      <div className="gg-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="gg-header-title">
            <CheckCircle2 size={28} color="#6366f1" />
            <h1>Gestor Global</h1>
          </div>
          <p className="gg-subtitle">Administra tu base de clientes y tareas (Conectado a Supabase).</p>
        </div>
        <button 
          onClick={handleExportBackup}
          disabled={isExporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#10b981', color: 'white', border: 'none',
            padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            opacity: isExporting ? 0.7 : 1
          }}
        >
          <Download size={18} />
          {isExporting ? 'Exportando...' : 'Backup CSV'}
        </button>
      </div>

      <div className="gg-tabs">
        <button 
          className={`gg-tab ${activeTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('clientes')}
        >
          <Users size={18} /> CLIENTES ({clientes.length})
        </button>
        <button 
          className={`gg-tab ${activeTab === 'tareas' ? 'active' : ''}`}
          onClick={() => setActiveTab('tareas')}
        >
          <CalendarCheck size={18} /> TAREAS ({tareas.length})
        </button>
      </div>

      <div className="gg-toolbar">
        <div className="gg-search">
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder={`Buscar ${activeTab}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="gg-add-btn"
          onClick={activeTab === 'clientes' ? handleAddCliente : handleAddTarea}
        >
          <PlusCircle size={18} /> AÑADIR {activeTab === 'clientes' ? 'CLIENTE' : 'TAREA'}
        </button>
      </div>

      <div className="gg-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <p>Cargando datos desde la nube...</p>
          </div>
        ) : (
          <>
            {activeTab === 'clientes' && renderClientes()}
            {activeTab === 'tareas' && renderTareas()}
          </>
        )}
      </div>
    </div>
  );
};

export default GestorGlobal;

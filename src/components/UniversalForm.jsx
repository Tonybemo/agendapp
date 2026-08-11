import React, { useState, useEffect } from 'react';
import { Plus, X, Droplet, Wind, MapPin, Briefcase, ChevronRight, Check, Calendar, Clock, Car, FileText, UploadCloud, PlusCircle, Search, Bug, Hexagon, BookOpen, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './UniversalForm.css';

const UniversalForm = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [selectedType, setSelectedType] = useState(null);
  
  // Estados para Aquapp
  const [aquappMode, setAquappMode] = useState('muestra'); // 'muestra' o 'tratamiento'
  const [tipoMuestra, setTipoMuestra] = useState('Estandar'); // Estandar, Torre, Piscina, Jacuzzi
  const [tipoTratamiento, setTipoTratamiento] = useState('Hipercloracion'); 
  const [motivoTrat, setMotivoTrat] = useState('Prevencion');
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [customClienteName, setCustomClienteName] = useState('');
  const [sugerenciaMuestra, setSugerenciaMuestra] = useState('Muestra 1');
  const [selectedFecha, setSelectedFecha] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Estado de edición
  const [editingItem, setEditingItem] = useState(null); // null = creando nuevo, {id, editType, ...} = editando
  const [editHora, setEditHora] = useState('');
  const [editCodEnvase, setEditCodEnvase] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editPh, setEditPh] = useState('');
  const [editTemp, setEditTemp] = useState('');
  const [editConductividad, setEditConductividad] = useState('');
  const [editTurbidez, setEditTurbidez] = useState('');
  const [editHierro, setEditHierro] = useState('');
  const [editLimpieza, setEditLimpieza] = useState('');
  const [editCloro, setEditCloro] = useState('');
  const [editF8583, setEditF8583] = useState('');
  const [editF8580, setEditF8580] = useState('');
  const [editMatF8583, setEditMatF8583] = useState('');
  const [editMatF8580, setEditMatF8580] = useState('');
  const [editMatF8481, setEditMatF8481] = useState('');
  const [editMatA4170, setEditMatA4170] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [editTipoActuacion, setEditTipoActuacion] = useState('');
  
  // Estado para Avisos
  const [avisoPlagas, setAvisoPlagas] = useState([]);
  const [avisoOtrasPlagas, setAvisoOtrasPlagas] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [localidadQuery, setLocalidadQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avisoFileName, setAvisoFileName] = useState('');
  const [jornadaParadas, setJornadaParadas] = useState([]);
  const [jornadaFecha, setJornadaFecha] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  
  const searchAddress = (query) => {
    setAddressQuery(query);
    
    // Cleanup pending timer
    if (window.addressDebounceTimer) {
      clearTimeout(window.addressDebounceTimer);
    }

    if (query.length > 3) {
      window.addressDebounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=es&limit=5&email=contacto@agendapp.local`);
          if (res.ok) {
            const data = await res.json();
            setAddressSuggestions(data);
          } else {
            console.warn("Nominatim API error:", res.status);
          }
        } catch (e) {
          console.error("Error al buscar dirección:", e);
        }
      }, 600);
    } else {
      setAddressSuggestions([]);
    }
  };

  const handleSelectAddress = (item) => {
    const street = item.address?.road || item.name || '';
    const city = item.address?.city || item.address?.town || item.address?.village || item.address?.county || '';
    setAddressQuery(street);
    setLocalidadQuery(city);
    setAddressSuggestions([]);
  };

  // Funciones para fecha/hora actual
  const getHoy = () => {
    const today = new Date();
    return today.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const getHoyInput = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const getHoraActual = () => {
    const today = new Date();
    return today.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Datos de Supabase
  const [clientesGlobales, setClientesGlobales] = useState([]);
  const [tareasGlobales, setTareasGlobales] = useState([]);

  const handleClienteChange = (e) => {
    if (e.target.value === '_custom_') {
      const manual = window.prompt("Introduce el nombre del cliente puntual:");
      if (manual && manual.trim()) {
        setSelectedClienteId('_custom_');
        setCustomClienteName(manual.trim());
      } else {
        setSelectedClienteId('');
      }
    } else {
      setSelectedClienteId(e.target.value);
      setCustomClienteName('');
    }
  };

  const handleGuardarJornada = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
    
    // Calcular horas reales
    const inicio = data.hora_inicio || "07:00";
    const fin = data.hora_fin || "15:00";
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fin.split(':').map(Number);
    const totalMinutos = (hF * 60 + mF) - (hI * 60 + mI);
    const totalHoras = totalMinutos / 60;
    const horasCalc = totalHoras.toFixed(1) + 'h';
    const [y, m, d] = data.fecha.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1-4 = L-J, 5 = Viernes, 6 = Sábado
    
    let jornadaBase = 8;
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      jornadaBase = 8; // Lunes a Jueves
    } else if (dayOfWeek === 5) {
      jornadaBase = 6.5; // Viernes
    } else {
      jornadaBase = 0; // Sábado y Domingo (todo extra)
    }
    
    const extras = Math.max(0, totalHoras - jornadaBase);
    const horasExtras = extras > 0 ? '+' + extras.toFixed(1) + 'h ext' : '0.0h';
    
    let fechaGuardar = data.fecha;
    if (fechaGuardar && fechaGuardar.includes('-')) {
      const parts = fechaGuardar.split('-');
      fechaGuardar = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    let adjuntoUrl = null;
    const file = data.adjunto;
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `workapp/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('adjuntos').upload(filePath, file);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('adjuntos').getPublicUrl(filePath);
        adjuntoUrl = publicUrlData.publicUrl;
      } else {
        console.error("Error subiendo archivo:", uploadError);
        alert("Aviso: No se pudo subir el archivo adjunto, pero la jornada se guardará.");
      }
    }
    
    const { error } = await supabase.from('workapp_jornadas').insert([{
      fecha: fechaGuardar,
      hora_inicio: data.hora_inicio,
      hora_fin: data.hora_fin,
      matricula: data.matricula,
      paradas: jornadaParadas,
      horas_calculadas: horasCalc,
      horas_extras: horasExtras,
      adjunto: adjuntoUrl
    }]);

    if (!error) {
      window.dispatchEvent(new Event('refresh-workapp'));
      alert("✅ Jornada guardada correctamente");
      handleClose();
    } else {
      console.error(error);
      alert("Error al guardar jornada.");
    }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
    
    // Mapear el nombre de la categoria a ID real (insecticidas, rodenticidas, biocidas)
    const catMap = {
      'Insecticidas': 'insecticidas',
      'Rodenticidas': 'rodenticidas',
      'Biocidas y Otros': 'biocidas'
    };
    
    const categoryId = catMap[data.categoria] || 'biocidas';

    const newProduct = {
      nombre: data.nombre,
      categoria_id: categoryId,
      materia_activa: data.materia_activa,
      plaga_diana: data.plaga_diana,
      registro: data.registro,
      lote: data.lote,
      plazo_seguridad: data.plazo_seguridad,
      metodo_aplicacion: data.metodo_aplicacion,
      caducidad: data.caducidad,
      has_warning: Boolean(data.plazo_seguridad && data.plazo_seguridad.toLowerCase() !== 'na' && data.plazo_seguridad.trim() !== '')
    };

    const { error } = await supabase.from('productos').insert([newProduct]);

    if (!error) {
      window.dispatchEvent(new Event('refresh-catalogo'));
      alert("✅ Producto guardado");
      handleClose();
    } else {
      console.error("Error guardando producto:", error);
      alert("Error de Supabase: " + (error.message || JSON.stringify(error)));
    }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarAviso = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
    
    // Unir plagas de los botones con el texto extra
    let todasLasPlagas = [...avisoPlagas];
    if (avisoOtrasPlagas.trim() !== '') {
      const extras = avisoOtrasPlagas.split(',').map(s => s.trim()).filter(s => s !== '');
      todasLasPlagas = [...todasLasPlagas, ...extras];
    }
    
    if (todasLasPlagas.length === 0) {
      alert("Debes seleccionar o escribir al menos una plaga a tratar.");
      return;
    }
    
    setIsUploading(true);

    let adjuntoUrl = null;
    const fileField = e.target.elements.adjunto;
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
        alert("Aviso: No se pudo subir el archivo adjunto, pero el aviso se guardará. (" + uploadError.message + ")");
      }
    }

    const { error } = await supabase.from('avisomap_avisos').insert([{
      direccion: addressQuery || data.direccion,
      portal: data.portal,
      localidad: localidadQuery || data.localidad,
      fecha: data.fecha,
      hora: data.hora,
      plagas: todasLasPlagas,
      comentarios: data.comentarios,
      contacto: data.contacto || '',
      adjunto: adjuntoUrl
    }]);

    setIsUploading(false);

    if (!error) {
      window.dispatchEvent(new Event('refresh-avisomap'));
      handleClose();
    } else {
      console.error(error);
      alert("Error guardando aviso: " + error.message);
    }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper para convertir fecha dd/mm/yyyy -> yyyy-mm-dd (para inputs type=date)
  const fechaToInput = (fecha) => {
    if (!fecha) return getHoyInput();
    if (fecha.includes('/')) {
      const parts = fecha.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return fecha;
  };

  const resetEditFields = () => {
    setEditingItem(null);
    setEditHora('');
    setEditCodEnvase('');
    setEditDescripcion('');
    setEditPh('');
    setEditTemp('');
    setEditConductividad('');
    setEditTurbidez('');
    setEditHierro('');
    setEditLimpieza('');
    setEditCloro('');
    setEditF8583('');
    setEditF8580('');
    setEditMatF8583('');
    setEditMatF8580('');
    setEditMatF8481('');
    setEditMatA4170('');
    setEditNotas('');
    setEditTipoActuacion('');
    setAvisoPlagas([]);
    setAvisoOtrasPlagas('');
    setAddressQuery('');
    setLocalidadQuery('');
    setAddressSuggestions([]);
    setAvisoFileName('');
    setJornadaParadas([]);
    setJornadaFecha(new Date().toISOString().split('T')[0]);
  };

  const handleGuardarMuestra = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
    
    const clienteId = data.cliente_id;
    let clienteNombre = "";
    if (clienteId) {
       const cli = clientesGlobales.find(c => c.id === clienteId);
       if (cli) clienteNombre = cli.name;
    }

    let fechaGuardar = data.fecha;
    if (fechaGuardar && fechaGuardar.includes('-')) {
      const parts = fechaGuardar.split('-');
      fechaGuardar = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const record = {
      cliente_id: clienteId || null,
      cliente_nombre: clienteNombre,
      tipo_muestra: tipoMuestra,
      fecha: fechaGuardar,
      hora: data.hora,
      numero_muestra: data.numero_muestra,
      cod_envase: data.cod_envase,
      descripcion: data.descripcion,
      ph: data.ph,
      temp: data.temp,
      conductividad: data.conductividad,
      turbidez: data.turbidez,
      hierro: data.hierro,
      limpieza: data.limpieza,
      cloro: data.cloro,
      f_8583_kit: data.f_8583_kit,
      f_8580_total: data.f_8580_total,
      mat_f_8583: data.mat_f_8583,
      mat_f_8580: data.mat_f_8580,
      mat_f_8481: data.mat_f_8481,
      mat_a_4170: data.mat_a_4170
    };

    // OFFLINE CHECK HERE
    if (!navigator.onLine && !editingItem) {
      const queue = JSON.parse(localStorage.getItem('offline_muestras_queue') || '[]');
      queue.push(record);
      localStorage.setItem('offline_muestras_queue', JSON.stringify(queue));
      alert("⚠️ Sin conexión a Internet.\nLa muestra se ha guardado en el móvil y se subirá automáticamente cuando recuperes la cobertura.");
      handleClose();
      setIsSaving(false);
      return;
    }

    let error;
    if (editingItem && editingItem.editType === 'muestra') {
      ({ error } = await supabase.from('aquapp_muestras').update(record).eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from('aquapp_muestras').insert([record]));
    }

    if (!error) {
      alert(editingItem ? "Muestra actualizada" : "Muestra guardada en la nube");
      window.dispatchEvent(new CustomEvent('aquapp-refresh-data'));
      handleClose();
    } else {
      console.error(error);
      alert("Error al guardar muestra");
    }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarTratamiento = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
    
    const clienteId = data.cliente_id;
    let clienteNombre = "";
    if (clienteId) {
       const cli = clientesGlobales.find(c => c.id === clienteId);
       if (cli) clienteNombre = cli.name;
    }

    let fechaGuardar = data.fecha;
    if (fechaGuardar && fechaGuardar.includes('-')) {
      const parts = fechaGuardar.split('-');
      fechaGuardar = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const record = {
      cliente_id: clienteId || null,
      cliente_nombre: clienteNombre,
      tipo_tratamiento: tipoTratamiento,
      motivo: motivoTrat,
      fecha: fechaGuardar,
      hora: data.hora,
      notas: data.notas,
      recordatorio: data.recordatorio === 'on',
      recordatorio_dias: parseInt(data.recordatorio_dias) || 15
    };

    let error;
    if (editingItem && editingItem.editType === 'tratamiento') {
      ({ error } = await supabase.from('aquapp_tratamientos').update(record).eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from('aquapp_tratamientos').insert([record]));
    }

    if (!error) {
      alert(editingItem ? "Tratamiento actualizado" : "Tratamiento guardado en la nube");
      window.dispatchEvent(new CustomEvent('aquapp-refresh-data'));
      handleClose();
    } else {
      console.error(error);
      alert("Error al guardar tratamiento");
    }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarPlaga = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
    
    const clienteId = data.cliente_id;
    let clienteNombre = "";
    if (clienteId) {
       const cli = clientesGlobales.find(c => c.id === clienteId);
       if (cli) clienteNombre = cli.name;
    }

    let fechaGuardar = data.fecha;
    if (fechaGuardar && fechaGuardar.includes('-')) {
      const parts = fechaGuardar.split('-');
      fechaGuardar = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const record = {
      cliente_id: clienteId || null,
      cliente_nombre: clienteNombre,
      tipo_actuacion: data.tipo_actuacion,
      fecha: fechaGuardar,
      hora: data.hora
    };

    let error;
    if (editingItem && editingItem.editType === 'plaga') {
      ({ error } = await supabase.from('aquapp_plagas').update(record).eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from('aquapp_plagas').insert([record]));
    }

    if (!error) {
      alert(editingItem ? "Plaga actualizada" : "Aviso de plaga guardado en la nube");
      window.dispatchEvent(new CustomEvent('aquapp-refresh-data'));
      handleClose();
    } else {
      console.error(error);
      alert("Error al guardar aviso de plaga");
    }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchGlobalData = async () => {
      if (!navigator.onLine) {
        // Modo offline: cargar desde caché
        const cachedClientes = localStorage.getItem('offline_cache_clientes');
        const cachedTareas = localStorage.getItem('offline_cache_tareas');
        if (cachedClientes) setClientesGlobales(JSON.parse(cachedClientes));
        if (cachedTareas) setTareasGlobales(JSON.parse(cachedTareas));
        return;
      }

      // Modo online: fetch y guardar en caché
      const { data: clientesData } = await supabase.from('clientes').select('id, name').order('name');
      const { data: tareasData } = await supabase.from('tareas_estandar').select('id, name').order('name');
      
      if (clientesData) {
        setClientesGlobales(clientesData);
        localStorage.setItem('offline_cache_clientes', JSON.stringify(clientesData));
      }
      if (tareasData) {
        setTareasGlobales(tareasData);
        localStorage.setItem('offline_cache_tareas', JSON.stringify(tareasData));
      }
    };
    
    if (isOpen) {
      fetchGlobalData();
    }
  }, [isOpen]);

  useEffect(() => {
    // Si estamos editando, no recalcular el número de muestra
    if (editingItem) return;

    let prefijo = "Muestra";
    if (tipoMuestra === "Torre") prefijo = "Torre";
    if (tipoMuestra === "Piscina") prefijo = "Piscina";
    if (tipoMuestra === "Jacuzzi") prefijo = "Jacuzzi";

    if (!selectedClienteId) {
      setSugerenciaMuestra(`${prefijo} 1`);
      return;
    }

    const fetchSugerencia = async () => {
      let fechaBusqueda = selectedFecha;
      if (fechaBusqueda && fechaBusqueda.includes('-')) {
        const parts = fechaBusqueda.split('-');
        fechaBusqueda = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      const { data } = await supabase
        .from('aquapp_muestras')
        .select('id')
        .eq('cliente_id', selectedClienteId)
        .eq('fecha', fechaBusqueda)
        .eq('tipo_muestra', tipoMuestra);
      
      if (data) {
        setSugerenciaMuestra(`${prefijo} ${data.length + 1}`);
      }
    };
    if (isOpen) {
      fetchSugerencia();
    }
  }, [selectedClienteId, tipoMuestra, selectedFecha, isOpen]);

  useEffect(() => {
    const handleOpenEvent = (e) => {
      resetEditFields();
      setIsOpen(true);
      setSelectedFecha(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
      });
      setEditHora(getHoraActual());
      if (e.detail?.type) setSelectedType(e.detail.type);
      if (e.detail?.mode) setAquappMode(e.detail.mode);
      if (e.detail?.tipoTratamiento) setTipoTratamiento(e.detail.tipoTratamiento);
    };

    const handleEditEvent = (e) => {
      const item = e.detail;
      if (!item) return;
      resetEditFields();
      setIsOpen(true);
      setSelectedType('muestra'); // Abrir en Aquapp
      setEditingItem(item);

      // Pre-rellenar campos comunes
      setSelectedClienteId(item.cliente_id || '');
      setSelectedFecha(fechaToInput(item.fecha));
      setEditHora(item.hora || '');

      if (item.editType === 'muestra') {
        setAquappMode('muestra');
        setTipoMuestra(item.tipo_muestra || 'Estandar');
        setSugerenciaMuestra(item.numero_muestra || 'Muestra 1');
        setEditCodEnvase(item.cod_envase || '');
        setEditDescripcion(item.descripcion || '');
        setEditPh(item.ph || '');
        setEditTemp(item.temp || '');
        setEditConductividad(item.conductividad || '');
        setEditTurbidez(item.turbidez || '');
        setEditHierro(item.hierro || '');
        setEditLimpieza(item.limpieza || '');
        setEditCloro(item.cloro || '');
        setEditF8583(item.f_8583_kit || '');
        setEditF8580(item.f_8580_total || '');
        setEditMatF8583(item.mat_f_8583 || '');
        setEditMatF8580(item.mat_f_8580 || '');
        setEditMatF8481(item.mat_f_8481 || '');
        setEditMatA4170(item.mat_a_4170 || '');
      } else if (item.editType === 'tratamiento') {
        setAquappMode('tratamiento');
        setTipoTratamiento(item.tipo_tratamiento || 'Hipercloracion');
        setMotivoTrat(item.motivo || 'Prevencion');
        setEditNotas(item.notas || '');
      } else if (item.editType === 'plaga') {
        setAquappMode('plagas');
        setEditTipoActuacion(item.tipo_actuacion || '');
      }
    };

    window.addEventListener('open-universal-form', handleOpenEvent);
    window.addEventListener('edit-record', handleEditEvent);
    return () => {
      window.removeEventListener('open-universal-form', handleOpenEvent);
      window.removeEventListener('edit-record', handleEditEvent);
    };
  }, []);

  const formTypes = [
    { id: 'muestra', title: 'Muestra de Agua', subtitle: 'Aquapp', icon: <Droplet size={28} color="#0284c7" />, bgColor: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' },
    { id: 'aviso', title: 'Aviso de Plaga', subtitle: 'Avisomap', icon: <MapPin size={28} color="#16a34a" />, bgColor: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' },
    { id: 'jornada', title: 'Fichar Jornada', subtitle: 'Workapp', icon: <Briefcase size={28} color="#7c3aed" />, bgColor: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' },
    { id: 'producto', title: 'Nuevo Producto', subtitle: 'Catálogo', icon: <BookOpen size={28} color="#ea580c" />, bgColor: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' }
  ];

  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
    resetEditFields();
  };

  const renderSelector = () => (
      <div className="uf-step animate-fade-in">
        <h3 style={{fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a'}}>¿Qué deseas registrar?</h3>
        <p className="uf-subtitle" style={{marginBottom: '24px'}}>Selecciona un módulo para añadir datos</p>
        <div className="uf-options-grid">
          {formTypes.map(type => (
            <div 
              key={type.id} 
              className="uf-option-card" 
              onClick={() => setSelectedType(type.id)}
            >
              <div className="uf-option-icon" style={{ background: type.bgColor }}>
                {type.icon}
              </div>
              <div className="uf-option-info">
                <h4>{type.title}</h4>
                <span>{type.subtitle}</span>
              </div>
              <div className="uf-option-arrow">
                <ChevronRight size={20} color="#cbd5e1" />
              </div>
            </div>
          ))}
        </div>
      </div>
  );

  // Auto-fetch paradas del día seleccionado
  useEffect(() => {
    if (selectedType !== 'jornada' || !jornadaFecha) return;
    
    const fetchParadasDelDia = async () => {
      // Convertir YYYY-MM-DD a DD/MM/YYYY para buscar en Supabase
      const [y, m, d] = jornadaFecha.split('-');
      const fechaES = `${d}/${m}/${y}`;
      
      const nombres = new Set();
      
      // 1. Tratamientos del día
      const { data: tratamientos } = await supabase
        .from('aquapp_tratamientos')
        .select('cliente_nombre')
        .eq('fecha', fechaES);
      if (tratamientos) tratamientos.forEach(t => { if (t.cliente_nombre) nombres.add(t.cliente_nombre); });
      
      // 2. Muestras del día
      const { data: muestras } = await supabase
        .from('aquapp_muestras')
        .select('cliente_nombre')
        .eq('fecha', fechaES);
      if (muestras) muestras.forEach(m => { if (m.cliente_nombre) nombres.add(m.cliente_nombre); });
      
      // 3. Plagas del día
      const { data: plagas } = await supabase
        .from('aquapp_plagas')
        .select('cliente_nombre')
        .eq('fecha', fechaES);
      if (plagas) plagas.forEach(p => { if (p.cliente_nombre) nombres.add(p.cliente_nombre); });
      
      // 4. Tareas completadas ese día (fecha dentro de tareas_json)
      const { data: tareasData } = await supabase
        .from('tareas_programadas')
        .select('tareas_json, frecuencia, clientes(name)');
      if (tareasData) {
        tareasData.forEach(tp => {
          let tareas = tp.tareas_json;
          if (typeof tareas === 'string') {
            try { tareas = JSON.parse(tareas); } catch(e) { return; }
          }
          if (Array.isArray(tareas)) {
            const hasCompletedToday = tareas.some(t => t.status === 'completed' && t.date === fechaES);
            if (hasCompletedToday) {
              // Cliente puntual: nombre en frecuencia (formato "puntual: NombreCliente")
              if (tp.frecuencia && tp.frecuencia.includes(':')) {
                const nombrePuntual = tp.frecuencia.split(':').slice(1).join(':').trim();
                if (nombrePuntual) nombres.add(nombrePuntual);
              } else if (tp.clientes?.name) {
                // Cliente normal del gestor global
                nombres.add(tp.clientes.name);
              }
            }
          }
        });
      }
      
      if (nombres.size > 0) {
        setJornadaParadas(prev => {
          const combined = new Set([...nombres, ...prev]);
          return [...combined];
        });
      }
    };
    
    fetchParadasDelDia();
  }, [selectedType, jornadaFecha]);

  const renderJornadaForm = () => {
    const opcionesRuta = [...clientesGlobales.map(c => c.name), 'Ir a por garrafas', 'Mantenimiento furgoneta', 'Almacén'];
    const typeInfo = formTypes.find(t => t.id === 'jornada');

    const handleAddParada = (e) => {
      let val = e.target.value;
      if (val === '_custom_') {
        const manual = window.prompt("Introduce el nombre de la parada o cliente puntual:");
        if (manual && manual.trim()) {
          val = manual.trim();
        } else {
          e.target.value = '';
          return;
        }
      }
      
      if (val && !jornadaParadas.includes(val)) {
        setJornadaParadas(prev => [...prev, val]);
      }
      e.target.value = '';
    };

    const handleRemoveParada = (p) => {
      setJornadaParadas(prev => prev.filter(x => x !== p));
    };

    return (
      <form className="uf-form-content" onSubmit={handleGuardarJornada}>
        <div className="uf-form-group">
          <label>Fecha</label>
          <input type="date" name="fecha" className="uf-input-basic" value={jornadaFecha} onChange={(e) => { setJornadaFecha(e.target.value); setJornadaParadas([]); }} required />
        </div>

        <div className="uf-form-row">
          <div className="uf-form-group">
            <label>Hora Inicio</label>
            <input type="time" name="hora_inicio" className="uf-input-basic" defaultValue="07:00" required />
          </div>
          <div className="uf-form-group">
            <label>Hora Fin</label>
            <input type="time" name="hora_fin" className="uf-input-basic" defaultValue="15:00" required />
          </div>
        </div>

        <div className="uf-form-group">
          <label>Matrícula Vehículo</label>
          <div className="uf-input-icon left-icon">
            <Car size={16} color="#94a3b8" className="icon-l" />
            <input type="text" name="matricula" defaultValue="9677MKH" />
          </div>
        </div>

        <div className="uf-form-group">
          <label>Ruta / Paradas del día</label>
          <div className="uf-paradas-lista">
            {jornadaParadas.map((p, i) => (
              <span key={i} className="uf-parada-pill" onClick={() => handleRemoveParada(p)}>
                {p} <X size={14} className="pill-x"/>
              </span>
            ))}
          </div>
          <select className="uf-select-parada" onChange={handleAddParada}>
            <option value="">+ Añadir nueva parada a la ruta...</option>
            <option value="_custom_" style={{fontWeight: 'bold', color: '#8b5cf6'}}>+ Escribir parada puntual...</option>
            {opcionesRuta.filter(o => !jornadaParadas.includes(o)).map((opcion, i) => (
              <option key={i} value={opcion}>{opcion}</option>
            ))}
          </select>
        </div>

        <div className="uf-form-group">
          <label>Archivo Adjunto (Albaranes/Notas)</label>
          <div className="uf-file-input" style={{position: 'relative', cursor: 'pointer'}}>
            <FileText size={16} color="#64748b" />
            <strong>{avisoFileName || "Elegir archivo"}</strong>
            <input 
              type="file" 
              name="adjunto" 
              style={{opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer'}} 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setAvisoFileName(e.target.files[0].name);
                } else {
                  setAvisoFileName('');
                }
              }}
            />
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="uf-btn-save" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
          <UploadCloud size={20} /> {isSaving ? 'Guardando...' : 'Guardar Jornada'}
        </button>
      </form>
    );
  };

  const renderAvisoForm = () => {
    const plagasOpciones = [
      { id: 'Cucarachas', color: '#b91c1c' },
      { id: 'Avispas', color: '#d97706' },
      { id: 'Roedores', color: '#c2410c' },
      { id: 'Hormigas', color: '#4338ca' },
      { id: 'Termitas', color: '#78350f' },
      { id: 'Procesionaria', color: '#047857' },
      { id: 'Chinches', color: '#15803d' },
    ];

    const togglePlaga = (p) => {
      setAvisoPlagas(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    return (
      <form className="uf-form-content animate-fade-in" onSubmit={handleGuardarAviso}>

        <div className="uf-form-group" style={{position: 'relative'}}>
          <label>DIRECCIÓN (CALLE / AVENIDA) *</label>
          <div className="uf-input-icon">
            <Search size={18} color="#94a3b8" className="icon-l" />
            <input name="direccion" type="text" placeholder="Escriba para buscar calle..." required value={addressQuery} onChange={(e) => searchAddress(e.target.value)} autoComplete="off" />
          </div>
          <span className="uf-hint">El buscador sugerirá la calle; añade el portal abajo.</span>
          {addressSuggestions.length > 0 && (
            <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto'}}>
              {addressSuggestions.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleSelectAddress(item)}
                  style={{padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.9rem'}}
                >
                  <strong>{item.address?.road || item.name}</strong>
                  <div style={{fontSize: '0.8rem', color: '#64748b'}}>{item.address?.city || item.address?.town || item.address?.village}, {item.address?.state}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="uf-form-row">
          <div className="uf-form-group">
            <label>PORTAL / Nº / PISO</label>
            <input name="portal" className="uf-input-basic" type="text" placeholder="Ej. 12, 4º B..." />
          </div>
          <div className="uf-form-group">
            <label>LOCALIDAD (MUNICIPIO) *</label>
            <input name="localidad" className="uf-input-basic" type="text" placeholder="Ej. Oviedo, Gijón..." required value={localidadQuery} onChange={(e) => setLocalidadQuery(e.target.value)} />
          </div>
        </div>

        <div className="uf-form-row">
          <div className="uf-form-group">
            <label>FECHA *</label>
            <input name="fecha" className="uf-input-basic" type="date" value={selectedFecha} onChange={(e) => setSelectedFecha(e.target.value)} required />
          </div>
          <div className="uf-form-group">
            <label>HORA *</label>
            <input name="hora" className="uf-input-basic" type="time" value={editHora || getHoraActual()} onChange={(e) => setEditHora(e.target.value)} required />
          </div>
        </div>
        
        <div className="uf-form-group">
          <label>CONTACTO (TELÉFONO O NOMBRE)</label>
          <input name="contacto" className="uf-input-basic" type="text" placeholder="Ej. 600123456 - Juan" />
        </div>

        <div className="uf-form-group">
          <label>PLAGAS A TRATAR (Puedes marcar varias) *</label>
          <div className="uf-plagas-grid">
            {plagasOpciones.map(p => (
              <button 
                type="button"
                key={p.id} 
                className={`uf-plaga-btn ${avisoPlagas.includes(p.id) ? 'active' : ''}`}
                onClick={() => togglePlaga(p.id)}
              >
                <Bug size={16} color={p.color}/> {p.id}
              </button>
            ))}
          </div>
        </div>
        
        <div className="uf-form-group">
          <label>OTRAS PLAGAS (Separadas por comas)</label>
          <input 
            className="uf-input-basic" 
            type="text" 
            placeholder="Ej: Pulgas, Polillas..."
            value={avisoOtrasPlagas}
            onChange={(e) => setAvisoOtrasPlagas(e.target.value)}
          />
        </div>

        <div className="uf-form-group">
          <label>NOTAS DE TRABAJO / TRATAMIENTO</label>
          <textarea name="comentarios" className="uf-textarea" rows="3" placeholder="Describa el problema o el aviso..."></textarea>
        </div>

        <div className="uf-form-group">
          <label>FOTO / ALBARÁN (Opcional)</label>
          <div className="uf-file-input" style={{position: 'relative', cursor: 'pointer', background: avisoFileName ? '#f0fdf4' : '', border: avisoFileName ? '2px dashed #22c55e' : ''}}>
            <FileText size={16} color={avisoFileName ? "#22c55e" : "#64748b"} />
            <strong style={{color: avisoFileName ? "#15803d" : ""}}>{avisoFileName || 'Adjuntar archivo'}</strong>
            <input name="adjunto" type="file" onChange={(e) => setAvisoFileName(e.target.files[0]?.name || '')} style={{opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer'}} />
          </div>
        </div>

        <button type="submit" className="uf-btn-save" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', opacity: isUploading ? 0.7 : 1 }} disabled={isUploading}>
          <UploadCloud size={20} /> {isUploading ? 'Guardando...' : 'Guardar Aviso'}
        </button>
      </form>
    );
  };



  const renderAquappForm = () => {
    return (
      <div className="uf-form-content">
        <div className="uf-tabs-sub">
          <button 
            className={`uf-tab-sub ${aquappMode === 'muestra' ? 'active' : ''}`}
            onClick={() => setAquappMode('muestra')}
          >
            <Droplet size={16}/> Muestra
          </button>
          <button 
            className={`uf-tab-sub ${aquappMode === 'tratamiento' ? 'active' : ''}`}
            onClick={() => setAquappMode('tratamiento')}
          >
            <Wind size={16}/> Tratamiento
          </button>
          <button 
            className={`uf-tab-sub ${aquappMode === 'plagas' ? 'active' : ''}`}
            onClick={() => setAquappMode('plagas')}
          >
            <Bug size={16}/> Plagas (Cliente)
          </button>
        </div>

        {aquappMode === 'muestra' && (
          <form className="uf-form-content animate-fade-in" onSubmit={handleGuardarMuestra}>
            <div className="uf-form-group">
              <label>TIPO DE MUESTRA</label>
              <select 
                className="uf-select-basic"
                value={tipoMuestra}
                onChange={(e) => setTipoMuestra(e.target.value)}
              >
                <option value="Estandar">💧 Estándar (Grifo / Red)</option>
                <option value="Torre">🌬️ Torre de Refrigeración</option>
                <option value="Piscina">🏊 Piscina</option>
                <option value="Jacuzzi">🛀 Jacuzzi / Vaso</option>
              </select>
            </div>

            <div className="uf-form-group">
              <label>CLIENTE</label>
              <select 
                name="cliente_id" 
                className="uf-select-basic"
                value={selectedClienteId}
                onChange={handleClienteChange}
              >
                <option value="">Seleccionar cliente...</option>
                <option value="_custom_" style={{fontWeight: 'bold', color: '#8b5cf6'}}>+ Escribir cliente puntual...</option>
                {clientesGlobales.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selectedClienteId === '_custom_' && (
                <div style={{marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#475569'}}>
                  <span style={{fontWeight: 'bold'}}>Puntual:</span> {customClienteName}
                </div>
              )}
            </div>

            <div className="uf-form-row">
              <div className="uf-form-group">
                <label>FECHA</label>
                <input name="fecha" className="uf-input-basic" type="date" value={selectedFecha} onChange={(e) => setSelectedFecha(e.target.value)} />
              </div>
              <div className="uf-form-group">
                <label>HORA</label>
                <input name="hora" className="uf-input-basic" type="time" value={editHora || getHoraActual()} onChange={(e) => setEditHora(e.target.value)} />
              </div>
            </div>

            <div className="uf-form-row">
              <div className="uf-form-group">
                <label>NÚMERO DE MUESTRA</label>
                <input name="numero_muestra" className="uf-input-basic" type="text" value={sugerenciaMuestra} onChange={(e) => setSugerenciaMuestra(e.target.value)} />
              </div>
              <div className="uf-form-group">
                <label>CÓD. ENVASE LAB</label>
                <input name="cod_envase" className="uf-input-basic" type="text" placeholder="Ej: 2603885" value={editCodEnvase} onChange={(e) => setEditCodEnvase(e.target.value)} />
              </div>
            </div>

            <div className="uf-form-group">
              <label>DESCRIPCIÓN</label>
              <textarea name="descripcion" className="uf-textarea" rows="2" placeholder="Observaciones..." value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)}></textarea>
            </div>

            <div className="uf-section-title">
              <Droplet size={18} /> PARÁMETROS {tipoMuestra === 'Torre' ? 'DE TORRE' : 'ESTÁNDAR'}
            </div>

            <div className="uf-form-row">
              <div className="uf-form-group">
                <label>PH</label>
                <input name="ph" className="uf-input-basic" type="text" placeholder="0-14" value={editPh} onChange={(e) => setEditPh(e.target.value)} />
              </div>
              <div className="uf-form-group">
                <label>TEMP (°C)</label>
                <input name="temp" className="uf-input-basic" type="text" placeholder="°C" value={editTemp} onChange={(e) => setEditTemp(e.target.value)} />
              </div>
            </div>

            {tipoMuestra === 'Torre' ? (
              <>
                <div className="uf-form-row">
                  <div className="uf-form-group">
                    <label>CONDUCTIV.</label>
                    <input name="conductividad" className="uf-input-basic" type="text" placeholder="mS/cm" value={editConductividad} onChange={(e) => setEditConductividad(e.target.value)} />
                  </div>
                  <div className="uf-form-group">
                    <label>TURBIDEZ</label>
                    <input name="turbidez" className="uf-input-basic" type="text" placeholder="NTU" value={editTurbidez} onChange={(e) => setEditTurbidez(e.target.value)} />
                  </div>
                </div>
                <div className="uf-form-row">
                  <div className="uf-form-group">
                    <label>HIERRO</label>
                    <input name="hierro" className="uf-input-basic" type="text" value={editHierro} onChange={(e) => setEditHierro(e.target.value)} />
                  </div>
                  <div className="uf-form-group">
                    <label>LIMPIEZA</label>
                    <input name="limpieza" className="uf-input-basic" type="text" placeholder="OK / Sucia" value={editLimpieza} onChange={(e) => setEditLimpieza(e.target.value)} />
                  </div>
                </div>

                <div className="uf-section-title"><Wind size={18} /> BIOCIDAS (VALORES KIT)</div>
                <div className="uf-form-row">
                  <div className="uf-form-group">
                    <label>F-8583 (KIT)</label>
                    <input name="f_8583_kit" className="uf-input-basic" type="text" value={editF8583} onChange={(e) => setEditF8583(e.target.value)} />
                  </div>
                  <div className="uf-form-group">
                    <label>F-8580 (TOTAL)</label>
                    <input name="f_8580_total" className="uf-input-basic" type="text" value={editF8580} onChange={(e) => setEditF8580(e.target.value)} />
                  </div>
                </div>

                <div className="uf-section-title"><Briefcase size={18} /> MATERIAL ENTREGADO</div>
                <div className="uf-form-row">
                  <div className="uf-form-group">
                    <label>F-8583</label>
                    <input name="mat_f_8583" className="uf-input-basic" type="text" placeholder="Ej: 1 Garrafa" value={editMatF8583} onChange={(e) => setEditMatF8583(e.target.value)} />
                  </div>
                  <div className="uf-form-group">
                    <label>F-8580</label>
                    <input name="mat_f_8580" className="uf-input-basic" type="text" placeholder="Ej: 1 Garrafa" value={editMatF8580} onChange={(e) => setEditMatF8580(e.target.value)} />
                  </div>
                </div>
                <div className="uf-form-row">
                  <div className="uf-form-group">
                    <label>F-8481</label>
                    <input name="mat_f_8481" className="uf-input-basic" type="text" placeholder="Ej: 1 Garrafa" value={editMatF8481} onChange={(e) => setEditMatF8481(e.target.value)} />
                  </div>
                  <div className="uf-form-group">
                    <label>A-4170 / 645D</label>
                    <input name="mat_a_4170" className="uf-input-basic" type="text" placeholder="Ej: 1 Garrafa" value={editMatA4170} onChange={(e) => setEditMatA4170(e.target.value)} />
                  </div>
                </div>
              </>
            ) : (
              <div className="uf-form-row">
                <div className="uf-form-group">
                  <label>CLORO (MG/L)</label>
                  <input name="cloro" className="uf-input-basic" type="text" placeholder="mg/L" value={editCloro} onChange={(e) => setEditCloro(e.target.value)} />
                </div>
                <div className="uf-form-group">
                  <label>HIERRO (MG/L)</label>
                  <input name="hierro" className="uf-input-basic" type="text" placeholder="mg/L" value={editHierro} onChange={(e) => setEditHierro(e.target.value)} />
                </div>
              </div>
            )}
            
            <button type="submit" className="uf-btn-save" style={{ background: editingItem ? '#f59e0b' : '#3b82f6', marginTop: '16px' }}>
              <UploadCloud size={20} /> {editingItem ? 'Actualizar Registro' : 'Guardar Registro'}
            </button>
          </form>
        )}

        {aquappMode === 'tratamiento' && (
          <form className="uf-form-content animate-fade-in" onSubmit={handleGuardarTratamiento}>
            <div className="uf-form-group">
              <label>CLIENTE</label>
              <select name="cliente_id" className="uf-select-basic" value={selectedClienteId} onChange={handleClienteChange}>
                <option value="">Seleccionar cliente...</option>
                <option value="_custom_" style={{fontWeight: 'bold', color: '#8b5cf6'}}>+ Escribir cliente puntual...</option>
                {clientesGlobales.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selectedClienteId === '_custom_' && (
                <div style={{marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#475569'}}>
                  <span style={{fontWeight: 'bold'}}>Puntual:</span> {customClienteName}
                </div>
              )}
            </div>

            <div className="uf-form-row">
              <div className="uf-form-group">
                <label>FECHA</label>
                <input name="fecha" className="uf-input-basic" type="date" value={selectedFecha} onChange={(e) => setSelectedFecha(e.target.value)} />
              </div>
              <div className="uf-form-group">
                <label>HORA</label>
                <input name="hora" className="uf-input-basic" type="time" value={editHora || getHoraActual()} onChange={(e) => setEditHora(e.target.value)} />
              </div>
            </div>

            <div className="uf-form-group">
              <label>TIPO DE TRATAMIENTO</label>
              <div className="uf-grid-2">
                <button type="button" className={`uf-btn-toggle ${tipoTratamiento==='Hipercloracion'?'active-purp':''}`} onClick={()=>setTipoTratamiento('Hipercloracion')}>Hipercloración</button>
                <button type="button" className={`uf-btn-toggle ${tipoTratamiento==='Choque'?'active-pink':''}`} onClick={()=>setTipoTratamiento('Choque')}>Choque Térmico</button>
                <button type="button" className={`uf-btn-toggle ${tipoTratamiento==='LimpTorres'?'active-blue':''}`} onClick={()=>setTipoTratamiento('LimpTorres')}>Limp. Torres</button>
                <button type="button" className={`uf-btn-toggle ${tipoTratamiento==='LimpDep'?'active-green':''}`} onClick={()=>setTipoTratamiento('LimpDep')}>Limp. Depósitos</button>
              </div>
            </div>

            <div className="uf-form-group">
              <label>MOTIVO</label>
              <div className="uf-grid-2">
                <button type="button" className={`uf-btn-toggle ${motivoTrat==='Prevencion'?'active-green':''}`} onClick={()=>setMotivoTrat('Prevencion')}>Prevención</button>
                <button type="button" className={`uf-btn-toggle ${motivoTrat==='Recuento'?'active-red':''}`} onClick={()=>setMotivoTrat('Recuento')}>Recuento Alto</button>
              </div>
            </div>

            <div className="uf-form-group">
              <label>OBSERVACIONES</label>
              <textarea name="notas" className="uf-textarea" rows="2" placeholder="Notas opcionales..." value={editNotas} onChange={(e) => setEditNotas(e.target.value)}></textarea>
            </div>

            <div className="uf-recordatorio-box">
              <label className="uf-checkbox-label">
                <input type="checkbox" name="recordatorio" defaultChecked />
                <span>🔔 AÑADIR RECORDATORIO PARA TOMA DE MUESTRA</span>
              </label>
              <div className="uf-form-group" style={{marginTop: '12px'}}>
                <label>AVISAR DESPUÉS DE (DÍAS):</label>
                <input name="recordatorio_dias" className="uf-input-basic" type="number" defaultValue="15" />
              </div>
            </div>

            <button type="submit" className="uf-btn-save" style={{ background: editingItem ? '#f59e0b' : '#ef4444', marginTop: '16px' }}>
              <UploadCloud size={20} /> {editingItem ? 'Actualizar Tratamiento' : 'Guardar Tratamiento'}
            </button>
          </form>
        )}

        {aquappMode === 'plagas' && (
          <form className="uf-subform animate-fade-in" onSubmit={handleGuardarPlaga}>
            <div className="uf-form-group">
              <label>CLIENTE *</label>
              <select name="cliente_id" className="uf-select-basic" required value={selectedClienteId} onChange={handleClienteChange}>
                <option value="">Seleccionar cliente...</option>
                <option value="_custom_" style={{fontWeight: 'bold', color: '#8b5cf6'}}>+ Escribir cliente puntual...</option>
                {clientesGlobales.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selectedClienteId === '_custom_' && (
                <div style={{marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#475569'}}>
                  <span style={{fontWeight: 'bold'}}>Puntual:</span> {customClienteName}
                </div>
              )}
            </div>

            <div className="uf-form-row">
              <div className="uf-form-group">
                <label>FECHA *</label>
                <input name="fecha" className="uf-input-basic" type="date" value={selectedFecha} onChange={(e) => setSelectedFecha(e.target.value)} required />
              </div>
              <div className="uf-form-group">
                <label>HORA</label>
                <input name="hora" className="uf-input-basic" type="time" value={editHora || getHoraActual()} onChange={(e) => setEditHora(e.target.value)} />
              </div>
            </div>

            <div className="uf-form-group">
              <label>TIPO DE ACTUACIÓN *</label>
              <select name="tipo_actuacion" className="uf-select-basic" required value={editTipoActuacion} onChange={(e) => setEditTipoActuacion(e.target.value)}>
                <option value="">Seleccionar tipo...</option>
                <option value="Revision">Revisión</option>
                <option value="Aviso">Aviso</option>
              </select>
            </div>

            <div className="uf-form-row" style={{ marginTop: '24px' }}>
              <button type="submit" className="uf-btn-save" style={{ background: editingItem ? '#f59e0b' : '#16a34a', padding: '12px' }}>
                {editingItem ? 'Actualizar' : 'Guardar'}
              </button>
              <button type="button" className="uf-btn-save" style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '12px' }} onClick={handleClose}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderProductoForm = () => {
    return (
      <form className="uf-form-content animate-fade-in" onSubmit={handleGuardarProducto}>
        <div className="uf-form-group">
          <label>Categoría</label>
          <select className="uf-select-basic" name="categoria">
            <option>Insecticidas</option>
            <option>Rodenticidas</option>
            <option>Biocidas y Otros</option>
          </select>
        </div>

        <div className="uf-form-group">
          <label>Nombre Comercial *</label>
          <input className="uf-input-basic" type="text" name="nombre" required />
        </div>

        <div className="uf-form-group">
          <label>Materia Activa / Composición</label>
          <input className="uf-input-basic" type="text" name="materia_activa" />
        </div>

        <div className="uf-form-group">
          <label>Plaga Diana (Principal)</label>
          <input className="uf-input-basic" type="text" name="plaga_diana" placeholder="Ej: Cucarachas, Roedores" />
        </div>

        <div className="uf-form-group">
          <label>Nº Registro</label>
          <input className="uf-input-basic" type="text" name="registro" />
        </div>

        <div className="uf-form-group">
          <label>Lote</label>
          <input className="uf-input-basic" type="text" name="lote" placeholder="Ej: L-12345" />
        </div>

        <div className="uf-form-group">
          <label>Plazo de Seguridad</label>
          <input className="uf-input-basic" type="text" name="plazo_seguridad" placeholder="Ej: 15 días, NA" />
        </div>

        <div className="uf-form-group">
          <label>Método de Aplicación</label>
          <input className="uf-input-basic" type="text" name="metodo_aplicacion" placeholder="Ej: Pulverización, Cebo" />
        </div>

        <div className="uf-form-group">
          <label>Fecha de Caducidad</label>
          <div className="uf-input-icon right">
            <input type="date" name="caducidad" className="uf-input-basic" style={{paddingRight: '40px'}} />
          </div>
        </div>

        <div className="uf-form-group">
          <label>Foto del Producto (Miniatura)</label>
          <div className="uf-file-input" style={{position: 'relative'}}>
            <input type="file" name="foto_producto" accept="image/*" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}} />
            <Camera size={16} color="#64748b" />
            <strong>Adjuntar Foto (JPG/PNG)</strong>
          </div>
          <span className="uf-hint">Esta será la imagen visible en las tarjetas del catálogo.</span>
        </div>

        <div className="uf-form-group">
          <label>Ficha de Seguridad (SDS)</label>
          <div className="uf-file-input" style={{position: 'relative'}}>
            <input type="file" name="ficha_sds" accept="application/pdf,image/*" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}} />
            <FileText size={16} color="#64748b" />
            <strong>Adjuntar Ficha (PDF/Imagen)</strong>
          </div>
          <span className="uf-hint">Si ya tiene una ficha, puedes subir una nueva para reemplazarla.</span>
        </div>

        <button type="submit" className="uf-btn-save" style={{ background: '#3b82f6', marginTop: '16px' }}>
          Guardar Producto
        </button>
      </form>
    );
  };

  const renderForm = () => {
    const typeInfo = formTypes.find(t => t.id === selectedType);
    return (
      <div className="uf-step animate-fade-in">
        <div className="uf-form-header">
          <button className="uf-btn-back" onClick={() => setSelectedType(null)}>Atrás</button>
          <div className="uf-badge" style={{ backgroundColor: typeInfo.color }}>
            {typeInfo.icon} {typeInfo.title}
          </div>
        </div>
        
        {selectedType === 'jornada' && renderJornadaForm()}
        {selectedType === 'aviso' && renderAvisoForm()}
        {selectedType === 'muestra' && renderAquappForm()}
        {selectedType === 'producto' && renderProductoForm()}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <button className={`uf-fab ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(true)}>
        <Plus size={32} />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="uf-overlay" onClick={handleClose}>
          <div className="uf-modal" onClick={e => e.stopPropagation()}>
            <div className="uf-modal-header">
              <h2>Nuevo Registro</h2>
              <button className="uf-btn-close" onClick={handleClose}>
                <X size={24} />
              </button>
            </div>
            
            <div className="uf-modal-body">
              {!selectedType ? renderSelector() : renderForm()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UniversalForm;

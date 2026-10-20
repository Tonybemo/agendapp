import { supabase } from './supabase';

export const QUEUE_MUESTRAS_KEY = 'offline_muestras_queue';
export const QUEUE_TRATAMIENTOS_KEY = 'offline_tratamientos_queue';
export const QUEUE_AVISOS_KEY = 'offline_avisos_queue';
export const CACHE_CLIENTES_KEY = 'offline_cache_clientes';
export const CACHE_TAREAS_KEY = 'offline_cache_tareas';

export const withTimeout = (promise, ms = 3500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
};

export const isNetworkFailure = (error) => {
  if (!navigator.onLine) return true;
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  const name = String(error.name || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('net::') ||
    msg.includes('abort') ||
    name.includes('typeerror') ||
    error.status === 0 ||
    error.status === 504 ||
    error.status === 503 ||
    error.status === 502 ||
    error.code === 'PGRST301'
  );
};

export const getOfflineQueue = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return [];
  }
};

export const saveOfflineRecord = (queueKey, record) => {
  try {
    const queue = getOfflineQueue(queueKey);
    const offlineRecord = {
      ...record,
      id: record.id || `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      _offlineId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      _offline: true,
      _savedAt: new Date().toISOString()
    };
    queue.push(offlineRecord);
    localStorage.setItem(queueKey, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('offline-queue-updated'));
    return offlineRecord;
  } catch (e) {
    console.error(`Error saving to ${queueKey}:`, e);
    throw e;
  }
};

export const getPendingOfflineCount = () => {
  const m = getOfflineQueue(QUEUE_MUESTRAS_KEY).length;
  const t = getOfflineQueue(QUEUE_TRATAMIENTOS_KEY).length;
  const a = getOfflineQueue(QUEUE_AVISOS_KEY).length;
  return m + t + a;
};

export const preloadOfflineCache = async () => {
  if (!navigator.onLine) return;
  try {
    const [clientesRes, tareasRes] = await withTimeout(
      Promise.all([
        supabase.from('clientes').select('id, name').order('name'),
        supabase.from('tareas_estandar').select('id, name').order('name')
      ]),
      4000
    );
    if (clientesRes?.data && clientesRes.data.length > 0) {
      localStorage.setItem(CACHE_CLIENTES_KEY, JSON.stringify(clientesRes.data));
    }
    if (tareasRes?.data && tareasRes.data.length > 0) {
      localStorage.setItem(CACHE_TAREAS_KEY, JSON.stringify(tareasRes.data));
    }
  } catch (e) {
    // Silently ignore cache preloading errors
  }
};

let isSyncing = false;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MUESTRA_COLUMNS = [
  'cliente_id', 'cliente_nombre', 'tipo_muestra', 'fecha', 'hora',
  'numero_muestra', 'cod_envase', 'descripcion', 'ph', 'temp',
  'conductividad', 'turbidez', 'hierro', 'limpieza', 'cloro',
  'f_8583_kit', 'f_8580_total', 'mat_f_8583', 'mat_f_8580',
  'mat_f_8481', 'mat_a_4170', 'mat_a_645d'
];

const TRATAMIENTO_COLUMNS = [
  'cliente_id', 'cliente_nombre', 'tipo_tratamiento', 'motivo',
  'fecha', 'hora', 'notas', 'recordatorio', 'recordatorio_dias'
];

const AVISO_COLUMNS = [
  'numero_aviso', 'direccion', 'portal', 'localidad', 'fecha',
  'hora', 'plagas', 'comentarios', 'contacto', 'adjunto', 'estado'
];

const cleanRecordForTable = (item, allowedColumns) => {
  const cleaned = {};
  for (const col of allowedColumns) {
    if (item[col] !== undefined) {
      cleaned[col] = item[col];
    }
  }
  if ('cliente_id' in cleaned) {
    if (!cleaned.cliente_id || !UUID_REGEX.test(String(cleaned.cliente_id).trim())) {
      cleaned.cliente_id = null;
    } else {
      cleaned.cliente_id = String(cleaned.cliente_id).trim();
    }
  }
  return cleaned;
};

export const syncAllOfflineData = async (toast) => {
  if (isSyncing || !navigator.onLine) return { totalSynced: 0, totalFailed: 0, lastError: null };

  const totalPending = getPendingOfflineCount();
  if (totalPending === 0) return { totalSynced: 0, totalFailed: 0, lastError: null };

  isSyncing = true;
  window.dispatchEvent(new CustomEvent('offline-sync-started'));

  let syncedMuestras = 0;
  let syncedTratamientos = 0;
  let syncedAvisos = 0;
  let lastErrorMsg = null;

  try {
    const muestrasQueue = getOfflineQueue(QUEUE_MUESTRAS_KEY);
    if (muestrasQueue.length > 0) {
      const remainingMuestras = [];
      for (let i = 0; i < muestrasQueue.length; i++) {
        const item = muestrasQueue[i];
        const id = item.id;
        const cleanRecord = cleanRecordForTable(item, MUESTRA_COLUMNS);

        try {
          // Si no tenía cliente_id válido pero sí cliente_nombre, intentar vincular con el cliente en la nube
          if (!cleanRecord.cliente_id && cleanRecord.cliente_nombre) {
            try {
              const { data: cliMatch } = await withTimeout(
                supabase.from('clientes').select('id').ilike('name', String(cleanRecord.cliente_nombre).trim()).limit(1),
                5000
              );
              if (cliMatch && cliMatch.length > 0) {
                cleanRecord.cliente_id = cliMatch[0].id;
              }
            } catch (e) {}
          }

          // Protección contra duplicados en zona de cobertura débil:
          let alreadyExists = false;

          // 1. Por ID real de UUID
          if (id && UUID_REGEX.test(String(id).trim())) {
            const { data: exId } = await withTimeout(
              supabase.from('aquapp_muestras').select('id').eq('id', String(id).trim()).limit(1),
              6000
            );
            if (exId && exId.length > 0) alreadyExists = true;
          }

          // 2. Por código de envase único (si el frasco escaneado ya fue insertado)
          if (!alreadyExists && cleanRecord.cod_envase && String(cleanRecord.cod_envase).trim().length > 0) {
            const { data: exEnv } = await withTimeout(
              supabase.from('aquapp_muestras').select('id').eq('cod_envase', String(cleanRecord.cod_envase).trim()).limit(1),
              6000
            );
            if (exEnv && exEnv.length > 0) alreadyExists = true;
          }

          if (alreadyExists) {
            console.log("Muestra offline ya confirmada en Supabase (evitado duplicado real):", cleanRecord);
            syncedMuestras++;
            autoCompleteMuestraTasks(cleanRecord).catch(() => {});
            continue;
          }

          // Preparar payload para insertar
          const payload = { ...cleanRecord };
          if (id && UUID_REGEX.test(String(id).trim())) {
            payload.id = String(id).trim();
          }

          let res = await withTimeout(supabase.from('aquapp_muestras').insert([payload]), 10000);

          // Fallback 1: si falla por conflicto de ID, reintentar sin ID para que Supabase genere uno nuevo
          if (res.error && payload.id && !isNetworkFailure(res.error)) {
            const payloadNoId = { ...cleanRecord };
            res = await withTimeout(supabase.from('aquapp_muestras').insert([payloadNoId]), 10000);
          }

          // Fallback 2: si falla por clave foránea de cliente_id, reintentar con cliente_id = null conservando cliente_nombre
          if (res.error && cleanRecord.cliente_id && !isNetworkFailure(res.error)) {
            const payloadNoCliId = { ...cleanRecord, cliente_id: null };
            res = await withTimeout(supabase.from('aquapp_muestras').insert([payloadNoCliId]), 10000);
          }

          if (!res.error) {
            syncedMuestras++;
            autoCompleteMuestraTasks(cleanRecord).catch(() => {});
          } else {
            console.error("Error sincronizando muestra individual:", res.error, cleanRecord);
            lastErrorMsg = res.error?.message || 'Error al subir muestra';
            remainingMuestras.push({
              ...item,
              _lastSyncError: lastErrorMsg,
              _lastAttempt: new Date().toISOString()
            });
            if (isNetworkFailure(res.error)) {
              remainingMuestras.push(...muestrasQueue.slice(i + 1));
              break;
            }
          }
        } catch (err) {
          console.error("Error en muestra (excepción):", err);
          lastErrorMsg = err?.message || 'Fallo de red';
          remainingMuestras.push({
            ...item,
            _lastSyncError: lastErrorMsg,
            _lastAttempt: new Date().toISOString()
          });
          if (isNetworkFailure(err)) {
            remainingMuestras.push(...muestrasQueue.slice(i + 1));
            break;
          }
        }
      }
      localStorage.setItem(QUEUE_MUESTRAS_KEY, JSON.stringify(remainingMuestras));
    }

    const tratQueue = getOfflineQueue(QUEUE_TRATAMIENTOS_KEY);
    if (tratQueue.length > 0) {
      const remainingTrat = [];
      for (let i = 0; i < tratQueue.length; i++) {
        const item = tratQueue[i];
        const cleanRecord = cleanRecordForTable(item, TRATAMIENTO_COLUMNS);
        try {
          if (!cleanRecord.cliente_id && cleanRecord.cliente_nombre) {
            try {
              const { data: cliMatch } = await withTimeout(
                supabase.from('clientes').select('id').ilike('name', String(cleanRecord.cliente_nombre).trim()).limit(1),
                5000
              );
              if (cliMatch && cliMatch.length > 0) {
                cleanRecord.cliente_id = cliMatch[0].id;
              }
            } catch (e) {}
          }

          // Comprobar si ya existe por fecha y tipo
          let alreadyExists = false;
          if (cleanRecord.fecha && cleanRecord.tipo_tratamiento) {
            let q = supabase.from('aquapp_tratamientos')
              .select('id')
              .eq('fecha', cleanRecord.fecha)
              .eq('tipo_tratamiento', cleanRecord.tipo_tratamiento);
            if (cleanRecord.cliente_id) q = q.eq('cliente_id', cleanRecord.cliente_id);
            const { data: exT } = await withTimeout(q.limit(1), 6000);
            if (exT && exT.length > 0) alreadyExists = true;
          }

          if (alreadyExists) {
            syncedTratamientos++;
            continue;
          }

          let res = await withTimeout(supabase.from('aquapp_tratamientos').insert([cleanRecord]), 10000);
          if (res.error && cleanRecord.cliente_id && !isNetworkFailure(res.error)) {
            res = await withTimeout(supabase.from('aquapp_tratamientos').insert([{ ...cleanRecord, cliente_id: null }]), 10000);
          }

          if (!res.error) {
            syncedTratamientos++;
          } else {
            console.error("Error sincronizando tratamiento:", res.error, cleanRecord);
            lastErrorMsg = res.error?.message || 'Error al subir tratamiento';
            remainingTrat.push({
              ...item,
              _lastSyncError: lastErrorMsg,
              _lastAttempt: new Date().toISOString()
            });
            if (isNetworkFailure(res.error)) {
              remainingTrat.push(...tratQueue.slice(i + 1));
              break;
            }
          }
        } catch (err) {
          console.error("Excepción sincronizando tratamiento:", err);
          lastErrorMsg = err?.message || 'Fallo de red';
          remainingTrat.push({
            ...item,
            _lastSyncError: lastErrorMsg,
            _lastAttempt: new Date().toISOString()
          });
          if (isNetworkFailure(err)) {
            remainingTrat.push(...tratQueue.slice(i + 1));
            break;
          }
        }
      }
      localStorage.setItem(QUEUE_TRATAMIENTOS_KEY, JSON.stringify(remainingTrat));
    }

    const avisosQueue = getOfflineQueue(QUEUE_AVISOS_KEY);
    if (avisosQueue.length > 0) {
      const remainingAvisos = [];
      for (let i = 0; i < avisosQueue.length; i++) {
        const item = avisosQueue[i];
        const cleanRecord = cleanRecordForTable(item, AVISO_COLUMNS);
        try {
          // Comprobar si ya existe por número de aviso
          let alreadyExists = false;
          if (cleanRecord.numero_aviso) {
            const { data: exA } = await withTimeout(
              supabase.from('avisomap_avisos').select('id').eq('numero_aviso', cleanRecord.numero_aviso).limit(1),
              6000
            );
            if (exA && exA.length > 0) alreadyExists = true;
          }

          if (alreadyExists) {
            syncedAvisos++;
            continue;
          }

          const res = await withTimeout(supabase.from('avisomap_avisos').insert([cleanRecord]), 10000);
          if (!res.error) {
            syncedAvisos++;
          } else {
            console.error("Error sincronizando aviso:", res.error, cleanRecord);
            lastErrorMsg = res.error?.message || 'Error al subir aviso';
            remainingAvisos.push({
              ...item,
              _lastSyncError: lastErrorMsg,
              _lastAttempt: new Date().toISOString()
            });
            if (isNetworkFailure(res.error)) {
              remainingAvisos.push(...avisosQueue.slice(i + 1));
              break;
            }
          }
        } catch (err) {
          console.error("Excepción sincronizando aviso:", err);
          lastErrorMsg = err?.message || 'Fallo de red';
          remainingAvisos.push({
            ...item,
            _lastSyncError: lastErrorMsg,
            _lastAttempt: new Date().toISOString()
          });
          if (isNetworkFailure(err)) {
            remainingAvisos.push(...avisosQueue.slice(i + 1));
            break;
          }
        }
      }
      localStorage.setItem(QUEUE_AVISOS_KEY, JSON.stringify(remainingAvisos));
    }

    const totalSynced = syncedMuestras + syncedTratamientos + syncedAvisos;
    if (totalSynced > 0) {
      const msg = `✅ Sincronización completada: ${totalSynced} registro${totalSynced > 1 ? 's' : ''} subido${totalSynced > 1 ? 's' : ''} a la nube.`;
      if (toast) toast.success(msg);
      else window.__toast?.success(msg);

      window.dispatchEvent(new CustomEvent('aquapp-refresh-data'));
      window.dispatchEvent(new CustomEvent('refresh-avisomap'));
    }
    const remainingAfter = getPendingOfflineCount();
    return { totalSynced, totalFailed: remainingAfter, lastError: lastErrorMsg };
  } catch (globalErr) {
    console.error("Error global en sincronización offline:", globalErr);
    return { totalSynced: 0, totalFailed: getPendingOfflineCount(), lastError: globalErr?.message || 'Error desconocido' };
  } finally {
    isSyncing = false;
    window.dispatchEvent(new CustomEvent('offline-queue-updated'));
    window.dispatchEvent(new CustomEvent('offline-sync-finished'));
  }
};

const autoCompleteMuestraTasks = async (record) => {
  try {
    const now = new Date();
    const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesActual = mesesNombres[now.getMonth()];
    const añoActual = now.getFullYear();

    let query = supabase.from('tareas_programadas')
      .select('*, clientes(name)')
      .eq('mes', mesActual)
      .eq('año', añoActual);

    if (record.cliente_id) {
      query = query.eq('cliente_id', record.cliente_id);
    }

    const { data: tareasData } = await query;
    if (tareasData && tareasData.length > 0) {
      let tareasDelCliente = tareasData;
      if (!record.cliente_id && record.cliente_nombre) {
        tareasDelCliente = tareasData.filter(t => {
          if (t.frecuencia && t.frecuencia.includes(':')) {
            const tName = t.frecuencia.split(':').slice(1).join(':').trim().toLowerCase();
            return tName === record.cliente_nombre.toLowerCase();
          }
          return false;
        });
      }

      const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      for (const tarea of tareasDelCliente) {
        const tasks = tarea.tareas_json || [];
        let updated = false;
        const newTasks = tasks.map(task => {
          if (task.status === 'pending' && task.name.toLowerCase().includes('muestra')) {
            updated = true;
            return { ...task, status: 'completed', date: todayStr, auto: true };
          }
          return task;
        });
        if (updated) {
          await supabase.from('tareas_programadas').update({ tareas_json: newTasks }).eq('id', tarea.id);
        }
      }
    }
  } catch (e) {
    console.warn("Auto-completar tareas offline skipped:", e);
  }
};

export const getAllPendingRecords = () => {
  const m = getOfflineQueue(QUEUE_MUESTRAS_KEY).map(item => ({ ...item, _queueType: 'muestra' }));
  const t = getOfflineQueue(QUEUE_TRATAMIENTOS_KEY).map(item => ({ ...item, _queueType: 'tratamiento' }));
  const a = getOfflineQueue(QUEUE_AVISOS_KEY).map(item => ({ ...item, _queueType: 'aviso' }));
  return [...m, ...t, ...a];
};

export const deleteOfflineRecord = (queueType, id) => {
  let key = QUEUE_MUESTRAS_KEY;
  if (queueType === 'tratamiento') key = QUEUE_TRATAMIENTOS_KEY;
  if (queueType === 'aviso') key = QUEUE_AVISOS_KEY;
  const q = getOfflineQueue(key);
  const filtered = q.filter(x => x.id !== id && x._offlineId !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent('offline-queue-updated'));
};


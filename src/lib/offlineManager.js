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

export const syncAllOfflineData = async (toast) => {
  if (isSyncing || !navigator.onLine) return;

  const totalPending = getPendingOfflineCount();
  if (totalPending === 0) return;

  isSyncing = true;
  window.dispatchEvent(new CustomEvent('offline-sync-started'));

  let syncedMuestras = 0;
  let syncedTratamientos = 0;
  let syncedAvisos = 0;

  try {
    const muestrasQueue = getOfflineQueue(QUEUE_MUESTRAS_KEY);
    if (muestrasQueue.length > 0) {
      const remainingMuestras = [];
      for (const item of muestrasQueue) {
        const { _offlineId, _offline, _savedAt, id, ...cleanRecord } = item;
        try {
          const res = await withTimeout(supabase.from('aquapp_muestras').insert([cleanRecord]), 4500);
          if (!res.error) {
            syncedMuestras++;
            autoCompleteMuestraTasks(cleanRecord).catch(() => {});
          } else if (isNetworkFailure(res.error)) {
            remainingMuestras.push(item);
            break;
          } else {
            console.error("Error sincronizando muestra individual:", res.error, cleanRecord);
          }
        } catch (err) {
          if (isNetworkFailure(err)) {
            remainingMuestras.push(item);
            break;
          }
          console.error("Error en muestra (excepción):", err);
        }
      }
      localStorage.setItem(QUEUE_MUESTRAS_KEY, JSON.stringify(remainingMuestras));
    }

    const tratQueue = getOfflineQueue(QUEUE_TRATAMIENTOS_KEY);
    if (tratQueue.length > 0) {
      const remainingTrat = [];
      for (const item of tratQueue) {
        const { _offlineId, _offline, _savedAt, id, ...cleanRecord } = item;
        try {
          const res = await withTimeout(supabase.from('aquapp_tratamientos').insert([cleanRecord]), 4500);
          if (!res.error) {
            syncedTratamientos++;
          } else if (isNetworkFailure(res.error)) {
            remainingTrat.push(item);
            break;
          } else {
            console.error("Error sincronizando tratamiento:", res.error, cleanRecord);
          }
        } catch (err) {
          if (isNetworkFailure(err)) {
            remainingTrat.push(item);
            break;
          }
        }
      }
      localStorage.setItem(QUEUE_TRATAMIENTOS_KEY, JSON.stringify(remainingTrat));
    }

    const avisosQueue = getOfflineQueue(QUEUE_AVISOS_KEY);
    if (avisosQueue.length > 0) {
      const remainingAvisos = [];
      for (const item of avisosQueue) {
        const { _offlineId, _offline, _savedAt, id, ...cleanRecord } = item;
        try {
          const res = await withTimeout(supabase.from('avisomap_avisos').insert([cleanRecord]), 4500);
          if (!res.error) {
            syncedAvisos++;
          } else if (isNetworkFailure(res.error)) {
            remainingAvisos.push(item);
            break;
          }
        } catch (err) {
          if (isNetworkFailure(err)) {
            remainingAvisos.push(item);
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
  } catch (globalErr) {
    console.error("Error global en sincronización offline:", globalErr);
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

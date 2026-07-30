const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jwgolcqetypdupouezxv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Z29sY3FldHlwZHVwb3Vlenh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTAzMTgsImV4cCI6MjEwMDQ4NjMxOH0.IsGhWJZ_aHmdmfIBPL2yJFgPzoxXpdJlQb4GBNERoS0');

async function run() {
  console.log('Fetching all clientes...');
  let allClientes = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('clientes').select('id, name').range(from, from + 999);
    if (!data || data.length === 0) break;
    allClientes = allClientes.concat(data);
    from += 1000;
  }
  
  console.log(`Fetched ${allClientes.length} clientes.`);
  let clientMap = {};
  allClientes.forEach(c => clientMap[c.name.trim().toLowerCase()] = c.id);

  console.log('Fetching all muestras without cliente_id...');
  let allMuestras = [];
  from = 0;
  while (true) {
    const { data } = await supabase.from('aquapp_muestras').select('id, cliente_nombre').is('cliente_id', null).range(from, from + 999);
    if (!data || data.length === 0) break;
    allMuestras = allMuestras.concat(data);
    from += 1000;
  }
  
  console.log(`Found ${allMuestras.length} muestras to update.`);

  for (let m of allMuestras) {
    if (!m.cliente_nombre) continue;
    let nameKey = m.cliente_nombre.trim().toLowerCase();
    
    let cid = clientMap[nameKey];
    if (!cid) {
      // Create new client
      console.log(`Creating missing client: ${m.cliente_nombre}`);
      const { data: newC, error } = await supabase.from('clientes').insert([{ name: m.cliente_nombre.trim() }]).select();
      if (newC && newC[0]) {
        cid = newC[0].id;
        clientMap[nameKey] = cid;
      }
    }
    
    if (cid) {
      await supabase.from('aquapp_muestras').update({ cliente_id: cid }).eq('id', m.id);
    }
  }
  console.log('Done linking muestras!');
  
  // Also link tratamientos just in case!
  let allTrat = [];
  from = 0;
  while (true) {
    const { data } = await supabase.from('aquapp_tratamientos').select('id, cliente_nombre').is('cliente_id', null).range(from, from + 999);
    if (!data || data.length === 0) break;
    allTrat = allTrat.concat(data);
    from += 1000;
  }
  console.log(`Found ${allTrat.length} tratamientos to update.`);
  for (let m of allTrat) {
    if (!m.cliente_nombre) continue;
    let nameKey = m.cliente_nombre.trim().toLowerCase();
    let cid = clientMap[nameKey];
    if (!cid) {
      const { data: newC } = await supabase.from('clientes').insert([{ name: m.cliente_nombre.trim() }]).select();
      if (newC && newC[0]) {
        cid = newC[0].id;
        clientMap[nameKey] = cid;
      }
    }
    if (cid) {
      await supabase.from('aquapp_tratamientos').update({ cliente_id: cid }).eq('id', m.id);
    }
  }
  console.log('Done linking tratamientos!');
}

run();

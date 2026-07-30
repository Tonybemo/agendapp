const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://wvrqmwsnuzugasaofvmc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cnFtd3NudXp1Z2FzYW9mdm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDQyOTAsImV4cCI6MjA4NzQyMDI5MH0.JzxklIsG-kW6yP_89ZLrFZ1Q7Es2r01m05Ie9K_0Ie0');

async function exportAll() {
  let allData = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase.from('muestras').select('*').range(from, from + step - 1);
    if (error) { console.error(error); return; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    from += step;
  }
  
  console.log(`Fetched ${allData.length} rows`);
  
  if (allData.length === 0) return;
  
  // Mapping
  const map = {
    cliente: 'cliente_nombre',
    muestra: 'numero_muestra',
    codigo: 'cod_envase',
    temperatura: 'temp',
    tipo: 'tipo_muestra',
    ferrocid_8583: 'f_8583_kit',
    ferrocid_8580: 'f_8580_total',
    entrega_8583: 'mat_f_8583',
    entrega_8580: 'mat_f_8580',
    entrega_4170: 'mat_a_4170',
    entrega_645: 'mat_a_645',
    entrega_8481: 'mat_f_8481'
  };
  
  const toDelete = ['id', 'user_id', 'created_at', 'imagen_url'];
  
  let uniqueKeys = new Set();
  allData.forEach(row => Object.keys(row).forEach(k => uniqueKeys.add(k)));
  uniqueKeys = Array.from(uniqueKeys).filter(k => !toDelete.includes(k));
  
  const headerRow = uniqueKeys.map(k => map[k] || k).join(',');
  
  let csvContent = headerRow + '\n';
  
  allData.forEach(row => {
    const rowStr = uniqueKeys.map(k => {
      let val = row[k];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        return `"${val}"`;
      }
      return val;
    }).join(',');
    csvContent += rowStr + '\n';
  });
  
  fs.writeFileSync('C:\\Users\\Usuario\\Desktop\\muestras_limpias.csv', csvContent, 'utf-8');
  console.log('Saved to muestras_limpias.csv');
}

exportAll();

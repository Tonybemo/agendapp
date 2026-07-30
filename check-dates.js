import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwgolcqetypdupouezxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Z29sY3FldHlwZHVwb3Vlenh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTAzMTgsImV4cCI6MjEwMDQ4NjMxOH0.IsGhWJZ_aHmdmfIBPL2yJFgPzoxXpdJlQb4GBNERoS0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDates() {
  const { data: muestras } = await supabase.from('aquapp_muestras').select('fecha');
  console.log('Muestras fechas:', muestras);
  
  const { data: tratamientos } = await supabase.from('aquapp_tratamientos').select('fecha');
  console.log('Tratamientos fechas:', tratamientos);
  
  const { data: avisos } = await supabase.from('avisomap_avisos').select('fecha');
  console.log('Avisos fechas:', avisos);
  
  const { data: tareas } = await supabase.from('tareas_programadas').select('tareas_json');
  console.log('Tareas JSON:', JSON.stringify(tareas, null, 2));
}

checkDates();

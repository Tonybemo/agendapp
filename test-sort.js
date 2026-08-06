import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const code = fs.readFileSync('C:/Users/Usuario/Desktop/Agendapp/src/lib/supabase.js', 'utf8');
const urlMatch = code.match(/supabaseUrl\s*=\s*['"`]([^'"`]+)/);
const keyMatch = code.match(/supabaseAnonKey\s*=\s*['"`]([^'"`]+)/);

const url = urlMatch ? urlMatch[1] : null;
const key = keyMatch ? keyMatch[1] : null;

if (url && key) {
  const supabase = createClient(url, key);
  supabase.from('workapp_nominas').select('*').then(res => {
    let nominas = res.data || [];
    
    let nominaYearFilter = "2026";
    let filteredNominas = nominaYearFilter === 'all' 
      ? [...nominas] 
      : nominas.filter(n => (n.mes || '').includes(nominaYearFilter));

    const monthOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    try {
      filteredNominas.sort((a, b) => {
        const extractYear = (m) => { const match = (m || '').match(/\d{4}/); return match ? parseInt(match[0]) : 0; };
        const extractMonth = (m) => { const name = (m || '').split(' ')[0]; return monthOrder.indexOf(name); };
        const yDiff = extractYear(b.mes) - extractYear(a.mes);
        if (yDiff !== 0) return yDiff;
        return extractMonth(b.mes) - extractMonth(a.mes);
      });
      console.log('Filtered and sorted length:', filteredNominas.length);
      console.log(filteredNominas.map(n => n.mes));
    } catch(err) {
      console.error('Sort error:', err);
    }
    
  });
}

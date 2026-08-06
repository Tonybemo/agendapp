const nominas = [
  { mes: 'Marzo 2026' },
  { mes: 'Diciembre 2025' },
  { mes: 'Febrero 2026' },
  { mes: 'Enero 2026' },
  { mes: 'Abril 2026' },
  { mes: 'Mayo 2026' },
  { mes: 'Junio 2026' },
  { mes: 'Julio de 2026' }
];

let nominaYearFilter = "2026";
let filteredNominas = nominaYearFilter === 'all' 
  ? [...nominas] 
  : nominas.filter(n => (n.mes || '').includes(nominaYearFilter));

const monthOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

filteredNominas.sort((a, b) => {
  const extractYear = (m) => { const match = (m || '').match(/\d{4}/); return match ? parseInt(match[0]) : 0; };
  const extractMonth = (m) => { const name = (m || '').split(' ')[0]; return monthOrder.indexOf(name); };
  const yDiff = extractYear(b.mes) - extractYear(a.mes);
  if (yDiff !== 0) return yDiff;
  return extractMonth(b.mes) - extractMonth(a.mes);
});

console.log('Filtered:', filteredNominas.map(n => n.mes));

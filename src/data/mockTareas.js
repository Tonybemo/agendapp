export const mockTareas = [
  {
    id: 't1',
    clientId: 'c1',
    clientName: 'Orovalle Mina',
    month: 'Julio',
    frecuencia: 'mensual',
    tasks: [
      { id: 'task1', name: 'Muestras', status: 'pending', date: null },
      { id: 'task2', name: 'Mediciones', status: 'pending', date: null }
    ]
  },
  {
    id: 't3',
    clientId: 'c3',
    clientName: 'Agua de Cuevas',
    month: 'Julio',
    frecuencia: 'semanal',
    tasks: [
      { id: 'task5', name: 'Semana 1', status: 'completed', date: '08/07/2026' },
      { id: 'task6', name: 'Semana 2', status: 'skipped', date: null },
      { id: 'task7', name: 'Semana 3', status: 'pending', date: null },
      { id: 'task8', name: 'Semana 4', status: 'pending', date: null }
    ]
  },
  {
    id: 't4',
    clientId: 'c4',
    clientName: 'IDESA Gijon',
    month: 'Julio',
    frecuencia: 'mensual',
    tasks: [
      { id: 'task9', name: 'Plagas', status: 'completed', date: '02/07/2026' },
      { id: 'task10', name: 'Muestras', status: 'completed', date: '02/07/2026' }
    ]
  },
  {
    id: 't5',
    clientId: 'c5',
    clientName: 'Hotel AC Oviedo',
    month: 'Julio',
    frecuencia: 'semanal',
    tasks: [
      { id: 'task11', name: 'Semana 1 (Del 1 al 7)', status: 'pending', date: null },
      { id: 'task12', name: 'Semana 2 (Del 8 al 14)', status: 'pending', date: null },
      { id: 'task13', name: 'Semana 3 (Del 15 al 21)', status: 'pending', date: null },
      { id: 'task14', name: 'Semana 4 (Del 22 al 31)', status: 'pending', date: null }
    ]
  }
];

export const months = [
  { id: 'Enero', label: 'Enero', progress: 'Pend.' },
  { id: 'Febrero', label: 'Febrero', progress: 'Pend.' },
  { id: 'Marzo', label: 'Marzo', progress: 'Pend.' },
  { id: 'Abril', label: 'Abril', progress: 'Pend.' },
  { id: 'Mayo', label: 'Mayo', progress: 'Pend.' },
  { id: 'Junio', label: 'Junio', progress: 'Pend.' },
  { id: 'Julio', label: 'Julio', progress: '10%' },
  { id: 'Agosto', label: 'Agosto', progress: '0%' },
  { id: 'Septiembre', label: 'Septiembre', progress: '0%' },
  { id: 'Octubre', label: 'Octubre', progress: '0%' },
  { id: 'Noviembre', label: 'Noviembre', progress: '0%' },
  { id: 'Diciembre', label: 'Diciembre', progress: '0%' },
];

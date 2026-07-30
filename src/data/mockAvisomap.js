export const mockAvisomapData = {
  total: 39,
  years: [
    {
      year: '2026',
      count: 22,
      months: [
        {
          month: 'Julio',
          count: 2,
          avisos: [
            {
              id: 'a1',
              direccion: 'Río Caudal, 6',
              localidad: 'Mieres',
              plaga: 'Roedores',
              plagaColor: '#f97316',
              plagaBg: '#ffedd5',
              fecha: 'Vie, 3 Jul',
              hora: '12:10:00'
            },
            {
              id: 'a2',
              direccion: 'Calle Marqués de Bolarque, 10',
              localidad: 'Llangréu / Langreo',
              plaga: 'Roedores',
              plagaColor: '#f97316',
              plagaBg: '#ffedd5',
              fecha: 'Mié, 1 Jul',
              hora: '12:00:00'
            }
          ]
        },
        { month: 'Junio', count: 11, avisos: [] },
        { month: 'Mayo', count: 2, avisos: [] },
        { month: 'Abril', count: 1, avisos: [] },
        { month: 'Marzo', count: 2, avisos: [] },
        { month: 'Enero', count: 4, avisos: [] }
      ]
    },
    {
      year: '2025',
      count: 17,
      months: []
    }
  ]
};

export const mockPlagasStats = [
  { name: 'Roedores', count: 20, percentage: 51, color: '#f97316' },
  { name: 'Cucarachas', count: 16, percentage: 41, color: '#e11d48' },
  { name: 'Avispas', count: 1, percentage: 3, color: '#f59e0b' },
  { name: 'Araña', count: 1, percentage: 3, color: '#ec4899' },
  { name: 'Hormigas', count: 1, percentage: 3, color: '#10b981' }
];

export const mockLocalidadStats = [
  { name: 'Oviedo', count: 14, percentage: 36, color: '#22c55e' },
  { name: 'Gijón', count: 11, percentage: 28, color: '#8b5cf6' },
  { name: 'Avilés', count: 5, percentage: 13, color: '#0ea5e9' },
  { name: 'Castrillón', count: 2, percentage: 5, color: '#14b8a6' },
  { name: 'San Martín del Rey Aurelio', count: 2, percentage: 5, color: '#10b981' }
];

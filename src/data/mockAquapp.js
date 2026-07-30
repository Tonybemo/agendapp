export const aquappClients = [
  { id: '1', name: 'AEAT Cangas del Narcea', initials: 'AC', color: '#14b8a6', lastSample: '20/06/24' }, // teal
  { id: '2', name: 'AEAT Fruela', initials: 'AF', color: '#f59e0b', lastSample: '04/06/26' }, // orange
  { id: '3', name: 'AEAT Gijon', initials: 'AG', color: '#3b82f6', lastSample: '03/06/26' }, // blue
  { id: '4', name: 'AEAT Langreo', initials: 'AL', color: '#84cc16', lastSample: '05/06/26' }, // lime
  { id: '5', name: 'AEAT Luarca', initials: 'AL', color: '#10b981', lastSample: '26/12/24' }, // green
  { id: '6', name: 'Expal', initials: 'EX', color: '#84cc16', lastSample: '19/06/26' }, // lime
  { id: '7', name: 'Galvanizados Aviles', initials: 'GA', color: '#a855f7', lastSample: '19/06/26' }, // purple
  { id: '8', name: 'GAM', initials: 'GA', color: '#22c55e', lastSample: '15/06/26' } // green
];

// Estructura jerárquica para Expal (simulando los datos completos)
export const expalData = {
  categories: [
    {
      id: 'c1',
      name: 'Muestras Estándar',
      iconType: 'flask',
      color: '#0ea5e9',
      years: [
        {
          year: '2026',
          months: [
            {
              month: 'Junio',
              count: 7,
              samples: [
                {
                  id: '2617574',
                  title: 'Muestra 1',
                  type: 'Estándar',
                  time: '12:05',
                  date: '2026-06-19',
                  location: 'Depósito PCI',
                  ph: 7.6,
                  temp: 19.1,
                  cloro: 0.01,
                  hierro: 0
                },
                {
                  id: '2617570',
                  title: 'Muestra 2',
                  type: 'Estándar',
                  time: '12:15',
                  date: '2026-06-19',
                  location: 'Ducha 2 ACS vestuario masculino nuevo',
                  ph: 7.6,
                  temp: 62.3,
                  cloro: 0.05,
                  hierro: 0
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'c2',
      name: 'Muestras de Torre',
      iconType: 'factory',
      color: '#f97316',
      years: []
    },
    {
      id: 'c3',
      name: 'Choques Térmicos',
      iconType: 'thermometer',
      color: '#eab308',
      years: []
    },
    {
      id: 'c4',
      name: 'Limpiezas de Torre',
      iconType: 'spray',
      color: '#0284c7',
      years: []
    }
  ]
};

export const dashboardActions = [
  { id: 'hipercloraciones', label: 'Hipercloraciones', icon: 'droplet', color: '#a855f7' }, // purple
  { id: 'choques', label: 'Choques Térmicos', icon: 'thermometer', color: '#ec4899' }, // pink
  { id: 'limpieza-torres', label: 'Limpieza Torres', icon: 'wind', color: '#3b82f6' }, // blue
  { id: 'limpieza-depositos', label: 'Limp. Depósitos', icon: 'box', color: '#14b8a6' }, // teal
  { id: 'plagas', label: 'Control Plagas', icon: 'bug', color: '#22c55e' }, // green
  { id: 'agenda', label: 'Agenda', icon: 'calendar', color: '#4b5563' } // slate
];

export const mockWorkappData = {
  dashboard: {
    mesTotal: '25.5h',
    mesExtra: '33.00€ extra',
    chartData: [
      { month: 'Feb', value: 6 },
      { month: 'Mar', value: 12 },
      { month: 'Abr', value: 5 },
      { month: 'May', value: 12 },
      { month: 'Jun', value: 18.5 },
      { month: 'Jul', value: 3 }
    ]
  },
  historial: {
    totalRegistros: 599,
    registros: [
      {
        id: 'w1',
        fechaLarga: 'VIERNES, 3 DE JULIO',
        horas: '7.5h',
        extras: '+1.0h ext',
        paradas: ['Agua de Cuevas', 'Aviso Mapfre', 'SEPE Oviedo'],
        horario: '06:00 - 13:30',
        matricula: '9677MKH'
      },
      {
        id: 'w2',
        fechaLarga: 'JUEVES, 2 DE JULIO',
        horas: '9.0h',
        extras: '+1.0h ext',
        paradas: ['Mutua Madrileña', 'IDESA gijon', 'SEPE Avilés', 'IDEFAB', 'IDESA', 'Meter datos Igeo'],
        horario: '07:00 - 16:00',
        matricula: '9677MKH'
      },
      {
        id: 'w3',
        fechaLarga: 'MIÉRCOLES, 1 DE JULIO',
        horas: '9.0h',
        extras: '+1.0h ext',
        paradas: ['Cabueñes', 'SEPE Las palmeras', 'SEPE Deva', 'Aviso Mapfre', 'Aviso Mapfre', 'SEPE Langreo'],
        horario: '06:00 - 15:00',
        matricula: '9677MKH'
      }
    ]
  },
  estadisticas: {
    totalHoras: '250.5',
    horasExtras: '27.5',
    importe: '302.50€',
    chartData: [
      { date: '13/05', value: 0.5 },
      { date: '21/05', value: 2 },
      { date: '27/05', value: 1 },
      { date: '03/06', value: 0.5 },
      { date: '11/06', value: 0.5 },
      { date: '16/06', value: 1 },
      { date: '18/06', value: 1 },
      { date: '22/06', value: 2 },
      { date: '24/06', value: 3.5 }
    ]
  }
};

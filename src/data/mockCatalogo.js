export const categories = [
  {
    id: 'insecticidas',
    title: 'Insecticidas',
    count: 9,
    color: '#10b981', // green
    bgColor: '#d1fae5',
    iconType: 'bug'
  },
  {
    id: 'rodenticidas',
    title: 'Rodenticidas',
    count: 5,
    color: '#f59e0b', // orange/yellow
    bgColor: '#fef3c7',
    iconType: 'mouse'
  },
  {
    id: 'biocidas',
    title: 'Biocidas y Otros',
    count: 4,
    color: '#0ea5e9', // blue
    bgColor: '#e0f2fe',
    iconType: 'shield'
  },
  {
    id: 'caducar',
    title: 'Próximos a Caducar',
    count: 0,
    color: '#ef4444', // red
    bgColor: '#fee2e2',
    iconType: 'calendar'
  }
];

export const products = [
  {
    id: 1,
    categoryId: 'insecticidas',
    name: 'Caramba Insecticida Fulminante Superconcentrado',
    lote: '5083',
    registro: '15-30-02337',
    badge: 'INS',
    plazoSeguridad: 'No aplica',
    hasWarning: false,
    image: 'https://via.placeholder.com/60x80?text=Caramba',
    materiaActiva: 'Cipermetrina 10%',
    plagaDiana: 'Insectos rastreros y voladores',
    metodoAplicacion: 'Pulverización',
    caducidad: '12/2027',
    sdsUrl: '#'
  },
  {
    id: 2,
    categoryId: 'insecticidas',
    name: 'Diptron con Etofenprox',
    lote: '99072',
    registro: '17-30-05749 y HA',
    badge: 'INS',
    plazoSeguridad: '12 horas',
    hasWarning: true,
    image: 'https://via.placeholder.com/60x80?text=Diptron',
    materiaActiva: 'Etofenprox 5%',
    plagaDiana: 'Cucarachas, Chinches, Pulgas',
    metodoAplicacion: 'Pulverización',
    caducidad: '05/2026',
    sdsUrl: '#'
  },
  {
    id: 3,
    categoryId: 'insecticidas',
    name: 'Pirefog FD',
    lote: '2405037101',
    registro: '16-30-05273 HA',
    badge: 'INS',
    plazoSeguridad: '12 horas',
    hasWarning: true,
    image: 'https://via.placeholder.com/60x80?text=Pirefog',
    materiaActiva: 'Piretrinas 2%',
    plagaDiana: 'Insectos voladores',
    metodoAplicacion: 'Nebulización en frío',
    caducidad: '10/2028',
    sdsUrl: '#'
  },
  {
    id: 4,
    categoryId: 'insecticidas',
    name: 'Deflow',
    lote: '77-040725',
    registro: 'ES/BB/(MR)-2017-18-00446',
    badge: 'INS',
    plazoSeguridad: 'Cuando la superficie pulverizada este seca',
    hasWarning: true,
    image: 'https://via.placeholder.com/60x80?text=Deflow',
    materiaActiva: 'Deltametrina 2.5%',
    plagaDiana: 'Hormigas, Cucarachas',
    metodoAplicacion: 'Pulverización',
    caducidad: '03/2027',
    sdsUrl: '#'
  },
  {
    id: 5,
    categoryId: 'insecticidas',
    name: 'Magnum gel Cucarachas',
    lote: 'W0843',
    registro: 'ES/APP(NA)-2017-18-00449',
    badge: 'INS',
    plazoSeguridad: 'No aplica',
    hasWarning: false,
    image: 'https://via.placeholder.com/60x80?text=Magnum',
    materiaActiva: 'Imidacloprid 2.15%',
    plagaDiana: 'Cucarachas',
    metodoAplicacion: 'Cebo en gel',
    caducidad: '01/2029',
    sdsUrl: '#'
  },
  {
    id: 6,
    categoryId: 'insecticidas',
    name: 'Crawjet plus',
    lote: '90250324',
    registro: 'N/A',
    badge: 'INS',
    plazoSeguridad: '12 horas',
    hasWarning: true,
    image: 'https://via.placeholder.com/60x80?text=Crawjet',
    materiaActiva: 'Cifenotrin',
    plagaDiana: 'Insectos rastreros',
    metodoAplicacion: 'Aerosol descarga total',
    caducidad: '11/2026',
    sdsUrl: '#'
  }
];

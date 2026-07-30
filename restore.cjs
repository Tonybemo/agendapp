const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\Usuario\\Desktop\\muestras_limpias.csv', 'utf-8');
const lines = data.split('\n');

const headers = lines[0].split(',');

// Reverse mapping
const map = {
  cliente_nombre: 'cliente',
  numero_muestra: 'muestra',
  cod_envase: 'codigo',
  temp: 'temperatura',
  tipo_muestra: 'tipo',
  f_8583_kit: 'ferrocid_8583',
  f_8580_total: 'ferrocid_8580',
  mat_f_8583: 'entrega_8583',
  mat_f_8580: 'entrega_8580',
  mat_a_4170: 'entrega_4170',
  mat_a_645: 'entrega_645',
  mat_f_8481: 'entrega_8481'
};

const oldHeaders = headers.map(h => map[h] || h);

lines[0] = oldHeaders.join(',');

fs.writeFileSync('C:\\Users\\Usuario\\Desktop\\muestras_RESTAURAR_ANTIGUA.csv', lines.join('\n'), 'utf-8');
console.log('Created muestras_RESTAURAR_ANTIGUA.csv');

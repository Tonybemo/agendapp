const fs = require('fs');
let content = fs.readFileSync('src/pages/Avisomap.jsx', 'utf8');

content = content.replace(/<Edit3 size=\{18\}/g, '<span className="admin-only"><Edit3 size={18}');
content = content.replace(/setAvisoFileName\(''\);\n                                      \}\} \/>/g, 'setAvisoFileName(\'\');\n                                      }} /></span>');

content = content.replace(/<Trash2 size=\{18\}/g, '<span className="admin-only"><Trash2 size={18}');
content = content.replace(/handleDeleteAviso\(aviso\.id\)\} \/>/g, 'handleDeleteAviso(aviso.id)} /></span>');

fs.writeFileSync('src/pages/Avisomap.jsx', content);
console.log('Updated Avisomap');

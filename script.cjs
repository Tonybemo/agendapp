const fs = require('fs');

function addAdminOnly(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/<div style=\{\{display: 'flex', gap: '12px'\}\}>/g, '<div className="admin-only" style={{display: \'flex\', gap: \'12px\'}}>');
  content = content.replace(/<div style=\{\{display: 'flex', gap: '8px', justifyContent: 'center'\}\}>/g, '<div className="admin-only" style={{display: \'flex\', gap: \'8px\', justifyContent: \'center\'}}>');
  content = content.replace(/<Edit3 size=\{14\} color="#94a3b8" \/>/g, '<span className="admin-only"><Edit3 size={14} color="#94a3b8" /></span>');

  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
}

addAdminOnly('src/pages/Aquapp.jsx');

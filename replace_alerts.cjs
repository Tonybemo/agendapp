const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let original = content;

  const newContent = content.replace(/alert\((.*?)\)/g, (match, inner) => {
    const lower = inner.toLowerCase();
    if (lower.includes('error')) {
      return `window.__toast?.error(${inner})`;
    } else if (lower.includes('aviso')) {
      return `window.__toast?.warning(${inner})`;
    } else {
      let cleaned = inner.replace(/✅/g, '').replace(/\?\?/g, '').replace(/\?/g, '').trim();
      return `window.__toast?.success(${cleaned})`;
    }
  });

  if (newContent !== original) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});

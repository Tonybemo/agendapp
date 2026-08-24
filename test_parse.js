const parsePlagas = (plagas) => {
  if (Array.isArray(plagas)) {
    // maybe it's an array of stringified strings?
    return plagas.map(p => {
       if (typeof p === 'string') {
          return p.replace(/^\[?["'\\]+|["'\\]+\]?$/g, '');
       }
       return p;
    });
  }
  if (typeof plagas === 'string') {
    try { 
      const parsed = JSON.parse(plagas); 
      if (Array.isArray(parsed)) return parsed.map(p => p.replace(/^\[?["'\\]+|["'\\]+\]?$/g, ''));
      return [parsed];
    } catch {
      let cleaned = plagas;
      if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        cleaned = cleaned.slice(1, -1);
      }
      if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned.split(',').map(s => s.trim().replace(/^["'\\]+|["'\\]+$/g, '')).filter(Boolean);
    }
  }
  return [];
};

console.log(parsePlagas('["Roedores"]'));
console.log(parsePlagas('["\"Avispas\""]'));
console.log(parsePlagas('["\"Cucarachas\""]'));
console.log(parsePlagas(["[\"Roedores\"]"]));
console.log(parsePlagas(["Roedores"]));

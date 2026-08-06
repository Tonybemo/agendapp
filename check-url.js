const fs = require('fs');
const content = fs.readFileSync('live.js', 'utf8');
const match = content.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/);
console.log('Found Supabase URL:', match ? match[0] : 'None');

import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('development', process.cwd(), '');
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('No credentials found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
async function test() {
  const { data, error } = await supabase.from('workapp_nominas').select('*');
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Nominas:', data);
  }
}

test();

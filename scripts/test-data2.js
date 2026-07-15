const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8' // anon key
);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Or try to query information_schema if possible
  // Since we don't have rpc for tables, let's just query a few common names
  const testNames = ['mesas', 'tables', 'boleteria_mesas', 'zonas'];
  for(const name of testNames) {
    const { data: res } = await supabase.from(name).select('*').limit(1);
    console.log(`Table ${name} has data:`, res ? res.length > 0 : false);
  }
}

checkTables();

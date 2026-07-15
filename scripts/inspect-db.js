const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8' // anon key
);

async function inspectTables() {
  const tables = ['boleteria_mesas', 'boleteria_individual', 'event_stages', 'purchased_tickets'];
  
  for (const table of tables) {
    console.log(`\n--- Inspecting ${table} ---`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      console.log(`Row count: ${data.length}`);
      if (data.length > 0) {
        console.log('Sample row fields:', Object.keys(data[0]));
        console.log('Sample data:', data[0]);
      }
    }
  }
}

inspectTables();

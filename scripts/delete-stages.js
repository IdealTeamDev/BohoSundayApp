const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8'
);
async function main() {
  const { data, error } = await supabase.from('event_stages').select('*');
  console.log("Current stages:", data, error);
  
  // Delete all stages
  for (const row of (data || [])) {
    const { error: delErr } = await supabase.from('event_stages').delete().eq('name', row.name);
    console.log(`Deleted ${row.name}`, delErr);
  }
}
main();

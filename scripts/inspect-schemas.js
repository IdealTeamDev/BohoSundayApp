const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8'
);
async function main() {
  const { data: tickets, error: err1 } = await supabase.from('boleteria_individual').select('*').limit(1);
  const { data: tables, error: err2 } = await supabase.from('boleteria_mesas').select('*').limit(1);
  console.log("Tickets:", tickets, err1);
  console.log("Tables:", tables, err2);
}
main();

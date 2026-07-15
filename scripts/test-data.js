const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8' // anon key
);

async function checkData() {
  const { data: tables } = await supabase.from('boleteria_mesas').select('*');
  console.log('Mesas:', tables?.length || 0);
  console.log('Sample mesa:', tables?.[0]);
}

checkData();

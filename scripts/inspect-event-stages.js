const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8'
);
async function main() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'event_stages' });
  if (error) {
    // try to insert a dummy row and rollback or just fetch and see error
    const { data: cols, error: err2 } = await supabase.from('event_stages').insert([{}]).select();
    console.log(err2);
  } else {
    console.log(data);
  }
}
main();

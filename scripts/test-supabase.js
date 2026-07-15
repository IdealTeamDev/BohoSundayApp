const { createClient } = require('@supabase/supabase-js');


const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8' // anon key
);

async function testUpdate() {
  const orderId = 'ORD-QUICK-PRIMITIVO-17-1784055247939'; // one of the tickets we found earlier

  const { data: fetch1, error: e1 } = await supabase
    .from('purchased_tickets')
    .select('accesos_restantes')
    .eq('order_id', orderId)
    .single();
    
  console.log('Before Update:', fetch1, e1);

  const { data: updateRes, error: e2 } = await supabase
    .from('purchased_tickets')
    .update({ accesos_restantes: fetch1.accesos_restantes }) // update to same value for safety
    .eq('order_id', orderId)
    .select(); // force return to see if row updated

  console.log('After Update:', updateRes, e2);
}

testUpdate();

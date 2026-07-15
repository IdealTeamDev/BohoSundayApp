const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hctdykhdekhwvmhrdrnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdGR5a2hkZWtod3ZtaHJkcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIyMjcsImV4cCI6MjA5OTI1ODIyN30.Hy_FKrK3X26_BYtSMznzNGxJH-35UdiOKE_nBpFN5e8' // anon key
);

async function testRealtime() {
  const channel = supabase.channel('public:purchased_tickets');
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'purchased_tickets' },
    (payload) => {
      console.log('REALTIME PAYLOAD:', payload.new);
    }
  ).subscribe((status) => {
    console.log('Sub status:', status);
    if (status === 'SUBSCRIBED') {
      setTimeout(async () => {
         const { data, error } = await supabase.from('purchased_tickets')
            .update({ accesos_restantes: 5 })
            .eq('order_id', 'ORD-QUICK-PRIMITIVO-17-1784055247939');
         console.log('Updated:', error);
      }, 1000);
    }
  });

  // Keep alive for a bit
  setTimeout(() => { process.exit(0); }, 5000);
}

testRealtime();

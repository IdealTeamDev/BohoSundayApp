require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function seed() {
  console.log("Starting DB seed...");

  // 1. Clear existing products
  await supabase.from('boleteria_individual').delete().neq('id', 'dummy');
  await supabase.from('boleteria_mesas').delete().neq('id', 'dummy');
  await supabase.from('event_stages').delete().neq('id', 'dummy');

  // 2. Add Tickets
  // Base prices will be Etapa 2 prices as standard.
  const tickets = [
    { id: 'early', name: 'EARLY', price: 330000, stock: 300 }, // Etapa 2 price
    { id: 'anytime', name: 'ANYTIME', price: 370000, stock: 300 }, // Etapa 2 price
  ];
  await supabase.from('boleteria_individual').insert(tickets);
  console.log("Tickets seeded.");

  // 3. Add Tables and Beds
  const tables = [];
  
  // 12 Oasis (Etapa 2 price: 3.400.000)
  for (let i = 1; i <= 12; i++) {
    tables.push({
      id: `oasis-${i}`, zone: 'oasis', name: 'MESA OASIS', number: i, persons: 6,
      price: 3400000, currency: 'COP', available: true,
      licor: '1 Botella licor premium', agua: 3, redbull: 3, x: 0, y: 0
    });
  }

  // 11 Bohemian (Etapa 2 price: 5.800.000)
  for (let i = 1; i <= 11; i++) {
    tables.push({
      id: `bohemian-${i}`, zone: 'bohemian', name: 'CAMA BOHEMIAN', number: i, persons: 8,
      price: 5800000, currency: 'COP', available: true,
      licor: '1 Botella licor premium', agua: 4, redbull: 4, x: 0, y: 0
    });
  }

  // 11 Lujo Primitivo (Etapa 2 price: 6.500.000)
  for (let i = 1; i <= 11; i++) {
    tables.push({
      id: `primitivo-${i}`, zone: 'primitivo', name: 'CAMA LUJO PRIMITIVO', number: i, persons: 8,
      price: 6500000, currency: 'COP', available: true,
      licor: '1 Botella licor premium', agua: 4, redbull: 4, x: 0, y: 0
    });
  }

  // 1 Backstage (18.000.000)
  tables.push({
    id: `backstage-1`, zone: 'backstage', name: 'BACKSTAGE', number: 1, persons: 20,
    price: 18000000, currency: 'COP', available: true,
    licor: '3 Botellas de licor premium', agua: 10, redbull: 10, x: 0, y: 0
  });

  // 4 VIP
  const vipPrices = [7000000, 6800000, 5800000, 5800000];
  for (let i = 1; i <= 4; i++) {
    tables.push({
      id: `vip-${i}`, zone: 'vip', name: 'CAMA VIP', number: i, persons: 8,
      price: vipPrices[i - 1], currency: 'COP', available: true,
      licor: '1 Botella licor premium', agua: 4, redbull: 4, x: 0, y: 0
    });
  }

  // 2 Candela (4.000.000)
  for (let i = 1; i <= 2; i++) {
    tables.push({
      id: `candela-${i}`, zone: 'candela', name: 'MESA CANDELA', number: i, persons: 6,
      price: 4000000, currency: 'COP', available: true,
      licor: '1 Botella licor premium', agua: 3, redbull: 3, x: 0, y: 0
    });
  }

  await supabase.from('boleteria_mesas').insert(tables);
  console.log("Tables/Beds seeded.");

  // 4. Create Stages
  // Believers
  const believersOverrides = {
    "early": 250000,
    "anytime": 250000,
    "oasis": 2650000,
    "bohemian": 4800000,
    "primitivo": 5500000
    // VIP, Backstage and Candela don't change by stage in this group
  };
  
  // Etapa 1
  const etapa1Overrides = {
    "early": 290000,
    "anytime": 340000,
    "oasis": 2900000,
    "bohemian": 5100000,
    "primitivo": 6000000
  };

  const stages = [
    { name: 'BELIEVERS', end_date: '2026-06-26T23:59:00Z', prices: believersOverrides },
    { name: 'ETAPA 1', end_date: '2026-07-15T23:59:00Z', prices: etapa1Overrides }
  ];

  await supabase.from('event_stages').insert(stages);
  console.log("Stages seeded.");
  
  console.log("DONE!");
}

seed().catch(console.error);

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

async function seed() {
  console.log('--- 1. Updating older 56 moves with authentic move_no and POS order invoices ---');
  const { data: existingMoves, error: fetchErr } = await supabase
    .from('stock_moves')
    .select('id, created_at, reference, move_no')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('Error fetching existing moves:', fetchErr);
    return;
  }

  const realInvoices = [
    'INV-POS-412097',
    'INV-POS-305922',
    'INV-POS-912018',
    'INV-POS-718429',
    'INV-POS-417953',
    'INV-POS-030262',
    'INV-POS-997260',
    'INV-POS-792803',
    'INV-POS-750721',
    'INV-POS-321319'
  ];

  let seq = 1;
  for (const m of existingMoves) {
    if (!m.move_no || m.reference === 'POS-SALE' || m.reference?.startsWith('POS-SALE-')) {
      const inv = realInvoices[(seq - 1) % realInvoices.length];
      const moveNo = `SM-2026-${String(seq).padStart(4, '0')}`;
      await supabase
        .from('stock_moves')
        .update({
          move_no: moveNo,
          reference: inv
        })
        .eq('id', m.id);
      seq++;
    }
  }
  console.log(`Updated ${seq - 1} historical stock moves.`);

  console.log('--- 2. Seeding rich diverse real-world movements for Today (Oct 9) & Yesterday (Oct 8) ---');
  const whKorba = '30000000-0000-0000-0000-000000000001';
  const whMaadi = '30000000-0000-0000-0000-000000000002';
  const whTagamoa = '30000000-0000-0000-0000-000000000003';
  const whFactory = '30000000-0000-0000-0000-000000000004';

  const newMoves = [
    // Today: Oct 9, 2026
    {
      move_no: 'SM-2026-10491',
      move_type: 'out',
      product_id: '40000000-0000-0000-0000-000000000004', // رز بلبن بستاشيو
      from_warehouse_id: whKorba,
      to_warehouse_id: null,
      quantity: 2,
      unit_cost: 42,
      reference: 'INV-POS-942180',
      moved_at: '2026-10-09T14:35:00+03:00'
    },
    {
      move_no: 'SM-2026-10492',
      move_type: 'out',
      product_id: '40000000-0000-0000-0000-000000000009', // فتة مانجا
      from_warehouse_id: whKorba,
      to_warehouse_id: null,
      quantity: 1,
      unit_cost: 45,
      reference: 'INV-POS-942176',
      moved_at: '2026-10-09T14:15:00+03:00'
    },
    {
      move_no: 'SM-2026-10493',
      move_type: 'in', // Returned / cancelled order
      product_id: '40000000-0000-0000-0000-000000000035', // بوكس مشكل ملوكي فاخر 1 كجم
      from_warehouse_id: null,
      to_warehouse_id: whKorba,
      quantity: 1,
      unit_cost: 160,
      reference: 'CANCEL-INV-POS-942150',
      moved_at: '2026-10-09T13:50:00+03:00'
    },
    {
      move_no: 'SM-2026-10494',
      move_type: 'transfer', // Transfer from factory to Korba branch
      product_id: '40000000-0000-0000-0000-000000000008', // فتة نوتيلا
      from_warehouse_id: whFactory,
      to_warehouse_id: whKorba,
      quantity: 20,
      unit_cost: 46,
      reference: 'TR-2026-109',
      moved_at: '2026-10-09T13:20:00+03:00'
    },
    {
      move_no: 'SM-2026-10495',
      move_type: 'in', // Supplier inbound purchase receipt
      product_id: '40000000-0000-0000-0000-000000000002', // رز بلبن مكسرات
      from_warehouse_id: null,
      to_warehouse_id: whMaadi,
      quantity: 50,
      unit_cost: 28,
      reference: 'PO-2026-088',
      moved_at: '2026-10-09T12:45:00+03:00'
    },
    {
      move_no: 'SM-2026-10496',
      move_type: 'out',
      product_id: '40000000-0000-0000-0000-000000000038', // بولاية آيس كريم فانيليا إضافية
      from_warehouse_id: whMaadi,
      to_warehouse_id: null,
      quantity: 3,
      unit_cost: 15,
      reference: 'INV-POS-942112',
      moved_at: '2026-10-09T11:30:00+03:00'
    },
    {
      move_no: 'SM-2026-10497',
      move_type: 'adjustment', // Physical inventory audit adjustment (deficit)
      product_id: '40000000-0000-0000-0000-000000000022', // تشيز كاخ بستاشيو
      from_warehouse_id: whKorba,
      to_warehouse_id: null,
      quantity: 2,
      unit_cost: 50,
      reference: 'ADJ-2026-021',
      moved_at: '2026-10-09T10:15:00+03:00'
    },
    {
      move_no: 'SM-2026-10498',
      move_type: 'in', // Dairy & ingredients factory inbound
      product_id: '40000000-0000-0000-0000-000000000001', // رز بلبن نوتيلا
      from_warehouse_id: null,
      to_warehouse_id: whFactory,
      quantity: 100,
      unit_cost: 25,
      reference: 'PO-2026-084',
      moved_at: '2026-10-09T09:30:00+03:00'
    },

    // Yesterday: Oct 8, 2026
    {
      move_no: 'SM-2026-10481',
      move_type: 'out',
      product_id: '40000000-0000-0000-0000-000000000005', // رز بلبن الوزير
      from_warehouse_id: whTagamoa,
      to_warehouse_id: null,
      quantity: 4,
      unit_cost: 40,
      reference: 'INV-POS-893041',
      moved_at: '2026-10-08T19:40:00+03:00'
    },
    {
      move_no: 'SM-2026-10482',
      move_type: 'out',
      product_id: '40000000-0000-0000-0000-000000000007', // فتة ميكس الوزير
      from_warehouse_id: whKorba,
      to_warehouse_id: null,
      quantity: 2,
      unit_cost: 48,
      reference: 'INV-POS-893025',
      moved_at: '2026-10-08T18:10:00+03:00'
    },
    {
      move_no: 'SM-2026-10483',
      move_type: 'transfer',
      product_id: '40000000-0000-0000-0000-000000000003', // رز بلبن لوتس
      from_warehouse_id: whFactory,
      to_warehouse_id: whTagamoa,
      quantity: 30,
      unit_cost: 28,
      reference: 'TR-2026-104',
      moved_at: '2026-10-08T16:30:00+03:00'
    },
    {
      move_no: 'SM-2026-10484',
      move_type: 'in', // Cancelled order return
      product_id: '40000000-0000-0000-0000-000000000038', // بولاية آيس كريم فانيليا إضافية
      from_warehouse_id: null,
      to_warehouse_id: whKorba,
      quantity: 2,
      unit_cost: 15,
      reference: 'CANCEL-INV-POS-892911',
      moved_at: '2026-10-08T15:00:00+03:00'
    },
    {
      move_no: 'SM-2026-10485',
      move_type: 'out',
      product_id: '40000000-0000-0000-0000-000000000006', // رز بلبن ساده
      from_warehouse_id: whMaadi,
      to_warehouse_id: null,
      quantity: 5,
      unit_cost: 12,
      reference: 'INV-POS-892890',
      moved_at: '2026-10-08T14:10:00+03:00'
    },
    {
      move_no: 'SM-2026-10486',
      move_type: 'in', // Raw & packaging supplier inbound
      product_id: '40000000-0000-0000-0000-000000000010', // فتة بستاشيو
      from_warehouse_id: null,
      to_warehouse_id: whFactory,
      quantity: 40,
      unit_cost: 52,
      reference: 'PO-2026-079',
      moved_at: '2026-10-08T11:00:00+03:00'
    },
    {
      move_no: 'SM-2026-10487',
      move_type: 'adjustment', // Surplus audit adjustment
      product_id: '40000000-0000-0000-0000-000000000001', // رز بلبن نوتيلا
      from_warehouse_id: null,
      to_warehouse_id: whKorba,
      quantity: 3,
      unit_cost: 25,
      reference: 'ADJ-2026-018',
      moved_at: '2026-10-08T09:45:00+03:00'
    }
  ];

  for (const move of newMoves) {
    // Check if move_no already exists
    const { data: existing } = await supabase.from('stock_moves').select('id').eq('move_no', move.move_no).maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from('stock_moves').insert(move);
      if (insErr) {
        console.error(`Error inserting ${move.move_no}:`, insErr.message);
      } else {
        console.log(`Inserted ${move.move_no} (${move.reference})`);
      }
    } else {
      console.log(`Move ${move.move_no} already exists.`);
    }
  }

  const { count: finalCount } = await supabase.from('stock_moves').select('*', { count: 'exact', head: true });
  console.log(`Done! Total stock_moves in database is now: ${finalCount}`);
}

seed();

import { createClient } from '@supabase/supabase-js';

const url = 'https://zpdokoytxqpwctesjfye.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZG9rb3l0eHFwd2N0ZXNqZnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njg0MjksImV4cCI6MjEwNDU0NDQyOX0.wbMPbhP-leo8IpGGlsdrnJRXwOrOwDg4owQN9-_hKhU';
const supabase = createClient(url, key);

async function seed() {
  console.log('--- Checking & Seeding Core Supabase Tables ---');

  // 1. ai_modules
  const { count: aiCount } = await supabase.from('ai_modules').select('*', { count: 'exact', head: true });
  console.log('ai_modules count:', aiCount);
  if (!aiCount || aiCount === 0) {
    const geminiKey = Buffer.from('QVEuQWI4Uk42SjFzZkVBYUI0QjlnckgxaWVOQ2xyUGczc1Z3elVvQXVIMkRIMmNEWG9sb2c=', 'base64').toString('utf8');
    const modules = [
      {
        code: 'AI-SALES',
        name_ar: 'وكيل مبيعات وزير الحلو',
        name_en: 'Wazeer Sales & Catering Agent',
        scope: 'sales',
        is_enabled: true,
        requires_approval: false,
        description_ar: JSON.stringify({
          provider: 'gemini',
          model: 'gemini-3.8-flash',
          apiKey: geminiKey,
          agentRole: 'sales',
          roleLabel: { ar: 'أخصائي فواتير وحفلات وتوريد', en: 'Sales & Catering Specialist' },
          systemPrompt: 'متخصص في تسعير طلبيات الحفلات لوزير الحلو، واحتساب الخصومات التجارية للفنادق، وإصدار الفواتير الإلكترونية المعتمدة.',
          allowedTools: ['create_invoice', 'check_party_credit', 'apply_discount', 'print_receipt'],
          temperature: 0.3,
          status: 'active',
          totalRuns: 934
        })
      },
      {
        code: 'AI-INVENTORY',
        name_ar: 'مراقب مخزون وخامات التصنيع',
        name_en: 'Raw Materials & Kitchen Inventory Sentinel',
        scope: 'inventory',
        is_enabled: true,
        requires_approval: true,
        description_ar: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: '',
          agentRole: 'inventory',
          roleLabel: { ar: 'مراقب الهدر والمخزون الحرج', en: 'Inventory & Waste Controller' },
          systemPrompt: 'يراقب معدل استهلاك السمن البلدي والفستق الحلبي، وينبه أمناء المخازن فور وصول المخزون للحد الأدنى، مع منع الهدر.',
          allowedTools: ['reorder_raw_materials', 'stock_transfer_request', 'flag_waste_variance'],
          temperature: 0.1,
          status: 'active',
          totalRuns: 1420
        })
      },
      {
        code: 'AI-DISPATCH',
        name_ar: 'موجه خطوط التوزيع وسيارات النقل',
        name_en: 'Cold-Chain Delivery Router',
        scope: 'dispatch',
        is_enabled: true,
        requires_approval: false,
        description_ar: JSON.stringify({
          provider: 'gemini',
          model: 'gemini-3.8-flash',
          apiKey: geminiKey,
          agentRole: 'dispatch',
          roleLabel: { ar: 'خبير التوزيع وسلاسل الإمداد', en: 'Cold Chain Logistics Expert' },
          systemPrompt: 'توزيع خطوط سيارات التبريد لضمان وصول التورت والجاتوهات طازجة وفي درجة الحرارة المحددة لفروع الكوربة والمعادي والتجمع.',
          allowedTools: ['optimize_van_route', 'assign_driver', 'verify_cooling_temp'],
          temperature: 0.2,
          status: 'active',
          totalRuns: 612
        })
      }
    ];

    const { error: insErr } = await supabase.from('ai_modules').insert(modules);
    if (insErr) console.error('Error inserting ai_modules:', insErr);
    else console.log('Successfully seeded ai_modules in Supabase!');
  }

  // 2. documents (for sales invoices and purchase orders)
  const { count: docCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });
  console.log('documents count:', docCount);
  if (!docCount || docCount === 0) {
    const seedDocs = [
      {
        code: 'INV-10481',
        type: 'invoice',
        date: '2026-10-08',
        due_date: '2026-10-22',
        amount: 14850,
        balance: 0,
        status: 'paid',
        notes: 'فندق ماريوت الزمالك — توريد حفلات وبوفيه شرقي',
        items: [
          { id: '1', sku: 'WZR-001', name: { ar: 'صواني مشكل شرقي فاخر (VIP)', en: 'Luxury Oriental Trays' }, quantity: 20, unit: { ar: 'صينية', en: 'tray' }, unitPrice: 500, total: 10000 },
          { id: '2', sku: 'WZR-002', name: { ar: 'تورتات مناسبات خاصة 30سم', en: 'Custom Celebration Cakes' }, quantity: 10, unit: { ar: 'تورتة', en: 'cake' }, unitPrice: 485, total: 4850 }
        ]
      },
      {
        code: 'INV-10482',
        type: 'invoice',
        date: '2026-10-09',
        due_date: '2026-10-23',
        amount: 8900,
        balance: 8900,
        status: 'overdue',
        notes: 'مجموعة كافيهات ومطاعم سيلانترو',
        items: [
          { id: '1', sku: 'WZR-003', name: { ar: 'كرواسون ودوناتس ومخبوزات صباحية', en: 'Morning Viennoiserie' }, quantity: 200, unit: { ar: 'قطعة', en: 'piece' }, unitPrice: 35, total: 7000 },
          { id: '2', sku: 'WZR-004', name: { ar: 'أطباق أم علي بالمكسرات والقشطة', en: 'Om Ali Single Servings' }, quantity: 38, unit: { ar: 'طبق', en: 'portion' }, unitPrice: 50, total: 1900 }
        ]
      },
      {
        code: 'INV-10483',
        type: 'invoice',
        date: '2026-10-09',
        due_date: '2026-10-30',
        amount: 22400,
        balance: 11200,
        status: 'partial',
        notes: 'شركة أوراسكوم للإنشاءات — إفطار جماعي',
        items: [
          { id: '1', sku: 'WZR-005', name: { ar: 'علب مشكل حلاوة وحلويات شرقية 2كجم', en: 'Assorted Sweets Gift Box' }, quantity: 80, unit: { ar: 'علبة', en: 'box' }, unitPrice: 280, total: 22400 }
        ]
      },
      {
        code: 'PO-20411',
        type: 'purchase',
        date: '2026-10-07',
        due_date: '2026-10-15',
        amount: 45000,
        balance: 0,
        status: 'paid',
        notes: 'شركة الدلتا للسكر ومستلزمات الحلويات',
        items: [
          { id: '1', sku: 'RAW-001', name: { ar: 'سكر أبيض نقي بلوري فاخر', en: 'Refined White Sugar' }, quantity: 2500, unit: { ar: 'كجم', en: 'kg' }, unitPrice: 18, total: 45000 }
        ]
      },
      {
        code: 'PO-20412',
        type: 'purchase',
        date: '2026-10-08',
        due_date: '2026-10-20',
        amount: 68000,
        balance: 68000,
        status: 'draft',
        notes: 'مطاحن ومخابز شمال القاهرة — دقيق 72%',
        items: [
          { id: '1', sku: 'RAW-002', name: { ar: 'دقيق فاخر استخراج 72% للحلويات', en: 'Premium Pastry Flour 72%' }, quantity: 4000, unit: { ar: 'كجم', en: 'kg' }, unitPrice: 17, total: 68000 }
        ]
      }
    ];

    const { error: docInsErr } = await supabase.from('documents').insert(seedDocs);
    if (docInsErr) console.error('Error inserting documents:', docInsErr);
    else console.log('Successfully seeded documents in Supabase!');
  }

  // 3. Check journal_entries
  const { count: jCount } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true });
  console.log('journal_entries count:', jCount);
  if (!jCount || jCount === 0) {
    const { data: accs } = await supabase.from('accounts').select('id, code').in('code', ['1110', '4110', '1120', '2110']);
    const accMap = {};
    accs?.forEach(a => { accMap[a.code] = a.id; });

    if (accMap['1110'] && accMap['4110']) {
      const { data: entry, error: entErr } = await supabase.from('journal_entries').insert({
        entry_no: 'JV-2026-001',
        entry_date: '2026-10-08',
        reference: 'INV-10481',
        description_ar: 'إثبات مبيعات نقدية لحفلات فندق ماريوت',
        description_en: 'Sales revenue recognition Marriott Catering',
        is_posted: true
      }).select().single();

      if (entry && !entErr) {
        await supabase.from('journal_lines').insert([
          { entry_id: entry.id, account_id: accMap['1110'], debit: 14850, credit: 0, line_no: 1, memo: 'تحصيل نقدي بالخزينة' },
          { entry_id: entry.id, account_id: accMap['4110'], debit: 0, credit: 14850, line_no: 2, memo: 'إيراد مبيعات حلويات' }
        ]);
        console.log('Successfully seeded sample journal entry in Supabase!');
      }
    }
  }

  console.log('--- Seeding Done ---');
}

seed();

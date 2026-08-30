import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rawCustomers, rawInspections, rawQuotations, rawPipelineOrders, rawSales, collectionsStore] = await Promise.all([
      prisma.customer.findMany({ orderBy: { updatedAt: 'desc' } }),
      prisma.inspectionRequest.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.quotationOrder.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.pipelineOrder.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.salesInvoice.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.systemStore.findUnique({ where: { key: 'ahmed_kishk_collections_v3' } }).catch(() => null),
    ]);

    const rawCollections: any[] = collectionsStore?.data && Array.isArray(collectionsStore.data) ? collectionsStore.data : [];

    // Helper to normalize phone
    const normPhone = (p: string | null | undefined) => (p || '').replace(/\D/g, '').slice(-10);
    const normName = (n: string | null | undefined) => (n || '').trim().toLowerCase();

    // Map of customers
    const customerMap = new Map<string, any>();

    // 1. Seed with registered customers
    for (const c of rawCustomers) {
      const key = normPhone(c.phone) || normName(c.name);
      if (!key) continue;
      customerMap.set(key, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address || '',
        city: c.city || 'القاهرة',
        openingBalance: Number(c.balance) || 0,
        notes: c.notes || '',
        createdAt: c.createdAt ? c.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        inspections: [],
        quotations: [],
        sales: [],
        collections: [],
      });
    }

    // 2. Discover customers from inspections
    for (const ins of rawInspections) {
      const key = normPhone(ins.phone) || normName(ins.customerName);
      if (!key) continue;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: ins.customerId || `CUST-${Math.random().toString(36).substr(2, 6)}`,
          name: ins.customerName,
          phone: ins.phone,
          address: ins.address || '',
          city: ins.branch || 'القاهرة',
          openingBalance: 0,
          notes: ins.notes || '',
          createdAt: ins.createdAt ? ins.createdAt.toISOString().split('T')[0] : (ins.scheduledAt || new Date().toISOString().split('T')[0]),
          inspections: [],
          quotations: [],
          sales: [],
          collections: [],
        });
      }
      customerMap.get(key).inspections.push(ins);
    }

    // 3. Discover & match quotations / curtain orders
    for (const qot of rawQuotations) {
      const key = normPhone(qot.phone) || normName(qot.customerName);
      if (!key) continue;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: `CUST-${Math.random().toString(36).substr(2, 6)}`,
          name: qot.customerName,
          phone: qot.phone,
          address: qot.address || '',
          city: qot.branch || 'القاهرة',
          openingBalance: 0,
          notes: '',
          createdAt: qot.date || (qot.createdAt ? qot.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          inspections: [],
          quotations: [],
          sales: [],
          collections: [],
        });
      }
      customerMap.get(key).quotations.push(qot);
    }

    // 4. Discover & match pipeline orders (avoid double counting if quotation has same inspectionId / orderId)
    for (const p of rawPipelineOrders) {
      const key = normPhone(p.phone) || normName(p.customerName);
      if (!key) continue;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: `CUST-${Math.random().toString(36).substr(2, 6)}`,
          name: p.customerName,
          phone: p.phone,
          address: p.address || '',
          city: p.branch || 'القاهرة',
          openingBalance: 0,
          notes: '',
          createdAt: p.createdAt ? p.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          inspections: [],
          quotations: [],
          sales: [],
          collections: [],
        });
      }
      const existingQots = customerMap.get(key).quotations;
      const alreadyHas = existingQots.some((q: any) => q.id === p.orderId || q.id === p.id || (q.customerName === p.customerName && q.totalAmount === p.totalAmount));
      if (!alreadyHas) {
        customerMap.get(key).quotations.push(p);
      }
    }

    // 5. Discover & match fabric sales
    for (const s of rawSales) {
      const key = normPhone(s.phone) || normName(s.customerName);
      if (!key) continue;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: `CUST-${Math.random().toString(36).substr(2, 6)}`,
          name: s.customerName,
          phone: s.phone,
          address: '',
          city: s.branch || 'القاهرة',
          openingBalance: 0,
          notes: s.notes || '',
          createdAt: s.date || (s.createdAt ? s.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          inspections: [],
          quotations: [],
          sales: [],
          collections: [],
        });
      }
      customerMap.get(key).sales.push(s);
    }

    // 6. Match Collections
    for (const col of rawCollections) {
      const key = normPhone(col.phone) || normName(col.customerName);
      if (!key) continue;
      if (customerMap.has(key)) {
        customerMap.get(key).collections.push(col);
      }
    }

    // 7. Calculate aggregate balances and generate detailed ledger entries
    const resultCustomers = Array.from(customerMap.values()).map(c => {
      let totalCurtains = 0;
      let totalDeposits = 0;
      for (const q of c.quotations) {
        totalCurtains += (Number(q.totalAmount) || 0);
        totalDeposits += (Number(q.depositPaid) || 0);
      }

      let totalSales = 0;
      let totalSalesPaid = 0;
      for (const s of c.sales) {
        totalSales += (Number(s.totalAmount) || 0);
        totalSalesPaid += (Number(s.paidAmount) || 0);
      }

      let totalCollected = 0;
      for (const col of c.collections) {
        totalCollected += (Number(col.amount) || 0);
      }

      const totalSpent = totalCurtains + totalSales + (c.openingBalance || 0);
      const totalPaid = totalDeposits + totalSalesPaid + totalCollected;
      const balance = totalSpent - totalPaid;
      const ordersCount = c.quotations.length + c.sales.length;
      const inspectionsCount = c.inspections.length;

      // Build Ledger Entries
      const ledger: any[] = [];
      let running = c.openingBalance || 0;

      if (c.openingBalance > 0) {
        ledger.push({
          id: `INIT-${c.id}`,
          date: c.createdAt,
          type: 'رصيد افتتاحي',
          description: 'رصيد افتتاحي سابق',
          debit: c.openingBalance,
          credit: 0,
          balanceAfter: running,
        });
      }

      // Add inspections as info lines
      for (const ins of c.inspections) {
        const roomCount = Array.isArray(ins.rooms) ? ins.rooms.length : 0;
        ledger.push({
          id: `INS-${ins.id}`,
          date: ins.scheduledAt || (ins.createdAt ? ins.createdAt.toISOString().split('T')[0] : c.createdAt),
          type: 'معاينة ومقاسات 📐',
          description: `طلب رفع مقاسات ومعاينة (${roomCount > 0 ? `${roomCount} غرف` : 'معاينة منزلية'}) — ${ins.status || 'تمت المعاينة'}`,
          debit: 0,
          credit: 0,
          balanceAfter: running,
        });
      }

      // Add curtain quotations and their deposits
      for (const q of c.quotations) {
        const qTotal = Number(q.totalAmount) || 0;
        const qDeposit = Number(q.depositPaid) || 0;
        const roomCount = Array.isArray(q.rooms) ? q.rooms.length : 0;
        const qDate = q.date || (q.createdAt ? q.createdAt.toISOString().split('T')[0] : c.createdAt);

        if (qTotal > 0) {
          running += qTotal;
          ledger.push({
            id: `QOT-${q.id}`,
            date: qDate,
            type: 'عقد ومقايسة ستائر 🪟',
            description: `عقد مقايسة وتوريد أقمشة ستائر (${roomCount > 0 ? `${roomCount} غرف` : 'طلب تفصيل'}) — ${q.status || 'معتمد'}`,
            debit: qTotal,
            credit: 0,
            balanceAfter: running,
          });
        }

        if (qDeposit > 0) {
          running -= qDeposit;
          ledger.push({
            id: `DEP-${q.id}`,
            date: qDate,
            type: 'عربون دفعة أولى 💵',
            description: `عربون مستلم عند اعتماد مقايسة الستائر (${qDeposit.toLocaleString()} ج)`,
            debit: 0,
            credit: qDeposit,
            balanceAfter: running,
          });
        }
      }

      // Add fabric sales and their payments
      for (const s of c.sales) {
        const sTotal = Number(s.totalAmount) || 0;
        const sPaid = Number(s.paidAmount) || 0;
        const sDate = s.date || (s.createdAt ? s.createdAt.toISOString().split('T')[0] : c.createdAt);
        const itemCount = Array.isArray(s.items) ? s.items.length : 0;

        if (sTotal > 0) {
          running += sTotal;
          ledger.push({
            id: `SAL-${s.id}`,
            date: sDate,
            type: 'فاتورة مبيعات أقمشة 🧾',
            description: `فاتورة كاشير بيع أقمشة رقم (${s.invoiceNumber || s.id}) — عدد الأصناف: ${itemCount}`,
            debit: sTotal,
            credit: 0,
            balanceAfter: running,
          });
        }

        if (sPaid > 0) {
          running -= sPaid;
          ledger.push({
            id: `SALPAY-${s.id}`,
            date: sDate,
            type: 'سداد كاشير 💵',
            description: `سداد قيمة فاتورة أقمشة (${s.paymentType || 'نقدي'})`,
            debit: 0,
            credit: sPaid,
            balanceAfter: running,
          });
        }
      }

      // Add collections
      for (const col of c.collections) {
        const colAmount = Number(col.amount) || 0;
        if (colAmount > 0) {
          running -= colAmount;
          ledger.push({
            id: `COL-${col.id}`,
            date: col.date || c.createdAt,
            type: 'سند تحصيل / سداد 💰',
            description: `سند تحصيل (${col.method || 'نقدي'}) — ${col.treasury || 'الخزينة الرئيسية'} ${col.notes ? `(${col.notes})` : ''}`,
            debit: 0,
            credit: colAmount,
            balanceAfter: running,
          });
        }
      }

      // Sort ledger entries chronologically
      ledger.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      // Re-calculate running balances in chronological order
      let finalRun = c.openingBalance || 0;
      for (const item of ledger) {
        if (item.debit > 0) finalRun += item.debit;
        if (item.credit > 0) finalRun -= item.credit;
        item.balanceAfter = finalRun;
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        city: c.city,
        openingBalance: c.openingBalance,
        totalSpent,
        totalDeposits,
        totalPaid,
        balance,
        ordersCount,
        inspectionsCount,
        notes: c.notes,
        createdAt: c.createdAt,
        ledger,
      };
    });

    return NextResponse.json({
      success: true,
      customers: resultCustomers,
      collections: rawCollections,
    });
  } catch (error: any) {
    console.error('Customers GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, address, city, balance, notes, collections } = body;

    // If saving collections list
    if (collections && Array.isArray(collections)) {
      await prisma.systemStore.upsert({
        where: { key: 'ahmed_kishk_collections_v3' },
        create: {
          key: 'ahmed_kishk_collections_v3',
          data: collections,
        },
        update: {
          data: collections,
        },
      });
      return NextResponse.json({ success: true, collections });
    }

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    const customer = await prisma.customer.upsert({
      where: { phone: phone.trim() },
      create: {
        id: id || undefined,
        name: name.trim(),
        phone: phone.trim(),
        address: address || '',
        city: city || 'القاهرة',
        balance: Number(balance) || 0,
        notes: notes || '',
      },
      update: {
        name: name.trim(),
        address: address || '',
        city: city || 'القاهرة',
        balance: Number(balance) || 0,
        notes: notes || '',
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

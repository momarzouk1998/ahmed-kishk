import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const bw = branchWhere(scope);
    // Customer ليس له عمود branch — الفرع مُخزَّن فى city.
    const customerWhere = scope && !scope.isAdmin ? { city: scope.branch } : {};

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key === 'ahmed_kishk_inspections_data_v4') {
      const inspections = await prisma.inspectionRequest.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: inspections });
    }
    if (key === 'ahmed_kishk_quotations_data_v4') {
      const quotations = await prisma.quotationOrder.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: quotations });
    }
    if (key === 'ahmed_kishk_pipeline_orders_v5') {
      const orders = await prisma.pipelineOrder.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: orders });
    }
    if (key === 'ahmed_kishk_customers_v3') {
      const customers = await prisma.customer.findMany({ where: customerWhere, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: customers });
    }
    if (key === 'ahmed_kishk_inventory_v3') {
      const inventory = await prisma.inventoryItem.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: inventory });
    }
    if (key === 'ahmed_kishk_suppliers_v3') {
      const suppliers = await prisma.supplier.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: suppliers });
    }
    if (key === 'ahmed_kishk_sales_invoices_v1') {
      const sales = await prisma.salesInvoice.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: sales });
    }
    if (key === 'ahmed_kishk_purchases_v3') {
      const purchases = await prisma.purchaseInvoice.findMany({ where: bw, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, key, data: purchases });
    }
    // Fallback: أى key غير معروف يُقرأ من SystemStore (بلا عزل فرع — بيانات إعدادات عامة عادةً)
    if (key) {
      const rec = await prisma.systemStore.findUnique({ where: { key } });
      const raw = rec?.data as any;
      const dataArr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      return NextResponse.json({ success: true, key, data: dataArr });
    }

    // Return all relational tables
    const [inspections, quotations, orders, customers, inventory, suppliers, sales, purchases] = await Promise.all([
      prisma.inspectionRequest.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
      prisma.quotationOrder.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
      prisma.pipelineOrder.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
      prisma.customer.findMany({ where: customerWhere, orderBy: { updatedAt: 'desc' } }),
      prisma.inventoryItem.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
      prisma.supplier.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
      prisma.salesInvoice.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
      prisma.purchaseInvoice.findMany({ where: bw, orderBy: { updatedAt: 'desc' } }),
    ]);

    const dataMap: Record<string, any> = {
      ahmed_kishk_inspections_data_v4: inspections,
      ahmed_kishk_quotations_data_v4: quotations,
      ahmed_kishk_pipeline_orders_v5: orders,
      ahmed_kishk_customers_v3: customers,
      ahmed_kishk_inventory_v3: inventory,
      ahmed_kishk_suppliers_v3: suppliers,
      ahmed_kishk_sales_invoices_v1: sales,
      ahmed_kishk_purchases_v3: purchases,
    };

    return NextResponse.json({ success: true, data: dataMap });
  } catch (error: any) {
    console.error('Error fetching relational data from PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, data } = body;

    if (!key || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Key and array data are required' }, { status: 400 });
    }

    // Sync into specific relational table
    if (key === 'ahmed_kishk_inspections_data_v4') {
      for (const item of data) {
        if (item && item.id) {
          await prisma.inspectionRequest.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              customerName: item.customerName || 'عميل جديد',
              phone: item.phone || '',
              address: item.address || '',
              branch: item.branch || 'الفرع الرئيسي',
              scheduledAt: item.scheduledAt || '',
              technician: item.technician || 'أحمد كشك',
              status: item.status || 'تم رفع المقاسات',
              isLocked: Boolean(item.isLocked),
              notes: item.notes || '',
              rooms: item.rooms || [],
            },
            update: {
              customerName: item.customerName,
              phone: item.phone,
              address: item.address,
              branch: item.branch,
              scheduledAt: item.scheduledAt,
              technician: item.technician,
              status: item.status,
              isLocked: item.isLocked !== undefined ? Boolean(item.isLocked) : undefined,
              notes: item.notes,
              rooms: item.rooms,
            },
          });
        }
      }
    } else if (key === 'ahmed_kishk_quotations_data_v4') {
      for (const item of data) {
        if (item && item.id) {
          await prisma.quotationOrder.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              inspectionId: item.inspectionId || item.id,
              customerName: item.customerName || '',
              phone: item.phone || '',
              address: item.address || '',
              branch: item.branch || 'الفرع الرئيسي',
              status: item.status || 'بانتظار التسعير',
              totalAmount: Number(item.totalAmount) || 0,
              depositPaid: Number(item.depositPaid) || 0,
              remainingAmount: Number(item.remainingAmount) || 0,
              date: item.date || new Date().toISOString().split('T')[0],
              deliveryDate: item.deliveryDate || null,
              estimatorName: item.estimatorName || 'أحمد كشك',
              rooms: item.rooms || [],
            },
            update: {
              customerName: item.customerName,
              phone: item.phone,
              address: item.address,
              branch: item.branch,
              status: item.status,
              totalAmount: Number(item.totalAmount) || 0,
              depositPaid: Number(item.depositPaid) || 0,
              remainingAmount: Number(item.remainingAmount) || 0,
              deliveryDate: item.deliveryDate || null,
              rooms: item.rooms,
            },
          });
        }
      }
    } else if (key === 'ahmed_kishk_pipeline_orders_v5') {
      for (const item of data) {
        if (item && item.id) {
          await prisma.pipelineOrder.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              orderId: item.orderId || item.id,
              customerName: item.customerName || '',
              phone: item.phone || '',
              address: item.address || '',
              branch: item.branch || 'الفرع الرئيسي',
              deliveryDate: item.deliveryDate || null,
              cutterName: item.cutterName || null,
              tailorName: item.tailorName || null,
              technicianName: item.technicianName || null,
              status: item.status || 'في المقص',
              localStatus: item.localStatus || 'بانتظار القص',
              totalAmount: Number(item.totalAmount) || 0,
              depositPaid: Number(item.depositPaid) || 0,
              remainingAmount: Number(item.remainingAmount) || 0,
              rooms: item.rooms || [],
            },
            update: {
              status: item.status,
              localStatus: item.localStatus,
              cutterName: item.cutterName,
              tailorName: item.tailorName,
              technicianName: item.technicianName,
              deliveryDate: item.deliveryDate,
              depositPaid: item.depositPaid !== undefined ? Number(item.depositPaid) : undefined,
              remainingAmount: item.remainingAmount !== undefined ? Number(item.remainingAmount) : undefined,
              rooms: item.rooms,
            },
          });
        }
      }
    } else if (key === 'ahmed_kishk_customers_v3') {
      for (const item of data) {
        if (item && (item.phone || item.id)) {
          const p = (item.phone || `0100000000${Math.floor(Math.random()*1000)}`).trim();
          await prisma.customer.upsert({
            where: { phone: p },
            create: {
              id: item.id || undefined,
              name: item.name || 'عميل',
              phone: p,
              address: item.address || '',
              city: item.city || 'غير مسجل',
              balance: Number(item.balance) || 0,
              notes: item.notes || '',
            },
            update: {
              name: item.name,
              address: item.address,
              city: item.city,
              balance: Number(item.balance) || 0,
              notes: item.notes,
            },
          });
        }
      }
    } else if (key === 'ahmed_kishk_inventory_v3') {
      for (const item of data) {
        if (item && item.code) {
          await prisma.inventoryItem.upsert({
            where: { code: item.code.trim() },
            create: {
              id: item.id || `INV-${Date.now()}-${Math.random()}`,
              code: item.code.trim(),
              name: item.name || '',
              category: item.category || 'ستائر',
              unit: item.unit || 'متر',
              totalQuantity: Number(item.totalQuantity) || 0,
              reservedQuantity: Number(item.reservedQuantity) || 0,
              costPrice: Number(item.costPrice) || 0,
              sellPrice: Number(item.sellPrice) || 0,
              branch: item.branch || 'الفرع الرئيسي',
              minAlert: Number(item.minAlert) || 20,
              supplier: item.supplier || 'شركة النيل',
            },
            update: {
              name: item.name,
              category: item.category,
              unit: item.unit,
              totalQuantity: Number(item.totalQuantity) || 0,
              reservedQuantity: Number(item.reservedQuantity) || 0,
              costPrice: Number(item.costPrice) || 0,
              sellPrice: Number(item.sellPrice) || 0,
              branch: item.branch,
              minAlert: Number(item.minAlert) || 20,
              supplier: item.supplier,
            },
          });
        }
      }
    } else {
      // Fallback عام: أى key غير معروف يُخزَّن فى SystemStore كـ blob JSON
      // (يستخدم للإعدادات مثل curtain defaults, supplier checks, ...).
      await prisma.systemStore.upsert({
        where: { key },
        update: { data: data as any },
        create: { key, data: data as any },
      });
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error: any) {
    console.error('Error persisting relational data to PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE — يمسح صف/صفوف من الجدول المرتبط بالـ key.
 * الاستخدام: DELETE /api/system-data?key=<KEY>&id=<ID>
 * أو body JSON: { key, ids: [...] }
 * هذا هو المفتاح لضمان أن حذف الأوردر/المعاينة/العميل ينتشر لقاعدة البيانات
 * بدلاً من مجرد إزالته من localStorage.
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    let key = url.searchParams.get('key') || '';
    let ids: string[] = [];
    const idParam = url.searchParams.get('id');
    if (idParam) ids = [idParam];

    if (!key || ids.length === 0) {
      try {
        const body = await request.json();
        key = key || body?.key;
        if (Array.isArray(body?.ids)) ids = body.ids;
        else if (body?.id) ids = [body.id];
      } catch {}
    }

    if (!key || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'key and id(s) required' }, { status: 400 });
    }

    const cleanIds = ids.map(String).filter(Boolean);
    let deleted = 0;

    if (key === 'ahmed_kishk_inspections_data_v4') {
      const r = await prisma.inspectionRequest.deleteMany({ where: { id: { in: cleanIds } } });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_quotations_data_v4') {
      const r = await prisma.quotationOrder.deleteMany({ where: { id: { in: cleanIds } } });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_pipeline_orders_v5') {
      const r = await prisma.pipelineOrder.deleteMany({
        where: { OR: [{ id: { in: cleanIds } }, { orderId: { in: cleanIds } }] },
      });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_customers_v3') {
      const r = await prisma.customer.deleteMany({ where: { id: { in: cleanIds } } });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_inventory_v3') {
      const r = await prisma.inventoryItem.deleteMany({ where: { OR: [{ id: { in: cleanIds } }, { code: { in: cleanIds } }] } });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_suppliers_v3') {
      const r = await prisma.supplier.deleteMany({ where: { id: { in: cleanIds } } });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_sales_invoices_v1') {
      const r = await prisma.salesInvoice.deleteMany({ where: { OR: [{ id: { in: cleanIds } }, { invoiceNumber: { in: cleanIds } }] } });
      deleted = r.count;
    } else if (key === 'ahmed_kishk_purchases_v3') {
      const r = await prisma.purchaseInvoice.deleteMany({ where: { OR: [{ id: { in: cleanIds } }, { invoiceNumber: { in: cleanIds } }] } });
      deleted = r.count;
    } else {
      return NextResponse.json({ success: false, error: `unsupported key: ${key}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, deleted, ids: cleanIds });
  } catch (error: any) {
    console.error('Error deleting from PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

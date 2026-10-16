import { NextResponse } from 'next/server';
import { getBranchScope } from '@/lib/branchScope';
import { computeSalesKpis, mergeQuotationsWithOrders, salesFromForPeriod, cairoHoursOf, SalesReportPeriod } from '@/lib/salesReportCalc';
import { GET as fabricSalesGET } from '@/app/api/fabric-sales/route';
import { GET as customersGET } from '@/app/api/customers/route';
import { GET as pricingGET } from '@/app/api/pricing/route';
import { GET as pipelineOrdersGET } from '@/app/api/pipeline-orders/route';
import { GET as shiftsGET } from '@/app/api/shifts/route';
import { GET as expensesGET } from '@/app/api/expenses/route';
import { GET as advancesGET } from '@/app/api/employee-advances/route';
import { GET as purchasesGET } from '@/app/api/purchases/route';
import { GET as transfersGET } from '@/app/api/branch-transfers/route';

export const dynamic = 'force-dynamic';

const PERIODS: SalesReportPeriod[] = ['yesterday', 'today', 'thisWeek', 'thisMonth', 'custom', 'all'];

// ملخص تقرير المبيعات + خزائن الفروع محسوب على السيرفر بنفس كود صفحة التقارير بالظبط
// (src/lib/salesReportCalc.ts)، وبنفس البيانات اللي الصفحة كانت بتطلبها (نفس الـ APIs
// بنفس صلاحيات المستخدم) — بس الفواتير بتتقري من قاعدة البيانات للفترة المطلوبة بس.
// كده الموبايل مش محتاج ينزّل الورديات/المصروفات/السلف/المشتريات/التسويات ولا يحسب.
export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const periodParam = (searchParams.get('period') || 'today') as SalesReportPeriod;
    const period: SalesReportPeriod = PERIODS.includes(periodParam) ? periodParam : 'today';
    const customStartDate = searchParams.get('start') || '';
    const customEndDate = searchParams.get('end') || '';
    // موظف الفرع: الصفحة بتثبّت الفرع على فرعه — نفس القاعدة هنا.
    const selectedBranch = scope.isAdmin ? (searchParams.get('branch') || 'ALL') : scope.branch;

    const sub = (path: string) => new Request(new URL(path, request.url), { headers: request.headers });
    const load = async (handler: (r: Request) => Promise<Response>, path: string) => {
      try {
        const res = await handler(sub(path));
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };

    const from = salesFromForPeriod(period, customStartDate);
    const [sales, cust, pri, ord, sh, exp, adv, pur, tr] = await Promise.all([
      load(fabricSalesGET, from ? `/api/fabric-sales?lite=1&from=${from}` : '/api/fabric-sales?lite=1'),
      load(customersGET, '/api/customers?lite=1'),
      load(pricingGET, '/api/pricing'),
      load(pipelineOrdersGET, '/api/pipeline-orders'),
      load(shiftsGET, '/api/shifts'),
      load(expensesGET, '/api/expenses'),
      load(advancesGET, '/api/employee-advances'),
      load(purchasesGET, '/api/purchases'),
      load(transfersGET, '/api/branch-transfers'),
    ]);

    const kpis = computeSalesKpis({
      invoices: Array.isArray(sales?.sales) ? sales.sales : [],
      quotations: mergeQuotationsWithOrders(pri?.quotations, ord?.orders),
      collections: Array.isArray(cust?.collections) ? cust.collections : [],
      customers: Array.isArray(cust?.customers) ? cust.customers : [],
      shifts: Array.isArray(sh?.shifts) ? sh.shifts : [],
      expenses: Array.isArray(exp?.expenses) ? exp.expenses : [],
      advances: Array.isArray(adv?.advances) ? adv.advances : [],
      purchases: Array.isArray(pur?.purchases) ? pur.purchases : [],
      branchTransfers: Array.isArray(tr?.transfers) ? tr.transfers : [],
      period,
      customStartDate,
      customEndDate,
      selectedBranch,
      hoursOf: cairoHoursOf,
    });

    return NextResponse.json({ success: true, period, selectedBranch, kpis });
  } catch (error: any) {
    console.error('sales-kpis error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

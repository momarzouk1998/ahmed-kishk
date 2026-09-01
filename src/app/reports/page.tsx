'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { formatDateOnly } from '@/lib/dateUtils';
import PdfPrintButton from '@/components/PdfPrintButton';

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  phone?: string;
  branch: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  splitPayments?: {
    cash?: number;
    instapay?: number;
    vodafone?: number;
    visa?: number;
  };
  status: string;
  items?: any[];
}

const SALES_INVOICES_KEY = 'ahmed_kishk_sales_invoices_v1';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'sales' | 'profits' | 'inventory' | 'curtains' | 'ledgers'>('sales');
  const [period, setPeriod] = useState<'today' | 'thisWeek' | 'thisMonth' | 'all'>('today');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/fabric-sales', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.sales)) {
            setInvoices(json.sales);
            localStorage.setItem(SALES_INVOICES_KEY, JSON.stringify(json.sales));
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching sales API:', err);
      }

      const raw = localStorage.getItem(SALES_INVOICES_KEY);
      if (raw) {
        try {
          setInvoices(JSON.parse(raw));
        } catch (e) {}
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Filter invoices by Period and Branch
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredInvoices = invoices.filter(inv => {
    // Branch Filter
    if (selectedBranch !== 'ALL' && inv.branch !== selectedBranch) {
      return false;
    }

    // Period Filter
    if (!inv.date) return true;
    const invDateStr = inv.date.split('T')[0];

    if (period === 'today') {
      return invDateStr === todayStr;
    }

    if (period === 'thisWeek') {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return new Date(invDateStr) >= weekAgo;
    }

    if (period === 'thisMonth') {
      const nowMonth = todayStr.substring(0, 7);
      return invDateStr.substring(0, 7) === nowMonth;
    }

    return true;
  });

  // Calculate Breakdown by Payment Methods (Including Split Payments!)
  let cashTotal = 0;
  let instapayTotal = 0;
  let vodafoneTotal = 0;
  let visaTotal = 0;
  let remainingTotal = 0;
  let totalGrandSales = 0;

  filteredInvoices.forEach(inv => {
    totalGrandSales += Number(inv.totalAmount || 0);
    remainingTotal += Number(inv.remainingAmount || 0);

    if (inv.paymentMethod === 'دفع متعدد / مزيج' && inv.splitPayments) {
      cashTotal += Number(inv.splitPayments.cash || 0);
      instapayTotal += Number(inv.splitPayments.instapay || 0);
      vodafoneTotal += Number(inv.splitPayments.vodafone || 0);
      visaTotal += Number(inv.splitPayments.visa || 0);
    } else {
      const paid = Number(inv.paidAmount || 0);
      if (inv.paymentMethod === 'نقدي') {
        cashTotal += paid;
      } else if (inv.paymentMethod === 'إنستاباي') {
        instapayTotal += paid;
      } else if (inv.paymentMethod === 'فودافون كاش') {
        vodafoneTotal += paid;
      } else if (inv.paymentMethod === 'فيزا / كارت') {
        visaTotal += paid;
      } else {
        cashTotal += paid; // Fallback
      }
    }
  });

  const totalCollected = cashTotal + instapayTotal + vodafoneTotal + visaTotal;

  return (
    <PageShell title="التقارير والإحصائيات الشاملة">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto" id="print-area">

        {/* Top Control Bar: Title & Period & Branch Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-soft">
          <div>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-3xl">analytics</span>
              <span>التقارير وجرد المبيعات والدرج</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
              تقرير مفصل وجرد يومية لكل فرع، النقدية بالدرج، تحويلات إنستاباي، فودافون كاش والفيزا.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PdfPrintButton
              targetSelector="#print-area"
              documentTitle={`تقرير-${reportType}-${period}-${selectedBranch === 'ALL' ? 'كل-الفروع' : selectedBranch}`}
              label="طباعة / حفظ PDF"
            />
            {/* Branch Filter Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 pr-2">الفرع:</span>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">🌐 جميع الفروع</option>
                <option value="الفرع الرئيسي">الفرع الرئيسي (سعد زغلول)</option>
                <option value="فرع عرابي">فرع عرابي</option>
                <option value="فرع عمر أفندي">فرع عمر أفندي</option>
                <option value="فرع الثلاثيني">فرع الثلاثيني</option>
              </select>
            </div>

            {/* Period Selector */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[
                { id: 'today', label: 'اليومية' },
                { id: 'thisWeek', label: 'هذا الأسبوع' },
                { id: 'thisMonth', label: 'هذا الشهر' },
                { id: 'all', label: 'الكل' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    period === p.id ? 'bg-amber-500 text-white font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
          {[
            { id: 'sales', label: 'تقارير مبيعات الفروع وجرد الدرج', icon: 'payments' },
            { id: 'profits', label: 'تقارير الأرباح والتكلفة', icon: 'trending_up' },
            { id: 'inventory', label: 'حركة وحالة المخزون', icon: 'inventory_2' },
            { id: 'curtains', label: 'تقارير الستائر والفنيين', icon: 'square_foot' },
            { id: 'ledgers', label: 'ديون العملاء والموردين', icon: 'account_balance_wallet' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                reportType === t.id ? 'border-amber-500 text-amber-900 font-black bg-amber-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Report Content Panel: Sales & Cash Drawer Audit */}
        {reportType === 'sales' && (
          <div className="space-y-6">
            
            {/* Header Notification Badge */}
            <div className="bg-slate-900 text-white p-4 rounded-3xl flex flex-wrap justify-between items-center gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  💰
                </div>
                <div>
                  <h3 className="font-black text-sm text-amber-400">
                    جرد تقفيل الخزينة والتحويلات — {selectedBranch === 'ALL' ? 'جميع الفروع' : selectedBranch}
                  </h3>
                  <p className="text-xs text-slate-300">
                    فترة التقرير: {period === 'today' ? 'اليومية الحالية' : period === 'thisWeek' ? 'الأسبوع الحالي' : period === 'thisMonth' ? 'الشهر الحالي' : 'إجمالي التراكمي'}
                  </p>
                </div>
              </div>

              <div className="text-left font-mono">
                <span className="text-xs text-slate-400 block font-sans">إجمالي المبيعات الإجمالية:</span>
                <span className="text-xl font-black text-white">{totalGrandSales.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* 5 Payment Breakdown Cards (جرد الخزينة والتحويلات) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              
              {/* 1. Cash in Drawer */}
              <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl space-y-1 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-900">💵 النقدية بالدرج (كاش)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="font-mono font-black text-xl sm:text-2xl text-emerald-950">
                  {cashTotal.toLocaleString()} <span className="text-xs">ج.م</span>
                </div>
                <p className="text-[10.5px] text-emerald-700 font-bold">المبلغ الفعلي بالخزينة النقدي</p>
              </div>

              {/* 2. InstaPay Transfers */}
              <div className="bg-purple-50 border-2 border-purple-300 p-4 rounded-2xl space-y-1 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900">⚡ تحويلات إنستاباي</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                </div>
                <div className="font-mono font-black text-xl sm:text-2xl text-purple-950">
                  {instapayTotal.toLocaleString()} <span className="text-xs">ج.م</span>
                </div>
                <p className="text-[10.5px] text-purple-700 font-bold">حساب البنك / InstaPay</p>
              </div>

              {/* 3. Vodafone Cash */}
              <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl space-y-1 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-900">📱 فودافون كاش</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                </div>
                <div className="font-mono font-black text-xl sm:text-2xl text-rose-950">
                  {vodafoneTotal.toLocaleString()} <span className="text-xs">ج.م</span>
                </div>
                <p className="text-[10.5px] text-rose-700 font-bold">محفظة فودافون كاش</p>
              </div>

              {/* 4. Visa / Cards */}
              <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-2xl space-y-1 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900">💳 فيزا وكروت البنوك</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>
                <div className="font-mono font-black text-xl sm:text-2xl text-blue-950">
                  {visaTotal.toLocaleString()} <span className="text-xs">ج.م</span>
                </div>
                <p className="text-[10.5px] text-blue-700 font-bold">حساب ماكينات POS والفيزا</p>
              </div>

              {/* 5. Debts / Remaining */}
              <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl space-y-1 shadow-2xs col-span-2 sm:col-span-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">⏳ الآجل والديون المتبقية</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                </div>
                <div className="font-mono font-black text-xl sm:text-2xl text-amber-950">
                  {remainingTotal.toLocaleString()} <span className="text-xs">ج.م</span>
                </div>
                <p className="text-[10.5px] text-amber-700 font-bold">مستحق تحصيله لاحقاً</p>
              </div>

            </div>

            {/* Invoices Table Audit */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-soft space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg">receipt</span>
                  <span>تفاصيل فواتير الفرع والجرد التفصيلي ({filteredInvoices.length} فاتورة):</span>
                </h3>
                <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  إجمالي المقبوضات الفعليه: {totalCollected.toLocaleString()} ج.م
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم الفاتورة والتاريخ</th>
                      <th className="p-3">العميل والفرع</th>
                      <th className="p-3 font-mono text-center">طريقة السداد</th>
                      <th className="p-3 font-mono text-center">إجمالي الفاتورة</th>
                      <th className="p-3 font-mono text-center">المدفوع والتحصيل</th>
                      <th className="p-3 font-mono text-center">المتبقي / آجل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد فواتير مبيعات لهذا الفرع في الفترة المحددة
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-black text-slate-900 block">{inv.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{inv.date ? formatDateOnly(inv.date) : ''}</span>
                          </td>

                          <td className="p-3 font-bold text-slate-900">
                            <div>{inv.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{inv.branch}</div>
                          </td>

                          <td className="p-3 text-center">
                            {inv.splitPayments ? (
                              <span className="inline-block bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">
                                🔀 متعدد ({[
                                  inv.splitPayments.cash ? `${inv.splitPayments.cash} كاش` : '',
                                  inv.splitPayments.instapay ? `${inv.splitPayments.instapay} إنستا` : '',
                                  inv.splitPayments.vodafone ? `${inv.splitPayments.vodafone} فودافون` : '',
                                  inv.splitPayments.visa ? `${inv.splitPayments.visa} فيزا` : '',
                                ].filter(Boolean).join(' + ')})
                              </span>
                            ) : (
                              <span className="inline-block bg-slate-100 text-slate-900 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">
                                {inv.paymentMethod || 'نقدي'}
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center font-mono font-black text-slate-950">
                            {(Number(inv.totalAmount) || 0).toLocaleString()} ج
                          </td>

                          <td className="p-3 text-center font-mono font-bold text-emerald-700">
                            {(Number(inv.paidAmount) || 0).toLocaleString()} ج
                          </td>

                          <td className="p-3 text-center font-mono font-bold text-rose-700">
                            {(Number(inv.remainingAmount) || 0) > 0 ? `${Number(inv.remainingAmount).toLocaleString()} ج` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {reportType === 'profits' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-xs font-mono text-slate-500">إجمالي الإيرادات</div>
                <div className="font-display font-bold text-2xl text-slate-900 mt-1">{totalGrandSales.toLocaleString()} ج.م</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-xs font-mono text-slate-500">تكلفة المنسوجات والخامات التقديرية</div>
                <div className="font-display font-bold text-2xl text-rose-700 mt-1">{(totalGrandSales * 0.65).toLocaleString()} ج.م</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-xs font-mono text-slate-500">صافي الأرباح التقديرية</div>
                <div className="font-display font-bold text-2xl text-emerald-700 mt-1">{(totalGrandSales * 0.35).toLocaleString()} ج.م</div>
              </div>
            </div>
          </div>
        )}

        {reportType === 'inventory' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-soft">
            <h3 className="font-bold text-base text-slate-900">الأصناف الأكثر مبيعاً في النظام</h3>
            <div className="space-y-3 text-sm">
              {[
                { name: 'تول ناعم ستائر', metersSold: 140, totalVal: 16800 },
                { name: 'ستان سواريه', metersSold: 85, totalVal: 38250 },
                { name: 'بلاك آوت عازل ضوء', metersSold: 65, totalVal: 18200 },
                { name: 'تراك سقف ألومنيوم', metersSold: 110, totalVal: 9350 },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500 font-mono">تم بيع {item.metersSold} متر</div>
                  </div>
                  <div className="font-mono font-bold text-emerald-700">{item.totalVal.toLocaleString()} ج.م</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportType === 'curtains' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
              <h3 className="font-bold text-base text-slate-900 mb-3">حالات المعاينات والطلبات</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span>إجمالي طلبات المعاينة</span>
                  <span className="font-mono font-bold">24 معاينة</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span>معاينات مكتملة (تم رفع المقاسات)</span>
                  <span className="font-mono font-bold text-emerald-700">18 معاينة</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}

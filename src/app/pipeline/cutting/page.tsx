'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface CuttingItem {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  roomName: string;
  dimensions: string;
  fabricName: string;
  fabricCode: string;
  requiredMeters: number;
  status: 'بانتظار القص' | 'تم استلام القماش' | 'تم القص وجاهز للخياطة';
  cutterName: string;
  notes: string;
}

const initialItems: CuttingItem[] = [
  {
    id: 'CUT-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'الصالة الرئيسية (بلكونة)',
    dimensions: 'عرض 350سم × ارتفاع 280سم',
    fabricName: 'تول خفيف مطرز',
    fabricCode: 'T-402',
    requiredMeters: 8.75,
    status: 'تم القص وجاهز للخياطة',
    cutterName: 'عم مصطفى',
    notes: 'قص قطعتين متساويتين',
  },
  {
    id: 'CUT-102',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'الصالة الرئيسية (بلكونة)',
    dimensions: 'عرض 350سم × ارتفاع 280سم',
    fabricName: 'قطيفة تركي ثقيل',
    fabricCode: 'V-990',
    requiredMeters: 6.30,
    status: 'بانتظار القص',
    cutterName: 'عم مصطفى',
    notes: 'مراعاة اتجاه وبَر القطيفة',
  },
  {
    id: 'CUT-103',
    orderId: 'ORD-002',
    customerName: 'شركة المعمار',
    phone: '01155556666',
    roomName: 'قاعة الاجتماعات',
    dimensions: 'عرض 500سم × ارتفاع 300سم',
    fabricName: 'بلاك آوت عازل ضوء',
    fabricCode: 'BL-900',
    requiredMeters: 16.00,
    status: 'تم القص وجاهز للخياطة',
    cutterName: 'أحمد شحاتة',
    notes: '3 شبابيك متساوية',
  }
];

export default function PipelineCuttingPage() {
  const [items, setItems] = useState<CuttingItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: CuttingItem['status']) => status === 'تم القص وجاهز للخياطة';

  const tabFiltered = items.filter(i => activeTab === 'OPEN' ? !isSent(i.status) : isSent(i.status));
  const filtered = tabFiltered.filter(i =>
    i.customerName.includes(searchQuery) || i.fabricCode.includes(searchQuery) || i.id.includes(searchQuery)
  );

  const updateItemStatus = (id: string, newStatus: CuttingItem['status']) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  const openCount = items.filter(i => !isSent(i.status)).length;
  const sentCount = items.filter(i => isSent(i.status)).length;

  return (
    <PageShell title="قص القماش">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              مرحلة القص
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">قص القماش</h1>
          </div>
        </div>

        {/* 2-Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">content_cut</span>
            <span>أوامر القص الجارية</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'SENT'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            <span>سجل المقصوص والمحول للورشة (جدول)</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الكود، كود القماش..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد أوامر قص جارية' : 'السجل فارغ'}
            </h3>
          </div>
        ) : activeTab === 'SENT' ? (
          /* TAB 2: Table for History */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">كود القص</th>
                    <th className="p-3.5">كود الطلب</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">الغرفة</th>
                    <th className="p-3.5">القماش</th>
                    <th className="p-3.5 text-center font-mono">الأمتار المقصوصة</th>
                    <th className="p-3.5">المسؤول</th>
                    <th className="p-3.5 text-center">تحديث واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-brand-gold-dark">{item.id}</td>
                      <td className="p-3.5 font-mono text-slate-500">{item.orderId}</td>
                      <td className="p-3.5 font-bold text-slate-900">{item.customerName}</td>
                      <td className="p-3.5 text-slate-700">{item.roomName}</td>
                      <td className="p-3.5 font-bold text-slate-800">{item.fabricName}</td>
                      <td className="p-3.5 text-center font-mono font-black text-amber-800">{item.requiredMeters} م</td>
                      <td className="p-3.5 text-slate-700">{item.cutterName}</td>
                      <td className="p-3.5 text-center">
                        <a
                          href={`https://wa.me/2${item.phone}?text=${encodeURIComponent(`مرحباً ${item.customerName}، نود إعلامك بأنه تم قص القماش الخاص بأوردر الستائر في مؤسسة أحمد كشك وجاري تحويله للورشة والتفصيل. شكراً لثقتكم بنا!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200"
                        >
                          💬 واتساب
                        </a>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          تم القص والتحويل للورشة
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1: Active Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-brand-gold-dark">{item.id}</span>
                      <h3 className="font-bold text-base text-slate-900">{item.customerName}</h3>
                      <p className="text-xs text-slate-600 font-bold">{item.roomName}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      item.status === 'تم استلام القماش' ? 'bg-blue-100 text-blue-900 border-blue-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl my-2.5 text-xs space-y-1.5 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">القماش:</span>
                      <strong className="text-slate-900">{item.fabricName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">المطلوب قصه:</span>
                      <strong className="font-mono font-black text-amber-800 text-sm">{item.requiredMeters} متر</strong>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-amber-950 bg-amber-50 p-2 rounded-lg border border-amber-200 mb-3">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${item.phone}?text=${encodeURIComponent(`مرحباً ${item.customerName}، نود إعلامك بأن أوردر الستائر الخاص بك في مرحلة قص القماش حالياً بمؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    💬 إرسال تحديث للعميل (واتساب)
                  </a>

                  {item.status === 'بانتظار القص' && (
                    <button
                      onClick={() => updateItemStatus(item.id, 'تم استلام القماش')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      استلام الثوب
                    </button>
                  )}
                  {item.status === 'تم استلام القماش' && (
                    <button
                      onClick={() => updateItemStatus(item.id, 'تم القص وجاهز للخياطة')}
                      className="w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2 rounded-xl text-xs font-black shadow-gold cursor-pointer"
                    >
                      تأكيد القص والتحويل للورشة ←
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

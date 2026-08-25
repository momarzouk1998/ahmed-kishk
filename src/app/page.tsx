'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface InspectionRequest {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  scheduledAt: string;
  status: 'مُجدول' | 'قيد الانتظار' | 'مكتمل';
}

export default function DashboardPage() {
  const [requests] = useState<InspectionRequest[]>([
    {
      id: '1',
      customerName: 'محمود عبد الرحمن',
      phone: '01012345678',
      address: 'التجمع الخامس، فيلا 42',
      scheduledAt: '١٥ أكتوبر - ٤:٠٠ م',
      status: 'مُجدول',
    },
    {
      id: '2',
      customerName: 'سارة أحمد',
      phone: '01298765432',
      address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
      scheduledAt: 'لم يحدد بعد',
      status: 'قيد الانتظار',
    },
    {
      id: '3',
      customerName: 'شركة المعمار',
      phone: '01155556666',
      address: 'المهندسين، شارع البطل أحمد عبد العزيز',
      scheduledAt: '١٢ أكتوبر - تمت الزيارة',
      status: 'مكتمل',
    },
  ]);

  const [selectedRequestId, setSelectedRequestId] = useState<string>('1');

  // Form State
  const [roomName, setRoomName] = useState('الصالة الرئيسية');
  const [roomType, setRoomType] = useState<'window' | 'balcony'>('balcony');
  const [widthCm, setWidthCm] = useState<number>(350);
  const [heightCm, setHeightCm] = useState<number>(280);
  const [sides, setSides] = useState<number>(2);
  const [extraHeightCm, setExtraHeightCm] = useState<number>(0);
  const [installationType, setInstallationType] = useState<'ceiling' | 'wall' | 'rods'>('ceiling');
  const [ceilingType, setCeilingType] = useState<'standard' | 'gypsum' | 'lightbox'>('gypsum');

  // Fabric Table State
  const [tulleCode, setTulleCode] = useState('T-402');
  const [tulleTape, setTulleTape] = useState(true);
  const [tulleEyelet, setTulleEyelet] = useState(false);

  const [velvetCode, setVelvetCode] = useState('V-990');
  const [velvetTape, setVelvetTape] = useState(false);
  const [velvetEyelet, setVelvetEyelet] = useState(true);

  const [blackoutCode, setBlackoutCode] = useState('');
  const [blackoutTape, setBlackoutTape] = useState(false);
  const [blackoutEyelet, setBlackoutEyelet] = useState(false);

  const [avgPrice, setAvgPrice] = useState<number>(450);

  // Auto calculate meters & estimated cost
  const calculatedMeters = Number(((widthCm * (sides === 2 ? 2.5 : 1.8)) / 100).toFixed(1));
  const estimatedTotalCost = Math.round(calculatedMeters * avgPrice);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`تم حفظ مقاسات الغرفة (${roomName}) للعميل (${selectedRequest.customerName}) بنجاح!`);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*طلب معاينة ومقاسات - أحمد كشك*\nالعميل: ${selectedRequest.customerName}\nالعنوان: ${selectedRequest.address}\nغرفة: ${roomName} (${roomType === 'balcony' ? 'بلكونة' : 'شباك'})\nالمقاس: ${widthCm} سم عرض × ${heightCm} سم ارتفاع (${sides === 2 ? 'جنبين' : 'جنب واحد'})\nالأمتار التقديرية: ${calculatedMeters} متر\nالتكلفة التقديرية: ${estimatedTotalCost} ج.م`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <Header />

      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-8">
          {/* Top Banner */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-3xl text-primary tracking-tight">
                المعاينات والمقاسات
              </h1>
              <p className="text-on-surface-variant text-base mt-1">
                إدارة طلبات المعاينة الميدانية وتسجيل تفاصيل مقاسات الستائر والأقمشة.
              </p>
            </div>
            <button
              onClick={() => alert('إضافة طلب معاينة جديد')}
              className="bg-primary text-on-primary px-6 py-3 rounded hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-sm shadow"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>طلب معاينة جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Request List (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <h2 className="font-display font-bold text-xl text-primary">طلبات المعاينة</h2>
                <div className="flex gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">
                    filter_list
                  </span>
                  <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">
                    sort
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {requests.map((req) => {
                  const isSelected = req.id === selectedRequestId;
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`p-5 rounded-lg cursor-pointer border transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-surface shadow-md border-primary'
                          : 'bg-surface-container-lowest border-surface-container-highest hover:border-outline-variant'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-display font-bold text-lg text-primary">
                            {req.customerName}
                          </h3>
                          <p className="text-on-surface-variant text-xs mt-0.5">{req.phone}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                            req.status === 'مُجدول'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : req.status === 'مكتمل'
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <p className="text-on-surface-variant text-xs mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span>{req.address}</span>
                      </p>

                      <div className="flex items-center gap-2 text-xs font-semibold bg-surface-container-low p-2 rounded text-primary">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        <span>{req.scheduledAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Measurement Form (8 Columns) */}
            <div className="lg:col-span-8 bg-surface-container-lowest shadow-sm rounded-xl p-8 border border-surface-container-highest">
              <div className="flex flex-wrap items-center justify-between mb-6 pb-6 border-b border-surface-container-low gap-4">
                <div>
                  <h2 className="font-display font-bold text-xl text-primary">
                    تفاصيل مقاسات الستارة
                  </h2>
                  <p className="text-on-surface-variant text-sm mt-1">
                    العميل: <strong className="text-primary">{selectedRequest.customerName}</strong> | {selectedRequest.address}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-4 py-2 rounded flex items-center gap-2 text-xs font-mono font-medium transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    <span>مشاركة واتساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="bg-primary text-on-primary px-6 py-2 rounded flex items-center gap-2 hover:bg-inverse-surface text-xs font-mono font-medium transition-all shadow"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>حفظ المقاسات</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-6">
                {/* Basic Room Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-medium text-on-surface-variant">
                      اسم الغرفة
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded p-3 text-primary focus:outline-none focus:border-primary transition-colors text-sm"
                      placeholder="مثال: الصالة الرئيسية"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-medium text-on-surface-variant">
                      نوع الفتحة
                    </label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value as 'window' | 'balcony')}
                      className="w-full bg-surface border border-outline-variant rounded p-3 text-primary focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer"
                    >
                      <option value="window">شباك</option>
                      <option value="balcony">بلكونة</option>
                    </select>
                  </div>
                </div>

                {/* Dimensions Ribbon */}
                <div className="bg-surface-container-low p-6 border border-surface-container-highest rounded-lg grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-medium text-on-surface-variant">
                      العرض (سم)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={widthCm}
                        onChange={(e) => setWidthCm(Number(e.target.value))}
                        className="w-full bg-surface border border-outline-variant rounded p-3 text-primary font-mono text-sm focus:outline-none focus:border-primary"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xs">
                        cm
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-medium text-on-surface-variant">
                      الارتفاع (سم)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                        className="w-full bg-surface border border-outline-variant rounded p-3 text-primary font-mono text-sm focus:outline-none focus:border-primary"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xs">
                        cm
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-medium text-on-surface-variant">
                      الجوانب
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSides(1)}
                        className={`flex-1 py-3 border rounded text-xs transition-colors font-medium ${
                          sides === 1
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant bg-surface text-on-surface-variant'
                        }`}
                      >
                        جنب واحد
                      </button>
                      <button
                        type="button"
                        onClick={() => setSides(2)}
                        className={`flex-1 py-3 border rounded text-xs transition-colors font-medium ${
                          sides === 2
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant bg-surface text-on-surface-variant'
                        }`}
                      >
                        جنبين
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-medium text-on-surface-variant">
                      ارتفاع إضافي
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={extraHeightCm}
                        onChange={(e) => setExtraHeightCm(Number(e.target.value))}
                        className="w-full bg-surface border border-outline-variant rounded p-3 text-primary font-mono text-sm focus:outline-none focus:border-primary"
                        placeholder="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xs">
                        cm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Installation & Ceiling */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-mono font-medium text-on-surface-variant border-b border-surface-container-low pb-2">
                      طريقة التركيب
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'ceiling', label: 'مجرى سقف (Ceiling Track)' },
                        { id: 'wall', label: 'مجرى حائط (Wall Track)' },
                        { id: 'rods', label: 'مواسير (Rods)' },
                      ].map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-surface-container-low transition-colors"
                        >
                          <input
                            type="radio"
                            name="installation"
                            checked={installationType === item.id}
                            onChange={() => setInstallationType(item.id as any)}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="text-sm">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-mono font-medium text-on-surface-variant border-b border-surface-container-low pb-2">
                      نوع السقف / الجيبسون بورد
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'standard', label: 'عادي (بدون بيت نور)' },
                        { id: 'gypsum', label: 'جيبسون بورد مفرغ' },
                        { id: 'lightbox', label: 'بيت نور كامل (Light Box)' },
                      ].map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-surface-container-low transition-colors"
                        >
                          <input
                            type="radio"
                            name="ceiling"
                            checked={ceilingType === item.id}
                            onChange={() => setCeilingType(item.id as any)}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="text-sm">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fabric Specification Table */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-display font-bold text-lg text-primary border-b border-surface-container-highest pb-2">
                    تفاصيل الأقمشة والشريط
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low text-xs font-mono text-on-surface-variant">
                          <th className="p-3">الطبقة</th>
                          <th className="p-3">نوع القماش (الكود)</th>
                          <th className="p-3 text-center">شريط كشكشة</th>
                          <th className="p-3 text-center">حلقات (كبس)</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr className="border-b border-surface-container-low">
                          <td className="p-3 font-bold text-primary">خفيف (تول)</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={tulleCode}
                              onChange={(e) => setTulleCode(e.target.value)}
                              placeholder="مثال: T-402"
                              className="w-36 bg-surface border border-outline-variant rounded p-1.5 text-xs"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={tulleTape}
                              onChange={(e) => setTulleTape(e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={tulleEyelet}
                              onChange={(e) => setTulleEyelet(e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </td>
                        </tr>

                        <tr className="border-b border-surface-container-low">
                          <td className="p-3 font-bold text-primary">ثقيل (قطيفة/كتان)</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={velvetCode}
                              onChange={(e) => setVelvetCode(e.target.value)}
                              className="w-36 bg-surface border border-outline-variant rounded p-1.5 text-xs"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={velvetTape}
                              onChange={(e) => setVelvetTape(e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={velvetEyelet}
                              onChange={(e) => setVelvetEyelet(e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </td>
                        </tr>

                        <tr>
                          <td className="p-3 font-bold text-primary">بلاك آوت / بطانة</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={blackoutCode}
                              onChange={(e) => setBlackoutCode(e.target.value)}
                              placeholder="كود القماش"
                              className="w-36 bg-surface border border-outline-variant rounded p-1.5 text-xs"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={blackoutTape}
                              onChange={(e) => setBlackoutTape(e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={blackoutEyelet}
                              onChange={(e) => setBlackoutEyelet(e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Calculation Ribbon */}
                <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex gap-6 w-full md:w-auto">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-on-surface-variant">
                        إجمالي أمتار القماش التقديري
                      </span>
                      <span className="font-mono text-xl font-bold text-primary">
                        {calculatedMeters} <span className="text-xs font-normal">متر</span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-on-surface-variant">
                        متوسط السعر / متر
                      </span>
                      <div className="relative w-32">
                        <input
                          type="number"
                          value={avgPrice}
                          onChange={(e) => setAvgPrice(Number(e.target.value))}
                          className="w-full bg-surface border border-outline-variant rounded p-1.5 text-sm font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col text-left w-full md:w-auto">
                    <span className="text-xs font-mono text-on-surface-variant">
                      الإجمالي التقريبي (لهذه الغرفة)
                    </span>
                    <span className="font-display text-3xl font-bold text-primary">
                      {estimatedTotalCost.toLocaleString()}{' '}
                      <span className="text-sm font-normal text-on-surface-variant">ج.م</span>
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

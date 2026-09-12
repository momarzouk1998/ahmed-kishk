'use client';

/**
 * نظام الورديات وتسليم وتسلم الأدراج والخزائن اليومية (Z-Report).
 * مستوحى من نظام ماسبيرو المتقدم: عهدة افتتاح، تتبع مبيعات، ومطابقة الدرج.
 */

export interface ShiftSession {
  id: string;
  branch: string;
  shiftType: 'صباحي' | 'مسائي';
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime?: string;
  status: 'OPEN' | 'CLOSED';
  openingDrawerBalance: number; // عهدة نقدية أول المدة
  
  // Sales breakdown inside this shift
  cashSales: number;
  instapaySales: number;
  vodafoneSales: number;
  visaSales: number;
  totalSales: number;

  // Drawer outgoing inside this shift
  expensesPaid: number;
  advancesPaid: number;

  // Expected cash in drawer at closing
  // expectedCash = openingDrawerBalance + cashSales - (expensesPaid + advancesPaid)
  expectedCashInDrawer: number;
  actualClosingCash?: number;
  cashDiscrepancy?: number; // actual - expected
  discrepancyReason?: string;

  // Handover destination
  handoverDestination?: 'تسليم لوردية المساء' | 'توريد لخزينة الإدارة (فرع عمر أفندي)' | 'إبقاء بالدرج لليوم التالي' | string;
  handoverReceiverName?: string;
  closingNotes?: string;
}

export async function fetchShiftsFromServer(branchName?: string): Promise<ShiftSession[]> {
  try {
    const url = branchName && branchName !== 'all' && branchName !== 'الكل'
      ? `/api/shifts?branch=${encodeURIComponent(branchName)}`
      : '/api/shifts';
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.shifts)) {
        return json.shifts;
      }
    }
  } catch (e) {
    console.error('Error fetching shifts from database:', e);
  }
  return [];
}

export async function startNewShift(params: {
  branch: string;
  shiftType: 'صباحي' | 'مسائي';
  employeeId: string;
  employeeName: string;
  openingDrawerBalance: number;
}): Promise<ShiftSession> {
  const newShift: ShiftSession = {
    id: `SHF-${Date.now().toString().slice(-6)}`,
    branch: params.branch,
    shiftType: params.shiftType,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    startTime: new Date().toISOString(),
    status: 'OPEN',
    openingDrawerBalance: params.openingDrawerBalance || 0,
    cashSales: 0,
    instapaySales: 0,
    vodafoneSales: 0,
    visaSales: 0,
    totalSales: 0,
    expensesPaid: 0,
    advancesPaid: 0,
    expectedCashInDrawer: params.openingDrawerBalance || 0,
  };

  try {
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShift),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.shift) return json.shift;
    }
  } catch (e) {
    console.error('Error starting shift on server:', e);
  }

  return newShift;
}

export async function closeActiveShift(params: {
  shiftId: string;
  actualClosingCash: number;
  discrepancyReason?: string;
  handoverDestination: string;
  handoverReceiverName?: string;
  closingNotes?: string;
}): Promise<any> {
  try {
    const res = await fetch('/api/shifts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const json = await res.json();
      return json.shift;
    }
  } catch (e) {
    console.error('Error closing shift on server:', e);
  }
}

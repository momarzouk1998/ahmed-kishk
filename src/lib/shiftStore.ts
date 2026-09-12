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

const SHIFTS_STORAGE_KEY = 'ahmed_kishk_shifts_v1';

export async function fetchShiftsFromServer(branchName?: string): Promise<ShiftSession[]> {
  try {
    const url = branchName && branchName !== 'all' && branchName !== 'الكل'
      ? `/api/shifts?branch=${encodeURIComponent(branchName)}`
      : '/api/shifts';
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.shifts)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(json.shifts));
        }
        return json.shifts;
      }
    }
  } catch (e) {
    console.error('Error fetching shifts from server:', e);
  }
  return getShifts();
}

export function getShifts(): ShiftSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHIFTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShifts(shifts: ShiftSession[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
  }
  fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: SHIFTS_STORAGE_KEY, data: shifts }),
  }).catch(() => {});
}

export function getActiveShiftForBranch(branchName: string): ShiftSession | undefined {
  const shifts = getShifts();
  return shifts.find(s => s.branch === branchName && s.status === 'OPEN');
}

export function startNewShift(params: {
  branch: string;
  shiftType: 'صباحي' | 'مسائي';
  employeeId: string;
  employeeName: string;
  openingDrawerBalance: number;
}): ShiftSession {
  const shifts = getShifts();
  const nowIso = new Date().toISOString();
  
  // Close any previously stuck open shift for this branch
  const updatedShifts = shifts.map(s => {
    if (s.branch === params.branch && s.status === 'OPEN') {
      return { ...s, status: 'CLOSED' as const, endTime: nowIso };
    }
    return s;
  });

  const newShift: ShiftSession = {
    id: `SHF-${Date.now().toString().slice(-6)}`,
    branch: params.branch,
    shiftType: params.shiftType,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    startTime: nowIso,
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

  updatedShifts.unshift(newShift);
  saveShifts(updatedShifts);

  // Sync with DB API
  fetch('/api/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newShift),
  }).catch(() => {});

  return newShift;
}

export function closeActiveShift(params: {
  shiftId: string;
  actualClosingCash: number;
  discrepancyReason?: string;
  handoverDestination: 'تسليم لوردية المساء' | 'توريد لخزينة الإدارة (فرع عمر أفندي)' | 'إبقاء بالدرج لليوم التالي' | string;
  handoverReceiverName?: string;
  closingNotes?: string;
}): ShiftSession {
  const shifts = getShifts();
  const shiftIdx = shifts.findIndex(s => s.id === params.shiftId);
  if (shiftIdx === -1) throw new Error('الوردية غير موجودة');

  const shift = shifts[shiftIdx];
  const expected = (shift.openingDrawerBalance || 0) + (shift.cashSales || 0) - ((shift.expensesPaid || 0) + (shift.advancesPaid || 0));
  const discrepancy = params.actualClosingCash - expected;

  const closedShift: ShiftSession = {
    ...shift,
    status: 'CLOSED',
    endTime: new Date().toISOString(),
    actualClosingCash: params.actualClosingCash,
    expectedCashInDrawer: expected,
    cashDiscrepancy: discrepancy,
    discrepancyReason: params.discrepancyReason,
    handoverDestination: params.handoverDestination,
    handoverReceiverName: params.handoverReceiverName,
    closingNotes: params.closingNotes,
  };

  shifts[shiftIdx] = closedShift;
  saveShifts(shifts);

  // Sync with DB API
  fetch('/api/shifts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).catch(() => {});

  return closedShift;
}

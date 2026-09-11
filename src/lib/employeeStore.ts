'use client';

/**
 * نظام إدارة الموظفين، الحضور والانصراف، السلف، وتقفيل الرواتب الأسبوعية (كل خميس).
 * مدعوم بقاعدة بيانات الـ 18 موظفاً المعتمدة في المستند.
 */

export interface Employee {
  id: string;
  name: string;
  branch: string;
  dailyWage: number;
  workStartTime: string; // e.g. "11:00 AM"
  workEndTime: string;   // e.g. "11:30 PM"
  phone?: string;
  role?: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  branch: string;
  status: 'حاضر' | 'غياب' | 'إجازة' | 'نصف يوم';
  checkInTime?: string;
  checkOutTime?: string;
  delayMinutes?: number;
  notes?: string;
  recordedBy?: string; // Branch manager name
}

export interface EmployeeAdvance {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  type: 'سلفة' | 'خصم' | 'مكافأة';
  amount: number;
  reason: string;
  treasuryDeducted: boolean;
  settledInPayrollId?: string;
  recordedBy?: string;
}

export interface WeeklyPayrollSettlement {
  id: string;
  settlementDate: string; // Thursday date YYYY-MM-DD
  weekStartDate: string;  // Saturday date YYYY-MM-DD
  weekEndDate: string;    // Thursday date YYYY-MM-DD
  branch: string;
  employeeId: string;
  employeeName: string;
  dailyWage: number;
  daysAttended: number;
  baseSalaryEarned: number;
  totalBonuses: number;
  totalDeductions: number;
  totalAdvances: number;
  netPayout: number;
  isPaid: boolean;
  paidAt?: string;
  paidFromTreasury?: string;
  notes?: string;
}

const EMPLOYEES_STORAGE_KEY = 'ahmed_kishk_employees_v1';
const ATTENDANCE_STORAGE_KEY = 'ahmed_kishk_attendance_v1';
const ADVANCES_STORAGE_KEY = 'ahmed_kishk_advances_v1';
const PAYROLL_STORAGE_KEY = 'ahmed_kishk_payroll_v1';

export const INITIAL_EMPLOYEES: Employee[] = [
  // الفرع الرئيسي (3)
  { id: 'emp_1', name: 'محمود', branch: 'الفرع الرئيسي', dailyWage: 350, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول الفرع الرئيسي', isActive: true },
  { id: 'emp_2', name: 'يوسف', branch: 'الفرع الرئيسي', dailyWage: 250, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مبيعات أقمشة', isActive: true },
  { id: 'emp_3', name: 'سليمان', branch: 'الفرع الرئيسي', dailyWage: 150, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مساعد مبيعات', isActive: true },

  // فرع عرابي (5)
  { id: 'emp_4', name: 'ابراهيم', branch: 'فرع عرابي', dailyWage: 300, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول فرع عرابي', isActive: true },
  { id: 'emp_5', name: 'نصار', branch: 'فرع عرابي', dailyWage: 270, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مبيعات', isActive: true },
  { id: 'emp_6', name: 'امين', branch: 'فرع عرابي', dailyWage: 200, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'فني تركيبات', isActive: true },
  { id: 'emp_7', name: 'محمد', branch: 'فرع عرابي', dailyWage: 250, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'سائق ومندوب توصيل', isActive: true },
  { id: 'emp_8', name: 'اسراء', branch: 'فرع عرابي', dailyWage: 130, workStartTime: '12:00 PM', workEndTime: '08:00 PM', role: 'مبيعات وسيدات', isActive: true },

  // فرع عمر أفندي (5)
  { id: 'emp_10', name: 'محمد كشك', branch: 'فرع عمر أفندي', dailyWage: 350, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مدير فرع عمر أفندي', isActive: true },
  { id: 'emp_9', name: 'بليه (شبلية)', branch: 'فرع عمر أفندي', dailyWage: 400, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'إدارة ومبيعات', isActive: true },
  { id: 'emp_11', name: 'صبحى', branch: 'فرع عمر أفندي', dailyWage: 350, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول وردية وكاشير', isActive: true },
  { id: 'emp_12', name: 'سيد', branch: 'فرع عمر أفندي', dailyWage: 350, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مبيعات', isActive: true },
  { id: 'emp_13', name: 'احمد', branch: 'فرع عمر أفندي', dailyWage: 150, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مساعد', isActive: true },

  // فرع الثلاثيني (1)
  { id: 'emp_14', name: 'كوكو', branch: 'فرع الثلاثيني', dailyWage: 200, workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول فرع الثلاثيني', isActive: true },

  // الفرع التجاري (2)
  { id: 'emp_15', name: 'عبدالرحمن كشك', phone: '01280042900', branch: 'الفرع التجاري', dailyWage: 400, workStartTime: '12:00 PM', workEndTime: '11:30 PM', role: 'مدير الفرع التجاري', isActive: true },
  { id: 'emp_16', name: 'محمد على', phone: '01220999355', branch: 'الفرع التجاري', dailyWage: 250, workStartTime: '12:00 PM', workEndTime: '11:30 PM', role: 'كاشير الفرع التجاري', isActive: true },
];

export function getEmployees(): Employee[] {
  if (typeof window === 'undefined') return INITIAL_EMPLOYEES;
  try {
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_EMPLOYEES;
    
    // Filter out deleted emp_18 (موسى) from legacy storage if exists
    const cleaned = parsed.filter((e: Employee) => e.id !== 'emp_18' && e.name !== 'موسى');
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

export function saveEmployees(employees: Employee[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  }
  fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: EMPLOYEES_STORAGE_KEY, data: employees }),
  }).catch(() => {});
}

export function getAttendance(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAttendance(records: AttendanceRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
  }
  fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: ATTENDANCE_STORAGE_KEY, data: records }),
  }).catch(() => {});
}

export function getAdvances(): EmployeeAdvance[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADVANCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAdvances(advances: EmployeeAdvance[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADVANCES_STORAGE_KEY, JSON.stringify(advances));
  }
  fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: ADVANCES_STORAGE_KEY, data: advances }),
  }).catch(() => {});
}

export function getPayrolls(): WeeklyPayrollSettlement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PAYROLL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePayrolls(payrolls: WeeklyPayrollSettlement[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(payrolls));
  }
  fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: PAYROLL_STORAGE_KEY, data: payrolls }),
  }).catch(() => {});
}

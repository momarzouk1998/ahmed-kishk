'use client';

/**
 * نظام إدارة الموظفين، الحضور والانصراف، السلف، وتقفيل الرواتب الأسبوعية (كل خميس).
 *
 * ⚠️ كانت البيانات دي بالكامل فى localStorage (+ نسخة احتياطية كـ JSON blob واحد
 * فى SystemStore)، وأي حفظ كان بيستبدل المصفوفة كاملة. دلوقتى كل سجل صف مستقل
 * حقيقي فى جداول Prisma (Employee, AttendanceRecord, EmployeeAdvance,
 * PayrollSettlement) عبر endpoints مخصصة (/api/employees، /api/employee-attendance،
 * /api/employee-advances، /api/employee-payroll) — نفس نمط supplier-payments.
 */

export interface Employee {
  id: string;
  name: string;
  branch: string;
  dailyWage: number;
  monthlySalary?: number;
  payType?: 'شهري' | 'أسبوعي'; // 'شهري' للموظفين الـ 5 أو 'أسبوعي' للباقين
  workStartTime: string; // e.g. "11:00 AM"
  workEndTime: string;   // e.g. "11:30 PM"
  phone?: string;
  role?: string;
  isActive: boolean;
}

export function isMonthlyEmployee(emp: { name?: string; payType?: string }): boolean {
  if (emp.payType === 'شهري') return true;
  if (emp.payType === 'أسبوعي') return false;
  const n = (emp.name || '').trim();
  return (
    n.includes('تقى') ||
    n.includes('تقي') ||
    n.includes('اسراء') ||
    n.includes('إسراء') ||
    n.includes('محمد كشك') ||
    n.includes('محمد على') ||
    n.includes('محمد علي') ||
    n.includes('بليه') ||
    n.includes('بليا') ||
    n.includes('شبلية')
  );
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
  settlementDate: string; // Thursday date YYYY-MM-DD or Month YYYY-MM
  weekStartDate: string;  // Saturday date YYYY-MM-DD or Month start
  weekEndDate: string;    // Thursday date YYYY-MM-DD or Month end
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
  payType?: 'شهري' | 'أسبوعي';
}

export const INITIAL_EMPLOYEES: Employee[] = [
  // الفرع الرئيسي (3)
  { id: 'emp_1', name: 'محمود', branch: 'الفرع الرئيسي', dailyWage: 350, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول الفرع الرئيسي', isActive: true },
  { id: 'emp_2', name: 'يوسف', branch: 'الفرع الرئيسي', dailyWage: 250, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مبيعات أقمشة', isActive: true },
  { id: 'emp_3', name: 'سليمان', branch: 'الفرع الرئيسي', dailyWage: 150, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مساعد مبيعات', isActive: true },

  // فرع عرابي (6)
  { id: 'emp_4', name: 'ابراهيم', branch: 'فرع عرابي', dailyWage: 300, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول فرع عرابي', isActive: true },
  { id: 'emp_5', name: 'نصار', branch: 'فرع عرابي', dailyWage: 270, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مبيعات', isActive: true },
  { id: 'emp_6', name: 'امين', branch: 'فرع عرابي', dailyWage: 200, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'فني تركيبات', isActive: true },
  { id: 'emp_7', name: 'محمد', branch: 'فرع عرابي', dailyWage: 250, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'سائق ومندوب توصيل', isActive: true },
  { id: 'emp_8', name: 'اسراء', branch: 'فرع عرابي', dailyWage: 130, payType: 'شهري', workStartTime: '12:00 PM', workEndTime: '08:00 PM', role: 'مبيعات وسيدات (شهري)', isActive: true },
  { id: 'emp_17', name: 'تقى', branch: 'فرع عرابي', dailyWage: 130, payType: 'شهري', workStartTime: '12:00 PM', workEndTime: '08:00 PM', role: 'مبيعات وسيدات (شهري)', isActive: true },

  // فرع عمر أفندي (5)
  { id: 'emp_10', name: 'محمد كشك', branch: 'فرع عمر أفندي', dailyWage: 350, payType: 'شهري', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مدير فرع عمر أفندي (شهري)', isActive: true },
  { id: 'emp_9', name: 'بليه (شبلية)', branch: 'فرع عمر أفندي', dailyWage: 400, payType: 'شهري', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'إدارة ومبيعات (شهري)', isActive: true },
  { id: 'emp_11', name: 'صبحى', branch: 'فرع عمر أفندي', dailyWage: 350, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول وردية وكاشير', isActive: true },
  { id: 'emp_12', name: 'سيد', branch: 'فرع عمر أفندي', dailyWage: 350, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مبيعات', isActive: true },
  { id: 'emp_13', name: 'احمد', branch: 'فرع عمر أفندي', dailyWage: 150, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مساعد', isActive: true },

  // فرع الثلاثيني (1)
  { id: 'emp_14', name: 'كوكو', branch: 'فرع الثلاثيني', dailyWage: 200, payType: 'أسبوعي', workStartTime: '11:00 AM', workEndTime: '11:30 PM', role: 'مسؤول فرع الثلاثيني', isActive: true },

  // الفرع التجاري (2)
  { id: 'emp_15', name: 'عبدالرحمن كشك', phone: '01280042900', branch: 'الفرع التجاري', dailyWage: 400, payType: 'أسبوعي', workStartTime: '12:00 PM', workEndTime: '11:30 PM', role: 'مدير الفرع التجاري', isActive: true },
  { id: 'emp_16', name: 'محمد على', phone: '01220999355', branch: 'الفرع التجاري', dailyWage: 250, payType: 'شهري', workStartTime: '12:00 PM', workEndTime: '11:30 PM', role: 'كاشير الفرع التجاري (شهري)', isActive: true },
];

async function safeFetchJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** يجيب الموظفين من قاعدة البيانات. لو الجدول لسه فاضي (تشغيل أول مرة)، يرجّع الروستر الافتراضي كعرض أولي فقط (بلا حفظ تلقائي). */
export async function getEmployees(): Promise<Employee[]> {
  const json = await safeFetchJson('/api/employees');
  if (json?.success && Array.isArray(json.employees) && json.employees.length > 0) {
    return json.employees;
  }
  return INITIAL_EMPLOYEES;
}

/** يحفظ موظف واحد (إضافة أو تعديل) — مش المصفوفة كاملة. يرجّع true لو نجح الحفظ فعليًا. */
export async function saveEmployee(employee: Employee): Promise<boolean> {
  try {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const json = await safeFetchJson('/api/employee-attendance');
  return json?.success && Array.isArray(json.records) ? json.records : [];
}

/** يسجّل/يعدّل حضور موظف ليوم واحد — صف مستقل، مش استبدال سجل الحضور كله. */
export async function saveAttendanceRecord(record: AttendanceRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/employee-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/employee-attendance?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function getAdvances(): Promise<EmployeeAdvance[]> {
  const json = await safeFetchJson('/api/employee-advances');
  return json?.success && Array.isArray(json.advances) ? json.advances : [];
}

export async function saveAdvance(advance: EmployeeAdvance): Promise<boolean> {
  try {
    const res = await fetch('/api/employee-advances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(advance),
    });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function deleteAdvance(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/employee-advances?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function getPayrolls(): Promise<WeeklyPayrollSettlement[]> {
  const json = await safeFetchJson('/api/employee-payroll');
  return json?.success && Array.isArray(json.settlements) ? json.settlements : [];
}

export async function savePayrollSettlement(settlement: WeeklyPayrollSettlement): Promise<boolean> {
  try {
    const res = await fetch('/api/employee-payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settlement),
    });
    const json = await res.json().catch(() => null);
    return !!json?.success;
  } catch {
    return false;
  }
}

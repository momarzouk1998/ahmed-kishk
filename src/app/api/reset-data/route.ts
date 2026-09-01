import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// تم تعطيل هذا الـ endpoint نهائياً بناءً على طلب المستخدم — خطر بلا رجعة.
// أى محاولة نداء تُرفض بـ 410 Gone.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'هذا الإجراء تم تعطيله نهائياً لأسباب أمنية.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'disabled' },
    { status: 410 }
  );
}

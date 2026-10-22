import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// رقم النسخة الشغالة — من غير قاعدة بيانات، خفيف كفاية إنه يتسأل كل دقيقة.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.APP_BUILD_ID || null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

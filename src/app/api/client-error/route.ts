import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/clientIp';

export const dynamic = 'force-dynamic';

// تخزين معدل البلاغات من كل عنوان IP لمنع إغراق السيرفر
const hits = new Map<string, { n: number; reset: number }>();

export async function POST(request: Request) {
  const ip = clientIp(request);
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
  } else if (++h.n > 25) {
    return new NextResponse(null, { status: 204 });
  }
  if (hits.size > 5000) hits.clear();

  try {
    const text = (await request.text()).slice(0, 6000);
    const d = JSON.parse(text);
    const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);
    console.error('[client-error]', JSON.stringify({
      at: new Date().toISOString(),
      ip,
      where: clip(d.where, 40),
      url: clip(d.url, 200),
      message: clip(d.message, 500),
      digest: clip(d.digest, 40),
      build: clip(d.build, 40),
      ua: clip(d.ua, 200),
      stack: clip(d.stack, 1500),
    }));
  } catch {
    /* تجاهل أي payload مشوه */
  }
  return new NextResponse(null, { status: 204 });
}

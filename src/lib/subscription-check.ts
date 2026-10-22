import { NextResponse } from 'next/server';

const SUBSCRIPTION_SYSTEM = 'Ahmed Kishk';
const VERIFY_URL = `https://admin.openappo.com/api/subscription/verify?system=${encodeURIComponent(SUBSCRIPTION_SYSTEM)}`;

interface SubscriptionCache {
  active: boolean;
  message?: string;
  checkedAt: number;
}

// كاش في الذاكرة لمدة 10 دقائق لتفادي الاتصال الخارجي بـ admin.openappo.com مع كل طلب
const CACHE_MS = 10 * 60 * 1000;
let cachedSubscription: SubscriptionCache | null = null;

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blockedPage(message: string) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>النظام متوقف — أحمد كشك</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0f172a; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; }
  .card { background: #fff; border-radius: 24px; padding: 40px 32px; max-width: 440px; width: 100%;
    text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 1px solid #e2e8f0; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 20px; color: #0f172a; margin: 0 0 16px; font-weight: 800; }
  p { color: #64748b; line-height: 1.8; font-size: 15px; margin: 0; }
  .contact { margin-top: 24px; font-size: 13px; color: #d97706; font-weight: bold; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>النظام متوقف مؤقتاً</h1>
    <p>${escapeHtml(message)}</p>
    <div class="contact">للدعم الفني وتجديد الاشتراك تواصل مع OpenAppo: 01558282760</div>
  </div>
</body>
</html>`;
}

export async function checkSubscription(pathname: string): Promise<NextResponse | null> {
  const now = Date.now();
  if (cachedSubscription && now - cachedSubscription.checkedAt < CACHE_MS) {
    if (cachedSubscription.active === false) {
      const message = cachedSubscription.message || 'تم إيقاف النظام مؤقتاً. يرجى التواصل مع إدارة النظام.';
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      return new NextResponse(blockedPage(message), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return null;
  }

  try {
    const res = await fetch(VERIFY_URL, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    cachedSubscription = {
      active: data.active !== false,
      message: data.message,
      checkedAt: now,
    };

    if (data.active === false) {
      const message = data.message || 'تم إيقاف النظام مؤقتاً. يرجى التواصل مع إدارة النظام.';
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      return new NextResponse(blockedPage(message), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  } catch {
    // Fail open if admin server is unreachable so app stays functional
    if (!cachedSubscription) {
      cachedSubscription = { active: true, checkedAt: now - CACHE_MS + 60_000 };
    }
  }
  return null;
}

import { NextResponse } from 'next/server';

const SUBSCRIPTION_SYSTEM = 'Ahmed Kishk';
const VERIFY_URL = `https://admin.openappo.com/api/subscription/verify?system=${encodeURIComponent(SUBSCRIPTION_SYSTEM)}`;

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blockedPage(message: string) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>النظام متوقف</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0f172a; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; }
  .card { background: #fff; border-radius: 24px; padding: 40px 32px; max-width: 420px; width: 100%;
    text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 20px; color: #0f172a; margin: 0 0 16px; }
  p { color: #475569; line-height: 1.8; font-size: 15px; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>النظام متوقف مؤقتاً</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

export async function checkSubscription(pathname: string): Promise<NextResponse | null> {
  try {
    const res = await fetch(VERIFY_URL, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.active === false) {
      const message = data.message || 'تم إيقاف النظام مؤقتاً. يرجى التواصل مع الإدارة.';
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      return new NextResponse(blockedPage(message), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  } catch {
    // Admin panel unreachable — fail open so a network blip never takes down the app
  }
  return null;
}

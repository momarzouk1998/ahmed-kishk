import { SignJWT, jwtVerify } from 'jose';

// لا يوجد أي قيمة افتراضية للمفتاح — أي قيمة مكتوبة فى الكود ومرفوعة على GitHub
// تصبح معروفة لأي حد يقرأ المستودع، ويقدر يزوّر بيها JWT صالح بدور ADMIN.
// التطبيق يفشل عمدًا لو المتغير مش مضبوط، بدل ما يعمل fallback صامت — لكن الفحص
// lazy (جوه دالة) مش فى أعلى الملف: `next build` بينفّذ (require) كل route module
// أثناء "Collecting page data" حتى لو الـ route مش هيتنفذ فعليًا، فرمي استثناء على
// مستوى الموديول كان بيكسر الـ build نفسه فى GitHub Actions (لا يوجد AUTH_SECRET
// وقت البناء أصلاً — بيتحقن runtime بس عند `docker run`). التحقق بيحصل أول ما حد
// يحاول فعليًا يوقّع أو يتحقق من توكن، مش أول ما الموديول يتحمّل.
let cachedSecret: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  if (!process.env.AUTH_SECRET) {
    throw new Error(
      'AUTH_SECRET environment variable is required and must not be empty. ' +
      'Set it in the deployment secrets — do not hardcode a fallback value in source.'
    );
  }
  cachedSecret = new TextEncoder().encode(process.env.AUTH_SECRET);
  return cachedSecret;
}

export interface JWTPayload {
  userId: string;
  phone: string;
  name: string;
  role: string;
  branch: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = 'ak_session';

// Helper: verify cookie inside a route handler
export async function verifyAuthCookie(request: Request): Promise<JWTPayload | null> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith(`${AUTH_COOKIE}=`));
    if (!match) return null;
    const token = decodeURIComponent(match.slice(AUTH_COOKIE.length + 1));
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

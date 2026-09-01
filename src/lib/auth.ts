import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'ahmed-kishk-super-secret-production-key-2026-secure'
);

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
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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

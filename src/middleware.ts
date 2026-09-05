import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, AUTH_COOKIE } from '@/lib/auth';
import { checkSubscription } from '@/lib/subscription-check';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Subscription must be checked before anything else, including login
  const blocked = await checkSubscription(pathname);
  if (blocked) return blocked;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check token
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  // Only pass ASCII-safe values in HTTP headers.
  // userId is a UUID (safe). role is ASCII-safe (ADMIN, TECHNICIAN, etc.)
  // Arabic values (name, branch) are NOT passed through headers — components
  // should read them directly from the JWT cookie via the /api/auth/profile route.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId || '');
  requestHeaders.set('x-user-role', payload.role || '');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};

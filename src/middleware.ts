import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, AUTH_COOKIE } from '@/lib/auth';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow API auth routes
  if (pathname.startsWith('/api/auth')) {
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

  // Inject user info in headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId || '');
  requestHeaders.set('x-user-name', payload.name || '');
  requestHeaders.set('x-user-role', payload.role || '');
  requestHeaders.set('x-user-branch', payload.branch || '');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|public).*)'],
};

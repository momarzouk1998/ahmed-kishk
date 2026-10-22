/**
 * استخراج عنوان IP الحقيقي لتحديد معدل الطلبات وحماية السيرفر
 */
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

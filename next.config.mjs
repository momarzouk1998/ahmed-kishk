/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // رقم النسخة: بيتغير مع كل build — الواجهة بتقارنه برقم السيرفر عشان تعرف إن فيه تحديث
  env: {
    APP_BUILD_ID: String(Date.now()),
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

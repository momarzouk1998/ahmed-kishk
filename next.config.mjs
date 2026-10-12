/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // رقم النسخة: SHA بتاع الـ commit (ثابت طول الـ build — Date.now() كان بيتحسب لكل مرحلة لوحدها فيطلع مختلف)
  // بيتغير مع كل build — الواجهة بتقارنه برقم السيرفر عشان تعرف إن فيه تحديث
  env: {
    APP_BUILD_ID: process.env.BUILD_ID || 'dev',
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

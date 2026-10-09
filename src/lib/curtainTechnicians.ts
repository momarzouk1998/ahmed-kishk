import { prisma } from '@/lib/prisma';

const STORE_KEY = 'curtain_technicians_v1';

/**
 * قائمة الفنيين المسؤولين عن رفع المقاسات — مُخزّنة فعليًا فى قاعدة البيانات
 * (SystemStore) عشان الأدمن يقدر يضيف/يشيل فنى من غير ما يحتاج تعديل كود.
 * لو مفيش سجل محفوظ بترجع قائمة فاضية — مفيش أي أسماء مكتوبة فى الكود.
 */
export async function getCurtainTechnicians(): Promise<string[]> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = rec?.data as any;
  if (raw && Array.isArray(raw?.list)) return raw.list.map(String);
  return [];
}

export async function setCurtainTechnicians(list: string[]): Promise<string[]> {
  const cleaned = Array.from(new Set(list.map(s => String(s).trim()).filter(Boolean)));
  await prisma.systemStore.upsert({
    where: { key: STORE_KEY },
    update: { data: { list: cleaned } as any },
    create: { key: STORE_KEY, data: { list: cleaned } as any },
  });
  return cleaned;
}

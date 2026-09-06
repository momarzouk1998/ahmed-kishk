import { prisma } from '@/lib/prisma';
import { CURTAIN_TECHNICIANS as SEED_TECHNICIANS } from '@/lib/technicians';

const STORE_KEY = 'curtain_technicians_v1';

/**
 * قائمة الفنيين المسؤولين عن رفع المقاسات — مُخزّنة فعليًا فى قاعدة البيانات
 * (SystemStore) عشان الأدمن يقدر يضيف/يشيل فنى من غير ما يحتاج تعديل كود.
 * أول مرة (لو مفيش سجل محفوظ) بترجع القائمة الافتراضية من technicians.ts.
 */
export async function getCurtainTechnicians(): Promise<string[]> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = rec?.data as any;
  if (raw && Array.isArray(raw?.list) && raw.list.length) {
    return raw.list.map(String);
  }
  return SEED_TECHNICIANS;
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

import { prisma } from '@/lib/prisma';

export const SEED_WORKSHOPS: string[] = [
  'ورشة أبو فهد الخياط',
  'الورشة المركزية',
  'ورشة السلام للتفصيل',
  'ورشة الأمل',
];

const STORE_KEY = 'curtain_workshops_v1';

/**
 * قائمة الورش ومسؤولي التفصيل — مُخزّنة فعليًا فى قاعدة البيانات (SystemStore)
 * عشان الأدمن يقدر يضيف أو يحذف اسم ورشة من شاشة الفروع مباشرة بدون تعديل كود.
 */
export async function getCurtainWorkshops(): Promise<string[]> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = rec?.data as any;
  if (raw && Array.isArray(raw?.list) && raw.list.length) {
    return raw.list.map(String);
  }
  return SEED_WORKSHOPS;
}

export async function setCurtainWorkshops(list: string[]): Promise<string[]> {
  const cleaned = Array.from(new Set(list.map(s => String(s).trim()).filter(Boolean)));
  await prisma.systemStore.upsert({
    where: { key: STORE_KEY },
    update: { data: { list: cleaned } as any },
    create: { key: STORE_KEY, data: { list: cleaned } as any },
  });
  return cleaned;
}

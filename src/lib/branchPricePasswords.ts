import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { BRANCHES_LIST } from '@/lib/branches';

const STORE_KEY = 'branch_price_passwords_v1';

// ⚠️ باقٍ مؤقتًا فقط للتوافق مع القيم القديمة المخزّنة قبل هذا التعديل (نص صريح).
// أي فرع يغيّر باسورده من الآن فصاعدًا (عبر setBranchPricePassword) يتحول تلقائيًا
// لـ bcrypt hash ولا يرجع لنص صريح أبدًا. احذف هذا الثابت بالكامل بعد التأكد (عبر
// getBranchPricePasswordsStatus) إن كل الفروع الخمسة غيّرت باسوردها الافتراضي.
const LEGACY_DEFAULT_PWD = '1234';

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$\d{2}\$/.test(value);
}

/** مقارنة بزمن ثابت (constant-time) لتفادي timing attacks — تقارن هاش SHA-256 للقيمتين بدل النص مباشرة، فمفيش تسريب لطول القيمة الحقيقية. */
function safeStringEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * يتحقق من كلمة سر فرع معيّن. يدعم كلا الشكلين أثناء فترة الترحيل:
 * - bcrypt hash (القيم الجديدة المحفوظة بعد هذا التعديل) — مقارنة bcrypt.compare.
 * - نص صريح قديم أو الافتراضي '1234' (لسه ما اتغيّرش) — مقارنة بزمن ثابت.
 */
export async function verifyBranchPricePassword(branch: string, candidate: string): Promise<boolean> {
  const passwords = await getRawBranchPricePasswords();
  const stored = passwords[branch] || passwords['الفرع الرئيسي'] || LEGACY_DEFAULT_PWD;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(candidate, stored);
  }
  return safeStringEqual(candidate, stored);
}

/** القيم الخام كما هي مخزّنة (hash أو نص قديم) — للاستخدام الداخلي فقط، لا تُعرض فى أي API. */
async function getRawBranchPricePasswords(): Promise<Record<string, string>> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = (rec?.data as any) || {};
  const map: Record<string, string> = {};
  for (const b of BRANCHES_LIST) {
    map[b.name] = typeof raw[b.name] === 'string' && raw[b.name] ? raw[b.name] : LEGACY_DEFAULT_PWD;
  }
  return map;
}

/**
 * حالة كل فرع للعرض فى واجهة الأدمن — بلا أي كشف لكلمة السر الفعلية أو الهاش:
 * isDefault=true يعني الفرع لسه على الباسورد الافتراضي المكتوب فى الكود ولازم يتغيّر.
 */
export async function getBranchPricePasswordsStatus(): Promise<Record<string, { isSet: boolean; isDefault: boolean }>> {
  const raw = await getRawBranchPricePasswords();
  const status: Record<string, { isSet: boolean; isDefault: boolean }> = {};
  for (const b of BRANCHES_LIST) {
    const stored = raw[b.name];
    status[b.name] = { isSet: stored !== LEGACY_DEFAULT_PWD, isDefault: stored === LEGACY_DEFAULT_PWD };
  }
  return status;
}

export async function setBranchPricePassword(branch: string, password: string): Promise<void> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const current = (rec?.data as any) || {};
  const hashed = await bcrypt.hash(password, 10);
  const updated = { ...current, [branch]: hashed };
  await prisma.systemStore.upsert({
    where: { key: STORE_KEY },
    update: { data: updated },
    create: { key: STORE_KEY, data: updated },
  });
}

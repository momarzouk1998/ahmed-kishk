import { prisma } from '@/lib/prisma';
import { BRANCHES_LIST } from '@/lib/branches';

const STORE_KEY = 'branch_price_passwords_v1';
const DEFAULT_PWD = '1234';

/** يرجّع خريطة {فرع: كلمة السر} — أي فرع لسه ما اتغيّرش باسورده بياخد الافتراضى. */
export async function getBranchPricePasswords(): Promise<Record<string, string>> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = (rec?.data as any) || {};
  const map: Record<string, string> = {};
  for (const b of BRANCHES_LIST) {
    map[b.name] = typeof raw[b.name] === 'string' && raw[b.name] ? raw[b.name] : DEFAULT_PWD;
  }
  return map;
}

export async function setBranchPricePassword(branch: string, password: string): Promise<void> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const current = (rec?.data as any) || {};
  const updated = { ...current, [branch]: password };
  await prisma.systemStore.upsert({
    where: { key: STORE_KEY },
    update: { data: updated },
    create: { key: STORE_KEY, data: updated },
  });
}

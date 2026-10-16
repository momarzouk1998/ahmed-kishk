'use client';

import { useEffect, useState } from 'react';
import { getProfile, peekProfile } from '@/lib/profileCache';

export interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  role: string; // 'ADMIN' | 'BRANCH_STAFF' | 'TECHNICIAN' | 'WORKSHOP'
  branch: string;
}

/**
 * Super Admins list:
 * - أحمد كشك (01063821000) - المدير العام
 * - openappo (01558282760) - مطور النظام
 * - أو أي مستخدم فرعه 'المدير العام' أو 'الكل'
 */
export function isSuperAdminUser(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  const phone = (user.phone || '').trim().replace(/\s/g, '');
  const norm = phone.replace(/^0/, '');
  const name = (user.name || '').trim().toLowerCase();
  if (norm === '1063821000' || norm === '1558282760' || phone === '01063821000' || phone === '01558282760') {
    return true;
  }
  if (user.branch === 'المدير العام' || user.branch === 'الكل' || user.role === 'SUPER_ADMIN') {
    return true;
  }
  if (name.includes('أحمد كشك') || name.includes('احمد كشك') || name.includes('openapp') || name.includes('openappo')) {
    return true;
  }
  return false;
}

/**
 * Hook مشترك: يقرأ المستخدم الحالى من /api/auth/profile.
 * يوفر أعلامك للتحقق من الأدوار: isAdmin, isSuperAdmin, isBranchManager, canOverrideLocks.
 */
export function useCurrentUser() {
  // #PERF: لو بيانات المستخدم اتجابت قبل كده (من السايد منيو أو صفحة سابقة) بتظهر فورًا.
  const initial = (peekProfile()?.user as CurrentUser | null | undefined) || null;
  const [user, setUser] = useState<CurrentUser | null>(initial);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then(d => {
        if (!alive) return;
        if (d?.user) setUser(d.user as CurrentUser);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Super Admin: يشوف كل الفروع ويقدر يفلتر على أى فرع
  const isSuperAdmin = isSuperAdminUser(user);
  
  // isAdmin هنا تعنى صلاحية إدارة عامة شاملة لكل الفروع (للفلاتر والتحكم العام)
  const isAdmin = isSuperAdmin;
  
  // مدير الفرع: إما سوبر أدمن أو يملك دور ADMIN/مدير فى فرعه
  const isBranchManager = user?.role === 'ADMIN' || isSuperAdmin;
  
  // قدرة تجاوز أى قفل تحرير على الأوردر أو المعاينة فى أى مرحلة
  const canOverrideLocks = isSuperAdmin || isBranchManager;

  return { user, loading, isAdmin, isSuperAdmin, isBranchManager, canOverrideLocks };
}

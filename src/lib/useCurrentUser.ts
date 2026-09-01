'use client';

import { useEffect, useState } from 'react';

export interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  role: string; // 'ADMIN' | 'BRANCH_STAFF' | 'TECHNICIAN' | 'WORKSHOP'
  branch: string;
}

/**
 * Hook مشترك: يقرأ المستخدم الحالى من /api/auth/profile.
 * يوفر أعلامك للتحقق من الأدوار: isAdmin, isBranchManager, canOverrideLocks.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        if (d?.user) setUser(d.user as CurrentUser);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  // مدير الفرع = أى ADMIN. لاحقاً يمكن إضافة BRANCH_MANAGER كدور منفصل.
  const isBranchManager = isAdmin;
  // قدرة تجاوز أى قفل تحرير على الأوردر أو المعاينة فى أى مرحلة
  const canOverrideLocks = isAdmin || isBranchManager;

  return { user, loading, isAdmin, isBranchManager, canOverrideLocks };
}

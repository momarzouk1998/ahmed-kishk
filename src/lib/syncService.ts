'use client';

// Central Multi-Browser Database Sync Service
const SYNC_KEYS = [
  'ahmed_kishk_inspections_data_v4',
  'ahmed_kishk_quotations_data_v4',
  'ahmed_kishk_pipeline_orders_v5',
  'ahmed_kishk_sales_invoices_v1',
  'ahmed_kishk_customers_v3',
  'ahmed_kishk_inventory_v3',
  'ahmed_kishk_suppliers_v3',
  'ahmed_kishk_purchases_v3',
];

let isInitialized = false;

export async function fetchServerData(key: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/system-data?key=${encodeURIComponent(key)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data !== null && json.data !== undefined) {
      return json.data;
    }
    return null;
  } catch (err) {
    console.error('Error fetching server data:', err);
    return null;
  }
}

export async function saveServerData(key: string, data: any): Promise<boolean> {
  try {
    // 1. Update localStorage immediately for instant UI responsiveness
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    }

    // 2. Persist to server PostgreSQL database
    const res = await fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data }),
    });

    return res.ok;
  } catch (err) {
    console.error('Error saving server data:', err);
    return false;
  }
}

export async function syncAllWithServer(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/api/system-data', { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();

    if (json.success && json.data) {
      const serverMap = json.data;

      for (const key of SYNC_KEYS) {
        if (serverMap[key] !== undefined && serverMap[key] !== null) {
          // If server has data, update localStorage
          localStorage.setItem(key, JSON.stringify(serverMap[key]));
        } else {
          // If server doesn't have this key yet, push local data to seed server
          const localRaw = localStorage.getItem(key);
          if (localRaw) {
            try {
              const localParsed = JSON.parse(localRaw);
              if (localParsed && (Array.isArray(localParsed) ? localParsed.length > 0 : true)) {
                await saveServerData(key, localParsed);
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.error('Error syncing all collections with server:', err);
  }
}

export function initCentralSync(): void {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // Run initial sync on app boot
  syncAllWithServer();

  // Periodic background sync every 15 seconds to keep all browsers in real-time sync
  setInterval(() => {
    syncAllWithServer();
  }, 15000);
}

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

// ─── Track whether the first server sync has completed ──────────────────────
let serverSyncDone = false;
const syncReadyCallbacks: Array<() => void> = [];

export function onSyncReady(cb: () => void): void {
  if (serverSyncDone) {
    cb();
  } else {
    syncReadyCallbacks.push(cb);
  }
}

function notifySyncReady() {
  serverSyncDone = true;
  syncReadyCallbacks.splice(0).forEach((cb) => cb());
}

// ─── Fetch a single key from the server ─────────────────────────────────────
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

// ─── Write to server (+ optimistic localStorage update) ─────────────────────
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

// ─── Pull all keys from server and hydrate localStorage ─────────────────────
export async function syncAllWithServer(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/api/system-data', { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();

    if (json.success && json.data) {
      const serverMap = json.data;

      for (const key of SYNC_KEYS) {
        const serverVal = serverMap[key];
        const hasServerData =
          serverVal !== undefined &&
          serverVal !== null &&
          (Array.isArray(serverVal) ? serverVal.length > 0 : true);

        if (hasServerData) {
          // Server wins — overwrite local with authoritative server data
          localStorage.setItem(key, JSON.stringify(serverVal));
        } else {
          // Server is empty — push local data to seed the server
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

// ─── Server-first load for a specific key ───────────────────────────────────
// Call this at the top of a page/component BEFORE reading localStorage.
// Returns true if server data was found and written to localStorage.
export async function loadFromServerFirst(key: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const serverData = await fetchServerData(key);
    const hasData =
      serverData !== null &&
      serverData !== undefined &&
      (Array.isArray(serverData) ? serverData.length > 0 : true);

    if (hasData) {
      localStorage.setItem(key, JSON.stringify(serverData));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Bootstrap: run once per browser session ─────────────────────────────────
export function initCentralSync(): void {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // First sync: pull server data → hydrate localStorage → notify listeners
  syncAllWithServer().finally(() => {
    notifySyncReady();
  });

  // Periodic background sync every 15 seconds to keep all browsers in sync
  setInterval(() => {
    syncAllWithServer();
  }, 15_000);
}

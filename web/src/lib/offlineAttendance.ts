import api from '@/lib/api';

export interface QueuedAttendanceScan {
  id: string;
  qr_token: string;
  scanned_at: string; // ISO String
  session_id?: number | null;
  session_name?: string | null;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  error_message?: string;
}

const STORAGE_KEY = 'assdi_offline_attendance_queue';

export function getOfflineQueue(): QueuedAttendanceScan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read offline attendance queue:', err);
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedAttendanceScan[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    // Broadcast event to notify components across the app
    window.dispatchEvent(new CustomEvent('assdi_offline_queue_updated', { detail: queue }));
  } catch (err) {
    console.error('Failed to save offline attendance queue:', err);
  }
}

export function addScanToOfflineQueue(
  rawToken: string,
  sessionInfo?: { id?: number | null; name?: string | null }
): QueuedAttendanceScan {
  const queue = getOfflineQueue();

  // Clean and parse raw token if wrapped in JSON
  let token = rawToken.trim();
  try {
    const parsed = JSON.parse(token);
    if (parsed.token || parsed.qr_token) {
      token = parsed.token || parsed.qr_token;
    }
  } catch {
    // Plain text token
  }

  // Check if token already exists in queue to prevent duplicate offline entries
  const existing = queue.find((item) => item.qr_token === token);
  if (existing) {
    return existing;
  }

  const newItem: QueuedAttendanceScan = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    qr_token: token,
    scanned_at: new Date().toISOString(),
    session_id: sessionInfo?.id || null,
    session_name: sessionInfo?.name || null,
    status: 'pending',
    retry_count: 0,
  };

  const updatedQueue = [newItem, ...queue];
  saveOfflineQueue(updatedQueue);
  return newItem;
}

export function removeScanFromQueue(id: string): void {
  const queue = getOfflineQueue();
  const updated = queue.filter((item) => item.id !== id);
  saveOfflineQueue(updated);
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('assdi_offline_queue_updated', { detail: [] }));
}

/**
 * Iterates through pending offline scans and synchronizes them with the backend.
 * Handles both online reconnection and manual sync trigger.
 */
export async function syncOfflineAttendanceQueue(
  onItemSynced?: (item: QueuedAttendanceScan, statusVal: string) => void
): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
  if (typeof window === 'undefined') {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, errors: ['Device is still offline'] };
  }

  const queue = getOfflineQueue();
  const pendingItems = queue.filter((item) => item.status === 'pending' || item.status === 'failed');

  if (pendingItems.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  const remainingQueue: QueuedAttendanceScan[] = [];

  for (const item of queue) {
    if (item.status === 'synced') {
      // Clean up already synced items
      continue;
    }

    try {
      item.status = 'syncing';
      saveOfflineQueue(queue);

      const response = await api.post('/api/v1/attendance/qr-scan/', {
        qr_token: item.qr_token,
        is_offline_sync: true,
        offline_scanned_at: item.scanned_at,
      });

      const statusVal = response.data?.status || 'present';
      item.status = 'synced';
      syncedCount += 1;

      if (onItemSynced) {
        onItemSynced(item, statusVal);
      }
    } catch (err: any) {
      const statusCode = err.response?.status;
      const errorData = err.response?.data;

      // If already recorded on server, count as successful sync!
      if (statusCode === 409 || errorData?.code === 'ALREADY_MARKED') {
        item.status = 'synced';
        syncedCount += 1;
        if (onItemSynced) {
          onItemSynced(item, 'already');
        }
      } else {
        item.status = 'failed';
        item.retry_count += 1;
        const msg =
          errorData?.detail ||
          errorData?.qr_token ||
          err.message ||
          'Failed to sync offline scan';
        item.error_message = typeof msg === 'string' ? msg : JSON.stringify(msg);
        failedCount += 1;
        errors.push(item.error_message);
        remainingQueue.push(item);
      }
    }
  }

  saveOfflineQueue(remainingQueue);

  if (syncedCount > 0) {
    window.dispatchEvent(
      new CustomEvent('assdi_attendance_synced', {
        detail: { syncedCount, failedCount },
      })
    );
  }

  return { syncedCount, failedCount, errors };
}

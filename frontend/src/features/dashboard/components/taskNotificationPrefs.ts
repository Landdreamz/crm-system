/**
 * Task notification preferences (stored in localStorage).
 * Browser notifications use the Notification API; sound uses Web Audio in taskNotificationSound.
 */

const STORAGE_KEY = 'crmTasksNotificationPrefs';

export interface TaskNotificationPrefs {
  browserEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_PREFS: TaskNotificationPrefs = {
  browserEnabled: false,
  soundEnabled: true,
};

export function loadTaskNotificationPrefs(): TaskNotificationPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TaskNotificationPrefs>;
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFS };
}

export function saveTaskNotificationPrefs(prefs: TaskNotificationPrefs): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // ignore
  }
}

/** Request browser notification permission. Call from a user gesture (e.g. button click). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/** Show a browser notification for due tasks. No-op if permission not granted or prefs say off. */
export function showDueTasksBrowserNotification(count: number): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const prefs = loadTaskNotificationPrefs();
  if (!prefs.browserEnabled) return;
  if (count <= 0) return;

  try {
    const title = count === 1 ? '1 task due' : `${count} tasks due`;
    const n = new Notification(title, {
      body: count === 1 ? 'You have a task due today or overdue.' : 'You have tasks due today or overdue.',
      icon: '/favicon.ico',
      tag: 'crm-due-tasks',
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // ignore
  }
}

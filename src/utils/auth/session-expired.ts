type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();
const pendingListeners = new Set<SessionExpiredListener>();
let sessionExpiredPending = false;

export function subscribeSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeSessionExpiredPending(listener: SessionExpiredListener): () => void {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
}

export function isSessionExpiredPending(): boolean {
  return sessionExpiredPending;
}

export function resolveSessionExpired(): void {
  if (!sessionExpiredPending) return;

  sessionExpiredPending = false;
  pendingListeners.forEach((listener) => listener());
}

export function notifySessionExpired(): void {
  if (!sessionExpiredPending) {
    sessionExpiredPending = true;
    pendingListeners.forEach((listener) => listener());
  }

  listeners.forEach((listener) => listener());
}

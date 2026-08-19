import { create } from 'zustand';

interface NotifyState {
  unreadCount: number;
  setUnreadCount: (unreadCount: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
}

export const useNotifyStore = create<NotifyState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => {
    set({
      unreadCount: Number.isFinite(unreadCount) ? Math.max(0, Math.floor(unreadCount)) : 0,
    });
  },
  incrementUnread: () => {
    set((state) => ({ unreadCount: state.unreadCount + 1 }));
  },
  decrementUnread: () => {
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
  },
}));

import { create } from 'zustand';

interface NotifyState {
  unreadCount: number;
  /**
   * 实时信号计数器：每收到一次站内信实时信号自增。
   * 未读数之外还需要重载派生数据的消费者（如消息列表、公告弹窗）订阅它。
   */
  signalVersion: number;
  setUnreadCount: (unreadCount: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  notifySignalReceived: () => void;
}

export const useNotifyStore = create<NotifyState>((set) => ({
  unreadCount: 0,
  signalVersion: 0,
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
  notifySignalReceived: () => {
    set((state) => ({ signalVersion: state.signalVersion + 1 }));
  },
}));

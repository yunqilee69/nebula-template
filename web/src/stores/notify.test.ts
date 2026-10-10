import { afterEach, describe, expect, it } from 'vitest';
import { useNotifyStore } from './notify';

afterEach(() => {
  useNotifyStore.setState(useNotifyStore.getInitialState(), true);
});

describe('useNotifyStore', () => {
  it('starts with zero unread notifications', () => {
    // Given the initial store state
    const state = useNotifyStore.getState();

    // When the unread count is read
    const unreadCount = state.unreadCount;

    // Then no notifications are unread
    expect(unreadCount).toBe(0);
  });

  it.each([
    { input: 5, expected: 5 },
    { input: 3.9, expected: 3 },
    { input: -2, expected: 0 },
    { input: Number.NaN, expected: 0 },
    { input: Number.POSITIVE_INFINITY, expected: 0 },
  ])('sets $input to the normalized unread count $expected', ({ input, expected }) => {
    // Given the initial store state
    const { setUnreadCount } = useNotifyStore.getState();

    // When the unread count is set
    setUnreadCount(input);

    // Then it is stored as a non-negative finite integer
    expect(useNotifyStore.getState().unreadCount).toBe(expected);
  });

  it('decrements the unread count by one', () => {
    // Given multiple unread notifications
    const { decrementUnread, setUnreadCount } = useNotifyStore.getState();
    setUnreadCount(3);

    // When one notification is read
    decrementUnread();

    // Then one fewer notification remains unread
    expect(useNotifyStore.getState().unreadCount).toBe(2);
  });

  it('increments the unread count by one', () => {
    // Given multiple unread notifications
    const { incrementUnread, setUnreadCount } = useNotifyStore.getState();
    setUnreadCount(3);

    // When one notification is marked unread
    incrementUnread();

    // Then one more notification remains unread
    expect(useNotifyStore.getState().unreadCount).toBe(4);
  });

  it('keeps the unread count at zero when decremented', () => {
    // Given no unread notifications
    const { decrementUnread } = useNotifyStore.getState();

    // When the unread count is decremented
    decrementUnread();

    // Then the count does not become negative
    expect(useNotifyStore.getState().unreadCount).toBe(0);
  });

  it.each([
    { input: 12, count: 5, expected: 7 },
    { input: 3, count: 10, expected: 0 },
    { input: 4, count: 0, expected: 4 },
    { input: 4, count: -3, expected: 4 },
    { input: 4, count: Number.NaN, expected: 4 },
  ])('decrements $input unread by $count to $expected', ({ input, count, expected }) => {
    // Given a known unread count
    const { decrementUnreadBy, setUnreadCount } = useNotifyStore.getState();
    setUnreadCount(input);

    // When a bulk read action reports how many messages it affected
    decrementUnreadBy(count);

    // Then the count drops by that many and never goes negative
    expect(useNotifyStore.getState().unreadCount).toBe(expected);
  });

  it('restores the initial state for test and session isolation', () => {
    // Given a store changed by a previous consumer
    useNotifyStore.getState().setUnreadCount(8);

    // When the store is restored to its initial snapshot
    useNotifyStore.setState(useNotifyStore.getInitialState(), true);

    // Then the next consumer starts with no unread notifications
    expect(useNotifyStore.getState().unreadCount).toBe(0);
  });

  it('starts with signal version zero', () => {
    expect(useNotifyStore.getState().signalVersion).toBe(0);
  });

  it('bumps the signal version when a realtime signal arrives', () => {
    // Given a mounted consumer listening for realtime signals
    const initialVersion = useNotifyStore.getState().signalVersion;

    // When a realtime signal is received
    useNotifyStore.getState().notifySignalReceived();

    // Then the version advances so consumers can reload derived data
    expect(useNotifyStore.getState().signalVersion).toBe(initialVersion + 1);
  });
});

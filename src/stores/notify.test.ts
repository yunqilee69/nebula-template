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

  it('restores the initial state for test and session isolation', () => {
    // Given a store changed by a previous consumer
    useNotifyStore.getState().setUnreadCount(8);

    // When the store is restored to its initial snapshot
    useNotifyStore.setState(useNotifyStore.getInitialState(), true);

    // Then the next consumer starts with no unread notifications
    expect(useNotifyStore.getState().unreadCount).toBe(0);
  });
});

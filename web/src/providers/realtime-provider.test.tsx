import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '@/types/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import { RealtimeProvider } from './realtime-provider';
import type { SiteMessageStreamOptions } from '@/services/realtime-client';

function buildUser(id: string): CurrentUser {
  return { id, name: id, username: id, roles: [], permissions: [] };
}

describe('RealtimeProvider', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    useNotifyStore.setState(useNotifyStore.getInitialState(), true);
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
    useNotifyStore.setState(useNotifyStore.getInitialState(), true);
    vi.restoreAllMocks();
  });

  it('does not open a stream while logged out', () => {
    const createStream = vi.fn();

    render(<RealtimeProvider createStream={createStream}>{null}</RealtimeProvider>);

    expect(createStream).not.toHaveBeenCalled();
  });

  it('opens a stream once a user is present and closes it on logout', async () => {
    const close = vi.fn();
    const createStream = vi.fn((_options: SiteMessageStreamOptions) => ({ close }));
    useAuthStore.setState({ user: buildUser('user-1') });

    const { rerender } = render(
      <RealtimeProvider createStream={createStream}>{null}</RealtimeProvider>,
    );

    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(1));

    useAuthStore.setState({ user: null });
    rerender(<RealtimeProvider createStream={createStream}>{null}</RealtimeProvider>);

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('reconnects when the logged-in user changes', async () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    const createStream = vi.fn()
      .mockReturnValueOnce({ close: firstClose })
      .mockReturnValueOnce({ close: secondClose });
    useAuthStore.setState({ user: buildUser('user-1') });

    const { rerender } = render(
      <RealtimeProvider createStream={createStream}>{null}</RealtimeProvider>,
    );
    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(1));

    useAuthStore.setState({ user: buildUser('user-2') });
    rerender(<RealtimeProvider createStream={createStream}>{null}</RealtimeProvider>);

    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(2));
    expect(firstClose).toHaveBeenCalledTimes(1);
  });

  it('refreshes unread count and bumps signal version on signal', async () => {
    const refreshUnreadCount = vi.fn(async () => 7);
    let capturedOnSignal: (() => void) | undefined;
    const createStream = vi.fn((options: { onSignal: (signal: { messageId: string }) => void }) => {
      capturedOnSignal = () => options.onSignal({ messageId: 'message-1' });
      return { close: vi.fn() };
    });
    useAuthStore.setState({ user: buildUser('user-1') });

    render(
      <RealtimeProvider createStream={createStream} refreshUnreadCount={refreshUnreadCount}>
        {null}
      </RealtimeProvider>,
    );
    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(1));

    act(() => capturedOnSignal?.());

    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(7));
    expect(useNotifyStore.getState().signalVersion).toBe(1);
  });
  it('passes the stored access token and the shared refresh callback to the stream', async () => {
    const createStream = vi.fn((_options: SiteMessageStreamOptions) => ({ close: vi.fn() }));
    useAuthStore.setState({ user: buildUser('user-1') });

    render(<RealtimeProvider createStream={createStream}>{null}</RealtimeProvider>);

    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(1));
    const options = createStream.mock.calls[0]?.[0] as {
      getToken: () => string | null;
      refreshToken: () => Promise<string | null>;
    };
    expect(typeof options.getToken).toBe('function');
    expect(typeof options.refreshToken).toBe('function');
  });

  it('refreshes unread count when the stream reconnects', async () => {
    const refreshUnreadCount = vi.fn(async () => 3);
    let capturedOnOpen: (() => void) | undefined;
    const createStream = vi.fn((options: { onOpen?: () => void }) => {
      capturedOnOpen = options.onOpen;
      return { close: vi.fn() };
    });
    useAuthStore.setState({ user: buildUser('user-1') });

    render(
      <RealtimeProvider createStream={createStream} refreshUnreadCount={refreshUnreadCount}>
        {null}
      </RealtimeProvider>,
    );
    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(1));

    act(() => capturedOnOpen?.());

    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(3));
  });
});

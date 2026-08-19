import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { CurrentAnnouncementResp } from '@/types/notify';
import { PopupAnnouncement, type PopupAnnouncementService } from './popup-announcement';

const baseAnnouncement: CurrentAnnouncementResp = {
  id: 'announcement-1',
  title: '系统公告',
  content: '第一行\n第二行',
  publishTime: '2026-08-10 10:00:00',
  pinnedFlag: false,
  sortNum: 1,
  popupFlag: true,
  readStatus: false,
};

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createService(overrides: Partial<PopupAnnouncementService> = {}): PopupAnnouncementService {
  return {
    listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([]),
    markAnnouncementRead: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPopup(service = createService()) {
  render(
    <NebulaProvider authAdapter={{ getCurrentUser: async () => useAuthStore.getState().user }}>
      <MemoryRouter>
        <PopupAnnouncement service={service} />
      </MemoryRouter>
    </NebulaProvider>,
  );
  return service;
}

describe('PopupAnnouncement', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'current-user',
        name: 'Current User',
        roles: [],
        permissions: [],
      });
    });
  });

  afterEach(() => {
    cleanup();
    act(() => useAuthStore.getState().clearUser());
  });

  it('renders nothing for an unauthenticated user', async () => {
    act(() => useAuthStore.getState().clearUser());
    const service = renderPopup();

    await act(async () => Promise.resolve());

    expect(service.listCurrentPopupAnnouncements).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads current popup announcements once after authentication', async () => {
    const service = renderPopup();

    await waitFor(() => expect(service.listCurrentPopupAnnouncements).toHaveBeenCalledOnce());
    expect(service.listCurrentPopupAnnouncements).toHaveBeenCalledTimes(1);
  });

  it('shows only unread announcements with preserved line breaks', async () => {
    renderPopup(createService({
      listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([
        { ...baseAnnouncement, readStatus: true },
        baseAnnouncement,
      ]),
    }));

    expect(await screen.findByRole('dialog', { name: '系统公告' })).toBeInTheDocument();
    const content = screen.getByText((_, element) => element?.tagName === 'PRE');
    expect(content.textContent).toBe('第一行\n第二行');
    expect(content).toHaveStyle({ whiteSpace: 'pre-wrap' });
    expect(screen.getByRole('button', { name: '知道了' })).toBeInTheDocument();
  });

  it('acknowledges before closing the current announcement', async () => {
    const user = userEvent.setup();
    const markAnnouncementRead = vi.fn().mockResolvedValue(undefined);
    renderPopup(createService({
      listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([baseAnnouncement]),
      markAnnouncementRead,
    }));

    await user.click(await screen.findByRole('button', { name: '知道了' }));

    await waitFor(() => expect(markAnnouncementRead).toHaveBeenCalledWith('announcement-1'));
    expect(screen.queryByRole('dialog', { name: '系统公告' })).not.toBeInTheDocument();
  });

  it('presents multiple unread announcements in backend order', async () => {
    const user = userEvent.setup();
    const secondAnnouncement = { ...baseAnnouncement, id: 'announcement-2', title: '第二条公告' };
    const service = renderPopup(createService({
      listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([baseAnnouncement, secondAnnouncement]),
    }));

    await user.click(await screen.findByRole('button', { name: '知道了' }));
    expect(await screen.findByRole('dialog', { name: '第二条公告' })).toBeInTheDocument();
    expect(service.markAnnouncementRead).toHaveBeenCalledWith('announcement-1');
  });

  it('does not re-show an acknowledged announcement on ordinary rerenders', async () => {
    const user = userEvent.setup();
    const service = renderPopup(createService({
      listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([baseAnnouncement]),
    }));

    await user.click(await screen.findByRole('button', { name: '知道了' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    act(() => useAuthStore.getState().setUser({
      id: 'current-user',
      name: 'Current User',
      roles: [],
      permissions: [],
    }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(service.listCurrentPopupAnnouncements).toHaveBeenCalledOnce();
  });

  it('clears stale fetch results after logout', async () => {
    const popupRequest = deferred<readonly CurrentAnnouncementResp[]>();
    const service = createService({ listCurrentPopupAnnouncements: vi.fn().mockReturnValue(popupRequest.promise) });
    renderPopup(service);

    await waitFor(() => expect(service.listCurrentPopupAnnouncements).toHaveBeenCalledOnce());

    act(() => useAuthStore.getState().clearUser());
    await act(async () => popupRequest.resolve([baseAnnouncement]));

    expect(screen.queryByRole('dialog', { name: '系统公告' })).not.toBeInTheDocument();
  });

  it('clears stale acknowledgement results after user change', async () => {
    const user = userEvent.setup();
    const acknowledgement = deferred<void>();
    const service = renderPopup(createService({
      listCurrentPopupAnnouncements: vi.fn()
        .mockResolvedValueOnce([baseAnnouncement])
        .mockResolvedValueOnce([]),
      markAnnouncementRead: vi.fn().mockReturnValue(acknowledgement.promise),
    }));

    await user.click(await screen.findByRole('button', { name: '知道了' }));
    act(() => useAuthStore.getState().setUser({
      id: 'next-user',
      name: 'Next User',
      roles: [],
      permissions: [],
    }));
    await act(async () => acknowledgement.resolve());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(service.listCurrentPopupAnnouncements).toHaveBeenCalledTimes(2);
  });

  it('keeps the announcement visible and exposes retry when acknowledgement fails', async () => {
    const user = userEvent.setup();
    const markAnnouncementRead = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(undefined);
    renderPopup(createService({
      listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([baseAnnouncement]),
      markAnnouncementRead,
    }));

    await user.click(await screen.findByRole('button', { name: '知道了' }));
    expect(await screen.findByText('公告确认失败，请重试')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '系统公告' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '知道了' }));
    await waitFor(() => expect(markAnnouncementRead).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a dismissable retry state when loading fails', async () => {
    const user = userEvent.setup();
    const listCurrentPopupAnnouncements = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([baseAnnouncement]);
    renderPopup(createService({ listCurrentPopupAnnouncements }));

    expect(await screen.findByText('公告加载失败，请重试')).toBeInTheDocument();
    const errorDialog = screen.getByRole('dialog', { name: '公告加载失败' });
    expect(within(errorDialog).getByRole('button', { name: /重\s*试/ })).toBeInTheDocument();

    await user.click(within(errorDialog).getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByRole('dialog', { name: '系统公告' })).toBeInTheDocument();
  });
});

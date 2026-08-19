import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthManagementService } from '@/api/auth-management';
import type { NotifyService } from '@/services/notify';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { AnnouncementDetailResp, AnnouncementResp } from '@/types/notify';
import { AnnouncementManagementPage } from './index';

const NOTICE = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/hooks/use-notice', () => ({ useNotice: () => NOTICE }));

const ANNOUNCEMENT: AnnouncementResp = {
  id: 'announcement-1',
  title: '系统维护',
  status: 1,
  publishTime: '2026-08-09 20:00:00',
  expireTime: '2026-08-10 06:00:00',
  pinnedFlag: true,
  sortNum: 10,
  popupFlag: false,
  targetType: 'ALL',
  targetValues: [],
};

const DRAFT_ANNOUNCEMENT: AnnouncementResp = {
  ...ANNOUNCEMENT,
  id: 'announcement-draft',
  title: '草稿公告',
  status: 0,
};

const ARCHIVED_ANNOUNCEMENT: AnnouncementResp = {
  ...ANNOUNCEMENT,
  id: 'announcement-archived',
  title: '废弃公告',
  status: 2,
};

const DETAIL: AnnouncementDetailResp = {
  ...ANNOUNCEMENT,
  content: '今晚进行系统维护',
  targetType: 'ROLE',
  targetValues: ['role-1'],
};

function createNotifyService(overrides: Partial<NotifyService> = {}): NotifyService {
  return {
    createAnnouncement: vi.fn().mockResolvedValue('announcement-2'),
    updateAnnouncement: vi.fn().mockResolvedValue('announcement-1'),
    deleteAnnouncement: vi.fn().mockResolvedValue(undefined),
    getAnnouncement: vi.fn().mockResolvedValue(DETAIL),
    pageAnnouncements: vi.fn().mockResolvedValue({
      data: [DRAFT_ANNOUNCEMENT, ANNOUNCEMENT, ARCHIVED_ANNOUNCEMENT],
      total: 3,
    }),
    pageCurrentAnnouncements: vi.fn(),
    listCurrentPopupAnnouncements: vi.fn(),
    markAnnouncementRead: vi.fn(),
    createNotifyTemplate: vi.fn(),
    updateNotifyTemplate: vi.fn(),
    deleteNotifyTemplate: vi.fn(),
    getNotifyTemplate: vi.fn(),
    pageNotifyTemplates: vi.fn(),
    createNotifyChannelTarget: vi.fn(),
    updateNotifyChannelTarget: vi.fn(),
    deleteNotifyChannelTarget: vi.fn(),
    getNotifyChannelTarget: vi.fn(),
    pageNotifyChannelTargets: vi.fn(),
    sendNotify: vi.fn(),
    testEmailNotify: vi.fn(),
    getNotifyRecord: vi.fn(),
    pageNotifyRecords: vi.fn(),
    pageSiteMessages: vi.fn(),
    getUnreadSiteMessageCount: vi.fn(),
    markSiteMessageRead: vi.fn(),
    markSiteMessageUnread: vi.fn(),
    markSiteMessagesRead: vi.fn(),
    markSiteMessagesUnread: vi.fn(),
    deleteSiteMessage: vi.fn(),
    removeSiteMessage: vi.fn(),
    ...overrides,
  };
}

function createAuthService(): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getUserDetail: vi.fn(),
    resetUserPassword: vi.fn(),
    changeUserPassword: vi.fn(),
    batchUpdateUserAssignments: vi.fn(),
    listRoles: vi.fn().mockResolvedValue([{ id: 'role-1', name: '平台管理员', code: 'ADMIN' }]),
    listOrgs: vi.fn(),
    pageOrgs: vi.fn(),
    getOrgTree: vi.fn().mockResolvedValue([]),
    createOrg: vi.fn(),
    updateOrg: vi.fn(),
    deleteOrg: vi.fn(),
    getOrgDetail: vi.fn(),
  };
}

const ANNOUNCEMENT_PERMISSIONS = [
  'NOTIFY_ANNOUNCEMENT_CREATE',
  'NOTIFY_ANNOUNCEMENT_EDIT',
  'NOTIFY_ANNOUNCEMENT_DELETE',
] as const;

function renderPage(
  service = createNotifyService(),
  permissions: readonly string[] = ANNOUNCEMENT_PERMISSIONS,
) {
  const authService = createAuthService();
  render(
    <NebulaProvider>
      <AnnouncementManagementPage service={service} authService={authService} />
    </NebulaProvider>,
  );
  act(() => {
    useAuthStore.getState().setUser({
      id: 'notify-test-user',
      name: 'Notify Test User',
      roles: [],
      permissions: [...permissions],
    });
  });
  return { service, authService };
}

describe('AnnouncementManagementPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    act(() => useAuthStore.getState().clearUser());
  });

  it('hides announcement actions when the user has no announcement permissions', async () => {
    renderPage(createNotifyService(), []);

    await screen.findByText('系统维护');

    expect(screen.queryByRole('button', { name: '新建公告' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑 系统维护/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /发布 草稿公告/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /废弃 系统维护/ })).not.toBeInTheDocument();
  });

  it('renders five filters and loads the announcement table', async () => {
    const { service, authService } = renderPage();

    expect(screen.getByLabelText('公告标题')).toBeInTheDocument();
    expect(screen.getByLabelText('状态')).toBeInTheDocument();
    expect(screen.getByLabelText('目标类型')).toBeInTheDocument();
    expect(screen.getByLabelText('弹窗展示')).toBeInTheDocument();
    expect(screen.getByLabelText('置顶')).toBeInTheDocument();
    expect(await screen.findByText('系统维护')).toBeInTheDocument();
    expect(screen.queryByText('公告管理')).not.toBeInTheDocument();
    expect(service.pageAnnouncements).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
    expect(authService.listRoles).toHaveBeenCalledOnce();
    expect(authService.getOrgTree).toHaveBeenCalledOnce();
  });

  it('creates an ALL announcement with backend-compatible date strings', async () => {
    const user = userEvent.setup();
    const { service } = renderPage();
    await screen.findByText('系统维护');

    await user.click(screen.getByRole('button', { name: '新建公告' }));
    const dialog = screen.getByRole('dialog', { name: '新建公告' });
    await user.type(within(dialog).getByLabelText('公告标题'), '版本发布');
    await user.type(within(dialog).getByLabelText('公告内容'), '新版本已经发布');
    await user.type(within(dialog).getByLabelText('发布时间'), '2026-08-11T09:30:00');
    await user.click(within(dialog).getByRole('button', { name: '保存并发布' }));

    await waitFor(() => expect(service.createAnnouncement).toHaveBeenCalledWith({
      title: '版本发布',
      content: '新版本已经发布',
      status: 1,
      publishTime: '2026-08-11 09:30:00',
      pinnedFlag: false,
      sortNum: 0,
      popupFlag: false,
      targetType: 'ALL',
    }));
    expect(NOTICE.success).toHaveBeenCalledWith('公告创建成功');
  });

  it('fetches detail before showing complete edit values and updates the record', async () => {
    const user = userEvent.setup();
    const getAnnouncement = vi.fn().mockResolvedValue(DETAIL);
    const service = createNotifyService({ getAnnouncement });
    renderPage(service);
    await screen.findByText('系统维护');

    await user.click(screen.getByRole('button', { name: '编辑 系统维护' }));
    expect(getAnnouncement).toHaveBeenCalledWith('announcement-1');
    const dialog = await screen.findByRole('dialog', { name: '编辑公告' });
    expect(await within(dialog).findByDisplayValue('今晚进行系统维护')).toBeInTheDocument();
    expect(within(dialog).getByText('平台管理员')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '保存为草稿' }));

    await waitFor(() => expect(service.updateAnnouncement).toHaveBeenCalledWith(
      'announcement-1',
      expect.objectContaining({ targetType: 'ROLE', targetValues: ['role-1'] }),
    ));
    expect(NOTICE.success).toHaveBeenCalledWith('公告更新成功');
  });

  it('publishes drafts and archives draft or published announcements only after confirmation', async () => {
    const user = userEvent.setup();
    const { service } = renderPage();
    await screen.findByText('系统维护');

    expect(screen.getByRole('button', { name: '编辑 草稿公告' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑 系统维护' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑 废弃公告' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /发布 系统维护/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /废弃 废弃公告/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '发布 草稿公告' }));
    expect(service.updateAnnouncement).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: '确认发布' }));

    await waitFor(() => expect(service.updateAnnouncement).toHaveBeenCalledWith(
      'announcement-draft',
      { status: 1 },
    ));

    await user.click(screen.getByRole('button', { name: '废弃 系统维护' }));
    await user.click(await screen.findByRole('button', { name: '确认废弃' }));

    await waitFor(() => expect(service.updateAnnouncement).toHaveBeenCalledWith(
      'announcement-1',
      { status: 2 },
    ));

    await user.click(screen.getByRole('button', { name: '废弃 草稿公告' }));
    await user.click(await screen.findByRole('button', { name: '确认废弃' }));

    await waitFor(() => expect(service.updateAnnouncement).toHaveBeenCalledWith(
      'announcement-draft',
      { status: 2 },
    ));
    expect(NOTICE.success).toHaveBeenCalledWith('公告发布成功');
    expect(NOTICE.success).toHaveBeenCalledWith('公告废弃成功');
  });

  it('reports detail and submission failures without closing the workflow silently', async () => {
    const user = userEvent.setup();
    const service = createNotifyService({
      getAnnouncement: vi.fn().mockRejectedValue(new Error('detail unavailable')),
      createAnnouncement: vi.fn().mockRejectedValue(new Error('create unavailable')),
    });
    renderPage(service);
    await screen.findByText('系统维护');

    await user.click(screen.getByRole('button', { name: '编辑 系统维护' }));
    await waitFor(() => expect(NOTICE.error).toHaveBeenCalledWith('公告详情加载失败'));

    await user.click(screen.getByRole('button', { name: '新建公告' }));
    const dialog = screen.getByRole('dialog', { name: '新建公告' });
    await user.type(within(dialog).getByLabelText('公告标题'), '失败公告');
    await user.type(within(dialog).getByLabelText('公告内容'), '提交失败测试');
    await user.click(within(dialog).getByRole('button', { name: '保存为草稿' }));

    await waitFor(() => expect(NOTICE.error).toHaveBeenCalledWith('公告创建失败'));
    expect(screen.getByRole('dialog', { name: '新建公告' })).toBeInTheDocument();
  });
});

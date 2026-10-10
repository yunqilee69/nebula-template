import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';
import type { SiteMessageResp } from '@/types/notify';
import { SiteMessageDetail } from './site-message-detail';

const message: SiteMessageResp = {
  id: 'message-1',
  recordId: 'record-1',
  receiverUserId: 'current-user',
  title: '登录异常提醒',
  content: '检测到你的账号在新设备登录',
  categoryCode: 'SECURITY',
  categoryName: '安全与账号',
  readStatus: false,
  createTime: '2026-08-09 10:00:00',
};

function renderDetail(nextMessage: SiteMessageResp | undefined) {
  render(
    <NebulaProvider>
      <SiteMessageDetail message={nextMessage} />
    </NebulaProvider>,
  );
}

describe('SiteMessageDetail', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useLocaleStore.getState().setLocale('zh-CN');
  });

  it('renders a skeleton while the message is not resolved', () => {
    renderDetail(undefined);

    expect(document.querySelector('.ant-skeleton')).not.toBeNull();
    expect(screen.queryByText('登录异常提醒')).not.toBeInTheDocument();
  });

  it('renders title, category, publish time, and content of an unread message', () => {
    renderDetail(message);

    expect(screen.getByRole('heading', { name: '登录异常提醒' })).toBeInTheDocument();
    expect(screen.getByText('安全与账号')).toBeInTheDocument();
    expect(screen.getByText('2026-08-09 10:00:00')).toBeInTheDocument();
    expect(screen.getByText('检测到你的账号在新设备登录')).toBeInTheDocument();
    expect(screen.getByText('未读')).toBeInTheDocument();
    expect(screen.queryByText(/已读于/)).not.toBeInTheDocument();
  });

  it('shows the read state and read time for a read message', () => {
    renderDetail({ ...message, readStatus: true, readTime: '2026-08-09 11:00:00', categoryName: undefined });

    expect(screen.getByText('已读')).toBeInTheDocument();
    expect(screen.getByText('已读于 2026-08-09 11:00:00')).toBeInTheDocument();
    expect(screen.getByText('SECURITY')).toBeInTheDocument();
  });
});

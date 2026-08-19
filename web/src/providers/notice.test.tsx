import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const messageApi = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
}));

const useMessage = vi.hoisted(() => vi.fn(() => [messageApi, <div key="holder">message context holder</div>] as const));

vi.mock('antd', () => ({
  message: {
    useMessage,
  },
}));

describe('NoticeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Ant Design message context holder and forwards notice levels', async () => {
    const { NoticeProvider, notice } = await import('./notice');

    render(<NoticeProvider>content</NoticeProvider>);

    expect(screen.getByText('message context holder')).toBeInTheDocument();

    act(() => {
      notice.error('请求失败');
      notice.warning('请检查输入');
      notice.success('保存成功');
    });

    expect(messageApi.error).toHaveBeenCalledWith({ content: '请求失败' });
    expect(messageApi.warning).toHaveBeenCalledWith({ content: '请检查输入' });
    expect(messageApi.success).toHaveBeenCalledWith({ content: '保存成功' });
  });

  it('passes default message configuration to Ant Design', async () => {
    const { NoticeProvider } = await import('./notice');

    render(
      <NoticeProvider options={{ duration: 4, maxCount: 2, pauseOnHover: false, stack: { threshold: 2 } }}>
        content
      </NoticeProvider>,
    );

    expect(useMessage).toHaveBeenCalledWith({ duration: 4, maxCount: 2, pauseOnHover: false, stack: { threshold: 2 } });
  });

  it('forwards per-message options to Ant Design', async () => {
    const { NoticeProvider, notice } = await import('./notice');
    const onClose = vi.fn();

    render(<NoticeProvider>content</NoticeProvider>);

    act(() => {
      notice.error('请求失败', { duration: 6, key: 'request-error', onClose, pauseOnHover: false });
    });

    expect(messageApi.error).toHaveBeenCalledWith({
      content: '请求失败',
      duration: 6,
      key: 'request-error',
      onClose,
      pauseOnHover: false,
    });
  });

  it('clears the active message api after unmounting', async () => {
    const { NoticeProvider, notice } = await import('./notice');

    const { unmount } = render(<NoticeProvider>content</NoticeProvider>);
    unmount();

    act(() => {
      notice.error('卸载后不提示');
    });

    expect(messageApi.error).not.toHaveBeenCalledWith({ content: '卸载后不提示' });
  });
});

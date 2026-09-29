import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { LoginLogService } from '@/services/login-log';
import type { LoginRecordResp } from '@/types/login-record';
import { LoginLogPage } from './index';
import { buildLoginRecordPageReq } from './components/login-log-table';

const LOGIN_RECORDS: readonly LoginRecordResp[] = [
  {
    id: 'login-1',
    userId: 'user-1',
    loginAccount: 'alice',
    loginType: 'PHONE',
    loginResult: 'SUCCESS',
    loginIp: '203.0.113.10',
    clientType: 'MP_WEIXIN',
    clientTypeSource: 'USER_AGENT',
    deviceInfo: 'WeChat / iOS',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) miniProgram',
    loginTime: '2026-08-10T08:00:00',
  },
  {
    id: 'login-2',
    userId: 'user-2',
    loginAccount: 'bob',
    loginType: 'PASSWORD',
    loginResult: 'FAILED',
    loginIp: '203.0.113.11',
    clientType: 'WEB',
    clientTypeSource: 'HEADER',
    deviceInfo: 'Chrome / Mac',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
    failReason: '密码错误',
    loginTime: '2026-08-10T09:00:00',
  },
  {
    id: 'login-3',
    userId: 'user-3',
    loginAccount: 'carol',
    loginType: 'PASSWORD',
    loginResult: 'FAILED',
    clientType: 'UNKNOWN',
    clientTypeSource: 'DEFAULT',
    loginTime: '2026-08-10T10:00:00',
  },
];

function createService(): LoginLogService {
  return {
    pageLoginRecords: vi.fn().mockResolvedValue({ data: LOGIN_RECORDS, total: LOGIN_RECORDS.length }),
  };
}

function renderPage(service: LoginLogService = createService()): LoginLogService {
  render(
    <NebulaProvider>
      <LoginLogPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

function getRecordRow(loginAccount: string): HTMLElement {
  const row = screen.getByText(loginAccount).closest('tr');
  if (row instanceof HTMLElement) return row;
  throw new Error(`Unable to find the login record row for account: ${loginAccount}`);
}

describe('LoginLogPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders login records with localized client type and result labels', async () => {
    renderPage();
    await screen.findByText('alice');

    const aliceRow = getRecordRow('alice');
    expect(within(aliceRow).getByText('手机验证码')).toBeInTheDocument();
    expect(within(aliceRow).getByText('微信小程序')).toBeInTheDocument();
    expect(within(aliceRow).getByText('成功')).toBeInTheDocument();
    expect(within(aliceRow).getByText('203.0.113.10')).toBeInTheDocument();
    expect(within(aliceRow).getByText('2026-08-10 08:00:00')).toBeInTheDocument();

    const bobRow = getRecordRow('bob');
    expect(within(bobRow).getByText('账密登录')).toBeInTheDocument();
    expect(within(bobRow).getByText('Web 端')).toBeInTheDocument();
    expect(within(bobRow).getByText('失败')).toBeInTheDocument();
    expect(within(bobRow).getByText('密码错误')).toBeInTheDocument();
  });

  it('falls back to the not-provided label when a failure has no reason', async () => {
    renderPage();
    await screen.findByText('carol');

    expect(within(getRecordRow('carol')).getByText('未填写')).toBeInTheDocument();
  });

  it('renders the parsed device info and exposes the raw User-Agent only through a tooltip', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('alice');
    expect(screen.getByText('WeChat / iOS')).toBeInTheDocument();
    expect(screen.queryByText(/miniProgram/)).not.toBeInTheDocument();

    await user.hover(screen.getByText('WeChat / iOS'));

    expect(await screen.findByText(/miniProgram/)).toBeInTheDocument();
  });

  it('submits the login type and client type filters', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('alice');
    await user.click(screen.getByLabelText('登录方式'));
    await user.click(await screen.findByTitle('手机验证码'));
    await user.click(screen.getByLabelText('端类型'));
    await user.click(await screen.findByTitle('微信小程序'));
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageLoginRecords).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 20,
        loginType: 'PHONE',
        clientType: 'MP_WEIXIN',
      });
    });
  });

  it('submits the login account and login IP text filters', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('alice');
    await user.type(screen.getByLabelText('登录账号'), 'alice');
    await user.type(screen.getByLabelText('登录IP'), '203.0.113.10');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageLoginRecords).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 20,
        loginAccount: 'alice',
        loginIp: '203.0.113.10',
      });
    });
  });
});

describe('buildLoginRecordPageReq', () => {
  it('omits empty filters and page-1 defaults', () => {
    expect(buildLoginRecordPageReq({ pageNum: 1, pageSize: 20, loginAccount: '   ', loginIp: '' })).toEqual({
      pageNum: 1,
      pageSize: 20,
    });
  });

  it('normalizes text filters and forwards the login result', () => {
    expect(
      buildLoginRecordPageReq({ pageNum: 2, pageSize: 50, loginAccount: ' alice ', loginResult: 'FAILED' }),
    ).toEqual({ pageNum: 2, pageSize: 50, loginAccount: 'alice', loginResult: 'FAILED' });
  });

  it('formats the login time range into boundary timestamps', () => {
    expect(
      buildLoginRecordPageReq({
        pageNum: 1,
        pageSize: 20,
        loginTimeRange: ['2026-08-10T00:00:00', '2026-08-11T23:59:59'],
      }),
    ).toEqual({
      pageNum: 1,
      pageSize: 20,
      loginTimeFrom: '2026-08-10 00:00:00',
      loginTimeTo: '2026-08-11 23:59:59',
    });
  });

  it('supports range boundaries exposing a moment-like formatter', () => {
    const boundary = { format: (template: string) => `formatted:${template}` };

    expect(buildLoginRecordPageReq({ pageNum: 1, pageSize: 20, loginTimeRange: [boundary, boundary] })).toEqual({
      pageNum: 1,
      pageSize: 20,
      loginTimeFrom: 'formatted:YYYY-MM-DD HH:mm:ss',
      loginTimeTo: 'formatted:YYYY-MM-DD HH:mm:ss',
    });
  });

  it('forwards the requested sort order', () => {
    expect(buildLoginRecordPageReq({ pageNum: 3, pageSize: 20, orderName: 'loginTime', orderType: 'asc' })).toEqual({
      pageNum: 3,
      pageSize: 20,
      orderName: 'loginTime',
      orderType: 'asc',
    });
  });
});

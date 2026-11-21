import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantOAuthService, type TenantOAuth2Provider } from '@/api/tenant-oauth';
import { NebulaProvider } from '@/providers/nebula-provider';
import { TenantOAuthProvidersPage } from './oauth-providers';

vi.mock('@/api/tenant-oauth', () => ({
  tenantOAuthService: {
    list: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

const list = vi.mocked(tenantOAuthService.list);
const upsert = vi.mocked(tenantOAuthService.upsert);
const remove = vi.mocked(tenantOAuthService.remove);

const githubRow: TenantOAuth2Provider = {
  id: 'cfg-github',
  tenantId: 'tenant-1',
  providerId: 'github',
  channel: 'WEB',
  enabled: true,
  clientId: 'Iv1.existing',
  hasClientSecret: true,
  credentialComplete: true,
  missingFields: [],
  redirectUri: 'https://api.example.com/api/auth/github/callback',
  frontendCallbackUri: '/login/github-callback',
};

const wechatWebRow: TenantOAuth2Provider = {
  id: 'cfg-wechat',
  tenantId: 'tenant-1',
  providerId: 'wechat',
  channel: 'WEB',
  enabled: true,
  clientId: 'wx-open-app',
  hasClientSecret: true,
  credentialComplete: true,
  missingFields: [],
  redirectUri: 'https://api.example.com/api/auth/wechat/web/callback',
  scope: 'snsapi_login',
  authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect',
  tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
  frontendCallbackUri: '/login/wechat-callback',
};

/** 凭据不完整的微信小程序记录：列表应显示「不可用」并说明缺什么。 */
const wechatMiniRow: TenantOAuth2Provider = {
  id: 'cfg-mini',
  tenantId: 'tenant-1',
  providerId: 'wechat',
  channel: 'MINI',
  enabled: true,
  clientId: 'wx-mini-app',
  hasClientSecret: true,
  credentialComplete: false,
  missingFields: ['授权码换会话地址（jscode2session）', '手机号接口地址'],
  tokenUrl: 'https://api.weixin.qq.com/cgi-bin/token',
};

const GITHUB_CLIENT_ID_PLACEHOLDER = '如 Iv1.1a2b3c4d5e6f7g8h';
const GITHUB_AUTHORIZE_PLACEHOLDER = 'https://github.com/login/oauth/authorize';
const GITHUB_REDIRECT_PLACEHOLDER = '如 https://api.example.com/api/auth/github/callback';
const WECHAT_MINI_SESSION_PLACEHOLDER = 'https://api.weixin.qq.com/sns/jscode2session';
const WECHAT_MINI_TOKEN_PLACEHOLDER = 'https://api.weixin.qq.com/cgi-bin/token';
const WECHAT_MINI_PHONE_PLACEHOLDER = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber';
/** GitHub 前端承接页的示例占位符，也是该字段的定位方式。 */
const GITHUB_FRONTEND_CALLBACK_PLACEHOLDER = '/login/github-callback';
/** 承接页只支持站内相对路径，绝对地址与 `//host`、`javascript:` 一律被拒。 */
const FRONTEND_CALLBACK_ERROR_MESSAGE = '前端承接页只支持站内相对路径（以 / 开头且不能以 // 开头）';

function renderPage(rows: TenantOAuth2Provider[] = []) {
  list.mockResolvedValue(rows);
  render(
    <NebulaProvider>
      <TenantOAuthProvidersPage />
    </NebulaProvider>,
  );
}

function getDialog(): HTMLElement {
  return screen.getByRole('dialog');
}

function getFormItemLabel(dialog: HTMLElement, label: string): HTMLElement {
  return within(dialog).getByText(label, { selector: '.ant-form-item-label > label' });
}

async function openCreateModal(user: UserEvent): Promise<HTMLElement> {
  await user.click(await screen.findByRole('button', { name: /新增配置/ }));
  return getDialog();
}

/** 字段 label 带 tooltip 图标会污染无障碍名称，这里按 Form.Item 生成的控件 id 定位下拉框。 */
function getSelectTrigger(dialog: HTMLElement, field: string): HTMLElement {
  const trigger = dialog.querySelector(`input#${field}[role="combobox"]`)?.closest('.ant-select');
  if (trigger instanceof HTMLElement) return trigger;
  throw new Error(`未找到下拉框：${field}`);
}

/** 通过 combobox 的 aria-controls 定位该字段自己的下拉面板，避免拿到上一次未收起的面板。 */
function getDropdown(dialog: HTMLElement, field: string): HTMLElement {
  const listId = dialog.querySelector(`input#${field}[role="combobox"]`)?.getAttribute('aria-controls');
  const dropdown = listId ? document.getElementById(listId)?.closest('.ant-select-dropdown') : null;
  if (dropdown instanceof HTMLElement) return dropdown;
  throw new Error(`未找到下拉面板：${field}`);
}

function getOptionLabels(dialog: HTMLElement, field: string): string[] {
  return Array.from(getDropdown(dialog, field).querySelectorAll('.ant-select-item-option-content')).map(
    (node) => node.textContent ?? '',
  );
}

async function pickOption(user: UserEvent, dialog: HTMLElement, field: string, option: string): Promise<void> {
  await user.click(getSelectTrigger(dialog, field));
  const content = within(getDropdown(dialog, field)).getByText(option, {
    selector: '.ant-select-item-option-content',
  });
  await user.click(content);
}

async function fillInput(user: UserEvent, dialog: HTMLElement, placeholder: string, value: string): Promise<void> {
  const input = within(dialog).getByPlaceholderText(placeholder);
  await user.clear(input);
  await user.type(input, value);
}

function getSelectionTexts(dialog: HTMLElement): string[] {
  return Array.from(dialog.querySelectorAll('.ant-select-content')).map((node) => (node.textContent ?? '').trim());
}

async function clickSave(user: UserEvent, dialog: HTMLElement): Promise<void> {
  await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));
}

async function fillRequiredGithubWeb(user: UserEvent, dialog: HTMLElement): Promise<void> {
  await fillInput(user, dialog, GITHUB_CLIENT_ID_PLACEHOLDER, 'Iv1.new-client');
  await fillInput(user, dialog, '请填写 Client Secret', 'new-secret');
  await fillInput(user, dialog, GITHUB_REDIRECT_PLACEHOLDER, 'https://api.example.com/api/auth/github/callback');
}

/**
 * 清空再填入非法承接页并确认字段报错。
 * 先清空可以确认上一条错误已消失，避免把上一次校验的残留提示误当成当前值的校验结果。
 */
async function expectFrontendCallbackRejected(user: UserEvent, dialog: HTMLElement, value: string): Promise<void> {
  const input = within(dialog).getByPlaceholderText(GITHUB_FRONTEND_CALLBACK_PLACEHOLDER);
  await user.clear(input);
  await waitFor(() =>
    expect(within(dialog).queryByText(FRONTEND_CALLBACK_ERROR_MESSAGE)).not.toBeInTheDocument(),
  );
  await user.type(input, value);
  await waitFor(() =>
    expect(within(dialog).getByText(FRONTEND_CALLBACK_ERROR_MESSAGE)).toBeInTheDocument(),
  );
}

beforeEach(() => {
  list.mockResolvedValue([]);
  upsert.mockResolvedValue(githubRow);
  remove.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TenantOAuthProvidersPage OAuth2 form', () => {
  it('offers only the Web channel for GitHub and corrects the channel after switching providers', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateModal(user);
    await user.click(getSelectTrigger(dialog, 'channel'));
    expect(getOptionLabels(dialog, 'channel')).toEqual(['Web']);
    await user.keyboard('{Escape}');

    await pickOption(user, dialog, 'providerId', '微信');
    await pickOption(user, dialog, 'channel', '小程序');
    expect(within(dialog).getByPlaceholderText(WECHAT_MINI_SESSION_PLACEHOLDER)).toBeInTheDocument();

    await pickOption(user, dialog, 'providerId', 'GitHub');
    // Provider 与渠道联动：小程序渠道被纠正回 Web，不残留隐藏值。
    expect(getSelectionTexts(dialog)).toEqual(['GitHub', 'Web']);
    expect(within(dialog).queryByPlaceholderText(WECHAT_MINI_SESSION_PLACEHOLDER)).not.toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(GITHUB_AUTHORIZE_PLACEHOLDER)).toBeInTheDocument();
  });

  it('shows only the fields that take effect for the selected channel', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateModal(user);
    await pickOption(user, dialog, 'providerId', '微信');

    // 微信 Web：Web 回调、Scope、授权地址、前端承接字段可见，用户信息地址与手机号接口不可见。
    expect(within(dialog).getByPlaceholderText('如 https://api.example.com/api/auth/wechat/web/callback')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('如 snsapi_login')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('https://open.weixin.qq.com/connect/qrconnect')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('/login/wechat-callback')).toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText(WECHAT_MINI_SESSION_PLACEHOLDER)).not.toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText(WECHAT_MINI_PHONE_PLACEHOLDER)).not.toBeInTheDocument();

    await pickOption(user, dialog, 'channel', '小程序');

    // 微信小程序：只保留 AppID/AppSecret 与三个小程序端点。
    expect(within(dialog).getByPlaceholderText(WECHAT_MINI_SESSION_PLACEHOLDER)).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(WECHAT_MINI_TOKEN_PLACEHOLDER)).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(WECHAT_MINI_PHONE_PLACEHOLDER)).toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText('如 snsapi_login')).not.toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText('如 https://api.example.com/api/auth/wechat/web/callback')).not.toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText('/login/wechat-callback')).not.toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText('https://open.weixin.qq.com/connect/qrconnect')).not.toBeInTheDocument();
    // 旧版误导文案与“扩展配置 JSON”字段不再出现。
    expect(within(dialog).queryByText(/额外地址放在 configJson/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText('扩展配置 JSON')).not.toBeInTheDocument();
  });

  it('marks required fields and blocks the API call until the enabled configuration is complete', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateModal(user);
    expect(getFormItemLabel(dialog, 'Client ID')).toHaveClass('ant-form-item-required');
    expect(getFormItemLabel(dialog, 'Client Secret')).toHaveClass('ant-form-item-required');
    expect(getFormItemLabel(dialog, 'OAuth 回调地址')).toHaveClass('ant-form-item-required');

    await clickSave(user, dialog);

    expect(await within(dialog).findByText('启用后必须填写 Client ID')).toBeInTheDocument();
    expect(within(dialog).getByText('启用后必须填写 Client Secret')).toBeInTheDocument();
    expect(within(dialog).getByText('启用后必须填写 OAuth 回调地址')).toBeInTheDocument();
    expect(upsert).not.toHaveBeenCalled();

    // 停用后允许保存不完整草稿。
    await user.click(within(dialog).getByRole('switch', { name: '启用' }));
    await clickSave(user, dialog);

    await waitFor(() => expect(upsert).toHaveBeenCalledWith({ providerId: 'github', channel: 'web', enabled: false }));
  });

  it('keeps the field help and examples for the fields that matter', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateModal(user);
    expect(within(dialog).getByRole('img', { name: 'OAuth 回调地址字段说明' })).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Client Secret字段说明' })).toBeInTheDocument();
    expect(
      within(dialog).getByText('保存后加密存储，任何接口都不会回显明文'),
    ).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(GITHUB_AUTHORIZE_PLACEHOLDER)).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('如 read:user user:email')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('/login/github-callback')).toBeInTheDocument();
  });

  it('keeps the stored secret when editing and submits trimmed values', async () => {
    const user = userEvent.setup();
    renderPage([githubRow]);

    await user.click(await screen.findByRole('button', { name: '编辑' }));
    const dialog = getDialog();
    const secretInput = within(dialog).getByPlaceholderText('留空保留已保存的密钥');
    expect(secretInput).toHaveValue('');
    expect(getFormItemLabel(dialog, 'Client Secret')).not.toHaveClass('ant-form-item-required');

    await fillInput(user, dialog, GITHUB_CLIENT_ID_PLACEHOLDER, ' Iv1.updated ');
    await fillInput(user, dialog, GITHUB_REDIRECT_PLACEHOLDER, ' https://api.example.com/api/auth/github/callback ');
    await clickSave(user, dialog);

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    const payload = upsert.mock.calls[0][0];
    expect(payload).toEqual({
      providerId: 'github',
      channel: 'web',
      enabled: true,
      clientId: 'Iv1.updated',
      redirectUri: 'https://api.example.com/api/auth/github/callback',
      frontendCallbackUri: '/login/github-callback',
    });
    expect(payload).not.toHaveProperty('clientSecret');
  });

  it('rejects invalid URLs and absolute frontend callbacks before calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateModal(user);
    await fillInput(user, dialog, GITHUB_CLIENT_ID_PLACEHOLDER, 'Iv1.new-client');
    await fillInput(user, dialog, '请填写 Client Secret', 'secret');
    await fillInput(user, dialog, GITHUB_REDIRECT_PLACEHOLDER, 'ftp://example.com/callback');
    await clickSave(user, dialog);
    expect(await within(dialog).findByText('请填写以 http:// 或 https:// 开头的完整地址')).toBeInTheDocument();
    expect(upsert).not.toHaveBeenCalled();

    await fillInput(user, dialog, GITHUB_REDIRECT_PLACEHOLDER, 'https://api.example.com/api/auth/github/callback');

    // 白名单入口已移除：绝对承接页、协议相对地址与非 http 协议都在表单层被拒绝。
    for (const invalid of ['https://admin.example.com/callback', '//evil.example.com/callback', 'javascript:alert(1)']) {
      await expectFrontendCallbackRejected(user, dialog, invalid);
    }
    await clickSave(user, dialog);
    expect(upsert).not.toHaveBeenCalled();

    // 站内相对路径可正常提交，且请求体不再带白名单字段。
    await fillInput(user, dialog, '/login/github-callback', '/login/github-callback');
    await waitFor(() =>
      expect(within(dialog).queryByText(FRONTEND_CALLBACK_ERROR_MESSAGE)).not.toBeInTheDocument(),
    );
    await clickSave(user, dialog);
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][0]).toMatchObject({ frontendCallbackUri: '/login/github-callback' });
    expect(upsert.mock.calls[0][0]).not.toHaveProperty('frontendCallbackAllowlist');
  });

  it('drops the previous channel fields when the configuration moves to the mini program', async () => {
    const user = userEvent.setup();
    renderPage([wechatWebRow]);

    await user.click(await screen.findByRole('button', { name: '编辑' }));
    const dialog = getDialog();
    await pickOption(user, dialog, 'channel', '小程序');
    await fillInput(user, dialog, WECHAT_MINI_SESSION_PLACEHOLDER, 'https://api.weixin.qq.com/sns/jscode2session');
    await fillInput(user, dialog, WECHAT_MINI_TOKEN_PLACEHOLDER, 'https://api.weixin.qq.com/cgi-bin/token');
    await fillInput(user, dialog, WECHAT_MINI_PHONE_PLACEHOLDER, 'https://api.weixin.qq.com/wxa/business/getuserphonenumber');
    await clickSave(user, dialog);

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][0]).toEqual({
      providerId: 'wechat',
      channel: 'mini',
      enabled: true,
      clientId: 'wx-open-app',
      userinfoUrl: 'https://api.weixin.qq.com/sns/jscode2session',
      tokenUrl: 'https://api.weixin.qq.com/cgi-bin/token',
      configJson: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
    });
  });

  it('keeps the dialog open with the user input when saving fails', async () => {
    const user = userEvent.setup();
    let rejectSave: (error: unknown) => void = () => {};
    upsert.mockImplementation(() => new Promise<TenantOAuth2Provider>((_resolve, reject) => {
      rejectSave = reject;
    }));
    renderPage();

    const dialog = await openCreateModal(user);
    await fillRequiredGithubWeb(user, dialog);
    await clickSave(user, dialog);

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(within(dialog).getByRole('button', { name: /保\s*存/ })).toHaveClass('ant-btn-loading');

    await act(async () => {
      rejectSave(new Error('save failed'));
    });

    expect(getDialog()).toBe(dialog);
    expect(within(dialog).getByPlaceholderText(GITHUB_REDIRECT_PLACEHOLDER)).toHaveValue(
      'https://api.example.com/api/auth/github/callback',
    );
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: /保\s*存/ })).not.toHaveClass('ant-btn-loading'),
    );
  });
});

describe('TenantOAuthProvidersPage OAuth2 list', () => {
  it('renders the wechat mini channel explicitly and hides the web-only callback address', async () => {
    renderPage([wechatMiniRow]);

    const channelCell = await screen.findByText('微信 - 小程序');
    const row = channelCell.closest('tr');
    if (!(row instanceof HTMLElement)) throw new Error('未找到数据行');

    // 渠道列明确到「Provider - 渠道」，仍复用 CHANNEL_LABELS 的渠道文案
    expect(within(row).getByText('不可用')).toBeInTheDocument();
    // 回调地址对小程序渠道无意义，显示占位符
    expect(within(row).getByText('-')).toBeInTheDocument();
  });

  it('lists the missing fields in a tooltip when the credential is incomplete', async () => {
    const user = userEvent.setup();
    renderPage([wechatMiniRow]);

    const tag = await screen.findByText('不可用');
    // 悬浮前页面里没有缺失项文案，说明下面的断言来自 Tooltip 而不是列表列
    expect(screen.queryByText('手机号接口地址')).not.toBeInTheDocument();
    await user.hover(tag);

    expect(await screen.findByText('授权码换会话地址（jscode2session）')).toBeInTheDocument();
    expect(screen.getByText('手机号接口地址')).toBeInTheDocument();
  });

  it('shows a complete credential tag for complete rows and keeps the existing columns', async () => {
    renderPage([githubRow]);

    expect(await screen.findByText('完整')).toBeInTheDocument();
    const channelCell = screen.getByText('GitHub - Web');
    const row = channelCell.closest('tr');
    if (!(row instanceof HTMLElement)) throw new Error('未找到数据行');
    // 既有「启用」列与编辑/删除按钮逻辑不受影响
    expect(within(row).getByText('已启用')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: '编辑' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(within(row).getByText('https://api.example.com/api/auth/github/callback')).toBeInTheDocument();
  });
});

describe('TenantOAuthProvidersPage OAuth2 list empty missing fields', () => {
  it('falls back to a dash in the tooltip when the backend returns no labels', async () => {
    const user = userEvent.setup();
    renderPage([
      {
        ...githubRow,
        id: 'cfg-disabled',
        enabled: false,
        credentialComplete: false,
        missingFields: [],
      },
    ]);

    const tag = await screen.findByText('不可用');
    await user.hover(tag);

    expect(await screen.findByText('-')).toBeInTheDocument();
  });
});

import type { Rule } from 'antd/es/form';
import { describe, expect, it } from 'vitest';
import {
  buildFieldRules,
  channelOptions,
  INVALID_FRONTEND_CALLBACK_MESSAGE,
  INVALID_URL_MESSAGE,
  isFieldRequired,
  isFieldVisible,
  normalizeChannelForProvider,
  toFormValues,
  toUpsertRequest,
  validateFrontendCallbackUri,
  type OAuthProviderFieldKey,
  type OAuthProviderFormContext,
} from './oauth-provider-form-helpers';
import type { TenantOAuth2Provider } from '@/api/tenant-oauth';

function createContext(overrides: Partial<OAuthProviderFormContext> = {}): OAuthProviderFormContext {
  return { providerId: 'github', channel: 'web', enabled: true, hasStoredSecret: false, ...overrides };
}

async function runValidators(key: OAuthProviderFieldKey, value: string, context = createContext()): Promise<void> {
  const rules = buildFieldRules(key, context);
  for (const rule of rules) {
    if (typeof rule === 'function' || !rule.validator) continue;
    await (rule as { validator: (rule: Rule, value: string, callback: () => void) => Promise<unknown> })
      .validator(rule, value, () => {});
  }
}

describe('oauth provider form helpers', () => {
  it('offers Web only for GitHub and Web+Mini for WeChat', () => {
    expect(channelOptions('github')).toEqual([{ label: 'Web', value: 'web' }]);
    expect(channelOptions('wechat')).toEqual([
      { label: 'Web', value: 'web' },
      { label: '小程序', value: 'mini' },
    ]);
  });

  it('corrects an illegal provider/channel combination back to the allowed channel', () => {
    expect(normalizeChannelForProvider('github', 'mini')).toBe('web');
    expect(normalizeChannelForProvider('github', undefined)).toBe('web');
    expect(normalizeChannelForProvider('wechat', 'MINI')).toBe('mini');
    expect(normalizeChannelForProvider('wechat', 'app')).toBe('web');
  });

  it('hides fields that do not apply to the selected provider and channel', () => {
    const miniHidden: OAuthProviderFieldKey[] = [
      'redirectUri',
      'scope',
      'authorizeUrl',
      'frontendCallbackUri',
    ];
    miniHidden.forEach((field) => expect(isFieldVisible(field, 'wechat', 'mini')).toBe(false));
    expect(isFieldVisible('userinfoUrl', 'wechat', 'mini')).toBe(true);
    expect(isFieldVisible('tokenUrl', 'wechat', 'mini')).toBe(true);
    expect(isFieldVisible('configJson', 'wechat', 'mini')).toBe(true);
    expect(isFieldVisible('userinfoUrl', 'wechat', 'web')).toBe(false);
    expect(isFieldVisible('configJson', 'wechat', 'web')).toBe(false);
    expect(isFieldVisible('userinfoUrl', 'github', 'web')).toBe(true);
    expect(isFieldVisible('configJson', 'github', 'web')).toBe(false);
  });

  it('requires credentials only when the configuration is enabled', () => {
    const enabled = createContext();
    expect(isFieldRequired('providerId', enabled)).toBe(true);
    expect(isFieldRequired('channel', enabled)).toBe(true);
    expect(isFieldRequired('clientId', enabled)).toBe(true);
    expect(isFieldRequired('clientSecret', enabled)).toBe(true);
    expect(isFieldRequired('redirectUri', enabled)).toBe(true);
    expect(isFieldRequired('scope', enabled)).toBe(false);
    expect(isFieldRequired('tokenUrl', enabled)).toBe(false);

    const enabledWithSecret = createContext({ hasStoredSecret: true });
    expect(isFieldRequired('clientSecret', enabledWithSecret)).toBe(false);

    const wechatWeb = createContext({ providerId: 'wechat' });
    expect(isFieldRequired('scope', wechatWeb)).toBe(true);
    expect(isFieldRequired('userinfoUrl', wechatWeb)).toBe(false);

    const wechatMini = createContext({ providerId: 'wechat', channel: 'mini' });
    expect(isFieldRequired('userinfoUrl', wechatMini)).toBe(true);
    expect(isFieldRequired('tokenUrl', wechatMini)).toBe(true);
    expect(isFieldRequired('configJson', wechatMini)).toBe(true);
    expect(isFieldRequired('redirectUri', wechatMini)).toBe(false);

    const disabled = createContext({ enabled: false });
    expect(isFieldRequired('clientId', disabled)).toBe(false);
    expect(isFieldRequired('clientSecret', disabled)).toBe(false);
    expect(isFieldRequired('redirectUri', disabled)).toBe(false);
    expect(isFieldRequired('providerId', disabled)).toBe(true);
  });

  it('rejects non-http(s) absolute addresses in URL fields', async () => {
    await expect(runValidators('redirectUri', 'ftp://example.com/callback')).rejects.toThrow(INVALID_URL_MESSAGE);
    await expect(runValidators('redirectUri', 'https://example.com/callback')).resolves.toBeUndefined();
    await expect(runValidators('configJson', 'api.weixin.qq.com/wxa', createContext({ providerId: 'wechat', channel: 'mini' })))
      .rejects.toThrow(INVALID_URL_MESSAGE);
  });

  it('accepts only same-site relative frontend callbacks', () => {
    expect(validateFrontendCallbackUri('/login/github-callback')).toBeNull();
    expect(validateFrontendCallbackUri('  /login/wechat-callback  ')).toBeNull();
    expect(validateFrontendCallbackUri('')).toBeNull();
    // 白名单入口已移除：绝对地址一律拒绝，避免开放跳转。
    expect(validateFrontendCallbackUri('https://admin.example.com/cb')).toBe(INVALID_FRONTEND_CALLBACK_MESSAGE);
    expect(validateFrontendCallbackUri('http://admin.example.com/cb')).toBe(INVALID_FRONTEND_CALLBACK_MESSAGE);
    expect(validateFrontendCallbackUri('//evil.example.com')).toBe(INVALID_FRONTEND_CALLBACK_MESSAGE);
    expect(validateFrontendCallbackUri('javascript:alert(1)')).toBe(INVALID_FRONTEND_CALLBACK_MESSAGE);
  });

  it('rejects absolute frontend callbacks through the field rule', async () => {
    await expect(runValidators('frontendCallbackUri', 'https://admin.example.com/cb'))
      .rejects.toThrow(INVALID_FRONTEND_CALLBACK_MESSAGE);
    await expect(runValidators('frontendCallbackUri', '//evil.example.com'))
      .rejects.toThrow(INVALID_FRONTEND_CALLBACK_MESSAGE);
    await expect(runValidators('frontendCallbackUri', 'javascript:alert(1)'))
      .rejects.toThrow(INVALID_FRONTEND_CALLBACK_MESSAGE);
    await expect(runValidators('frontendCallbackUri', '/login/github-callback')).resolves.toBeUndefined();
  });

  it('trims inputs, drops fields of other channels, and keeps the stored secret when left blank', () => {
    const githubPayload = toUpsertRequest({
      providerId: 'github',
      channel: 'web',
      enabled: true,
      clientId: ' Iv1.abc ',
      clientSecret: '   ',
      redirectUri: ' https://api.example.com/api/auth/github/callback ',
      scope: '',
      frontendCallbackUri: ' /login/github-callback ',
      configJson: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
    });
    expect(githubPayload).toEqual({
      providerId: 'github',
      channel: 'web',
      enabled: true,
      clientId: 'Iv1.abc',
      redirectUri: 'https://api.example.com/api/auth/github/callback',
      frontendCallbackUri: '/login/github-callback',
    });
    // 白名单已整体移除：请求体不再携带该字段。
    expect(githubPayload).not.toHaveProperty('frontendCallbackAllowlist');

    expect(toUpsertRequest({
      providerId: 'wechat',
      channel: 'mini',
      enabled: true,
      clientId: ' wx-mini ',
      clientSecret: ' secret ',
      redirectUri: 'https://api.example.com/api/auth/wechat/web/callback',
      scope: 'snsapi_login',
      frontendCallbackUri: '/login/wechat-callback',
      userinfoUrl: ' https://api.weixin.qq.com/sns/jscode2session ',
      tokenUrl: 'https://api.weixin.qq.com/cgi-bin/token',
      configJson: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
    })).toEqual({
      providerId: 'wechat',
      channel: 'mini',
      enabled: true,
      clientId: 'wx-mini',
      clientSecret: 'secret',
      userinfoUrl: 'https://api.weixin.qq.com/sns/jscode2session',
      tokenUrl: 'https://api.weixin.qq.com/cgi-bin/token',
      configJson: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
    });
  });

  it('maps a response row to form values without echoing the secret', () => {
    const row: TenantOAuth2Provider = {
      id: 'cfg-1',
      tenantId: 'tenant-1',
      providerId: 'wechat',
      channel: 'MINI',
      enabled: false,
      clientId: 'wx-mini',
      hasClientSecret: true,
      credentialComplete: false,
      missingFields: ['未启用'],
      userinfoUrl: 'https://api.weixin.qq.com/sns/jscode2session',
      configJson: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
    };

    expect(toFormValues(row)).toEqual({
      providerId: 'wechat',
      channel: 'mini',
      enabled: false,
      clientId: 'wx-mini',
      clientSecret: '',
      userinfoUrl: 'https://api.weixin.qq.com/sns/jscode2session',
      configJson: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
    });
    expect(toFormValues(null)).toEqual({ providerId: 'github', channel: 'web', enabled: true, clientSecret: '' });
  });
});

import { describe, expect, it } from 'vitest';
import type { NebulaExtraLoginBadge, AuthInitResp } from '@/types/auth';
import { getBuiltInLoginMethods, mergeLoginBadges } from './auth-methods';

describe('getBuiltInLoginMethods', () => {
  it('derives enabled built-in methods from auth config', () => {
    const config: Partial<AuthInitResp> = {
      usernameEnabled: true,
      phoneEnabled: false,
      emailEnabled: true,
      githubEnabled: true,
    };

    expect(getBuiltInLoginMethods(config)).toEqual(['password', 'email', 'github']);
  });

  it('returns only password when only usernameEnabled is true', () => {
    expect(
      getBuiltInLoginMethods({
        usernameEnabled: true,
        phoneEnabled: false,
        emailEnabled: false,
      }),
    ).toEqual(['password']);
  });

  it('returns only phone when only phoneEnabled is true', () => {
    expect(
      getBuiltInLoginMethods({
        usernameEnabled: false,
        phoneEnabled: true,
        emailEnabled: false,
      }),
    ).toEqual(['phone']);
  });

  it('returns empty array when nothing is enabled', () => {
    expect(
      getBuiltInLoginMethods({
        usernameEnabled: false,
        phoneEnabled: false,
        emailEnabled: false,
      }),
    ).toEqual([]);
  });

  it('includes github only when githubEnabled is true', () => {
    const result = getBuiltInLoginMethods({
      usernameEnabled: true,
      phoneEnabled: true,
      emailEnabled: true,
      githubEnabled: false,
    });

    expect(result).toEqual(['password', 'phone', 'email']);
    expect(result).not.toContain('github');
  });

  it('handles empty partial config with all flags undefined (treated as false)', () => {
    expect(getBuiltInLoginMethods({})).toEqual([]);
  });
});

describe('mergeLoginBadges', () => {
  const stubRender = () => null;

  it('appends extra login badge keys after built-in method keys', () => {
    const extraBadges: NebulaExtraLoginBadge[] = [
      { key: 'sso', label: 'SSO', render: stubRender },
    ];

    expect(mergeLoginBadges(['password'], extraBadges)).toEqual(['password', 'sso']);
  });

  it('deduplicates by key with built-in winning over extra', () => {
    const extraBadges: NebulaExtraLoginBadge[] = [
      { key: 'password', label: 'Custom Password', render: stubRender },
      { key: 'sso', label: 'SSO', render: stubRender },
    ];

    expect(mergeLoginBadges(['password'], extraBadges)).toEqual(['password', 'sso']);
  });

  it('returns only built-ins when extra badges is empty', () => {
    expect(mergeLoginBadges(['password', 'phone'], [])).toEqual(['password', 'phone']);
  });

  it('returns only extra badges when built-ins is empty', () => {
    const extraBadges: NebulaExtraLoginBadge[] = [
      { key: 'sso', label: 'SSO', render: stubRender },
    ];

    expect(mergeLoginBadges([], extraBadges)).toEqual(['sso']);
  });

  it('preserves built-in order and extra badge order', () => {
    const extraBadges: NebulaExtraLoginBadge[] = [
      { key: 'dingtalk', label: 'DingTalk', render: stubRender },
      { key: 'sso', label: 'SSO', render: stubRender },
    ];

    expect(mergeLoginBadges(['password', 'email'], extraBadges)).toEqual([
      'password',
      'email',
      'dingtalk',
      'sso',
    ]);
  });

  it('deduplicates multiple extra badges with same key keeping first occurrence', () => {
    const extraBadges: NebulaExtraLoginBadge[] = [
      { key: 'sso', label: 'SSO v1', render: stubRender },
      { key: 'sso', label: 'SSO v2', render: stubRender },
    ];

    expect(mergeLoginBadges([], extraBadges)).toEqual(['sso']);
  });
});

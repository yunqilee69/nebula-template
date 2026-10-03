import { describe, expect, it } from 'vitest';
import type { NotifyPreferenceResp } from '@/types/notify';
import { buildUpdatePayload, listChannelToggles, toggleChannel } from './notify-preference-helpers';

const preference: NotifyPreferenceResp = {
  categories: [
    {
      code: 'SECURITY',
      name: '安全与账号',
      mandatory: true,
      sort: 10,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'EMAIL', enabled: true, editable: false },
        { channel: 'PUSH', enabled: true, editable: false },
      ],
    },
    {
      code: 'TODO',
      name: '待办与审批',
      mandatory: false,
      sort: 20,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'PUSH', enabled: true, editable: true },
      ],
    },
  ],
};

describe('listChannelToggles', () => {
  it('flattens categories into channel toggles preserving order and editable flags', () => {
    const toggles = listChannelToggles(preference);

    expect(toggles.map((toggle) => `${toggle.categoryCode}:${toggle.channel}`)).toEqual([
      'SECURITY:SITE',
      'SECURITY:EMAIL',
      'SECURITY:PUSH',
      'TODO:SITE',
      'TODO:PUSH',
    ]);
    expect(toggles.find((toggle) => toggle.categoryCode === 'SECURITY')?.mandatory).toBe(true);
    expect(toggles.find((toggle) => toggle.categoryCode === 'SECURITY' && toggle.channel === 'EMAIL')?.editable).toBe(false);
    expect(toggles.find((toggle) => toggle.categoryCode === 'TODO' && toggle.channel === 'PUSH')?.editable).toBe(true);
  });

  it('returns an empty list for missing preference', () => {
    expect(listChannelToggles(undefined)).toEqual([]);
    expect(listChannelToggles(null)).toEqual([]);
  });
});

describe('toggleChannel', () => {
  it('flips an editable channel without touching other toggles', () => {
    const toggles = listChannelToggles(preference);

    const next = toggleChannel(toggles, 'TODO', 'PUSH', false);

    expect(next.find((toggle) => toggle.categoryCode === 'TODO' && toggle.channel === 'PUSH')?.enabled).toBe(false);
    expect(toggles.find((toggle) => toggle.categoryCode === 'TODO' && toggle.channel === 'PUSH')?.enabled).toBe(true);
    expect(next).not.toBe(toggles);
  });

  it('ignores changes to non-editable channels', () => {
    const toggles = listChannelToggles(preference);

    const next = toggleChannel(toggles, 'SECURITY', 'EMAIL', false);

    expect(next.find((toggle) => toggle.categoryCode === 'SECURITY' && toggle.channel === 'EMAIL')?.enabled).toBe(true);
  });
});

describe('buildUpdatePayload', () => {
  it('submits only editable items', () => {
    const toggles = toggleChannel(listChannelToggles(preference), 'TODO', 'PUSH', false);

    const payload = buildUpdatePayload(toggles);

    expect(payload).toEqual({ items: [{ categoryCode: 'TODO', channel: 'PUSH', enabled: false }] });
  });

  it('returns an empty item list when nothing is editable', () => {
    const toggles = listChannelToggles({
      categories: [
        {
          code: 'SECURITY',
          name: '安全与账号',
          mandatory: true,
          channels: [{ channel: 'SITE', enabled: true, editable: false }],
        },
      ],
    });

    expect(buildUpdatePayload(toggles)).toEqual({ items: [] });
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUnreadPoller } from '../src/notify/notify-service.ts';
import {
  buildUpdatePayload,
  isToggleEditable,
  listChannelToggles,
  toggleChannel,
} from '../src/notify/preferences.ts';
import {
  MAX_NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_IDS,
  channelIdForCategory,
  listNotificationChannels,
} from '../src/notify/push-channel-ids.ts';
import type { NotifyPreferenceResp } from '../../packages/client-sdk/index.ts';

const PREFERENCE: NotifyPreferenceResp = {
  categories: [
    {
      code: 'SECURITY',
      name: '安全与账号',
      mandatory: true,
      sort: 10,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'EMAIL', enabled: true, editable: false },
      ],
    },
    {
      code: 'BUSINESS',
      name: '业务提醒',
      sort: 30,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'PUSH', enabled: false, editable: true },
      ],
    },
  ],
};

test('NotifyTest.testUnreadPoller', async () => {
  let captured: (() => void) | null = null;
  let cleared = 0;
  let fetchCount = 0;
  const counts: number[] = [];

  const poller = createUnreadPoller({
    fetchUnread: async () => {
      fetchCount += 1;
      return fetchCount;
    },
    onCount: (count) => counts.push(count),
    intervalMs: 1000,
    setIntervalFn: (handler) => {
      captured = handler;
      return 1;
    },
    clearIntervalFn: () => {
      cleared += 1;
    },
  });

  poller.start();
  assert.equal(poller.isRunning(), true);
  assert.equal(fetchCount, 1, 'start 立即拉取一次');

  (captured as unknown as () => void)();
  await new Promise((resolve) => setTimeout(resolve, 0));
  poller.stop();

  assert.equal(fetchCount, 2);
  assert.deepEqual(counts, [1, 2]);
  assert.equal(cleared, 1);
  assert.equal(poller.isRunning(), false);
});

test('NotifyTest.testMandatoryCategoryChannelNotEditable', () => {
  const toggles = listChannelToggles(PREFERENCE);
  const securitySite = toggles.find((item) => item.categoryCode === 'SECURITY' && item.channel === 'SITE')!;
  assert.equal(securitySite.mandatory, true);
  assert.equal(securitySite.editable, false);
  assert.equal(isToggleEditable(PREFERENCE, 'SECURITY', 'SITE'), false);
});

test('NotifyTest.testToggleOnlyEditableChannel', () => {
  const unchanged = toggleChannel(PREFERENCE, 'SECURITY', 'SITE', false);
  assert.equal(unchanged, PREFERENCE, '不可编辑项不得产生变更');

  const changed = toggleChannel(PREFERENCE, 'BUSINESS', 'PUSH', true);
  const businessPush = listChannelToggles(changed).find(
    (item) => item.categoryCode === 'BUSINESS' && item.channel === 'PUSH',
  )!;
  assert.equal(businessPush.enabled, true);
});

test('NotifyTest.testBuildUpdatePayloadOnlyEditable', () => {
  const payload = buildUpdatePayload(PREFERENCE);
  assert.equal(payload.items?.length, 1);
  assert.deepEqual(payload.items?.[0], {
    categoryCode: 'BUSINESS',
    channel: 'PUSH',
    enabled: false,
  });
  assert.deepEqual(Object.keys(payload), ['items']);
});

test('NotifyTest.testNotificationChannelIdsAreStableAndBounded', () => {
  const channels = listNotificationChannels();
  assert.ok(channels.length <= MAX_NOTIFICATION_CHANNELS, '渠道总数必须 ≤ 7');
  const ids = channels.map((channel) => channel.id);
  assert.equal(new Set(ids).size, ids.length, '渠道 ID 必须唯一');
  assert.equal(channelIdForCategory('BUSINESS'), NOTIFICATION_CHANNEL_IDS.BUSINESS);
  assert.equal(channelIdForCategory('UNKNOWN_CODE'), NOTIFICATION_CHANNEL_IDS.DEFAULT);
  assert.equal(channelIdForCategory(undefined), NOTIFICATION_CHANNEL_IDS.DEFAULT);
});

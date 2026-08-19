import { describe, expect, it, vi } from 'vitest';
import type { AuthManagementService } from '@/api/auth-management';
import type { ReceiverItem } from '@/types/notify';
import type { UserResp } from '@/types/auth-management';
import {
  createSendPlan,
  extractCustomTemplateVariables,
  loadAllUsersForSource,
  mergeReceiverUsers,
} from './send-page-helpers';

const userA: UserResp = {
  id: 'user-a',
  username: 'alice',
  nickname: 'Alice',
  email: 'alice@example.com',
  status: 1,
};

const userB: UserResp = {
  id: 'user-b',
  username: 'bob',
  nickname: 'Bob',
  status: 1,
};

const userC: UserResp = {
  id: 'user-c',
  username: 'carol',
  nickname: 'Carol',
  email: 'carol@example.com',
  status: 1,
};

function receiverItem(
  sourceType: ReceiverItem['sourceType'],
  sourceId: string,
  users: readonly UserResp[],
): ReceiverItem {
  return { sourceType, sourceId, sourceName: sourceId, users };
}

describe('send page helpers', () => {
  it('keeps a single selected user', () => {
    // Given
    const items = [receiverItem('USER', userA.id, [userA])];

    // When
    const users = mergeReceiverUsers(items);

    // Then
    expect(users).toEqual([userA]);
  });

  it('deduplicates multiple sources by user ID while preserving first-selection order', () => {
    // Given
    const items = [
      receiverItem('ROLE', 'role-a', [userB, userA]),
      receiverItem('ROLE', 'role-b', [userA, userC]),
    ];

    // When
    const users = mergeReceiverUsers(items);

    // Then
    expect(users.map((user) => user.id)).toEqual(['user-b', 'user-a', 'user-c']);
  });

  it('deduplicates mixed USER, ROLE, and ORG selections in source order', () => {
    // Given
    const items = [
      receiverItem('USER', userC.id, [userC]),
      receiverItem('ROLE', 'role-a', [userA, userC]),
      receiverItem('ORG', 'org-a', [userB, userA]),
    ];

    // When
    const users = mergeReceiverUsers(items);

    // Then
    expect(users.map((user) => user.id)).toEqual(['user-c', 'user-a', 'user-b']);
  });

  it.each([
    { channels: [], items: [receiverItem('USER', userA.id, [userA])], reason: 'CHANNELS_REQUIRED' },
    { channels: ['SITE'], items: [], reason: 'RECIPIENTS_REQUIRED' },
    { channels: ['EMAIL'], items: [receiverItem('USER', userB.id, [userB])], reason: 'EMAIL_RECIPIENTS_REQUIRED' },
  ] as const)('rejects invalid send input with $reason', ({ channels, items, reason }) => {
    // Given / When
    const plan = createSendPlan({
      channelTypes: channels,
      receiverItems: items,
      templateCode: 'WELCOME',
      templateParams: {},
    });

    // Then
    expect(plan).toEqual({ kind: 'INVALID', reason });
  });

  it('builds exact SITE and EMAIL counts while excluding users without email', () => {
    // Given
    const items = [receiverItem('ROLE', 'role-a', [userA, userB, userC])];

    // When
    const plan = createSendPlan({
      channelTypes: ['SITE', 'EMAIL'],
      receiverItems: items,
      templateCode: 'WELCOME',
      templateParams: { name: 'Nebula' },
    });

    // Then
    expect(plan).toEqual({
      kind: 'VALID',
      request: {
        channelTypes: ['SITE', 'EMAIL'],
        templateCode: 'WELCOME',
        templateParams: { name: 'Nebula' },
        receiverUserIds: ['user-a', 'user-b', 'user-c'],
      },
      counts: {
        channelCount: 2,
        selectedUserCount: 3,
        siteRecipientCount: 3,
        emailRecipientCount: 2,
        emailExcludedCount: 1,
        wecomTargetCount: 0,
        feishuTargetCount: 0,
        dingtalkTargetCount: 0,
      },
    });
  });

  it('extracts custom template variables once and excludes notify built-ins', () => {
    // Given / When
    const variables = extractCustomTemplateVariables(
      '${title}-${notify.currentDate}-${title}',
      'Hello ${name}, ${notify.receiverUserId}',
    );

    // Then
    expect(variables).toEqual(['title', 'name']);
  });

  it('loads every role page in backend order', async () => {
    // Given
    const pageUsers = vi.fn<AuthManagementService['pageUsers']>()
      .mockResolvedValueOnce({ data: [userA, userB], total: 3 })
      .mockResolvedValueOnce({ data: [userC], total: 3 });

    // When
    const users = await loadAllUsersForSource(
      { pageUsers },
      { sourceType: 'ROLE', sourceId: 'role-a', pageSize: 2 },
    );

    // Then
    expect(pageUsers).toHaveBeenNthCalledWith(1, { pageNum: 1, pageSize: 2, roleId: 'role-a' });
    expect(pageUsers).toHaveBeenNthCalledWith(2, { pageNum: 2, pageSize: 2, roleId: 'role-a' });
    expect(users).toEqual([userA, userB, userC]);
  });
});

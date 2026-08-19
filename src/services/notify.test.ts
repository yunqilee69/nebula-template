import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import type { NotifySendResultList } from '@/types/notify';
import { notifyService } from './notify';

const mockedRequest = vi.mocked(request);

beforeEach(() => vi.clearAllMocks());

describe('notifyService', () => {
  const endpointCases = [
    {
      name: 'creates an announcement',
      execute: () => notifyService.createAnnouncement({ title: 'Maintenance', content: 'Tonight', targetType: 'ALL' }),
      expected: {
        method: 'POST', url: '/api/notify/announcements',
        data: { title: 'Maintenance', content: 'Tonight', targetType: 'ALL' },
      },
    },
    {
      name: 'updates an announcement by path ID',
      execute: () => notifyService.updateAnnouncement('announcement-1', {
        title: 'Updated maintenance',
        content: 'Tomorrow',
        targetType: 'ROLE',
        targetValues: ['role-1'],
      }),
      expected: {
        method: 'PUT',
        url: '/api/notify/announcements/announcement-1',
        data: {
          title: 'Updated maintenance',
          content: 'Tomorrow',
          targetType: 'ROLE',
          targetValues: ['role-1'],
        },
      },
    },
    {
      name: 'deletes an announcement by path ID',
      execute: () => notifyService.deleteAnnouncement('announcement-1'),
      expected: { method: 'DELETE', url: '/api/notify/announcements/announcement-1' },
    },
    {
      name: 'gets announcement detail by path ID',
      execute: () => notifyService.getAnnouncement('announcement-1'),
      expected: { method: 'GET', url: '/api/notify/announcements/announcement-1' },
    },
    {
      name: 'pages administrative announcements in the request body',
      execute: () => notifyService.pageAnnouncements({ pageNum: 2, pageSize: 20, status: 1 }),
      expected: { method: 'POST', url: '/api/notify/announcements/page', data: { pageNum: 2, pageSize: 20, status: 1 } },
    },
    {
      name: 'pages current-user announcements in the request body',
      execute: () => notifyService.pageCurrentAnnouncements({ pageNum: 1, pageSize: 10, readStatus: false }),
      expected: { method: 'POST', url: '/api/notify/announcements/current/page', data: { pageNum: 1, pageSize: 10, readStatus: false } },
    },
    {
      name: 'lists current popup announcements',
      execute: () => notifyService.listCurrentPopupAnnouncements(),
      expected: { method: 'GET', url: '/api/notify/announcements/current/popup' },
    },
    {
      name: 'marks an announcement read by path ID',
      execute: () => notifyService.markAnnouncementRead('announcement-1'),
      expected: { method: 'PUT', url: '/api/notify/announcements/announcement-1/read' },
    },
    {
      name: 'creates a notification template',
      execute: () => notifyService.createNotifyTemplate({
        templateCode: 'ORDER_PAID',
        templateName: 'Order paid',
      }),
      expected: {
        method: 'POST',
        url: '/api/notify/templates',
        data: {
          templateCode: 'ORDER_PAID',
          templateName: 'Order paid',
        },
      },
    },
    {
      name: 'updates a notification template by path ID',
      execute: () => notifyService.updateNotifyTemplate('template-1', {
        templateName: 'Order paid update',
        variants: [{ channelType: 'EMAIL', contentTemplate: 'Updated ${orderNo}' }],
      }),
      expected: { method: 'PUT', url: '/api/notify/templates/template-1', data: {
        templateName: 'Order paid update',
        variants: [{ channelType: 'EMAIL', contentTemplate: 'Updated ${orderNo}' }],
      } },
    },
    {
      name: 'deletes a notification template by path ID',
      execute: () => notifyService.deleteNotifyTemplate('template-1'),
      expected: { method: 'DELETE', url: '/api/notify/templates/template-1' },
    },
    {
      name: 'gets notification template detail by path ID',
      execute: () => notifyService.getNotifyTemplate('template-1'),
      expected: { method: 'GET', url: '/api/notify/templates/template-1' },
    },
    {
      name: 'pages notification templates in the request body',
      execute: () => notifyService.pageNotifyTemplates({ pageNum: 1, pageSize: 10, channelType: 'EMAIL' }),
      expected: {
        method: 'POST', url: '/api/notify/templates/page',
        data: { pageNum: 1, pageSize: 10, channelType: 'EMAIL' },
      },
    },
    {
      name: 'creates a notification channel target',
      execute: () => notifyService.createNotifyChannelTarget({
        targetName: 'Ops Group',
        channelType: 'WECOM_GROUP_WEBHOOK',
        endpointUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret',
        configJson: '{"rateLimit":20}',
      }),
      expected: {
        method: 'POST',
        url: '/api/notify/channel-targets',
        data: {
          targetName: 'Ops Group',
          channelType: 'WECOM_GROUP_WEBHOOK',
          endpointUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret',
          configJson: '{"rateLimit":20}',
        },
      },
    },
    {
      name: 'updates a notification channel target by path ID',
      execute: () => notifyService.updateNotifyChannelTarget('target-1', {
        targetName: 'Ops Group Updated',
        channelType: 'WECOM_GROUP_WEBHOOK',
        endpointUrl: 'https://example.test/webhook',
      }),
      expected: {
        method: 'PUT',
        url: '/api/notify/channel-targets/target-1',
        data: {
          targetName: 'Ops Group Updated',
          channelType: 'WECOM_GROUP_WEBHOOK',
          endpointUrl: 'https://example.test/webhook',
        },
      },
    },
    {
      name: 'deletes a notification channel target by path ID',
      execute: () => notifyService.deleteNotifyChannelTarget('target-1'),
      expected: { method: 'DELETE', url: '/api/notify/channel-targets/target-1' },
    },
    {
      name: 'gets notification channel target detail by path ID',
      execute: () => notifyService.getNotifyChannelTarget('target-1'),
      expected: { method: 'GET', url: '/api/notify/channel-targets/target-1' },
    },
    {
      name: 'pages notification channel targets in the request body',
      execute: () => notifyService.pageNotifyChannelTargets({
        pageNum: 1,
        pageSize: 10,
        channelType: 'WECOM_GROUP_WEBHOOK',
      }),
      expected: {
        method: 'POST',
        url: '/api/notify/channel-targets/page',
        data: { pageNum: 1, pageSize: 10, channelType: 'WECOM_GROUP_WEBHOOK' },
      },
    },
    {
      name: 'sends one notification batch in the request body',
      execute: () => notifyService.sendNotify({
        channelTypes: ['SITE', 'EMAIL'],
        receiverUserIds: ['user-1', 'user-2'],
        content: 'Deployment complete',
      }),
      expected: {
        method: 'POST',
        url: '/api/notify/send',
        data: {
          channelTypes: ['SITE', 'EMAIL'],
          receiverUserIds: ['user-1', 'user-2'],
          content: 'Deployment complete',
        },
      },
    },
    {
      name: 'tests SMTP email configuration in the request body',
      execute: () => notifyService.testEmailNotify({
        receiver: 'admin@example.com',
        subject: 'SMTP测试',
        content: '这是一封SMTP配置测试邮件',
      }),
      expected: {
        method: 'POST',
        url: '/api/notify/email/test',
        data: {
          receiver: 'admin@example.com',
          subject: 'SMTP测试',
          content: '这是一封SMTP配置测试邮件',
        },
      },
    },
    {
      name: 'gets notification record detail by path ID',
      execute: () => notifyService.getNotifyRecord('record-1'),
      expected: { method: 'GET', url: '/api/notify/records/record-1' },
    },
    {
      name: 'pages notification records in the request body',
      execute: () => notifyService.pageNotifyRecords({ pageNum: 3, pageSize: 10, sendStatus: 'FAILED' }),
      expected: {
        method: 'POST', url: '/api/notify/records/page',
        data: { pageNum: 3, pageSize: 10, sendStatus: 'FAILED' },
      },
    },
    {
      name: 'pages site messages in the request body',
      execute: () => notifyService.pageSiteMessages({ pageNum: 1, pageSize: 20, readStatus: false }),
      expected: {
        method: 'POST', url: '/api/notify/site-messages/page',
        data: { pageNum: 1, pageSize: 20, readStatus: false },
      },
    },
    {
      name: 'gets the current-user unread site-message count',
      execute: () => notifyService.getUnreadSiteMessageCount(),
      expected: { method: 'GET', url: '/api/notify/site-messages/unread-count' },
    },
    {
      name: 'marks a site message read by path ID',
      execute: () => notifyService.markSiteMessageRead('message-1'),
      expected: { method: 'PUT', url: '/api/notify/site-messages/message-1/read' },
    },
    {
      name: 'marks a site message unread by path ID',
      execute: () => notifyService.markSiteMessageUnread('message-1'),
      expected: { method: 'PUT', url: '/api/notify/site-messages/message-1/unread' },
    },
    {
      name: 'marks selected site messages read in one request body',
      execute: () => notifyService.markSiteMessagesRead(['message-1', 'message-2']),
      expected: { method: 'PUT', url: '/api/notify/site-messages/read', data: { ids: ['message-1', 'message-2'] } },
    },
    {
      name: 'marks selected site messages unread in one request body',
      execute: () => notifyService.markSiteMessagesUnread(['message-1', 'message-2']),
      expected: { method: 'PUT', url: '/api/notify/site-messages/unread', data: { ids: ['message-1', 'message-2'] } },
    },
    {
      name: 'deletes a site message by path ID',
      execute: () => notifyService.deleteSiteMessage('message-1'),
      expected: { method: 'DELETE', url: '/api/notify/site-messages/message-1' },
    },
  ] as const;

  it.each(endpointCases)('$name', async ({ execute, expected }) => {
    mockedRequest.mockResolvedValue(undefined);

    await execute();

    expect(mockedRequest).toHaveBeenCalledOnce();
    expect(mockedRequest).toHaveBeenCalledWith(expected);
  });

  it('passes the ordered batch send result list through unchanged', async () => {
    const orderedResults: NotifySendResultList = [
      {
        recordId: 'record-site-1',
        siteMessageId: 'message-1',
        channelType: 'SITE',
        receiver: 'user-1',
        sendStatus: 'SUCCESS',
      },
      {
        recordId: 'record-email-1',
        channelType: 'EMAIL',
        receiver: 'team@example.com',
        sendStatus: 'FAILED',
        failReason: 'SMTP unavailable',
      },
    ];
    mockedRequest.mockResolvedValue(orderedResults);

    const result = await notifyService.sendNotify({
      channelTypes: ['SITE', 'EMAIL'],
      receiverUserIds: ['user-1'],
      content: 'Deployment complete',
    });

    expect(result).toBe(orderedResults);
  });
});

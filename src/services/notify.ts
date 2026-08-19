import type { NebulaPageResp } from '@/components/nebula-pro-table/params';
import { request } from '@/request/request';
import type {
  AnnouncementDetailResp,
  AnnouncementPageReq,
  AnnouncementResp,
  CreateAnnouncementReq,
  CreateNotifyChannelTargetReq,
  CreateNotifyTemplateReq,
  CurrentAnnouncementPageReq,
  CurrentAnnouncementResp,
  NotifyChannelTargetPageReq,
  NotifyChannelTargetResp,
  NotifyRecordDetailResp,
  NotifyRecordPageReq,
  NotifyRecordResp,
  NotifySendResultList,
  NotifyTemplateDetailResp,
  NotifyTemplatePageReq,
  NotifyTemplateResp,
  SendNotifyReq,
  SiteMessageReadStatusBatchReq,
  SiteMessagePageReq,
  TestEmailNotifyReq,
  SiteMessageResp,
  UnreadSiteMessageCount,
  UpdateAnnouncementReq,
  UpdateNotifyChannelTargetReq,
  UpdateNotifyTemplateReq,
} from '@/types/notify';

export interface NotifyService {
  readonly createAnnouncement: (data: CreateAnnouncementReq) => Promise<string>;
  readonly updateAnnouncement: (id: string, data: UpdateAnnouncementReq) => Promise<string>;
  readonly deleteAnnouncement: (id: string) => Promise<void>;
  readonly getAnnouncement: (id: string) => Promise<AnnouncementDetailResp>;
  readonly pageAnnouncements: (data: AnnouncementPageReq) => Promise<NebulaPageResp<AnnouncementResp>>;
  readonly pageCurrentAnnouncements: (
    data: CurrentAnnouncementPageReq,
  ) => Promise<NebulaPageResp<CurrentAnnouncementResp>>;
  readonly listCurrentPopupAnnouncements: () => Promise<readonly CurrentAnnouncementResp[]>;
  readonly markAnnouncementRead: (id: string) => Promise<void>;
  readonly createNotifyTemplate: (data: CreateNotifyTemplateReq) => Promise<string>;
  readonly updateNotifyTemplate: (id: string, data: UpdateNotifyTemplateReq) => Promise<string>;
  readonly deleteNotifyTemplate: (id: string) => Promise<void>;
  readonly getNotifyTemplate: (id: string) => Promise<NotifyTemplateDetailResp>;
  readonly pageNotifyTemplates: (data: NotifyTemplatePageReq) => Promise<NebulaPageResp<NotifyTemplateResp>>;
  readonly createNotifyChannelTarget: (data: CreateNotifyChannelTargetReq) => Promise<string>;
  readonly updateNotifyChannelTarget: (id: string, data: UpdateNotifyChannelTargetReq) => Promise<string>;
  readonly deleteNotifyChannelTarget: (id: string) => Promise<void>;
  readonly getNotifyChannelTarget: (id: string) => Promise<NotifyChannelTargetResp>;
  readonly pageNotifyChannelTargets: (
    data: NotifyChannelTargetPageReq,
  ) => Promise<NebulaPageResp<NotifyChannelTargetResp>>;
  readonly sendNotify: (data: SendNotifyReq) => Promise<NotifySendResultList>;
  readonly testEmailNotify: (data: TestEmailNotifyReq) => Promise<void>;
  readonly getNotifyRecord: (id: string) => Promise<NotifyRecordDetailResp>;
  readonly pageNotifyRecords: (data: NotifyRecordPageReq) => Promise<NebulaPageResp<NotifyRecordResp>>;
  readonly pageSiteMessages: (data: SiteMessagePageReq) => Promise<NebulaPageResp<SiteMessageResp>>;
  readonly getUnreadSiteMessageCount: () => Promise<UnreadSiteMessageCount>;
  readonly markSiteMessageRead: (id: string) => Promise<void>;
  readonly markSiteMessageUnread: (id: string) => Promise<void>;
  readonly markSiteMessagesRead: (ids: readonly string[]) => Promise<void>;
  readonly markSiteMessagesUnread: (ids: readonly string[]) => Promise<void>;
  readonly deleteSiteMessage: (id: string) => Promise<void>;
  readonly removeSiteMessage: (id: string) => Promise<void>;
}

function buildSiteMessageReadStatusBatchReq(ids: readonly string[]): SiteMessageReadStatusBatchReq {
  return { ids };
}

export const notifyService: NotifyService = {
  createAnnouncement: (data) =>
    request<string>({ method: 'POST', url: '/api/notify/announcements', data }),
  updateAnnouncement: (id, data) =>
    request<string>({ method: 'PUT', url: `/api/notify/announcements/${id}`, data }),
  deleteAnnouncement: (id) =>
    request<void>({ method: 'DELETE', url: `/api/notify/announcements/${id}` }),
  getAnnouncement: (id) =>
    request<AnnouncementDetailResp>({ method: 'GET', url: `/api/notify/announcements/${id}` }),
  pageAnnouncements: (data) =>
    request<NebulaPageResp<AnnouncementResp>>({ method: 'POST', url: '/api/notify/announcements/page', data }),
  pageCurrentAnnouncements: (data) =>
    request<NebulaPageResp<CurrentAnnouncementResp>>({
      method: 'POST',
      url: '/api/notify/announcements/current/page',
      data,
    }),
  listCurrentPopupAnnouncements: () =>
    request<readonly CurrentAnnouncementResp[]>({
      method: 'GET',
      url: '/api/notify/announcements/current/popup',
    }),
  markAnnouncementRead: (id) =>
    request<void>({ method: 'PUT', url: `/api/notify/announcements/${id}/read` }),
  createNotifyTemplate: (data) =>
    request<string>({ method: 'POST', url: '/api/notify/templates', data }),
  updateNotifyTemplate: (id, data) =>
    request<string>({ method: 'PUT', url: `/api/notify/templates/${id}`, data }),
  deleteNotifyTemplate: (id) =>
    request<void>({ method: 'DELETE', url: `/api/notify/templates/${id}` }),
  getNotifyTemplate: (id) =>
    request<NotifyTemplateDetailResp>({ method: 'GET', url: `/api/notify/templates/${id}` }),
  pageNotifyTemplates: (data) =>
    request<NebulaPageResp<NotifyTemplateResp>>({ method: 'POST', url: '/api/notify/templates/page', data }),
  createNotifyChannelTarget: (data) =>
    request<string>({ method: 'POST', url: '/api/notify/channel-targets', data }),
  updateNotifyChannelTarget: (id, data) =>
    request<string>({ method: 'PUT', url: `/api/notify/channel-targets/${id}`, data }),
  deleteNotifyChannelTarget: (id) =>
    request<void>({ method: 'DELETE', url: `/api/notify/channel-targets/${id}` }),
  getNotifyChannelTarget: (id) =>
    request<NotifyChannelTargetResp>({ method: 'GET', url: `/api/notify/channel-targets/${id}` }),
  pageNotifyChannelTargets: (data) =>
    request<NebulaPageResp<NotifyChannelTargetResp>>({
      method: 'POST',
      url: '/api/notify/channel-targets/page',
      data,
    }),
  sendNotify: (data) =>
    request<NotifySendResultList>({ method: 'POST', url: '/api/notify/send', data }),
  testEmailNotify: (data) =>
    request<void>({ method: 'POST', url: '/api/notify/email/test', data }),
  getNotifyRecord: (id) =>
    request<NotifyRecordDetailResp>({ method: 'GET', url: `/api/notify/records/${id}` }),
  pageNotifyRecords: (data) =>
    request<NebulaPageResp<NotifyRecordResp>>({ method: 'POST', url: '/api/notify/records/page', data }),
  pageSiteMessages: (data) =>
    request<NebulaPageResp<SiteMessageResp>>({ method: 'POST', url: '/api/notify/site-messages/page', data }),
  getUnreadSiteMessageCount: () =>
    request<UnreadSiteMessageCount>({ method: 'GET', url: '/api/notify/site-messages/unread-count' }),
  markSiteMessageRead: (id) =>
    request<void>({ method: 'PUT', url: `/api/notify/site-messages/${id}/read` }),
  markSiteMessageUnread: (id) =>
    request<void>({ method: 'PUT', url: `/api/notify/site-messages/${id}/unread` }),
  markSiteMessagesRead: (ids) =>
    request<void>({ method: 'PUT', url: '/api/notify/site-messages/read', data: buildSiteMessageReadStatusBatchReq(ids) }),
  markSiteMessagesUnread: (ids) =>
    request<void>({ method: 'PUT', url: '/api/notify/site-messages/unread', data: buildSiteMessageReadStatusBatchReq(ids) }),
  deleteSiteMessage: (id) =>
    request<void>({ method: 'DELETE', url: `/api/notify/site-messages/${id}` }),
  removeSiteMessage: (id) =>
    request<void>({ method: 'DELETE', url: `/api/notify/site-messages/${id}` }),
};

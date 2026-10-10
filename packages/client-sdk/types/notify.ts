/**
 * 站内信、公告与通知偏好契约，对应后端 `nebula-notify` 的 Req/Resp。
 *
 * <p>来源：`SiteMessageResp`、`SiteMessagePageReq`、`SiteMessageCategoryResp`、
 * `MarkAllSiteMessagesReadReq`、`AnnouncementResp`、`CurrentAnnouncementResp`、
 * `CurrentAnnouncementPageReq`、`NotifyPreferenceResp`、`NotifyCategoryPreferenceResp`、
 * `NotifyChannelPreferenceResp`、`NotifyPreferenceItemReq`、`UpdateNotifyPreferenceReq`。</p>
 */
import type { BasePageReq } from './api.ts';
import type { NotifyCategory, NotifyChannel } from './enums.ts';

/** 站内信分页项。 */
export interface SiteMessageResp {
  id: string;
  recordId?: string;
  receiverUserId?: string;
  title?: string;
  content?: string;
  /** 通知类别 code，落库时随发送记录冗余。 */
  categoryCode?: string;
  /** 通知类别名称，由服务端按类别表补齐。 */
  categoryName?: string;
  readStatus?: boolean;
  readTime?: string;
  createTime?: string;
  updateTime?: string;
}

/** 站内信分页请求。 */
export interface SiteMessagePageReq extends BasePageReq {
  receiverUserId?: string;
  readStatus?: boolean;
  categoryCode?: string;
  createTimeFrom?: string;
  createTimeTo?: string;
}

/** 当前用户站内信的类别聚合项。 */
export interface SiteMessageCategoryResp {
  code: string;
  name?: string;
  totalCount?: number;
  unreadCount?: number;
}

/** 全部标记已读请求：省略 `categoryCode` 表示全部类别。 */
export interface MarkAllSiteMessagesReadReq {
  categoryCode?: string;
}

/** 公告分页项（管理端）。 */
export interface AnnouncementResp {
  id: string;
  title?: string;
  status?: number;
  publishTime?: string;
  expireTime?: string;
  pinned?: boolean;
  sortNum?: number;
  popup?: boolean;
  targetType?: string;
  targetValues?: string[];
  createTime?: string;
  updateTime?: string;
}

/** 当前用户可见公告，附带已读状态。 */
export interface CurrentAnnouncementResp {
  id: string;
  title?: string;
  content?: string;
  publishTime?: string;
  expireTime?: string;
  pinned?: boolean;
  sortNum?: number;
  popup?: boolean;
  readStatus?: boolean;
  readTime?: string;
  createTime?: string;
  updateTime?: string;
}

/** 当前用户公告分页请求。 */
export interface CurrentAnnouncementPageReq extends BasePageReq {
  readStatus?: boolean;
  popup?: boolean;
}

/** 类别下的渠道开关。 */
export interface NotifyChannelPreferenceResp {
  channel: NotifyChannel | string;
  enabled?: boolean;
  /** 客户端必须据此置灰，不要自行判断 mandatory。 */
  editable?: boolean;
}

/** 类别偏好状态。 */
export interface NotifyCategoryPreferenceResp {
  code: NotifyCategory | string;
  name?: string;
  description?: string;
  /** 强制类别整组不可编辑。 */
  mandatory?: boolean;
  sort?: number;
  channels?: NotifyChannelPreferenceResp[];
}

/** 当前用户通知偏好。查询/更新/重置返回同一结构。 */
export interface NotifyPreferenceResp {
  categories?: NotifyCategoryPreferenceResp[];
}

/** 偏好单项请求（类别 × 渠道）。 */
export interface NotifyPreferenceItemReq {
  categoryCode: string;
  channel: string;
  enabled: boolean;
}

/** 更新偏好请求；`items` 为空表示不改动任何开关。 */
export interface UpdateNotifyPreferenceReq {
  items?: NotifyPreferenceItemReq[];
}

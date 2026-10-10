import type { ReactNode } from 'react';
import type { NebulaPageResp } from '@/components/nebula-pro-table';
import type { NotifyService } from '@/services/notify';
import type { SiteMessagePageReq, SiteMessageResp } from '@/types/notify';

/** 列表顶部的已读状态筛选。 */
export type SiteMessageFilter = 'all' | 'unread';

export interface SiteMessageListService {
  readonly pageSiteMessages: (data: SiteMessagePageReq) => Promise<NebulaPageResp<SiteMessageResp>>;
  readonly listSiteMessageCategories: NotifyService['listSiteMessageCategories'];
  readonly markAllSiteMessagesRead: NotifyService['markAllSiteMessagesRead'];
  readonly markSiteMessageRead: NotifyService['markSiteMessageRead'];
  readonly markSiteMessageUnread: NotifyService['markSiteMessageUnread'];
  readonly deleteSiteMessage: NotifyService['deleteSiteMessage'];
}

export interface SiteMessageListProps {
  readonly service: SiteMessageListService;
  /** 当前登录用户 id；为空时不发请求，直接展示空态。 */
  readonly receiverUserId: string | undefined;
  /** 点击某条消息。由使用方决定是切详情视图还是弹窗。 */
  readonly onSelect: (message: SiteMessageResp) => void;
  /** 当前选中的消息 id，用于高亮。 */
  readonly selectedMessageId?: string;
  /** 每页条数，默认 10。 */
  readonly pageSize?: number;
  /**
   * 是否显示单条「标记未读 / 删除」动作。
   * 面板空间狭窄且面向「看一眼」，默认关闭；全文页需要管理能力时打开。
   */
  readonly showMessageActions?: boolean;
  /** 是否支持勾选与批量操作。默认关闭，面板用不到。 */
  readonly selectable?: boolean;
  /**
   * 批量操作区内容，仅在 `selectable` 且存在选中项时渲染。
   * 列表只负责勾选状态，具体动作（批量已读/未读/删除）由使用方决定。
   */
  readonly renderBatchActions?: (selected: readonly SiteMessageResp[], clearSelection: () => void) => ReactNode;
  /** 值变化即重新从第一页拉取，供使用方主动刷新。 */
  readonly reloadToken?: number;
  /** 列表数据变化时回调，供使用方派生「当前选中消息」等。 */
  readonly onDataLoaded?: (messages: readonly SiteMessageResp[]) => void;
}

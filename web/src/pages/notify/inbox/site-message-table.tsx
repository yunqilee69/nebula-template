import { CheckOutlined, CloseOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Popconfirm, Space, Tag, Typography } from 'antd';
import type { Key } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import type { NotifyService } from '@/services/notify';
import type { SiteMessagePageReq, SiteMessageResp } from '@/types/notify';

export interface SiteMessageTableQuery {
  readonly readStatus?: boolean | string;
  readonly createTimeRange?: readonly [string | undefined, string | undefined];
}

export interface SiteMessageTableHandle {
  readonly reload: () => Promise<void>;
}

interface SiteMessageTableProps {
  readonly currentUserId: string | undefined;
  readonly selectedMessageId?: string;
  readonly deletingMessageId?: string;
  readonly pendingReadStatusAction?: 'read' | 'unread';
  readonly service: Pick<NotifyService, 'pageSiteMessages'>;
  readonly onDataLoaded?: (messages: readonly SiteMessageResp[]) => void;
  readonly onDelete: (message: SiteMessageResp) => void;
  readonly onMarkRead: (messages: readonly SiteMessageResp[]) => void;
  readonly onMarkUnread: (messages: readonly SiteMessageResp[]) => void;
  readonly onSelect: (message: SiteMessageResp) => void;
}

function normalizeDateTime(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace('T', ' ');
  return normalized || undefined;
}

function normalizeReadStatus(value: SiteMessageTableQuery['readStatus']): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function buildContentPreview(content: string): string {
  return content.length > 20 ? `${content.slice(0, 20)}...` : content;
}

function isTableControlClick(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, a, input, label, [role="button"], .ant-table-selection-column'));
}

export function buildSiteMessagePageReq(
  params: SiteMessageTableQuery & NebulaPageReq,
  receiverUserId: string,
): SiteMessagePageReq {
  const [createTimeStart, createTimeEnd] = params.createTimeRange ?? [];
  const readStatus = normalizeReadStatus(params.readStatus);
  const createTimeFrom = normalizeDateTime(createTimeStart);
  const createTimeTo = normalizeDateTime(createTimeEnd);

  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
    receiverUserId,
    ...(readStatus === undefined ? {} : { readStatus }),
    ...(createTimeFrom ? { createTimeFrom } : {}),
    ...(createTimeTo ? { createTimeTo } : {}),
  };
}

export const SiteMessageTable = forwardRef<SiteMessageTableHandle, SiteMessageTableProps>(
  function SiteMessageTable({ currentUserId, selectedMessageId, deletingMessageId, pendingReadStatusAction, service, onDataLoaded, onDelete, onMarkRead, onMarkUnread, onSelect }, ref) {
    const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
    const [requestFailed, setRequestFailed] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Key[]>([]);
    const [selectedMessages, setSelectedMessages] = useState<readonly SiteMessageResp[]>([]);

    useImperativeHandle(ref, () => ({
      reload: () => actionRef.current?.reload() ?? Promise.resolve(),
    }), []);

    const requestMessages = useCallback(
      async (params: SiteMessageTableQuery & NebulaPageReq) => {
        if (!currentUserId) {
          const emptyResult = { data: [], total: 0 };
          onDataLoaded?.(emptyResult.data);
          return emptyResult;
        }

        setRequestFailed(false);
        const result = await service.pageSiteMessages(buildSiteMessagePageReq(params, currentUserId));
        setSelectedMessageIds([]);
        setSelectedMessages([]);
        onDataLoaded?.(result.data);
        return result;
      },
      [currentUserId, onDataLoaded, service],
    );

    const columns = useMemo<NebulaProColumns<SiteMessageResp, 'text'>[]>(() => [
      {
        title: '消息标题',
        dataIndex: 'title',
        fixed: 'left',
        width: 220,
        search: false,
        ellipsis: true,
        render: (_, record) => (
          <Typography.Text strong={!record.readStatus} ellipsis={{ tooltip: record.title }}>
            {record.title}
          </Typography.Text>
        ),
      },
      {
        title: '消息内容',
        dataIndex: 'content',
        width: 360,
        search: false,
        ellipsis: true,
        render: (_, record) => {
          const contentPreview = buildContentPreview(record.content);
          return (
            <Typography.Text type="secondary" ellipsis={{ tooltip: record.content }}>
              {contentPreview}
            </Typography.Text>
          );
        },
      },
      {
        title: '阅读状态',
        dataIndex: 'readStatus',
        width: 120,
        valueType: 'select',
        fieldProps: {
          'aria-label': '阅读状态',
          allowClear: true,
          options: [
            { label: '未读', value: false },
            { label: '已读', value: true },
          ],
          placeholder: '请选择阅读状态',
        },
        render: (_, record) => (
          <Tag color={record.readStatus ? 'default' : 'blue'}>
            {record.readStatus ? '已读' : '未读'}
          </Tag>
        ),
      },
      {
        title: '阅读时间',
        dataIndex: 'readTime',
        width: 180,
        search: false,
        render: (_, record) => record.readTime ?? '-',
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        search: false,
        sorter: true,
        render: (_, record) => record.createTime ?? '-',
      },
      {
        title: '创建时间范围',
        dataIndex: 'createTimeRange',
        hideInTable: true,
        valueType: 'dateTimeRange',
        fieldProps: {
          'aria-label': '创建时间范围',
        },
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 110,
        valueType: 'option',
        search: false,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              icon={<EyeOutlined />}
              aria-label={`查看消息 ${record.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(record);
              }}
            >
              详情
            </Button>
            <Popconfirm
              cancelText="取消"
              description="删除后无法恢复"
              okButtonProps={{ danger: true }}
              okText="删除"
              title="确认删除这条消息？"
              onConfirm={() => onDelete(record)}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                aria-label={`删除消息 ${record.title}`}
                loading={deletingMessageId === record.id}
                onClick={(event) => event.stopPropagation()}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ], [deletingMessageId, onDelete, onSelect]);

    const selectedCount = selectedMessages.length;

    return (
      <NebulaProTable<SiteMessageResp, SiteMessageTableQuery>
        actionRef={actionRef}
        columns={columns}
        request={requestMessages}
        rowKey="id"
        size="middle"
        scroll={{ x: 1180 }}
        rowSelection={{
          selectedRowKeys: selectedMessageIds,
          onChange: (nextSelectedMessageIds, nextSelectedMessages) => {
            setSelectedMessageIds(nextSelectedMessageIds);
            setSelectedMessages(nextSelectedMessages);
          },
        }}
        toolBarRender={() => [
          <Button
            key="mark-read"
            icon={<CheckOutlined />}
            aria-label="批量标记为已读"
            disabled={selectedCount === 0}
            loading={pendingReadStatusAction === 'read'}
            onClick={() => onMarkRead(selectedMessages)}
          >
            标记为已读
          </Button>,
          <Button
            key="mark-unread"
            icon={<CloseOutlined />}
            aria-label="批量标记为未读"
            disabled={selectedCount === 0}
            loading={pendingReadStatusAction === 'unread'}
            onClick={() => onMarkUnread(selectedMessages)}
          >
            标记为未读
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        rowClassName={(record) => record.id === selectedMessageId ? 'ant-table-row-selected' : ''}
        onRow={(record) => ({
          onClick: (event) => {
            if (isTableControlClick(event.target)) return;

            onSelect(record);
          },
        })}
        onRequestError={() => setRequestFailed(true)}
        tableExtraRender={() => requestFailed ? (
          <Alert
            type="error"
            showIcon
            title="消息加载失败"
            description="请检查网络连接后重试。"
            action={(
              <Button
                icon={<ReloadOutlined />}
                aria-label="重试加载消息"
                onClick={() => void actionRef.current?.reload()}
              >
                重试
              </Button>
            )}
          />
        ) : null}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息" />,
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: { id: 'site-message-page-size' },
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    );
  },
);

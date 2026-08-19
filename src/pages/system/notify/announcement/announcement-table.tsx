import { Button, Popconfirm, Space, Tag } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import type { RefObject } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import type { AnnouncementResp } from '@/types/notify';
import type { NotifyService } from '@/services/notify';
import {
  ANNOUNCEMENT_STATUS_OPTIONS,
  ANNOUNCEMENT_STATUS_TEXT,
  ANNOUNCEMENT_TARGET_OPTIONS,
  ANNOUNCEMENT_TARGET_TEXT,
  type AnnouncementPageQuery,
  toAnnouncementPageRequest,
} from './announcement-shared';

interface AnnouncementTableProps {
  readonly service: NotifyService;
  readonly actionRef: RefObject<NebulaProTableAction | undefined>;
  readonly onCreate: () => void;
  readonly onEdit: (announcement: AnnouncementResp) => void;
  readonly onPublish: (announcement: AnnouncementResp) => void;
  readonly onArchive: (announcement: AnnouncementResp) => void;
  readonly onLoadError: () => void;
}

const BOOLEAN_VALUE_ENUM = {
  true: { text: '是' },
  false: { text: '否' },
};

export function AnnouncementTable({
  service,
  actionRef,
  onCreate,
  onEdit,
  onPublish,
  onArchive,
  onLoadError,
}: AnnouncementTableProps) {
  const columns: NebulaProColumns<AnnouncementResp>[] = [
    {
      title: '公告标题',
      dataIndex: 'title',
      ellipsis: true,
      fixed: 'left',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      fieldProps: { 'aria-label': '状态', options: ANNOUNCEMENT_STATUS_OPTIONS },
      render: (_, record) => <Tag>{ANNOUNCEMENT_STATUS_TEXT[record.status]}</Tag>,
    },
    {
      title: '目标类型',
      dataIndex: 'targetType',
      width: 120,
      valueType: 'select',
      fieldProps: { 'aria-label': '目标类型', options: ANNOUNCEMENT_TARGET_OPTIONS },
      render: (_, record) => ANNOUNCEMENT_TARGET_TEXT[record.targetType],
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 170,
      search: false,
      render: (_, record) => record.publishTime ?? '-',
    },
    {
      title: '过期时间',
      dataIndex: 'expireTime',
      width: 170,
      search: false,
      render: (_, record) => record.expireTime ?? '-',
    },
    {
      title: '置顶',
      dataIndex: 'pinnedFlag',
      width: 90,
      valueType: 'select',
      valueEnum: BOOLEAN_VALUE_ENUM,
      fieldProps: { 'aria-label': '置顶' },
      render: (_, record) => record.pinnedFlag ? '是' : '否',
    },
    {
      title: '弹窗展示',
      dataIndex: 'popupFlag',
      width: 90,
      valueType: 'select',
      valueEnum: BOOLEAN_VALUE_ENUM,
      fieldProps: { 'aria-label': '弹窗展示' },
      render: (_, record) => record.popupFlag ? '是' : '否',
    },
    {
      title: '排序',
      dataIndex: 'sortNum',
      width: 80,
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 200,
      render: (_, record) => record.status === 2 ? null : (
        <Access permission="NOTIFY_ANNOUNCEMENT_EDIT" fallback={null}>
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              aria-label={`编辑 ${record.title}`}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            {record.status === 0 && (
              <Popconfirm
                title={`确定发布“${record.title}”吗？`}
                okText="确认发布"
                cancelText="取消"
                onConfirm={() => onPublish(record)}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<SendOutlined />}
                  aria-label={`发布 ${record.title}`}
                >
                  发布
                </Button>
              </Popconfirm>
            )}
            <Popconfirm
              title={`确定废弃“${record.title}”吗？`}
              okText="确认废弃"
              cancelText="取消"
              onConfirm={() => onArchive(record)}
            >
              <Button
                type="link"
                danger
                size="small"
                icon={<StopOutlined />}
                aria-label={`废弃 ${record.title}`}
              >
                废弃
              </Button>
            </Popconfirm>
          </Space>
        </Access>
      ),
    },
  ];

  return (
    <NebulaProTable<AnnouncementResp, AnnouncementPageQuery>
      actionRef={actionRef}
      rowKey="id"
      size="small"
      columns={columns}
      scroll={{ x: 1370 }}
      search={{ labelWidth: 'auto', defaultCollapsed: false }}
      options={{ density: false, fullScreen: true, reload: true, setting: true }}
      onRequestError={onLoadError}
      toolBarRender={() => [
        <Button
          key="reload"
          icon={<ReloadOutlined />}
          aria-label="刷新"
          onClick={() => actionRef.current?.reload()}
        >
          刷新
        </Button>,
        <Access key="create" permission="NOTIFY_ANNOUNCEMENT_CREATE" fallback={null}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            aria-label="新建公告"
            onClick={onCreate}
          >
            新建公告
          </Button>
        </Access>,
      ]}
      request={params => service.pageAnnouncements(toAnnouncementPageRequest(params))}
    />
  );
}

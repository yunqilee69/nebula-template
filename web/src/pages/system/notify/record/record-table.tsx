import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { DictLabel, DictSelect } from '@/components/dict-select';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import type { NotifyService } from '@/services/notify';
import type {
  ChannelType,
  NotifyRecordPageReq,
  NotifyRecordResp,
  NotifySendStatus,
} from '@/types/notify';
import {
  CopyableRecordText,
  formatRecordDateTime,
  getRecordChannelTargetDisplay,
  getRecordRecipientDisplay,
  getRecordTemplateVariantDisplay,
  NotifySendStatusTag,
  SEND_STATUS_VALUE_ENUM,
} from './record-presentation';

const NOTIFY_CHANNEL_DICT_CODE = 'NOTIFY_CHANNEL_TYPE';

export interface NotifyRecordQuery {
  readonly channelType?: ChannelType;
  readonly templateCode?: string;
  readonly sendStatus?: NotifySendStatus;
  readonly receiver?: string;
  readonly receiverUserId?: string;
}

interface NotifyRecordTableProps {
  readonly service: Pick<NotifyService, 'pageNotifyRecords'>;
  readonly onDetail: (record: NotifyRecordResp) => void;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function buildNotifyRecordPageReq(
  params: NotifyRecordQuery & NebulaPageReq,
): NotifyRecordPageReq {
  const templateCode = normalizeOptionalText(params.templateCode);
  const receiver = normalizeOptionalText(params.receiver);
  const receiverUserId = normalizeOptionalText(params.receiverUserId);

  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
    ...(params.channelType ? { channelType: params.channelType } : {}),
    ...(templateCode ? { templateCode } : {}),
    ...(params.sendStatus ? { sendStatus: params.sendStatus } : {}),
    ...(receiver ? { receiver } : {}),
    ...(receiverUserId ? { receiverUserId } : {}),
  };
}

export function NotifyRecordTable({ service, onDetail }: NotifyRecordTableProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [requestFailed, setRequestFailed] = useState(false);

  const requestRecords = useCallback(
    (params: NotifyRecordQuery & NebulaPageReq) => {
      setRequestFailed(false);
      return service.pageNotifyRecords(buildNotifyRecordPageReq(params));
    },
    [service],
  );

  const columns = useMemo<NebulaProColumns<NotifyRecordResp>[]>(() => [
    {
      title: '通知渠道',
      dataIndex: 'channelType',
      width: 120,
      valueType: 'select',
      formItemRender: () => (
        <DictSelect
          dictCode={NOTIFY_CHANNEL_DICT_CODE}
          showDisabled={false}
          aria-label="通知渠道"
          placeholder="请选择通知渠道"
        />
      ),
      render: (_, record) => <DictLabel dictCode={NOTIFY_CHANNEL_DICT_CODE} value={record.channelType} />,
    },
    {
      title: '模板编码',
      dataIndex: 'templateCode',
      width: 180,
      fieldProps: { 'aria-label': '模板编码', placeholder: '请输入模板编码' },
      render: (_, record) => <CopyableRecordText value={record.templateCode} />,
    },
    {
      title: '发送状态',
      dataIndex: 'sendStatus',
      width: 120,
      valueType: 'select',
      valueEnum: SEND_STATUS_VALUE_ENUM,
      fieldProps: { 'aria-label': '发送状态', allowClear: true, placeholder: '请选择发送状态' },
      render: (_, record) => <NotifySendStatusTag status={record.sendStatus} />,
    },
    {
      title: '接收人',
      dataIndex: 'receiver',
      width: 220,
      fieldProps: { 'aria-label': '接收人', placeholder: '请输入接收人' },
      render: (_, record) => <CopyableRecordText value={getRecordRecipientDisplay(record)} />,
    },
    {
      title: '接收用户 ID',
      dataIndex: 'receiverUserId',
      hideInTable: true,
      fieldProps: { 'aria-label': '接收用户 ID', placeholder: '请输入接收用户 ID' },
    },
    {
      title: '模板变体',
      dataIndex: 'templateVariantId',
      width: 180,
      search: false,
      render: (_, record) => <CopyableRecordText value={getRecordTemplateVariantDisplay(record)} />,
    },
    {
      title: '渠道目标',
      dataIndex: 'targetId',
      width: 180,
      search: false,
      render: (_, record) => <CopyableRecordText value={getRecordChannelTargetDisplay(record)} />,
    },
    {
      title: '发送时间',
      dataIndex: 'sendTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatRecordDateTime(record.sendTime),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatRecordDateTime(record.createTime),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 100,
      valueType: 'option',
      search: false,
      render: (_, record) => (
        <Access permission="NOTIFY_RECORD_VIEW" fallback={null}>
          <Button
            type="link"
            icon={<EyeOutlined />}
            aria-label={`查看详情 ${record.id}`}
            onClick={() => onDetail(record)}
          >
            详情
          </Button>
        </Access>
      ),
    },
  ], [onDetail]);

  return (
    <NebulaProTable<NotifyRecordResp, NotifyRecordQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestRecords}
      rowKey="id"
      search={{ defaultCollapsed: false }}
      size="middle"
      scroll={{ x: 1580 }}
      onRequestError={() => setRequestFailed(true)}
      tableExtraRender={() => requestFailed ? (
        <Alert
          type="error"
          showIcon
          title="发送记录加载失败"
          description="请检查网络连接后重试。"
          action={(
            <Button
              icon={<ReloadOutlined />}
              aria-label="重试加载发送记录"
              onClick={() => void actionRef.current?.reload()}
            >
              重试
            </Button>
          )}
        />
      ) : null}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无发送记录" />,
      }}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  );
}

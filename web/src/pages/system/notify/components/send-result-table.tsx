import { Card, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo } from 'react';
import type { NotifySendResultResp } from '@/types/notify';

export function SendResultTable({ results }: { readonly results: readonly NotifySendResultResp[] }) {
  const columns = useMemo<TableColumnsType<NotifySendResultResp>>(() => [
    { title: '记录 ID', dataIndex: 'recordId' },
    { title: '渠道', dataIndex: 'channelType' },
    { title: '接收人', dataIndex: 'receiver' },
    {
      title: '状态',
      dataIndex: 'sendStatus',
      render: (status: NotifySendResultResp['sendStatus']) => (
        <Tag color={status === 'SUCCESS' ? 'success' : 'error'}>{status}</Tag>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'failReason',
      render: (reason: string | undefined) => reason || '-',
    },
  ], []);

  if (results.length === 0) return null;

  return (
    <Card title="发送结果">
      <Table<NotifySendResultResp>
        rowKey="recordId"
        columns={columns}
        dataSource={results}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}

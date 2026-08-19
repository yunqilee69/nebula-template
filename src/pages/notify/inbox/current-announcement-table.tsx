import { Alert, Modal, Skeleton, Tag, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import type { NotifyService } from '@/services/notify';
import type { CurrentAnnouncementResp } from '@/types/notify';

export interface CurrentAnnouncementTableProps {
  readonly service: Pick<NotifyService, 'pageCurrentAnnouncements' | 'markAnnouncementRead'>;
}

export function CurrentAnnouncementTable({ service }: CurrentAnnouncementTableProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<CurrentAnnouncementResp | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [markReadError, setMarkReadError] = useState<string | null>(null);

  const requestAnnouncements = useCallback(
    async (params: NebulaPageReq) => {
      setMarkReadError(null);
      const result = await service.pageCurrentAnnouncements(params);
      return result;
    },
    [service],
  );

  const openDetail = useCallback((announcement: CurrentAnnouncementResp) => {
    setSelectedAnnouncement(announcement);
    setDetailOpen(true);

    if (!announcement.readStatus) {
      void service.markAnnouncementRead(announcement.id)
        .then(() => {
          void actionRef.current?.reload();
        })
        .catch(() => {
          setMarkReadError('标记公告已读失败，请重试');
        });
    }
  }, [service]);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
  }, []);

  const columns = useMemo<NebulaProColumns<CurrentAnnouncementResp, 'text'>[]>(() => [
    {
      title: '公告标题',
      dataIndex: 'title',
      width: 320,
      fixed: 'left',
      ellipsis: true,
      search: false,
      render: (_, record) => (
        <Typography.Text strong={!record.readStatus} ellipsis={{ tooltip: record.title }}>
          {record.title}
        </Typography.Text>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 180,
      sorter: true,
      search: false,
    },
    {
      title: '阅读状态',
      dataIndex: 'readStatus',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color={record.readStatus ? 'default' : 'blue'}>
          {record.readStatus ? '已读' : '未读'}
        </Tag>
      ),
    },
    {
      title: '置顶',
      dataIndex: 'pinnedFlag',
      width: 80,
      search: false,
      render: (_, record) => (
        record.pinnedFlag ? <Tag color="red">置顶</Tag> : null
      ),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 100,
      valueType: 'option',
      search: false,
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record)}>
          查看详情
        </Typography.Link>
      ),
    },
  ], [openDetail]);

  return (
    <>
      {markReadError && <Alert className="mb-3" showIcon title={markReadError} type="error" />}

      <NebulaProTable<CurrentAnnouncementResp, Record<string, never>>
        actionRef={actionRef}
        columns={columns}
        request={requestAnnouncements}
        rowKey="id"
        size="middle"
        scroll={{ x: 800 }}
        search={false}
        options={false}
        onRow={(record) => ({
          onClick: () => openDetail(record),
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: '暂无公告',
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: { id: 'current-announcement-page-size' },
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title="公告详情"
        open={detailOpen}
        footer={null}
        onCancel={closeDetail}
        destroyOnHidden
      >
        {selectedAnnouncement ? (
          <article>
            <header className="flex items-start justify-between gap-4">
              <div>
                <Typography.Title level={4}>
                  {selectedAnnouncement.title}
                </Typography.Title>
                <div className="flex flex-wrap gap-3">
                  <Typography.Text type="secondary">
                    {selectedAnnouncement.publishTime ?? '时间未知'}
                  </Typography.Text>
                  {selectedAnnouncement.expireTime ? (
                    <Typography.Text type="secondary">
                      过期于 {selectedAnnouncement.expireTime}
                    </Typography.Text>
                  ) : null}
                </div>
                {selectedAnnouncement.pinnedFlag ? (
                  <Tag color="red" className="mt-2">置顶</Tag>
                ) : null}
              </div>
              <Tag color={selectedAnnouncement.readStatus ? 'default' : 'blue'} variant="filled">
                {selectedAnnouncement.readStatus ? '已读' : '未读'}
              </Tag>
            </header>
            <Typography.Paragraph className="mt-4 whitespace-pre-wrap break-words">
              {selectedAnnouncement.content}
            </Typography.Paragraph>
          </article>
        ) : (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        )}
      </Modal>
    </>
  );
}
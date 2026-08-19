import { StopOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNotice } from '@/hooks/use-notice';
import { onlineUserService, type OnlineUserService } from '@/services/online-user';
import type { OnlineUserPageReq, OnlineUserResp } from '@/types/online-user';

export interface OnlineUserPageProps {
  readonly service?: OnlineUserService;
}

type OnlineUserSearchValues = {
  readonly userId?: string;
  readonly username?: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
};

function formatSeconds(value: number | undefined): string {
  return value === undefined ? '-' : `${value}s`;
}

function trimOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildQuery(values: OnlineUserSearchValues & NebulaPageReq): OnlineUserPageReq {
  const userId = trimOptionalText(values.userId);
  const username = trimOptionalText(values.username);
  const nickname = trimOptionalText(values.nickname);
  const email = trimOptionalText(values.email);
  const phone = trimOptionalText(values.phone);

  return {
    pageNum: values.pageNum,
    pageSize: values.pageSize,
    ...(values.orderName ? { orderName: values.orderName } : {}),
    ...(values.orderType ? { orderType: values.orderType } : {}),
    ...(userId ? { userId } : {}),
    ...(username ? { username } : {}),
    ...(nickname ? { nickname } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };
}

function renderCodeTags(values: readonly string[] | undefined): React.ReactNode {
  if (!values?.length) return '-';

  return (
    <Space size={[0, 4]} wrap>
      {values.map((value) => <Tag key={value}>{value}</Tag>)}
    </Space>
  );
}

export function OnlineUserPage({ service: serviceProp }: OnlineUserPageProps) {
  const service = serviceProp ?? onlineUserService;
  const notice = useNotice();
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [kickingKey, setKickingKey] = useState<string>();

  const requestOnlineUsers = useCallback(
    (params: OnlineUserSearchValues & NebulaPageReq) => service.pageOnlineUsers(buildQuery(params)),
    [service],
  );

  const kickOutUser = useCallback(async (record: OnlineUserResp) => {
    setKickingKey(record.cacheKey);
    try {
      await service.kickOutOnlineUser(record.cacheKey);
      notice.success('在线用户已踢出');
      await actionRef.current?.reload();
    } catch (error) {
      if (error instanceof Error) {
        notice.error('踢出在线用户失败');
        return;
      }
      throw error;
    } finally {
      setKickingKey(undefined);
    }
  }, [notice, service]);

  const columns = useMemo<NebulaProColumns<OnlineUserResp>[]>(() => [
    { title: '用户ID', dataIndex: 'userId', hideInTable: true },
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '昵称', dataIndex: 'nickname', width: 140, render: (_, record) => record.nickname ?? '-' },
    { title: '手机号', dataIndex: 'phone', width: 150, render: (_, record) => record.phone ?? '-' },
    { title: '邮箱', dataIndex: 'email', width: 200, render: (_, record) => record.email ?? '-' },
    { title: '组织编码', dataIndex: 'orgCodeList', width: 180, search: false, render: (_, record) => renderCodeTags(record.orgCodeList) },
    { title: '角色编码', dataIndex: 'roleCodeList', width: 180, search: false, render: (_, record) => renderCodeTags(record.roleCodeList) },
    { title: '登录时间', dataIndex: 'loginTime', width: 180, search: false, render: (_, record) => record.loginTime ?? '-' },
    { title: '过期时间', dataIndex: 'expireTime', width: 180, search: false, render: (_, record) => record.expireTime ?? '-' },
    { title: '剩余 TTL', dataIndex: 'remainingTtlSeconds', width: 120, search: false, render: (_, record) => formatSeconds(record.remainingTtlSeconds) },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      search: false,
      render: (_, record) => (
        <Access permission={AUTH_BUTTON_CODES.ONLINE_USER_KICK_OUT} fallback={null}>
          <Popconfirm
            title="确认踢出该在线用户？"
            okText="踢出"
            cancelText="取消"
            onConfirm={() => void kickOutUser(record)}
          >
            <Button
              danger
              type="link"
              icon={<StopOutlined />}
              loading={kickingKey === record.cacheKey}
              aria-label={`踢出用户 ${record.username}`}
            >
              踢出
            </Button>
          </Popconfirm>
        </Access>
      ),
    },
  ], [kickOutUser, kickingKey]);

  return (
    <div className="h-full flex flex-col gap-4">
      <NebulaProTable<OnlineUserResp, OnlineUserSearchValues>
        actionRef={actionRef}
        rowKey="cacheKey"
        columns={columns}
        request={requestOnlineUsers}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{ showSizeChanger: true }}
        scroll={{ x: 1450 }}
      />
    </div>
  );
}

export default OnlineUserPage;

import { DeleteOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthManagementService } from '@/api/auth-management';
import { OrgTree } from '@/components/org-tree';
import { UserSelect } from '@/components/user-select';
import { useNotice } from '@/hooks/use-notice';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type { ReceiverItem } from '@/types/notify';
import { loadAllUsersForSource } from './send-page-helpers';

type ReceiverAuthService = Pick<AuthManagementService, 'getOrgTree' | 'listRoles' | 'pageUsers'>;

export type ReceiverSelectorProps = {
  readonly service: ReceiverAuthService;
  readonly value: readonly ReceiverItem[];
  readonly onChange: (items: readonly ReceiverItem[]) => void;
};

export function ReceiverSelector({ service, value, onChange }: ReceiverSelectorProps) {
  const notice = useNotice();
  const [roles, setRoles] = useState<readonly RoleOptionResp[]>([]);
  const [orgTree, setOrgTree] = useState<readonly OrgTreeResp[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [selectedOrg, setSelectedOrg] = useState<OrgTreeResp>();
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [orgSelectOpen, setOrgSelectOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([service.listRoles(), service.getOrgTree()])
      .then(([roleList, orgList]) => {
        if (!active) return;
        setRoles(roleList);
        setOrgTree(orgList);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          notice.error('接收对象选项加载失败');
          return;
        }
        throw error;
      });
    return () => {
      active = false;
    };
  }, [notice, service]);

  const appendSources = useCallback((sources: readonly ReceiverItem[]) => {
    const keys = new Set(value.map((item) => `${item.sourceType}:${item.sourceId}`));
    const additions = sources.filter((item) => {
      const key = `${item.sourceType}:${item.sourceId}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
    onChange([...value, ...additions]);
  }, [onChange, value]);

  const addResolvedSource = useCallback(async (
    sourceType: 'ROLE' | 'ORG',
    sourceId: string,
    sourceName: string,
  ) => {
    if (value.some((item) => item.sourceType === sourceType && item.sourceId === sourceId)) return;
    setResolving(true);
    try {
      const users = await loadAllUsersForSource(service, { sourceType, sourceId });
      appendSources([{ sourceType, sourceId, sourceName, users }]);
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('接收用户解析失败');
        return;
      }
      throw error;
    } finally {
      setResolving(false);
    }
  }, [appendSources, notice, service, value]);

  const addSelectedRole = useCallback(async () => {
    const role = roles.find((item) => item.id === selectedRoleId);
    if (!role) return;
    await addResolvedSource('ROLE', role.id, role.name);
    setSelectedRoleId(undefined);
  }, [addResolvedSource, roles, selectedRoleId]);

  const confirmSelectedOrg = useCallback(async () => {
    if (!selectedOrg) return;
    await addResolvedSource('ORG', selectedOrg.id, selectedOrg.name);
    setOrgSelectOpen(false);
    setSelectedOrg(undefined);
  }, [addResolvedSource, selectedOrg]);

  const columns = useMemo<TableColumnsType<ReceiverItem>>(() => [
    {
      title: '来源',
      dataIndex: 'sourceType',
      render: (sourceType: ReceiverItem['sourceType']) => <Tag>{sourceType}</Tag>,
    },
    { title: '接收对象', dataIndex: 'sourceName' },
    {
      title: '解析用户数',
      key: 'userCount',
      render: (_, item) => item.users.length,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, item) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onChange(value.filter((candidate) => candidate !== item))}
        >
          移除
        </Button>
      ),
    },
  ], [onChange, value]);

  const selectedUsers = useMemo(
    () => value.filter((item) => item.sourceType === 'USER').flatMap((item) => item.users),
    [value],
  );

  return (
    <Flex vertical gap="middle">
      <Space wrap>
        <Button icon={<UserAddOutlined />} onClick={() => setUserSelectOpen(true)}>
          选择用户
        </Button>
        <Select
          aria-label="角色"
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="选择角色"
          value={selectedRoleId}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          onChange={setSelectedRoleId}
          className="min-w-48"
        />
        <Button
          icon={<TeamOutlined />}
          loading={resolving}
          disabled={!selectedRoleId}
          onClick={() => void addSelectedRole()}
        >
          添加角色
        </Button>
        <Button icon={<TeamOutlined />} onClick={() => setOrgSelectOpen(true)}>
          选择组织
        </Button>
      </Space>

      <Table<ReceiverItem>
        rowKey={(item) => `${item.sourceType}:${item.sourceId}`}
        columns={columns}
        dataSource={value}
        pagination={false}
        size="small"
        locale={{ emptyText: '请选择用户、角色或组织' }}
      />

      <UserSelect
        open={userSelectOpen}
        title="选择接收用户"
        mode="multiple"
        treeData={[...orgTree]}
        roles={[...roles]}
        service={service}
        onClose={() => setUserSelectOpen(false)}
        onChange={(_selectedIds, users: UserResp[]) => {
          appendSources(users.map((user) => ({
            sourceType: 'USER',
            sourceId: user.id,
            sourceName: user.nickname || user.username,
            users: [user],
          })));
        }}
      />

      <Modal
        title="选择组织"
        open={orgSelectOpen}
        okText="添加组织"
        cancelText="取消"
        confirmLoading={resolving}
        okButtonProps={{ disabled: !selectedOrg }}
        destroyOnHidden
        onOk={() => void confirmSelectedOrg()}
        onCancel={() => {
          setOrgSelectOpen(false);
          setSelectedOrg(undefined);
        }}
      >
        <OrgTree
          dataSource={[...orgTree]}
          selectedKey={selectedOrg?.id}
          showStatusTags={false}
          onSelect={(_orgId, org) => setSelectedOrg(org)}
        />
        {selectedOrg ? (
          <Typography.Text type="secondary">已选择：{selectedOrg.name}</Typography.Text>
        ) : null}
      </Modal>
      <Typography.Text type="secondary">
        已添加 {value.length} 个来源，发送前将按用户 ID 合并重复用户。
        {selectedUsers.length > 0 ? ` 其中直接选择用户 ${selectedUsers.length} 人。` : ''}
      </Typography.Text>
    </Flex>
  );
}

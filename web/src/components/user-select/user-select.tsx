import { CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Modal, Select, Table, Tag, theme, Typography } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OrgTree } from '@/components/org-tree';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type { UserSelectProps } from './types';

export function UserSelect({
  open,
  title,
  mode = 'single',
  value,
  treeData,
  roles,
  disabled = false,
  onChange,
  onClose,
  service,
}: UserSelectProps) {
  const { token } = theme.useToken();
  const { t } = useNebulaI18n();

  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();
  const [tableData, setTableData] = useState<UserResp[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePagination, setTablePagination] = useState({ current: 1, pageSize: 10 });
  const [searchKeyword, setSearchKeyword] = useState('');

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResp[]>([]);

  const modalTitle = title ?? t('auth.userManagement.title');

  useEffect(() => {
    if (open && value) {
      const keys = Array.isArray(value) ? value : [value];
      setSelectedKeys(keys);
    } else if (!open) {
      setSelectedKeys([]);
      setSelectedUsers([]);
      setSelectedOrgId(undefined);
      setSelectedRoleId(undefined);
      setSearchKeyword('');
    }
  }, [open, value]);

  const loadTableData = useCallback(async (orgId: string | undefined, roleId: string | undefined, keyword: string, page: number, pageSize: number) => {
    if (!service) return;

    setTableLoading(true);
    try {
      const result = await service.pageUsers({
        pageNum: page,
        pageSize,
        orgId,
        roleId,
        username: keyword || undefined,
      });
      setTableData(result.data);
      setTableTotal(result.total);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setTableLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (open) {
      void loadTableData(selectedOrgId, selectedRoleId, searchKeyword, tablePagination.current, tablePagination.pageSize);
    }
  }, [open, selectedOrgId, selectedRoleId, searchKeyword, tablePagination.current, tablePagination.pageSize, loadTableData]);

  const handleTableChange: TableProps<UserResp>['onChange'] = (pagination) => {
    setTablePagination({ current: pagination.current ?? 1, pageSize: pagination.pageSize ?? 10 });
  };

  const handleOrgTreeSelect = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    setTablePagination({ current: 1, pageSize: 10 });
  }, []);

  const handleRoleChange = useCallback((roleId: string | undefined) => {
    setSelectedRoleId(roleId);
    setTablePagination({ current: 1, pageSize: 10 });
  }, []);

  const handleRowSelect = useCallback((record: UserResp, selected: boolean) => {
    if (mode === 'single') {
      if (selected) {
        setSelectedKeys([record.id]);
        setSelectedUsers([record]);
      } else {
        setSelectedKeys([]);
        setSelectedUsers([]);
      }
    } else {
      if (selected) {
        setSelectedKeys((prev) => {
          if (prev.includes(record.id)) return prev;
          return [...prev, record.id];
        });
        setSelectedUsers((prev) => {
          if (prev.some((u) => u.id === record.id)) return prev;
          return [...prev, record];
        });
      } else {
        setSelectedKeys((prev) => prev.filter((k) => k !== record.id));
        setSelectedUsers((prev) => prev.filter((u) => u.id !== record.id));
      }
    }
  }, [mode]);

  const handleConfirm = useCallback(() => {
    if (mode === 'single') {
      const singleKey = selectedKeys[0];
      const singleUser = selectedUsers[0];
      onChange?.(singleKey, singleUser ? [singleUser] : []);
    } else {
      onChange?.(selectedKeys, selectedUsers);
    }
    onClose();
  }, [mode, selectedKeys, selectedUsers, onChange, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const columns: TableColumnsType<UserResp> = useMemo(() => [
    {
      title: t('auth.userManagement.columns.username'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('auth.userManagement.columns.nickname'),
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: t('auth.userManagement.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'default'}>
          {status === 1 ? t('auth.userManagement.status.enabled') : t('auth.userManagement.status.disabled')}
        </Tag>
      ),
    },
  ], [t]);

  const rowSelection: TableProps<UserResp>['rowSelection'] = useMemo(() => ({
    type: mode === 'single' ? 'radio' : 'checkbox',
    selectedRowKeys: selectedKeys,
    onSelect: handleRowSelect,
    selections: mode === 'multiple' ? [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ] : undefined,
  }), [mode, selectedKeys, handleRowSelect]);

  const roleOptions = useMemo(() => [
    { value: '', label: t('auth.select.allRoles') },
    ...roles.map((role) => ({ value: role.id, label: role.name })),
  ], [roles, t]);

  const selectedDisplayNames = useMemo(() => {
    return selectedUsers.map((u) => u.nickname || u.username).join(', ');
  }, [selectedUsers]);

  return (
    <Modal
      open={open}
      title={modalTitle}
      width={800}
      footer={null}
      onCancel={handleCancel}
      destroyOnHidden
    >
      <Flex gap={token.marginMD} style={{ minHeight: 400 }}>
        <Flex vertical gap={token.marginSM} style={{ flex: '0 0 240px' }}>
          <OrgTree
            dataSource={treeData}
            selectedKey={selectedOrgId}
            showStatusTags={false}
            onSelect={handleOrgTreeSelect}
            style={{ flex: 1 }}
          />
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: token.marginXS }}>
              {t('auth.userManagement.fields.roles')}
            </Typography.Text>
            <Select
              options={roleOptions}
              value={selectedRoleId}
              onChange={handleRoleChange}
              allowClear
              placeholder={t('auth.select.allRoles')}
              style={{ width: '100%' }}
            />
          </div>
        </Flex>
        <Flex vertical gap={token.marginSM} style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" justify="space-between" gap={token.marginSM}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('auth.userManagement.placeholders.username')}
              value={searchKeyword}
              allowClear
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setTablePagination({ current: 1, pageSize: 10 });
              }}
              style={{ maxWidth: 200 }}
            />
            {selectedKeys.length > 0 && (
              <Typography.Text type="secondary">
                {mode === 'single' ? t('auth.select.selectedSingle') : `${t('auth.select.selectedMultiple').replace('{count}', String(selectedKeys.length))}`}
                : {selectedDisplayNames}
              </Typography.Text>
            )}
          </Flex>
          <Table<UserResp>
            rowKey="id"
            columns={columns}
            dataSource={tableData}
            loading={tableLoading}
            rowSelection={rowSelection}
            pagination={{
              current: tablePagination.current,
              pageSize: tablePagination.pageSize,
              total: tableTotal,
              showSizeChanger: true,
              showTotal: (total) => `${t('common.pagination.total').replace('{total}', String(total))}`,
            }}
            onChange={handleTableChange}
            size="small"
            style={{ flex: 1 }}
          />
        </Flex>
      </Flex>
      <Flex justify="flex-end" gap={token.marginSM} style={{ marginTop: token.marginMD }}>
        <Button icon={<CloseOutlined />} onClick={handleCancel}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm}>
          {t('common.actions.confirm')}
        </Button>
      </Flex>
    </Modal>
  );
}

export type { UserSelectProps } from './types';

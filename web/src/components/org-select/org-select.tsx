import { CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Modal, Table, theme, Typography } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OrgTree } from '@/components/org-tree';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgOptionResp, OrgResp } from '@/types/auth-management';
import type { OrgSelectProps } from './types';

export function OrgSelect({
  open,
  title,
  mode = 'single',
  value,
  treeData,
  orgList,
  onChange,
  onClose,
  service,
}: OrgSelectProps) {
  const { token } = theme.useToken();
  const { t } = useNebulaI18n();

  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [tableData, setTableData] = useState<OrgResp[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePagination, setTablePagination] = useState({ current: 1, pageSize: 10 });
  const [searchKeyword, setSearchKeyword] = useState('');

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<OrgResp[]>([]);

  const modalTitle = title ?? t('auth.orgManagement.title');

  useEffect(() => {
    if (open && value) {
      const keys = Array.isArray(value) ? value : [value];
      setSelectedKeys(keys);
    } else if (!open) {
      setSelectedKeys([]);
      setSelectedOrgs([]);
    }
  }, [open, value]);

  const loadTableData = useCallback(async (parentId: string | undefined, keyword: string, page: number, pageSize: number) => {
    if (!service) return;

    setTableLoading(true);
    try {
      const result = await service.pageOrgs({
        pageNum: page,
        pageSize,
        parentId,
        name: keyword || undefined,
      });
      setTableData(result.data);
      setTableTotal(result.total);
    } catch (error) {
      console.error('Failed to load orgs', error);
    } finally {
      setTableLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (open) {
      void loadTableData(selectedOrgId, searchKeyword, tablePagination.current, tablePagination.pageSize);
    }
  }, [open, selectedOrgId, searchKeyword, tablePagination.current, tablePagination.pageSize, loadTableData]);

  const handleTableChange: TableProps<OrgResp>['onChange'] = (pagination) => {
    setTablePagination({ current: pagination.current ?? 1, pageSize: pagination.pageSize ?? 10 });
  };

  const handleOrgTreeSelect = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    setTablePagination({ current: 1, pageSize: 10 });
  }, []);

  const handleRowSelect = useCallback((record: OrgResp, selected: boolean) => {
    if (mode === 'single') {
      if (selected) {
        setSelectedKeys([record.id]);
        setSelectedOrgs([record]);
      } else {
        setSelectedKeys([]);
        setSelectedOrgs([]);
      }
    } else {
      if (selected) {
        setSelectedKeys((prev) => {
          if (prev.includes(record.id)) return prev;
          return [...prev, record.id];
        });
        setSelectedOrgs((prev) => {
          if (prev.some((o) => o.id === record.id)) return prev;
          return [...prev, record];
        });
      } else {
        setSelectedKeys((prev) => prev.filter((k) => k !== record.id));
        setSelectedOrgs((prev) => prev.filter((o) => o.id !== record.id));
      }
    }
  }, [mode]);

  const handleConfirm = useCallback(() => {
    if (mode === 'single') {
      const singleKey = selectedKeys[0];
      const singleOrg = selectedOrgs[0];
      onChange?.(singleKey, singleOrg ? [singleOrg] : []);
    } else {
      onChange?.(selectedKeys, selectedOrgs);
    }
    onClose();
  }, [mode, selectedKeys, selectedOrgs, onChange, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const columns: TableColumnsType<OrgResp> = useMemo(() => [
    {
      title: t('auth.orgManagement.columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('auth.orgManagement.columns.code'),
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: t('auth.orgManagement.columns.type'),
      dataIndex: 'type',
      key: 'type',
    },
  ], [t]);

  const rowSelection: TableProps<OrgResp>['rowSelection'] = useMemo(() => ({
    type: mode === 'single' ? 'radio' : 'checkbox',
    selectedRowKeys: selectedKeys,
    onSelect: handleRowSelect,
    selections: mode === 'multiple' ? [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ] : undefined,
  }), [mode, selectedKeys, handleRowSelect]);

  const orgMap = useMemo(() => {
    const map = new Map<string, OrgOptionResp>();
    for (const org of orgList) {
      map.set(org.id, org);
    }
    return map;
  }, [orgList]);

  const selectedDisplayNames = useMemo(() => {
    return selectedKeys.map((id) => orgMap.get(id)?.name ?? id).join(', ');
  }, [selectedKeys, orgMap]);

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
        <div style={{ flex: '0 0 240px' }}>
          <OrgTree
            dataSource={treeData}
            selectedKey={selectedOrgId}
            showStatusTags={false}
            onSelect={handleOrgTreeSelect}
            style={{ height: '100%' }}
          />
        </div>
        <Flex vertical gap={token.marginSM} style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" justify="space-between" gap={token.marginSM}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('auth.orgManagement.placeholders.name')}
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
          <Table<OrgResp>
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

export type { OrgSelectProps } from './types';

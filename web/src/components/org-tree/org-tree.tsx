import { ApartmentOutlined } from '@ant-design/icons';
import { Tag, theme as antdTheme } from 'antd';
import { useMemo, type ReactNode } from 'react';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgTreeResp } from '@/types/auth-management';
import type { OrgTreeProps } from './types';

function collectExpandableOrgKeys(items: OrgTreeResp[]): string[] {
  return items.flatMap((item) => {
    const childKeys = collectExpandableOrgKeys(item.children ?? []);
    return item.children?.length ? [item.id, ...childKeys] : childKeys;
  });
}

function toNeTreeNodes(
  items: OrgTreeResp[],
  showStatusTags: boolean,
  statusLabels: { enabled: string; disabled: string },
  renderNodeActions: ((org: OrgTreeResp, isRoot: boolean) => ReactNode) | undefined,
  isRootLevel: boolean,
): NeTreeNode[] {
  return items.map((item) => ({
    key: item.id,
    title: item.name,
    icon: <ApartmentOutlined />,
    actions: renderNodeActions?.(item, isRootLevel),
    tag: showStatusTags
      ? item.status === 1
        ? <Tag color="success">{statusLabels.enabled}</Tag>
        : <Tag>{statusLabels.disabled}</Tag>
      : undefined,
    children: item.children?.length
      ? toNeTreeNodes(item.children, showStatusTags, statusLabels, renderNodeActions, false)
      : undefined,
  }));
}

function findOrgById(items: OrgTreeResp[], id: string): OrgTreeResp | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children ? findOrgById(item.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
}

export function OrgTree({
  dataSource,
  selectedKey,
  defaultSelectedKey,
  expandedKeys,
  defaultExpandedKeys,
  title,
  extra,
  extraRootNodes = [],
  renderNodeActions,
  searchable = true,
  searchPlaceholder,
  emptyText,
  showStatusTags = true,
  className,
  style,
  onSelect,
  onExpand,
}: OrgTreeProps) {
  const { token } = antdTheme.useToken();
  const { t } = useNebulaI18n();

  const statusLabels = useMemo(
    () => ({
      enabled: t('auth.orgManagement.status.enabled'),
      disabled: t('auth.orgManagement.status.disabled'),
    }),
    [t],
  );

  const defaultTitle = t('auth.orgManagement.tree.title');
  const defaultSearchPlaceholder = t('auth.orgManagement.tree.searchPlaceholder');
  const rootCountLabel = t('auth.orgManagement.tree.rootCount');

  const treeNodes = useMemo(
    () => [
      ...extraRootNodes,
      ...toNeTreeNodes(dataSource, showStatusTags, statusLabels, renderNodeActions, true),
    ],
    [dataSource, extraRootNodes, renderNodeActions, showStatusTags, statusLabels],
  );

  const autoExpandedKeys = useMemo(
    () => collectExpandableOrgKeys(dataSource),
    [dataSource],
  );

  const handleSelect = (key: string) => {
    const org = findOrgById(dataSource, key);
    onSelect?.(key, org);
  };

  const rootCount = dataSource.length;
  const resolvedTitle = title === undefined ? defaultTitle : title;
  const resolvedExtra = extra === undefined ? <Tag>{rootCount} {rootCountLabel}</Tag> : extra;

  return (
    <NeTree
      title={resolvedTitle}
      dataSource={treeNodes}
      selectedKey={selectedKey}
      defaultSelectedKey={defaultSelectedKey}
      expandedKeys={expandedKeys}
      defaultExpandedKeys={defaultExpandedKeys ?? autoExpandedKeys}
      extra={resolvedExtra}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder ?? defaultSearchPlaceholder}
      emptyText={emptyText ?? '暂无组织数据'}
      className={className}
      style={{
        minHeight: 360,
        height: '100%',
        background: token.colorBgContainer,
        ...style,
      }}
      onSelect={handleSelect}
      onExpand={onExpand}
    />
  );
}

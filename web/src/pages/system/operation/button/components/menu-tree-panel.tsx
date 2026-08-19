import { MenuOutlined } from '@ant-design/icons';
import { Tag, theme as antdTheme } from 'antd';
import { useMemo } from 'react';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { MenuTreeResp } from '@/types/menu';

interface MenuTreePanelProps {
  tree: MenuTreeResp[];
  selectedKey?: string;
  onSelect: (menuId: string, menu: MenuTreeResp) => void;
}

function collectExpandableMenuKeys(items: MenuTreeResp[]): string[] {
  return items.flatMap((item) => {
    const childKeys = collectExpandableMenuKeys(item.children ?? []);
    return item.children?.length ? [item.id, ...childKeys] : childKeys;
  });
}

function toNeTreeNodes(
  items: MenuTreeResp[],
  statusLabels: { enabled: string; disabled: string },
): NeTreeNode[] {
  return items.map((item) => ({
    key: item.id,
    title: item.name,
    icon: <MenuOutlined />,
    tag: item.status === 1
      ? <Tag color="success">{statusLabels.enabled}</Tag>
      : <Tag>{statusLabels.disabled}</Tag>,
    children: item.children?.length
      ? toNeTreeNodes(item.children, statusLabels)
      : undefined,
  }));
}

function findMenuById(items: MenuTreeResp[], id: string): MenuTreeResp | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children ? findMenuById(item.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
}

export function MenuTreePanel({ tree, selectedKey, onSelect }: MenuTreePanelProps) {
  const { token } = antdTheme.useToken();
  const { t } = useNebulaI18n();

  const statusLabels = useMemo(
    () => ({
      enabled: t('auth.menuManagement.status.enabled'),
      disabled: t('auth.menuManagement.status.disabled'),
    }),
    [t],
  );

  const title = t('auth.buttonManagement.tree.title');
  const searchPlaceholder = t('auth.buttonManagement.tree.searchPlaceholder');

  const treeNodes = useMemo(
    () => toNeTreeNodes(tree, statusLabels),
    [tree, statusLabels],
  );

  const autoExpandedKeys = useMemo(
    () => collectExpandableMenuKeys(tree),
    [tree],
  );

  const handleSelect = (key: string) => {
    const menu = findMenuById(tree, key);
    if (menu) {
      onSelect(key, menu);
    }
  };

  const rootCount = tree.length;

  return (
    <NeTree
      title={title}
      dataSource={treeNodes}
      selectedKey={selectedKey}
      defaultExpandedKeys={autoExpandedKeys}
      extra={<Tag>{rootCount} {t('auth.buttonManagement.tree.rootCount')}</Tag>}
      searchable
      searchPlaceholder={searchPlaceholder}
      emptyText={t('auth.buttonManagement.tree.emptyText')}
      style={{
        minHeight: 360,
        height: '100%',
        background: token.colorBgContainer,
      }}
      onSelect={handleSelect}
    />
  );
}
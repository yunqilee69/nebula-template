import { DownOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Empty, Flex, Input, Typography, theme as antdTheme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { collectExpandableKeys, createIndentStyle, filterTree } from './tree-helpers';
import type { NeTreeNode, NeTreeProps } from './types';

interface NeTreeNodeListProps {
  nodes: NeTreeNode[];
  level: number;
  selectedKey: string | undefined;
  expandedKeys: Set<string>;
  indentSize: number;
  searchActive: boolean;
  onSelect: (node: NeTreeNode) => void;
  onToggleExpand: (node: NeTreeNode) => void;
}

function NeTreeNodeList({
  nodes,
  level,
  selectedKey,
  expandedKeys,
  indentSize,
  searchActive,
  onSelect,
  onToggleExpand,
}: NeTreeNodeListProps) {
  const { token } = antdTheme.useToken();

  return (
    <ul role={level === 0 ? 'tree' : 'group'} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const expanded = searchActive || expandedKeys.has(node.key);
        const selected = selectedKey === node.key;

        return (
          <li key={node.key} style={{ marginBlock: 2 }}>
            <Flex
              align="center"
              gap={token.marginXXS}
              style={{
                ...createIndentStyle(level, indentSize),
                minHeight: 32,
                borderRadius: token.borderRadius,
                background: selected ? token.colorPrimaryBg : undefined,
                color: selected ? token.colorPrimary : token.colorText,
              }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${expanded ? '折叠' : '展开'} ${node.title}`}
                  onClick={() => onToggleExpand(node)}
                  style={{
                    width: 28,
                    height: 28,
                    border: 0,
                    borderRadius: token.borderRadiusSM,
                    color: token.colorTextTertiary,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {expanded ? <DownOutlined /> : <RightOutlined />}
                </button>
              ) : (
                <span aria-hidden="true" style={{ width: 28 }} />
              )}

              <button
                type="button"
                role="treeitem"
                aria-selected={selected}
                aria-expanded={hasChildren ? expanded : undefined}
                disabled={node.disabled}
                onClick={() => onSelect(node)}
                style={{
                  minWidth: 0,
                  flex: 1,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  gap: token.marginXS,
                  border: 0,
                  borderRadius: token.borderRadius,
                  background: 'transparent',
                  color: 'inherit',
                  cursor: node.disabled ? 'not-allowed' : 'pointer',
                  opacity: node.disabled ? 0.45 : 1,
                  textAlign: 'start',
                  paddingInline: token.paddingXXS,
                }}
              >
                {node.icon ? <span aria-hidden="true" style={{ display: 'inline-flex' }}>{node.icon}</span> : null}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
                {node.tag ? <span>{node.tag}</span> : null}
              </button>
              {node.actions ? (
                <span
                  onClick={(event) => event.stopPropagation()}
                  style={{ display: 'inline-flex', flexShrink: 0 }}
                >
                  {node.actions}
                </span>
              ) : null}
            </Flex>

            {hasChildren && expanded ? (
              <NeTreeNodeList
                nodes={node.children ?? []}
                level={level + 1}
                selectedKey={selectedKey}
                expandedKeys={expandedKeys}
                indentSize={indentSize}
                searchActive={searchActive}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function NeTree({
  title,
  dataSource,
  selectedKey,
  defaultSelectedKey,
  expandedKeys,
  defaultExpandedKeys,
  extra,
  searchable = false,
  searchPlaceholder = '搜索',
  emptyText = '暂无数据',
  className,
  style,
  onSelect,
  onExpand,
}: NeTreeProps) {
  const { token } = antdTheme.useToken();
  const [internalSelectedKey, setInternalSelectedKey] = useState(defaultSelectedKey);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(() => defaultExpandedKeys ?? collectExpandableKeys(dataSource));
  const [keyword, setKeyword] = useState('');

  const effectiveSelectedKey = selectedKey ?? internalSelectedKey;
  const effectiveExpandedKeys = expandedKeys ?? internalExpandedKeys;
  const filteredData = useMemo(() => filterTree(dataSource, keyword), [dataSource, keyword]);
  const searchActive = keyword.trim().length > 0;

  useEffect(() => {
    if (!expandedKeys) {
      setInternalExpandedKeys(defaultExpandedKeys ?? collectExpandableKeys(dataSource));
    }
  }, [dataSource, defaultExpandedKeys, expandedKeys]);

  function updateExpandedKeys(nextKeys: string[]) {
    if (!expandedKeys) {
      setInternalExpandedKeys(nextKeys);
    }
    onExpand?.(nextKeys);
  }

  function handleSelect(node: NeTreeNode) {
    if (node.disabled) return;

    if (!selectedKey) {
      setInternalSelectedKey(node.key);
    }
    onSelect?.(node.key, node);
  }

  function handleToggleExpand(node: NeTreeNode) {
    const keySet = new Set(effectiveExpandedKeys);
    if (keySet.has(node.key)) {
      keySet.delete(node.key);
    } else {
      keySet.add(node.key);
    }
    updateExpandedKeys(Array.from(keySet));
  }

  const hasData = filteredData.length > 0;
  const showHeader = title !== null && title !== undefined || extra !== null && extra !== undefined;

  return (
    <Flex
      vertical
      gap={token.marginSM}
      className={className}
      style={{
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        padding: token.paddingMD,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorFillAlter,
        ...style,
      }}
    >
      {showHeader ? (
        <Flex align="center" justify="space-between" gap={token.marginSM} wrap style={{ flexShrink: 0 }}>
          {title !== null && title !== undefined ? <Typography.Text strong>{title}</Typography.Text> : null}
          {extra !== null && extra !== undefined ? <span>{extra}</span> : null}
        </Flex>
      ) : null}

      {searchable ? (
        <Input
          value={keyword}
          prefix={<SearchOutlined />}
          placeholder={searchPlaceholder}
          allowClear
          style={{ flexShrink: 0 }}
          onChange={(event) => setKeyword(event.target.value)}
        />
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          paddingInlineEnd: token.paddingXXS,
        }}
      >
        {hasData ? (
          <NeTreeNodeList
            nodes={filteredData}
            level={0}
            selectedKey={effectiveSelectedKey}
            expandedKeys={new Set(effectiveExpandedKeys)}
            indentSize={18}
            searchActive={searchActive}
            onSelect={handleSelect}
            onToggleExpand={handleToggleExpand}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        )}
      </div>
    </Flex>
  );
}

export type { NeTreeNode, NeTreeProps } from './types';

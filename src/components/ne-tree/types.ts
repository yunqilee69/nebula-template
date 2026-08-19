import type { CSSProperties, ReactNode } from 'react';

export interface NeTreeNode {
  key: string;
  title: string;
  searchText?: string;
  children?: NeTreeNode[];
  disabled?: boolean;
  icon?: ReactNode;
  tag?: ReactNode;
  actions?: ReactNode;
}

export interface NeTreeProps {
  title?: ReactNode;
  dataSource: NeTreeNode[];
  selectedKey?: string;
  defaultSelectedKey?: string;
  expandedKeys?: string[];
  defaultExpandedKeys?: string[];
  extra?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onSelect?: (key: string, node: NeTreeNode) => void;
  onExpand?: (expandedKeys: string[]) => void;
}

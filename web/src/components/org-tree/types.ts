import type { CSSProperties, ReactNode } from 'react';
import type { NeTreeNode } from '@/components/ne-tree/types';
import type { OrgTreeResp } from '@/types/auth-management';

export interface OrgTreeProps {
  /**
   * Organization tree data
   */
  dataSource: OrgTreeResp[];
  /**
   * Selected organization ID
   */
  selectedKey?: string;
  /**
   * Default selected organization ID for uncontrolled mode
   */
  defaultSelectedKey?: string;
  /**
   * Expanded keys for controlled mode
   */
  expandedKeys?: string[];
  /**
   * Default expanded keys for uncontrolled mode
   * @default All parent nodes are expanded
   */
  defaultExpandedKeys?: string[];
  /**
   * Panel title
   */
  title?: ReactNode;
  /**
   * Extra content in the header right side
   */
  extra?: ReactNode;
  extraRootNodes?: NeTreeNode[];
  renderNodeActions?: (org: OrgTreeResp, isRoot: boolean) => ReactNode;
  /**
   * Whether to show search input
   * @default true
   */
  searchable?: boolean;
  /**
   * Search input placeholder
   */
  searchPlaceholder?: string;
  /**
   * Empty state text
   */
  emptyText?: ReactNode;
  /**
   * Whether to show status tags
   * @default true
   */
  showStatusTags?: boolean;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Custom style
   */
  style?: CSSProperties;
  /**
   * Callback when an organization is selected
   */
  onSelect?: (orgId: string, org: OrgTreeResp | undefined) => void;
  /**
   * Callback when nodes are expanded or collapsed
   */
  onExpand?: (expandedKeys: string[]) => void;
}

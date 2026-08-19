import type { OrgOptionResp, OrgResp, OrgTreeResp } from '@/types/auth-management';

export interface OrgSelectProps {
  /**
   * Modal open state
   */
  open: boolean;
  /**
   * Modal title
   */
  title?: string;
  /**
   * Selection mode: single or multiple
   * @default 'single'
   */
  mode?: 'single' | 'multiple';
  /**
   * Currently selected organization IDs
   */
  value?: string | string[];
  /**
   * Organization tree data
   */
  treeData: OrgTreeResp[];
  /**
   * Organization list for display
   */
  orgList: OrgOptionResp[];
  /**
   * Placeholder text for trigger button
   */
  placeholder?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Callback when selection changes
   */
  onChange?: (value: string | string[] | undefined, orgs: OrgResp[] | OrgOptionResp[]) => void;
  /**
   * Callback when modal closes
   */
  onClose: () => void;
  /**
   * Custom service for pagination
   */
  service?: {
    pageOrgs: (params: { pageNum: number; pageSize: number; parentId?: string; name?: string }) => Promise<{ data: OrgResp[]; total: number }>;
  };
}
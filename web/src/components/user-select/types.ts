import type { OrgOptionResp, OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';

export interface UserSelectProps {
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
   * Currently selected user IDs
   */
  value?: string | string[];
  /**
   * Organization tree data
   */
  treeData: OrgTreeResp[];
  /**
   * Role list for filter
   */
  roles: RoleOptionResp[];
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
  onChange?: (value: string | string[] | undefined, users: UserResp[]) => void;
  /**
   * Callback when modal closes
   */
  onClose: () => void;
  /**
   * Custom service for pagination
   */
  service?: {
    pageUsers: (params: { pageNum: number; pageSize: number; orgId?: string; roleId?: string; username?: string; nickname?: string }) => Promise<{ data: UserResp[]; total: number }>;
  };
}
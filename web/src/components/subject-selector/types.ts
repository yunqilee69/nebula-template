import type { PermissionSubject, PermissionSubjectType } from '@/types/permission';

export interface SubjectSelectorProps {
  /**
   * Current active subject type tab
   */
  activeType: PermissionSubjectType;
  /**
   * Search keyword
   */
  keyword: string;
  /**
   * Organization subjects (tree structure)
   */
  orgSubjects: PermissionSubject[];
  /**
   * Role subjects (flat list)
   */
  roleSubjects: PermissionSubject[];
  /**
   * User subjects (flat list)
   */
  userSubjects: PermissionSubject[];
  /**
   * Currently selected subject
   */
  selectedSubject?: PermissionSubject;
  /**
   * Callback when subject type tab changes
   */
  onTypeChange: (type: PermissionSubjectType) => void;
  /**
   * Callback when search keyword changes
   */
  onKeywordChange: (keyword: string) => void;
  /**
   * Callback when a subject is selected
   */
  onSelect: (subject: PermissionSubject) => void;
}
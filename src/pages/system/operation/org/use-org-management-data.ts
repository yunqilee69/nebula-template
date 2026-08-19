import { useCallback, useEffect, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { AuthManagementService } from '@/api/auth-management';
import type { OrgOptionResp, OrgTreeResp, RoleOptionResp } from '@/types/auth-management';

interface UseOrgManagementDataOptions {
  readonly service: AuthManagementService;
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useOrgManagementData({ service }: UseOrgManagementDataOptions) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [tree, setTree] = useState<OrgTreeResp[]>([]);
  const [orgs, setOrgs] = useState<OrgOptionResp[]>([]);
  const [roles, setRoles] = useState<RoleOptionResp[]>([]);

  useEffect(() => {
    let cancelled = false;

    service.getOrgTree().then(
      (data) => { if (!cancelled) setTree(data); },
      (error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.orgManagement.feedback.treeLoadFailed'));
          console.error('Failed to load org tree', describeError(error));
        }
      },
    );
    service.listOrgs().then(
      (data) => { if (!cancelled) setOrgs(data); },
      (error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.orgManagement.feedback.listLoadFailed'));
          console.error('Failed to load org list', describeError(error));
        }
      },
    );
    service.listRoles().then(
      (data) => { if (!cancelled) setRoles(data); },
      (error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.userManagement.feedback.optionsLoadFailed'));
          console.error('Failed to load role list', describeError(error));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [service, notice, t]);

  const refreshTreeAndOrgs = useCallback(async () => {
    try {
      const [nextTree, nextOrgs] = await Promise.all([service.getOrgTree(), service.listOrgs()]);
      setTree(nextTree);
      setOrgs(nextOrgs);
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.refreshFailed'));
      console.error('Failed to refresh org tree/orgs', describeError(error));
    }
  }, [service, notice, t]);

  return { tree, orgs, roles, refreshTreeAndOrgs };
}

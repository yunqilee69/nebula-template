import type { AuthManagementService } from '@/api/auth-management';
import { authManagementService as defaultAuthManagementService } from '@/api/auth-management';
import { NotificationSendPanel } from '@/pages/system/notify/components/notification-send-panel';
import { notifyService as defaultNotifyService } from '@/services/notify';
import type { NotifyService } from '@/services/notify';

type NotifySendAuthService = Pick<AuthManagementService, 'getOrgTree' | 'listRoles' | 'pageUsers'>;

export type NotifySendPageProps = {
  readonly notifyService?: NotifyService;
  readonly authService?: NotifySendAuthService;
};

export function NotifySendPage({
  notifyService: service = defaultNotifyService,
  authService = defaultAuthManagementService,
}: NotifySendPageProps) {
  return <NotificationSendPanel notifyService={service} authService={authService} />;
}

export default NotifySendPage;

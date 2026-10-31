import type { NebulaMessages } from '../../types';
import { audit } from './audit';
import { auth } from './auth';
import { common } from './common';
import { layout } from './layout';
import { loginLog } from './login-log';
import { onlineUser } from './online-user';
import { scheduler } from './scheduler';
import { siteMessage } from './site-message';
import { system } from './system';
import { tenantSettings } from './tenant-settings';

export const enUS: NebulaMessages = {
  common,
  layout,
  auth,
  system,
  tenantSettings,
  scheduler,
  audit,
  onlineUser,
  loginLog,
  siteMessage,
};

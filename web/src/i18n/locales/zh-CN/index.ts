import type { NebulaMessages } from '../../types';
import { audit } from './audit';
import { auth } from './auth';
import { common } from './common';
import { layout } from './layout';
import { scheduler } from './scheduler';
import { system } from './system';

export const zhCN: NebulaMessages = {
  common,
  layout,
  auth,
  system,
  scheduler,
  audit,
};

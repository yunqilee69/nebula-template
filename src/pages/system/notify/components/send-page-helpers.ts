import type { AuthManagementService } from '@/api/auth-management';
import type { UserResp } from '@/types/auth-management';
import type { ChannelType, ReceiverItem, SendNotifyReq } from '@/types/notify';

export type SendPlanCounts = {
  readonly channelCount: number;
  readonly selectedUserCount: number;
  readonly siteRecipientCount: number;
  readonly emailRecipientCount: number;
  readonly emailExcludedCount: number;
  readonly wecomTargetCount: number;
  readonly feishuTargetCount: number;
  readonly dingtalkTargetCount: number;
};

export type ValidSendPlan = {
  readonly kind: 'VALID';
  readonly request: SendNotifyReq;
  readonly counts: SendPlanCounts;
};

type InvalidSendPlan = {
  readonly kind: 'INVALID';
  readonly reason: 'CHANNELS_REQUIRED' | 'RECIPIENTS_REQUIRED' | 'EMAIL_RECIPIENTS_REQUIRED' | 'WECOM_TARGET_REQUIRED' | 'FEISHU_TARGET_REQUIRED' | 'DINGTALK_TARGET_REQUIRED';
};

type SendPlanInput = {
  readonly channelTypes?: readonly ChannelType[];
  readonly receiverItems: readonly ReceiverItem[];
  readonly templateCode: string;
  readonly templateParams: Readonly<Record<string, string>>;
  readonly channelTargetIds?: Readonly<Record<string, string>>;
};

type ReceiverUserService = Pick<AuthManagementService, 'pageUsers'>;

type ResolvedSource = {
  readonly sourceType: 'ROLE' | 'ORG';
  readonly sourceId: string;
  readonly pageSize?: number;
};

function assertNever(value: never): never {
  throw new TypeError(`Unexpected receiver source: ${String(value)}`);
}

export function mergeReceiverUsers(items: readonly ReceiverItem[]): readonly UserResp[] {
  const userIds = new Set<string>();
  const users: UserResp[] = [];

  for (const item of items) {
    for (const user of item.users) {
      if (userIds.has(user.id)) continue;
      userIds.add(user.id);
      users.push(user);
    }
  }

  return users;
}

export function extractCustomTemplateVariables(
  subjectTemplate: string | undefined,
  contentTemplate: string,
): readonly string[] {
  const variables: string[] = [];
  const seen = new Set<string>();
  const source = `${subjectTemplate ?? ''}\n${contentTemplate}`;

  for (const match of source.matchAll(/\$\{([^}]+)\}/g)) {
    const name = match[1]?.trim();
    if (!name || name.startsWith('notify.') || seen.has(name)) continue;
    seen.add(name);
    variables.push(name);
  }

  return variables;
}

export function createSendPlan(input: SendPlanInput): ValidSendPlan | InvalidSendPlan {
  const channelTypes = input.channelTypes ?? [];

  if (channelTypes.length === 0) {
    return { kind: 'INVALID', reason: 'CHANNELS_REQUIRED' };
  }

  const includesSite = channelTypes.includes('SITE');
  const includesEmail = channelTypes.includes('EMAIL');
  const includesWecom = channelTypes.includes('WECOM_GROUP_WEBHOOK');
  const includesFeishu = channelTypes.includes('FEISHU_GROUP_WEBHOOK');
  const includesDingTalk = channelTypes.includes('DINGTALK_GROUP_WEBHOOK');
  const users = mergeReceiverUsers(input.receiverItems);
  if ((includesSite || includesEmail) && users.length === 0) {
    return { kind: 'INVALID', reason: 'RECIPIENTS_REQUIRED' };
  }

  const emailUsers = users.filter((user) => Boolean(user.email?.trim()));
  if (includesEmail && emailUsers.length === 0) {
    return { kind: 'INVALID', reason: 'EMAIL_RECIPIENTS_REQUIRED' };
  }

  if (includesWecom && !input.channelTargetIds?.WECOM_GROUP_WEBHOOK?.trim()) {
    return { kind: 'INVALID', reason: 'WECOM_TARGET_REQUIRED' };
  }

  if (includesFeishu && !input.channelTargetIds?.FEISHU_GROUP_WEBHOOK?.trim()) {
    return { kind: 'INVALID', reason: 'FEISHU_TARGET_REQUIRED' };
  }

  if (includesDingTalk && !input.channelTargetIds?.DINGTALK_GROUP_WEBHOOK?.trim()) {
    return { kind: 'INVALID', reason: 'DINGTALK_TARGET_REQUIRED' };
  }

  const request: SendNotifyReq = {
    channelTypes,
    templateCode: input.templateCode,
    templateParams: input.templateParams,
    ...((includesSite || includesEmail) ? { receiverUserIds: users.map((user) => user.id) } : {}),
    ...(input.channelTargetIds ? { channelTargetIds: input.channelTargetIds } : {}),
  };

  return {
    kind: 'VALID',
    request,
    counts: {
      channelCount: channelTypes.length,
      selectedUserCount: users.length,
      siteRecipientCount: includesSite ? users.length : 0,
      emailRecipientCount: includesEmail ? emailUsers.length : 0,
      emailExcludedCount: includesEmail ? users.length - emailUsers.length : 0,
      wecomTargetCount: includesWecom ? 1 : 0,
      feishuTargetCount: includesFeishu ? 1 : 0,
      dingtalkTargetCount: includesDingTalk ? 1 : 0,
    },
  };
}

export async function loadAllUsersForSource(
  service: ReceiverUserService,
  source: ResolvedSource,
): Promise<readonly UserResp[]> {
  const pageSize = source.pageSize ?? 100;
  const users: UserResp[] = [];
  let pageNum = 1;
  let total = 0;

  do {
    const filter = (() => {
      switch (source.sourceType) {
        case 'ROLE':
          return { roleId: source.sourceId };
        case 'ORG':
          return { orgId: source.sourceId };
        default:
          return assertNever(source.sourceType);
      }
    })();
    const page = await service.pageUsers({ pageNum, pageSize, ...filter });
    users.push(...page.data);
    total = page.total;
    pageNum += 1;
  } while (users.length < total);

  return users;
}

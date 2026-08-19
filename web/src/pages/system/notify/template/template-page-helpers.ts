import { NEBULA_TABLE_DEFAULT_PAGE_SIZE } from '@/components/nebula-pro-table/params';
import type { NebulaPageReq } from '@/components/nebula-pro-table/params';
import type { NotifyService } from '@/services/notify';
import type {
  ChannelType,
  CreateNotifyTemplateReq,
  NotifyTemplateFieldReq,
  NotifyTemplateDetailResp,
  NotifyTemplatePageReq,
  UpdateNotifyTemplateVariantReq,
  TemplateVariable,
  UpdateNotifyTemplateReq,
} from '@/types/notify';

export const NOTIFY_CHANNEL_TYPE = 'NOTIFY_CHANNEL_TYPE';

export const WECOM_WEBHOOK_HELP_LINK = 'https://developer.work.weixin.qq.com/document/path/99110';
export const FEISHU_WEBHOOK_HELP_LINK = 'https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/bot-v3/bot-overview';
export const DINGTALK_WEBHOOK_HELP_LINK = 'https://open.dingtalk.com/document/orgapp/custom-robot-access';

export const ALL_CHANNEL_TYPES: readonly ChannelType[] = [
  'SITE',
  'EMAIL',
  'WECOM_GROUP_WEBHOOK',
  'FEISHU_GROUP_WEBHOOK',
  'DINGTALK_GROUP_WEBHOOK',
];

export const DEFAULT_VARIANTS: readonly UpdateNotifyTemplateVariantReq[] = ALL_CHANNEL_TYPES.map((channelType) => ({
  channelType,
  contentTemplate: '',
  enabled: false,
}));

export const SYSTEM_TEMPLATE_VARIABLES = [
  { kind: 'BUILTIN', name: 'notify.currentDateTime', description: '当前日期时间', builtin: true },
  { kind: 'BUILTIN', name: 'notify.currentDate', description: '当前日期', builtin: true },
  { kind: 'BUILTIN', name: 'notify.currentTime', description: '当前时间', builtin: true },
  { kind: 'BUILTIN', name: 'notify.timestamp', description: '当前时间戳', builtin: true },
  { kind: 'BUILTIN', name: 'notify.year', description: '当前年份', builtin: true },
  { kind: 'BUILTIN', name: 'notify.month', description: '当前月份', builtin: true },
  { kind: 'BUILTIN', name: 'notify.day', description: '当前日期中的日', builtin: true },
  { kind: 'BUILTIN', name: 'notify.hour', description: '当前小时', builtin: true },
  { kind: 'BUILTIN', name: 'notify.minute', description: '当前分钟', builtin: true },
  { kind: 'BUILTIN', name: 'notify.second', description: '当前秒', builtin: true },
  { kind: 'BUILTIN', name: 'notify.dayOfWeek', description: '当前星期', builtin: true },
  { kind: 'BUILTIN', name: 'notify.templateCode', description: '当前模板编码（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.channelType', description: '当前发送渠道（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.receiverUserId', description: '当前接收用户 ID（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.receiverEmail', description: '当前接收用户邮箱（自动）', builtin: true },
] as const satisfies readonly TemplateVariable[];

export type NotifyTemplateService = Pick<
  NotifyService,
  | 'pageNotifyTemplates'
  | 'getNotifyTemplate'
  | 'createNotifyTemplate'
  | 'updateNotifyTemplate'
  | 'deleteNotifyTemplate'
  | 'pageNotifyChannelTargets'
  | 'sendNotify'
>;

export interface NotifyTemplateTableQuery {
  readonly templateCode?: string;
  readonly templateName?: string;
  readonly channelType?: ChannelType;
}

export interface NotifyTemplateFormValues {
  readonly templateCode: string;
  readonly templateName: string;
  readonly remark?: string;
  readonly fields?: readonly NotifyTemplateFieldReq[];
  readonly variants: readonly UpdateNotifyTemplateVariantReq[];
}

export type NotifyTemplateFormState =
  | Readonly<{ mode: 'create' }>
  | Readonly<{ mode: 'update'; templateId: string }>;

export function extractCustomTemplateVariables(
  subjectTemplate: string | undefined,
  contentTemplate: string,
): readonly TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const names = new Set<string>();
  const pattern = /\$\{([A-Za-z_][A-Za-z0-9_.-]*)\}/g;

  for (const template of [subjectTemplate ?? '', contentTemplate]) {
    for (const match of template.matchAll(pattern)) {
      const name = match[1];
      if (!name || name.startsWith('notify.') || names.has(name)) continue;
      names.add(name);
      variables.push({ kind: 'CUSTOM', name, builtin: false });
    }
  }

  return variables;
}

export function extractCustomTemplateVariablesFromVariants(
  variants: readonly Pick<UpdateNotifyTemplateVariantReq, 'subjectTemplate' | 'contentTemplate'>[],
): readonly TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const names = new Set<string>();
  const pattern = /\$\{([A-Za-z_][A-Za-z0-9_.-]*)\}/g;

  for (const variant of variants) {
    for (const template of [variant.subjectTemplate ?? '', variant.contentTemplate]) {
      for (const match of template.matchAll(pattern)) {
        const name = match[1];
        if (!name || name.startsWith('notify.') || names.has(name)) continue;
        names.add(name);
        variables.push({ kind: 'CUSTOM', name, builtin: false });
      }
    }
  }

  return variables;
}

export function buildNotifyTemplatePageReq(
  params: NotifyTemplateTableQuery & Partial<NebulaPageReq>,
): NotifyTemplatePageReq {
  const templateCode = normalizeOptionalText(params.templateCode);
  const templateName = normalizeOptionalText(params.templateName);

  return {
    pageNum: params.pageNum ?? 1,
    pageSize: params.pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
    ...(templateCode ? { templateCode } : {}),
    ...(templateName ? { templateName } : {}),
    ...(params.channelType ? { channelType: params.channelType } : {}),
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
  };
}

export function toCreateNotifyTemplateReq(values: NotifyTemplateFormValues): CreateNotifyTemplateReq {
  return {
    templateCode: values.templateCode.trim(),
    templateName: values.templateName.trim(),
    fields: normalizeFields(values.fields),
    ...optionalTemplateFields(values),
  };
}

export function toUpdateNotifyTemplateReq(values: NotifyTemplateFormValues): UpdateNotifyTemplateReq {
  return {
    templateName: values.templateName.trim(),
    variants: normalizeVariants(values.variants),
    fields: normalizeFields(values.fields),
    ...optionalTemplateFields(values),
  };
}

export function toNotifyTemplateFormValues(
  detail: NotifyTemplateDetailResp,
): Partial<NotifyTemplateFormValues> {
  return {
    templateCode: detail.templateCode,
    templateName: detail.templateName,
    fields: detail.fields ?? [],
    variants: detail.variants ?? [],
    ...(detail.remark ? { remark: detail.remark } : {}),
  };
}

function optionalTemplateFields(
  values: NotifyTemplateFormValues,
): Pick<CreateNotifyTemplateReq, 'remark'> {
  const remark = normalizeOptionalText(values.remark);
  return {
    ...(remark ? { remark } : {}),
  };
}

function normalizeFields(values: readonly NotifyTemplateFieldReq[] | undefined): readonly NotifyTemplateFieldReq[] | undefined {
  const fields = values
    ?.filter((field) => normalizeOptionalText(field.fieldCode) && normalizeOptionalText(field.fieldName))
    .map((field) => ({
      ...(field.id ? { id: field.id } : {}),
      fieldCode: field.fieldCode.trim(),
      fieldName: field.fieldName.trim(),
      requiredFlag: field.requiredFlag ?? false,
      ...optionalFieldValues(field),
    }));
  return fields && fields.length > 0 ? fields : undefined;
}

function normalizeVariants(values: readonly UpdateNotifyTemplateVariantReq[]): readonly UpdateNotifyTemplateVariantReq[] {
  return values.map((variant) => ({
    ...(variant.id ? { id: variant.id } : {}),
    channelType: variant.channelType,
    contentTemplate: variant.contentTemplate.trim(),
    enabled: variant.enabled ?? false,
    ...optionalVariantValues(variant),
  }));
}

function optionalFieldValues(field: NotifyTemplateFieldReq): Pick<NotifyTemplateFieldReq, 'defaultValue' | 'exampleValue' | 'remark'> {
  const defaultValue = normalizeOptionalText(field.defaultValue);
  const exampleValue = normalizeOptionalText(field.exampleValue);
  const remark = normalizeOptionalText(field.remark);
  return {
    ...(defaultValue ? { defaultValue } : {}),
    ...(exampleValue ? { exampleValue } : {}),
    ...(remark ? { remark } : {}),
  };
}

function optionalVariantValues(
  variant: UpdateNotifyTemplateVariantReq,
): Pick<UpdateNotifyTemplateVariantReq, 'subjectTemplate' | 'remark'> {
  const subjectTemplate = normalizeOptionalText(variant.subjectTemplate);
  const remark = normalizeOptionalText(variant.remark);
  return {
    ...(subjectTemplate ? { subjectTemplate } : {}),
    ...(remark ? { remark } : {}),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

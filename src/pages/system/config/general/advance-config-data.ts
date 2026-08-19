import { DataType } from '@/types/param';
import type { GeneralConfigDTO } from '@/types/param';

/* ------------------------------------------------------------------ */
/*  配置项元数据 —— 映射 DTO 字段 + paramKey                            */
/* ------------------------------------------------------------------ */

export interface FieldConfig {
  /** 后端 GeneralConfigDTO 中的字段名 */
  readonly field: keyof GeneralConfigDTO;
  /** 在 sys_param 中的 paramKey */
  readonly paramKey: string;
  /** UI 显示名称 */
  readonly paramName: string;
  /** 描述 */
  readonly description: string;
  /** 数据类型 */
  readonly dataType: DataType;
  /** 选项编码（仅 SINGLE/MULTIPLE 时需要） */
  readonly optionCode?: string;
}

/* ------------------------------------------------------------------ */
/*  Config 常量内部类型 —— fields 结构                                  */
/* ------------------------------------------------------------------ */

interface ConfigGroup {
  readonly groupName: string;
  readonly fields: FieldConfig[];
}

interface ConfigTab {
  readonly tabName: string;
  readonly groups: ConfigGroup[];
}

/* ------------------------------------------------------------------ */
/*  运行时类型 —— params 结构（含值）、页面组件使用                      */
/* ------------------------------------------------------------------ */

export interface AdvanceParamItem {
  readonly paramKey: string;
  readonly paramName: string;
  readonly description: string;
  readonly paramValue: string;
  readonly dataType: DataType;
  readonly optionCode?: string;
}

export interface ParamGroup {
  readonly groupName: string;
  readonly params: AdvanceParamItem[];
}

export interface AdvanceTab {
  readonly tabName: string;
  readonly groups: ParamGroup[];
}

/* ------------------------------------------------------------------ */
/*  配置定义                                                           */
/* ------------------------------------------------------------------ */

export const TAB_CONFIGS: ConfigTab[] = [
  {
    tabName: '登录与注册',
    groups: [
      {
        groupName: '用户名登录',
        fields: [
          { field: 'usernameRegisterEnabled', paramKey: 'login.username.allow-register', paramName: '用户名注册开关', description: '用户名密码登录固定开启，仅注册开关允许运行时调整', dataType: DataType.BOOLEAN },
          { field: 'usernamePasswordMinLength', paramKey: 'login.username.password-min-length', paramName: '用户名密码最小长度', description: '用户名注册密码最小长度', dataType: DataType.INT },
          { field: 'usernamePasswordMaxLength', paramKey: 'login.username.password-max-length', paramName: '用户名密码最大长度', description: '用户名注册密码最大长度', dataType: DataType.INT },
          { field: 'usernameLoginFailMaxCount', paramKey: 'login.username.login-fail-max-count', paramName: '登录失败最大次数', description: '用户名登录失败最大次数，0 表示不开启失败锁定', dataType: DataType.INT },
          { field: 'usernameLockTimeHours', paramKey: 'login.username.lock-time-hours', paramName: '登录锁定时长（小时）', description: '用户名登录锁定时长，按小时配置', dataType: DataType.INT },
        ],
      },
      {
        groupName: '手机号登录',
        fields: [
          { field: 'phoneLoginEnabled', paramKey: 'login.phone.enabled', paramName: '手机号登录开关', description: '手机号登录开关', dataType: DataType.BOOLEAN },
          { field: 'phoneRegisterEnabled', paramKey: 'login.phone.allow-register', paramName: '手机号注册开关', description: '手机号注册开关', dataType: DataType.BOOLEAN },
          { field: 'phoneCodeExpireMinutes', paramKey: 'login.phone.code-expire-minutes', paramName: '验证码有效期（分钟）', description: '手机号验证码有效期', dataType: DataType.INT },
          { field: 'phoneSendIntervalSeconds', paramKey: 'login.phone.send-interval-seconds', paramName: '发送间隔（秒）', description: '手机号验证码发送间隔', dataType: DataType.INT },
        ],
      },
      {
        groupName: '邮箱登录',
        fields: [
          { field: 'emailLoginEnabled', paramKey: 'login.email.enabled', paramName: '邮箱登录开关', description: '邮箱登录开关', dataType: DataType.BOOLEAN },
          { field: 'emailRegisterEnabled', paramKey: 'login.email.allow-register', paramName: '邮箱注册开关', description: '邮箱注册开关', dataType: DataType.BOOLEAN },
          { field: 'emailCodeExpireMinutes', paramKey: 'login.email.code-expire-minutes', paramName: '验证码有效期（分钟）', description: '邮箱验证码有效期', dataType: DataType.INT },
          { field: 'emailSendIntervalSeconds', paramKey: 'login.email.send-interval-seconds', paramName: '发送间隔（秒）', description: '邮箱验证码发送间隔', dataType: DataType.INT },
        ],
      },
      {
        groupName: '第三方登录（OAuth2）',
        fields: [
          { field: 'oauth2Enabled', paramKey: 'login.oauth2.enabled', paramName: 'OAuth2 登录开关', description: 'OAuth2 登录总开关', dataType: DataType.BOOLEAN },
          { field: 'oauth2AllowRegister', paramKey: 'login.oauth2.allow-register', paramName: 'OAuth2 注册开关', description: 'OAuth2 注册开关', dataType: DataType.BOOLEAN },
          { field: 'oauth2GithubEnabled', paramKey: 'login.oauth2.provider.github.enabled', paramName: 'GitHub 登录', description: 'GitHub 登录提供商开关', dataType: DataType.BOOLEAN },
        ],
      },
    ],
  },
  {
    tabName: '审计',
    groups: [
      {
        groupName: '审计配置',
        fields: [
          { field: 'auditRequestMaxLength', paramKey: 'audit.request.max.length', paramName: '请求参数最大长度', description: '审计请求参数 JSON 最大字符数', dataType: DataType.INT },
          { field: 'auditResponseMaxLength', paramKey: 'audit.response.max.length', paramName: '响应数据最大长度', description: '审计响应数据 JSON 最大字符数', dataType: DataType.INT },
          { field: 'auditRetentionDays', paramKey: 'audit.retention.days', paramName: '记录保留天数', description: '审计记录定时清理保留天数', dataType: DataType.INT },
        ],
      },
    ],
  },
  { tabName: '字典', groups: [{ groupName: '字典配置', fields: [] }] },
  { tabName: '参数', groups: [{ groupName: '参数配置', fields: [] }] },
  {
    tabName: '通知',
    groups: [
      {
        groupName: '邮件配置',
        fields: [
          { field: 'notifyEmailSmtpHost', paramKey: 'notify.email.smtp-host', paramName: 'SMTP服务器地址', description: '邮件SMTP服务器地址，例如 smtp.example.com', dataType: DataType.STRING },
          { field: 'notifyEmailSmtpPort', paramKey: 'notify.email.smtp-port', paramName: 'SMTP端口', description: '邮件SMTP端口，常见为 465 或 587', dataType: DataType.INT },
          { field: 'notifyEmailSecurity', paramKey: 'notify.email.security', paramName: 'SMTP加密方式', description: '支持 NONE、STARTTLS、SSL', dataType: DataType.STRING, optionCode: 'notify_email_security' },
          { field: 'notifyEmailUsername', paramKey: 'notify.email.username', paramName: '邮箱账号', description: 'SMTP登录账号，同时作为邮件发件人', dataType: DataType.STRING },
          { field: 'notifyEmailPassword', paramKey: 'notify.email.password', paramName: '邮箱密码', description: 'SMTP登录密码或邮箱授权码', dataType: DataType.STRING, optionCode: 'password' },
        ],
      },
    ],
  },
  { tabName: '通信', groups: [{ groupName: '通信配置', fields: [] }] },
  {
    tabName: '存储',
    groups: [
      {
        groupName: '上传配置',
        fields: [
          { field: 'storageMultipartMaxFileSize', paramKey: 'spring.servlet.multipart.max-file-size', paramName: '单文件上传上限', description: 'Spring multipart 单个文件大小上限，例如 100MB；超过后可能触发 content too large/413', dataType: DataType.STRING },
          { field: 'storageMultipartMaxRequestSize', paramKey: 'spring.servlet.multipart.max-request-size', paramName: '单次请求上传上限', description: 'Spring multipart 单次请求总大小上限，例如 120MB；分片上传时应不小于单片文件大小', dataType: DataType.STRING },
        ],
      },
    ],
  },
  { tabName: '调度', groups: [{ groupName: '调度配置', fields: [] }] },
  { tabName: '前端', groups: [{ groupName: '前端配置', fields: [] }] },
];

const FIELD_CONFIGS = TAB_CONFIGS.flatMap((tab) => tab.groups.flatMap((group) => group.fields));

const FIELD_BY_PARAM_KEY = new Map(FIELD_CONFIGS.map((field) => [field.paramKey, field]));

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

/** DTO 值 → 字符串（用于发送到后端） */
export function valueToString(value: boolean | number | string | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

/** 字符串 → DTO 字段值（从后端反序列化） */
export function stringToValue(value: string, dataType: DataType): string | boolean | number {
  if (dataType === DataType.BOOLEAN) return value === 'true' || value === '1';
  if (dataType === DataType.INT || dataType === DataType.DOUBLE) {
    const n = dataType === DataType.INT ? parseInt(value, 10) : parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return value;
}

export function buildTabs(dto: GeneralConfigDTO): AdvanceTab[] {
  return TAB_CONFIGS.map((tab) => ({
    tabName: tab.tabName,
    groups: tab.groups.map((group) => ({
      groupName: group.groupName,
      params: group.fields.map((field) => ({
        paramKey: field.paramKey,
        paramName: field.paramName,
        description: field.description,
        paramValue: valueToString(dto[field.field]),
        dataType: field.dataType,
        optionCode: field.optionCode,
      })),
    })),
  }));
}

export function hasTabParams(tab: AdvanceTab): boolean {
  return tab.groups.some((group) => group.params.length > 0);
}

export function getVisibleTabs(tabs: readonly AdvanceTab[]): readonly AdvanceTab[] {
  return tabs.filter(hasTabParams);
}

export function getParamField(paramKey: string): FieldConfig | undefined {
  return FIELD_BY_PARAM_KEY.get(paramKey);
}

function parseBooleanValue(value: string): boolean {
  return value === 'true' || value === '1';
}

function parseNumberValue(value: string, dataType: DataType): number {
  const parsed = dataType === DataType.INT ? parseInt(value, 10) : parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function assignConfigValue(dto: GeneralConfigDTO, field: keyof GeneralConfigDTO, value: string, dataType: DataType): void {
  switch (field) {
    case 'usernameRegisterEnabled':
    case 'phoneLoginEnabled':
    case 'phoneRegisterEnabled':
    case 'emailLoginEnabled':
    case 'emailRegisterEnabled':
    case 'oauth2Enabled':
    case 'oauth2AllowRegister':
    case 'oauth2GithubEnabled':
      dto[field] = parseBooleanValue(value);
      return;
    case 'usernamePasswordMinLength':
    case 'usernamePasswordMaxLength':
    case 'usernameLoginFailMaxCount':
    case 'usernameLockTimeHours':
    case 'phoneCodeExpireMinutes':
    case 'phoneSendIntervalSeconds':
    case 'emailCodeExpireMinutes':
    case 'emailSendIntervalSeconds':
    case 'auditRequestMaxLength':
    case 'auditResponseMaxLength':
    case 'auditRetentionDays':
    case 'notifyEmailSmtpPort':
      dto[field] = parseNumberValue(value, dataType);
      return;
    case 'notifyEmailSmtpHost':
    case 'notifyEmailSecurity':
    case 'notifyEmailUsername':
    case 'notifyEmailPassword':
    case 'storageMultipartMaxFileSize':
    case 'storageMultipartMaxRequestSize':
      dto[field] = value;
      return;
  }
}

export function buildGeneralConfigPatch(dirtyMap: Readonly<Record<string, string>>): GeneralConfigDTO {
  const dto: GeneralConfigDTO = {};

  for (const [paramKey, value] of Object.entries(dirtyMap)) {
    const field = getParamField(paramKey);
    if (field === undefined) continue;
    assignConfigValue(dto, field.field, value, field.dataType);
  }

  return dto;
}

export function updateTabParamValues(tabs: readonly AdvanceTab[], dirtyMap: Readonly<Record<string, string>>): AdvanceTab[] {
  return tabs.map((tab) => ({
    ...tab,
    groups: tab.groups.map((group) => ({
      ...group,
      params: group.params.map((param) => {
        const value = dirtyMap[param.paramKey];
        return value === undefined ? param : { ...param, paramValue: value };
      }),
    })),
  }));
}

import type { NebulaPageReq } from '@/components/nebula-pro-table/params';

export const DataType = {
  STRING: 'STRING',
  INT: 'INT',
  DOUBLE: 'DOUBLE',
  BOOLEAN: 'BOOLEAN',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
} as const;

export type DataType = (typeof DataType)[keyof typeof DataType];

export interface SystemParamDetailResp {
  id?: string;
  paramKey?: string;
  paramName?: string;
  description?: string;
  paramValue?: string;
  dataType?: DataType;
  optionCode?: string;
  moduleCode?: string;
  builtin?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface SystemParamResp {
  id?: string;
  paramKey?: string;
  paramName?: string;
  description?: string;
  dataType?: DataType;
  moduleCode?: string;
  createTime?: string;
  updateTime?: string;
}

export interface SystemParamPageReq extends NebulaPageReq {
  paramKey?: string;
  paramName?: string;
  dataType?: DataType;
  moduleCode?: string;
}

export interface CreateSystemParamReq {
  paramKey: string;
  paramName: string;
  description?: string;
  paramValue?: string;
  dataType?: DataType;
  optionCode?: string;
  moduleCode?: string;
  builtin?: boolean;
}

export interface UpdateSystemParamReq {
  paramName: string;
  description?: string;
  paramValue?: string;
  dataType?: DataType;
  optionCode?: string;
  moduleCode?: string;
}

export interface ParamValueUpdateReq {
  paramKey: string;
  paramValue?: string;
}

export interface ParamValueUpdateResultResp {
  paramKey?: string;
  success?: boolean;
  message?: string;
}

export interface BatchUpdateResultResp {
  successCount?: number;
  failCount?: number;
  results?: ParamValueUpdateResultResp[];
}

/** 通用配置 DTO —— 对应后端 GET/PUT /api/general-config 的结构化配置 */
export interface GeneralConfigDTO {
  // 用户名登录
  usernameRegisterEnabled?: boolean;
  usernamePasswordMinLength?: number;
  usernamePasswordMaxLength?: number;
  usernameLoginFailMaxCount?: number;
  usernameLockTimeHours?: number;
  // 手机号登录
  phoneLoginEnabled?: boolean;
  phoneRegisterEnabled?: boolean;
  phoneCodeExpireMinutes?: number;
  phoneSendIntervalSeconds?: number;
  // 邮箱登录
  emailLoginEnabled?: boolean;
  emailRegisterEnabled?: boolean;
  emailCodeExpireMinutes?: number;
  emailSendIntervalSeconds?: number;
  // OAuth2
  oauth2Enabled?: boolean;
  oauth2AllowRegister?: boolean;
  oauth2GithubEnabled?: boolean;
  // 审计
  auditRequestMaxLength?: number;
  auditResponseMaxLength?: number;
  auditRetentionDays?: number;
  storageMultipartMaxFileSize?: string;
  storageMultipartMaxRequestSize?: string;
  notifyEmailSmtpHost?: string;
  notifyEmailSmtpPort?: number;
  notifyEmailSecurity?: string;
  notifyEmailUsername?: string;
  notifyEmailPassword?: string;
}

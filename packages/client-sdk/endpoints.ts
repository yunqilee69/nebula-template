/**
 * 接口路径常量。所有端（mobile / 后续小程序）只从这里取路径，不散落魔法字符串。
 *
 * <p>这里只放「路径字符串」，不放传输实现（axios/fetch）。带路径参数的端点用函数表达。</p>
 */

/** 认证与会话端点。 */
export const AUTH_ENDPOINTS = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  getAuthConfig: '/api/auth/get-auth-config',
  currentUser: '/api/auth/current-user',
  logout: '/api/auth/logout',
  sendPhoneCode: '/api/auth/send-phone-code',
  phoneLogin: '/api/auth/phone-login',
  sendEmailCode: '/api/auth/send-email-code',
  emailLogin: '/api/auth/email-login',
  forgotPasswordSendCode: '/api/auth/forgot-password/send-code',
  forgotPasswordVerifyCode: '/api/auth/forgot-password/verify-code',
  forgotPasswordChange: '/api/auth/forgot-password/change',
  profile: '/api/auth/profile',
  profilePassword: '/api/auth/profile/password',
  oauth2Bindings: '/api/auth/profile/oauth2/bindings',
  oauth2Binding: (providerId: string) =>
    `/api/auth/profile/oauth2/bindings/${encodeURIComponent(providerId)}`,
  loginRecordsPage: '/api/auth/profile/login-records/page',
} as const;

/** 启动引导与版本检查端点。 */
export const FRONTEND_ENDPOINTS = {
  init: '/api/frontend/init',
  appReleaseCheck: '/api/frontend/app-release/check',
} as const;

/** 文件存储端点。 */
export const STORAGE_ENDPOINTS = {
  uploadPolicy: '/api/storage/upload-policy',
  upload: '/api/storage/upload',
  uploadTasks: '/api/storage/upload-tasks',
  uploadTaskPart: (taskId: string, partNo: number) =>
    `/api/storage/upload-tasks/${encodeURIComponent(taskId)}/parts/${partNo}`,
  completeUploadTask: (taskId: string) =>
    `/api/storage/upload-tasks/${encodeURIComponent(taskId)}/complete`,
  bindUploadTask: (taskId: string) =>
    `/api/storage/upload-tasks/${encodeURIComponent(taskId)}/bind`,
  uploadTask: (taskId: string) => `/api/storage/upload-tasks/${encodeURIComponent(taskId)}`,
  file: (fileId: string) => `/api/storage/files/${encodeURIComponent(fileId)}`,
  filesPage: '/api/storage/files/page',
  download: '/api/storage/download',
  downloadLocation: '/api/storage/download-location',
  generateSignedUrl: '/api/storage/generate-signed-url',
  downloadSigned: '/api/storage/download-signed',
} as const;

/** 字典端点。 */
export const DICT_ENDPOINTS = {
  itemsByCode: (dictCode: string) => `/api/dict/items/dict/${encodeURIComponent(dictCode)}`,
} as const;

/** 系统参数端点。 */
export const PARAM_ENDPOINTS = {
  value: (key: string) => `/api/param/key/${encodeURIComponent(key)}`,
  boolean: (key: string) => `/api/param/key/${encodeURIComponent(key)}/boolean`,
  integer: (key: string) => `/api/param/key/${encodeURIComponent(key)}/integer`,
  detail: (key: string) => `/api/param/key/${encodeURIComponent(key)}/detail`,
} as const;

/** 站内信 / 公告 / 通知偏好 / 推送设备端点。 */
export const NOTIFY_ENDPOINTS = {
  siteMessagesPage: '/api/notify/site-messages/page',
  siteMessagesUnreadCount: '/api/notify/site-messages/unread-count',
  siteMessageRead: (id: string) => `/api/notify/site-messages/${encodeURIComponent(id)}/read`,
  siteMessageUnread: (id: string) => `/api/notify/site-messages/${encodeURIComponent(id)}/unread`,
  siteMessagesReadBatch: '/api/notify/site-messages/read',
  siteMessagesUnreadBatch: '/api/notify/site-messages/unread',
  announcementsCurrentPage: '/api/notify/announcements/current/page',
  announcementsCurrentPopup: '/api/notify/announcements/current/popup',
  announcementRead: (id: string) => `/api/notify/announcements/${encodeURIComponent(id)}/read`,
  preferencesCurrent: '/api/notify/preferences/current',
  preferencesCurrentReset: '/api/notify/preferences/current/reset',
  pushDevices: '/api/notify/push-devices',
  pushDevice: (deviceId: string) => `/api/notify/push-devices/${encodeURIComponent(deviceId)}`,
  pushDevicesHeartbeat: '/api/notify/push-devices/heartbeat',
  pushDevicesCurrent: '/api/notify/push-devices/current',
} as const;

/**
 * 匿名白名单端点：这些端点不带 `Authorization`。
 * 注意 `/api/frontend/init` 与版本检查、登录、刷新均在此列。
 */
export const ANONYMOUS_ENDPOINTS: readonly string[] = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.phoneLogin,
  AUTH_ENDPOINTS.emailLogin,
  AUTH_ENDPOINTS.sendPhoneCode,
  AUTH_ENDPOINTS.sendEmailCode,
  AUTH_ENDPOINTS.refresh,
  AUTH_ENDPOINTS.register,
  AUTH_ENDPOINTS.forgotPasswordSendCode,
  AUTH_ENDPOINTS.forgotPasswordVerifyCode,
  AUTH_ENDPOINTS.forgotPasswordChange,
  AUTH_ENDPOINTS.getAuthConfig,
  FRONTEND_ENDPOINTS.init,
  FRONTEND_ENDPOINTS.appReleaseCheck,
];

/** 判断路径是否属于匿名白名单（精确匹配，忽略查询串）。 */
export function isAnonymousEndpoint(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return ANONYMOUS_ENDPOINTS.includes(path);
}

import { App, Form } from 'antd';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { tenantProfileService } from '@/api/tenant-profile';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantBrandStore } from '@/stores/tenant-brand-store';
import type {
  TenantAssetSlot,
  TenantAssetUploadTaskIds,
  TenantProfile,
  UpdateTenantProfileReq,
} from '@/types/tenant-profile';
import { hasPermission } from '@/utils/permissions';

/** 企业资料的保存按钮权限码：与后端 `TenantProfileController#updateProfile` 对应。 */
const profileUpdatePermission = 'BUTTON:TENANT_PROFILE_UPDATE:Allow';

type TenantAssetTaskIds = Partial<Record<TenantAssetSlot, string>>;

/**
 * 企业资料表单值：图片资源位只存待提交的上传任务 id，图片地址来自保存响应。
 */
export type TenantProfileFormValues = Omit<UpdateTenantProfileReq, 'uploadTaskIds'> & {
  assetTaskIds?: TenantAssetTaskIds;
};

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function toFormValues(profile: TenantProfile): TenantProfileFormValues {
  return {
    name: profile.name,
    shortName: profile.shortName,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    website: profile.website,
    address: profile.address,
    industry: profile.industry,
    description: profile.description,
    locale: profile.locale,
    timezone: profile.timezone,
    branding: {
      loginTitle: profile.branding?.loginTitle,
      loginSubtitle: profile.branding?.loginSubtitle,
      themeColor: profile.branding?.themeColor,
    },
  };
}

/** 聚合待提交的资源位上传任务：只提交有 taskId 的资源位，单值资源位每个 key 恰好一个元素。 */
export function toUploadTaskIds(assetTaskIds: TenantAssetTaskIds | undefined): TenantAssetUploadTaskIds | undefined {
  const entries = Object.entries(assetTaskIds ?? {})
    .map(([slot, taskId]) => [slot as TenantAssetSlot, normalizeText(taskId)] as const)
    .filter((entry): entry is readonly [TenantAssetSlot, string] => Boolean(entry[1]));
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries.map(([slot, taskId]) => [slot, [taskId]])) as TenantAssetUploadTaskIds;
}

function toRequest(values: TenantProfileFormValues): UpdateTenantProfileReq {
  const branding = values.branding ?? {};
  const uploadTaskIds = toUploadTaskIds(values.assetTaskIds);
  return {
    name: values.name.trim(),
    shortName: normalizeText(values.shortName),
    contactEmail: normalizeText(values.contactEmail),
    contactPhone: normalizeText(values.contactPhone),
    website: normalizeText(values.website),
    address: normalizeText(values.address),
    industry: normalizeText(values.industry),
    description: normalizeText(values.description),
    locale: normalizeText(values.locale),
    timezone: normalizeText(values.timezone),
    branding: {
      loginTitle: normalizeText(branding.loginTitle),
      loginSubtitle: normalizeText(branding.loginSubtitle),
      themeColor: normalizeText(branding.themeColor),
    },
    ...(uploadTaskIds ? { uploadTaskIds } : {}),
  };
}

interface TenantProfileContextValue {
  /** 表单实例：基础信息与品牌两个 tab 共用，切换 tab 不丢已填值。 */
  readonly form: ReturnType<typeof Form.useForm<TenantProfileFormValues>>[0];
  readonly profile: TenantProfile | null;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly canUpdate: boolean;
  /** 重新拉取企业资料。 */
  readonly reload: () => Promise<void>;
  /** 校验当前表单并保存；基础信息与品牌两个 tab 的保存按钮都调它。 */
  readonly save: () => Promise<void>;
}

const TenantProfileContext = createContext<TenantProfileContextValue | null>(null);

/**
 * 供企业资料相关 tab 共享的状态容器。
 *
 * <p>基础信息与品牌共用同一个 `PUT /api/auth/tenant/profile` 接口与一份表单，
 * 因此状态必须提到 tab 之上；登录与安全（OAuth2）和存储各有自己的接口，不走这里。</p>
 */
export function TenantProfileProvider({ enabled = true, children }: {
  /** 是否为当前用户加载企业资料：没有查询权限时静默跳过，不弹加载失败。 */
  readonly enabled?: boolean;
  readonly children: ReactNode;
}) {
  const { message } = App.useApp();
  const { t } = useNebulaI18n();
  const [form] = Form.useForm<TenantProfileFormValues>();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const canUpdate = hasPermission(permissions, profileUpdatePermission, { roles });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await tenantProfileService.getProfile();
      setProfile(nextProfile);
      form.setFieldsValue(toFormValues(nextProfile));
    } catch {
      void message.error(t('tenantSettings.feedback.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [form, message, t]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void reload();
  }, [enabled, reload]);

  const save = useCallback(async () => {
    let values: TenantProfileFormValues;
    try {
      values = await form.validateFields();
    } catch {
      // 校验失败由 Form.Item 就地提示，不再弹全局错误
      return;
    }
    setSaving(true);
    try {
      const updated = await tenantProfileService.updateProfile(toRequest(values));
      setProfile(updated);
      // 保存成功后清空待提交的上传任务：图片地址以保存响应为准
      form.setFieldsValue({ ...toFormValues(updated), assetTaskIds: undefined });

      const authStore = useAuthStore.getState();
      if (authStore.user) {
        authStore.setUser({ ...authStore.user, tenantName: updated.name });
      }
      useTenantBrandStore.getState().setTenant({
        tenantId: updated.id,
        code: updated.code,
        name: updated.name,
        shortName: updated.shortName,
        logo: updated.logo,
        contactEmail: updated.contactEmail,
        contactPhone: updated.contactPhone,
        website: updated.website,
        address: updated.address,
        industry: updated.industry,
        description: updated.description,
        locale: updated.locale,
        timezone: updated.timezone,
        branding: updated.branding,
        status: updated.status,
      });

      void message.success(t('tenantSettings.feedback.saveSuccess'));
    } catch {
      void message.error(t('tenantSettings.feedback.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [form, message, t]);

  const value = useMemo<TenantProfileContextValue>(
    () => ({ form, profile, loading, saving, canUpdate, reload, save }),
    [form, profile, loading, saving, canUpdate, reload, save],
  );

  return <TenantProfileContext.Provider value={value}>{children}</TenantProfileContext.Provider>;
}

/**
 * 读取企业资料状态。
 *
 * @return 供企业资料相关 tab 使用的上下文
 * @throws Error 在 {@link TenantProfileProvider} 之外调用时抛出
 */
export function useTenantProfile(): TenantProfileContextValue {
  const context = useContext(TenantProfileContext);
  if (context === null) {
    throw new Error('useTenantProfile 必须在 TenantProfileProvider 内使用');
  }
  return context;
}

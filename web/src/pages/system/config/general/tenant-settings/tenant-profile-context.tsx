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

/** 表单里的资源位值：只存待提交的上传任务 id（图片地址由上传组件自行解析，不进表单）。 */
type TenantAssetTaskIds = Partial<Record<TenantAssetSlot, string>>;

/**
 * 企业资料表单值：图片资源位只记待提交的上传任务 id。
 *
 * <p>图片列表由 `NeImageUpload` 按业务归属（`tenant-profile` + 资源位）自行解析下载地址，
 * 保存成功后组件通过 `refreshToken` 重新解析，不依赖资料响应回传地址。</p>
 */
export type TenantProfileFormValues = Omit<UpdateTenantProfileReq, 'uploadTaskIds'> & {
  assetTaskIds?: TenantAssetTaskIds;
};

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

/**
 * 可清空字段的提交值。
 *
 * <p>后端用 `null` 表示「本次未提交，保留旧值」、空字符串表示「明确清空」。JSON 会丢弃
 * `undefined`，所以清空后的输入必须显式提交空字符串，否则会被当成未提交而保留旧值。</p>
 */
function submittedText(value: string | undefined): string {
  return value?.trim() ?? '';
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
      footerCopyright: profile.branding?.footerCopyright,
      footerIcp: profile.branding?.footerIcp,
      footerContactEmail: profile.branding?.footerContactEmail,
      footerContactPhone: profile.branding?.footerContactPhone,
      footerWebsite: profile.branding?.footerWebsite,
    },
  };
}

/**
 * 聚合待提交的资源位上传任务：只提交有 taskId 的资源位，单值资源位每个 key 恰好一个元素。
 */
export function toUploadTaskIds(assetTaskIds: TenantAssetTaskIds | undefined): TenantAssetUploadTaskIds | undefined {
  const entries = Object.entries(assetTaskIds ?? {})
    .map(([slot, taskId]) => [slot as TenantAssetSlot, normalizeText(taskId)] as const)
    .filter((entry): entry is readonly [TenantAssetSlot, string] => Boolean(entry[1]));
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries.map(([slot, taskId]) => [slot, [taskId]])) as TenantAssetUploadTaskIds;
}

function toRequest(values: TenantProfileFormValues, deletedFileIds: string[]): UpdateTenantProfileReq {
  const branding = values.branding ?? {};
  const uploadTaskIds = toUploadTaskIds(values.assetTaskIds);
  return {
    name: values.name.trim(),
    shortName: submittedText(values.shortName),
    contactEmail: submittedText(values.contactEmail),
    contactPhone: submittedText(values.contactPhone),
    website: submittedText(values.website),
    address: submittedText(values.address),
    industry: submittedText(values.industry),
    description: submittedText(values.description),
    locale: submittedText(values.locale),
    timezone: submittedText(values.timezone),
    branding: {
      loginTitle: submittedText(branding.loginTitle),
      loginSubtitle: submittedText(branding.loginSubtitle),
      themeColor: submittedText(branding.themeColor),
      footerCopyright: submittedText(branding.footerCopyright),
      footerIcp: submittedText(branding.footerIcp),
      footerContactEmail: submittedText(branding.footerContactEmail),
      footerContactPhone: submittedText(branding.footerContactPhone),
      footerWebsite: submittedText(branding.footerWebsite),
    },
    ...(uploadTaskIds ? { uploadTaskIds } : {}),
    // 换图时被顶掉的旧图：与 uploadTaskIds 同批提交，后端先绑定新的、再释放这些
    ...(deletedFileIds.length > 0 ? { deletedFileIds } : {}),
  };
}

interface TenantProfileContextValue {
  /** 表单实例：企业资料与品牌两个 tab 共用，切换 tab 不丢已填值。 */
  readonly form: ReturnType<typeof Form.useForm<TenantProfileFormValues>>[0];
  readonly profile: TenantProfile | null;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly canUpdate: boolean;
  /** 资源位数据版本：保存成功后自增，上传组件据此重新解析下载地址。 */
  readonly assetVersion: number;
  /** 上报某个资源位被顶掉/删除的正式文件 ID（随保存一并提交）。 */
  readonly reportRemovedFileIds: (slot: TenantAssetSlot, fileIds: string[]) => void;
  /** 重新拉取企业资料。 */
  readonly reload: () => Promise<void>;
  /** 校验当前表单并保存；企业资料与品牌两个 tab 的保存按钮都调它。 */
  readonly save: () => Promise<void>;
}

const TenantProfileContext = createContext<TenantProfileContextValue | null>(null);

/**
 * 供企业资料相关 tab 共享的状态容器。
 *
 * <p>企业资料与品牌共用同一个 `PUT /api/auth/tenant/profile` 接口与一份表单，
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
  const [assetVersion, setAssetVersion] = useState(0);
  /** 各资源位待释放的旧文件：key 为资源位，value 为文件 ID 列表。 */
  const [removedFileIds, setRemovedFileIds] = useState<Partial<Record<TenantAssetSlot, string[]>>>({});

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
      // `assetTaskIds` 不是受控 Form.Item（图片资源位由上传组件自己解析地址），
      // validateFields 不会带出它，这里显式补一次
      values = { ...(await form.validateFields()), assetTaskIds: form.getFieldValue('assetTaskIds') };
    } catch {
      // 校验失败由 Form.Item 就地提示，不再弹全局错误
      return;
    }
    setSaving(true);
    try {
      const updated = await tenantProfileService.updateProfile(
        toRequest(values, Object.values(removedFileIds).flat()),
      );
      setProfile(updated);
      // 保存成功：清空待提交的 taskId，并让资源位组件重新解析一次下载地址（三元组没变但文件变了）
      form.setFieldsValue(toFormValues(updated));
      form.setFieldsValue({ assetTaskIds: undefined });
      setAssetVersion((version) => version + 1);
      // 旧的已被释放：清空待删除集合，避免下一次保存重复提交
      setRemovedFileIds({});

      const authStore = useAuthStore.getState();
      if (authStore.user) {
        authStore.setUser({ ...authStore.user, tenantName: updated.name });
      }
      // 资料响应不再回传图片地址：品牌（favicon / 背景图）改从 /api/frontend/init 重新拉取。
      // 等待强制刷新结束，但刷新失败只单独警告，不得进入资料保存失败分支。
      try {
        const refreshed = await useTenantBrandStore.getState().load({ force: true });
        if (refreshed === false) {
          void message.warning(t('tenantSettings.feedback.brandRefreshFailed'));
        }
      } catch {
        void message.warning(t('tenantSettings.feedback.brandRefreshFailed'));
      }

      void message.success(t('tenantSettings.feedback.saveSuccess'));
    } catch {
      void message.error(t('tenantSettings.feedback.saveFailed'));
    } finally {
      setSaving(false);
    }
    // 依赖 removedFileIds：save 是 useCallback，闭包里的待删除集合必须跟着状态更新
  }, [form, message, removedFileIds, t]);

  const value = useMemo<TenantProfileContextValue>(
    () => ({
      form, profile, loading, saving, canUpdate, assetVersion,
      reportRemovedFileIds: (slot: TenantAssetSlot, fileIds: string[]) =>
        setRemovedFileIds((previous) => ({ ...previous, [slot]: fileIds })),
      reload, save,
    }),
    [form, profile, loading, saving, canUpdate, assetVersion, reload, save],
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

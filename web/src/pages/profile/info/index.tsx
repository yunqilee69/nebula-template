import { Form, Space, Tabs, theme as antdTheme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import { profileService as defaultProfileService } from '@/api/profile';
import type { ProfileService } from '@/api/profile';
import { redirectToAuthorizeUrl } from '@/pages/login/wechat-redirect-navigation';
import { useAuthStore } from '@/stores/auth-store';
import type { OAuth2BindingResp, ProfileResp } from '@/types/profile';
import { createAvatarPreviewUrl, createAvatarUploadAdapter, revokeAvatarPreviewUrl } from './avatar-upload';
import type { AvatarUploadOutcome } from './avatar-upload';
import type { UploadTaskDetailResp } from '@/types/storage';
import { BasicProfileCard } from './basic-profile-card';
import type { ProfileFormValues } from './basic-profile-card';
import { buildProfilePayload, mergeProfileIntoCurrentUser } from './profile-save';
import { profileStorageService } from './profile-storage-service';
import { LoginRecordsCard, OAuth2BindingsCard, PasswordCard } from './section-cards';
import type { PasswordFormValues } from './section-cards';
import { PlatformAccountPanel } from './platform-account';

/** 保存个人资料时与头像相关的临时状态。 */
interface ProfileSaveOptions {
  /** 本次保存要提交的头像上传任务；缺省用页面上待提交的 taskId。 */
  readonly avatarTaskId?: string;
  /** 保存成功后写入全局用户态的本地预览地址。 */
  readonly avatarPreviewUrl?: string;
  /** 换头像时被顶掉的旧头像文件：随同一次保存提交，由后端释放引用。 */
  readonly deletedFileIds?: readonly string[];
}

export interface ProfileInfoPageProps {
  service?: ProfileService;
  /** 只负责把文件传成临时任务；保存与绑定由本页发起。 */
  uploadAvatar?: (file: File, onProgress?: (percent: number) => void) => Promise<AvatarUploadOutcome>;
}

export function ProfileInfoPage({ service: serviceProp, uploadAvatar }: ProfileInfoPageProps) {
  const service = serviceProp ?? defaultProfileService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();
  const setStoredUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);
  const multiTenant = Boolean(currentUser?.tenantId);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'platform' ? 'platform' : 'tenant',
  );
  const [form] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();

  const [profile, setProfile] = useState<ProfileResp>();
  const [avatarUrl, setAvatarUrl] = useState<string>();
  /** 已上传但尚未保存成功的头像任务：保存失败时保留，供下一次保存重试。 */
  const [pendingAvatarTaskId, setPendingAvatarTaskId] = useState<string>();
  const avatarPreviewUrl = useStoragePreviewUrl(avatarUrl);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [bindings, setBindings] = useState<OAuth2BindingResp[]>([]);
  const [bindingsLoading, setBindingsLoading] = useState(false);
  const [unbindProviderId, setUnbindProviderId] = useState<string>();
  const [bindProviderId, setBindProviderId] = useState<string>();
  const storedAvatarPreviewUrlRef = useRef<string>();

  const replaceStoredAvatarPreviewUrl = useCallback((nextPreviewUrl: string | undefined) => {
    const previousPreviewUrl = storedAvatarPreviewUrlRef.current;
    storedAvatarPreviewUrlRef.current = nextPreviewUrl;
    if (previousPreviewUrl && previousPreviewUrl !== nextPreviewUrl) revokeAvatarPreviewUrl(previousPreviewUrl);
  }, []);

  const syncStoredUser = useCallback(
    (nextProfile: ProfileResp, avatarPreviewUrl?: string) => {
      const nextUser = mergeProfileIntoCurrentUser(useAuthStore.getState().user, nextProfile, avatarPreviewUrl);
      if (!nextUser) {
        revokeAvatarPreviewUrl(avatarPreviewUrl);
        return;
      }
      replaceStoredAvatarPreviewUrl(avatarPreviewUrl);
      setStoredUser(nextUser);
    },
    [replaceStoredAvatarPreviewUrl, setStoredUser],
  );

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const nextProfile = await service.getProfile();
      setProfile(nextProfile);
      setAvatarUrl(nextProfile.avatar);
      syncStoredUser(nextProfile);
      form.setFieldsValue({
        nickname: nextProfile.nickname,
        email: nextProfile.email,
        phone: nextProfile.phone,
      });
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.feedback.profileLoadFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load profile', message);
    } finally {
      setProfileLoading(false);
    }
  }, [form, notice, service, syncStoredUser, t]);

  const loadBindings = useCallback(async () => {
    setBindingsLoading(true);
    try {
      const result = await service.listOAuth2Bindings();
      setBindings(result.providers);
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.feedback.oauth2LoadFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load OAuth2 bindings', message);
    } finally {
      setBindingsLoading(false);
    }
  }, [notice, service, t]);

  useEffect(() => {
    void loadProfile();
    void loadBindings();
  }, [loadBindings, loadProfile]);

  const saveProfile = useCallback(
    async (values: ProfileFormValues, options: ProfileSaveOptions = {}) => {
      const avatarTaskId = options.avatarTaskId ?? pendingAvatarTaskId;
      // 换头像 = 删旧 + 加新：删除集合由上传组件在回调里回吐（见 handleAvatarUploaded）
      const updatedProfile = await service.updateProfile(
        buildProfilePayload(values, avatarTaskId, options.deletedFileIds),
      );
      // 头像地址以保存响应为准：绑定在保存流程内完成，响应里是最终地址
      setProfile(updatedProfile);
      setAvatarUrl(updatedProfile.avatar);
      syncStoredUser(updatedProfile, options.avatarPreviewUrl);
      form.setFieldsValue({
        nickname: updatedProfile.nickname,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
      });
      if (avatarTaskId) setPendingAvatarTaskId(undefined);
      return updatedProfile;
    },
    [form, pendingAvatarTaskId, service, syncStoredUser],
  );

  const submitProfile = useCallback(
    async (values: ProfileFormValues) => {
      setSaving(true);
      try {
        // 保存失败时 pendingAvatarTaskId 保持不变，下一次保存继续携带它重试
        await saveProfile(values);
        notice.success(t('auth.profileInfo.feedback.profileUpdateSuccess'));
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.profileUpdateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Profile update failed', message);
      } finally {
        setSaving(false);
      }
    },
    [notice, saveProfile, t],
  );

  const avatarUpload = useMemo(() => {
    if (uploadAvatar) return uploadAvatar;
    if (!profile?.id) return undefined;
    return createAvatarUploadAdapter(profileStorageService).uploadAvatar;
  }, [profile?.id, uploadAvatar]);

  /** 本次上传产出的本地预览地址：保存时交给页面同步到全局用户态（Header 头像） */
  const pendingAvatarPreviewRef = useRef<string>();

  /** 只负责上传：把文件传成临时任务，同时留一份本地预览地址给 Header 用。 */
  const uploadAvatarTask = useCallback(
    async (file: File, onProgress?: (percent: number) => void): Promise<UploadTaskDetailResp> => {
      if (!avatarUpload) throw new Error(t('auth.profileInfo.feedback.profileLoadFailed'));
      const outcome = await avatarUpload(file, onProgress);
      const previewUrl = outcome.previewUrl ?? createAvatarPreviewUrl(file);
      const previousPreview = pendingAvatarPreviewRef.current;
      pendingAvatarPreviewRef.current = previewUrl;
      if (previousPreview && previousPreview !== previewUrl) revokeAvatarPreviewUrl(previousPreview);
      return outcome.task;
    },
    [avatarUpload, t],
  );

  /**
   * 上传成功后的保存：组件回吐"新增 taskId + 被顶掉的旧 fileId"，两者一次提交。
   *
   * <p>保存失败时 taskId 与本地预览都保留（绑定尚未发生），用户可再次保存重试。</p>
   */
  const handleAvatarUploaded = useCallback(
    async (task: UploadTaskDetailResp, removedFileIds: string[]) => {
      setPendingAvatarTaskId(task.id);
      setSaving(true);
      try {
        await saveProfile(form.getFieldsValue(), {
          avatarTaskId: task.id,
          avatarPreviewUrl: pendingAvatarPreviewRef.current,
          deletedFileIds: removedFileIds,
        });
        notice.success(t('auth.profileInfo.feedback.profileUpdateSuccess'));
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.profileUpdateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Profile avatar auto-save failed', message);
      } finally {
        setSaving(false);
      }
    },
    [form, notice, saveProfile, t],
  );

  const unbindOAuth2 = useCallback(
    async (providerId: string) => {
      setUnbindProviderId(providerId);
      try {
        await service.unbindOAuth2(providerId);
        notice.success(t('auth.profileInfo.feedback.unbindSuccess'));
        await loadBindings();
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.unbindFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('OAuth2 unbind failed', message);
      } finally {
        setUnbindProviderId(undefined);
      }
    },
    [loadBindings, notice, service, t],
  );

  const startOAuth2Bind = useCallback(
    async (providerId: string) => {
      setBindProviderId(providerId);
      try {
        const prepareResult = await service.prepareOAuth2Bind({ providerId });
        redirectToAuthorizeUrl(prepareResult.authorizeUrl);
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.bindFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('OAuth2 bind prepare failed', message);
        setBindProviderId(undefined);
      }
    },
    [notice, service, t],
  );

  const submitPassword = useCallback(
    async (values: PasswordFormValues) => {
      setPasswordSaving(true);
      try {
        await service.changePassword({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        });
        passwordForm.resetFields();
        notice.success(t('auth.profileInfo.feedback.passwordChangeSuccess'));
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.passwordChangeFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Password change failed', message);
      } finally {
        setPasswordSaving(false);
      }
    },
    [notice, passwordForm, service, t],
  );

  const tenantContent = (
    <Space orientation="vertical" size={token.marginMD} className="w-full">
      <BasicProfileCard
        profile={profile}
        avatarUrl={avatarUrl}
        avatarPreviewUrl={avatarPreviewUrl}
        form={form}
        loading={profileLoading}
        saving={saving}
        uploadDisabled={saving || profileLoading || !profile?.id}
        onRefresh={loadProfile}
        onSubmit={submitProfile}
        uploadAvatarTask={uploadAvatarTask}
        onAvatarUploaded={handleAvatarUploaded}
      />

      <PasswordCard form={passwordForm} saving={passwordSaving} onSubmit={submitPassword} />

      <OAuth2BindingsCard
        bindings={bindings}
        loading={bindingsLoading}
        unbindProviderId={unbindProviderId}
        bindProviderId={bindProviderId}
        onRefresh={loadBindings}
        onUnbind={unbindOAuth2}
        onBind={startOAuth2Bind}
      />

      <LoginRecordsCard service={service} />
    </Space>
  );

  if (!multiTenant) {
    return tenantContent;
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        {
          key: 'tenant',
          label: '企业个人信息',
          children: tenantContent,
        },
        {
          key: 'platform',
          label: '平台个人信息',
          children: <PlatformAccountPanel />,
        },
      ]}
    />
  );
}

export default ProfileInfoPage;

import { Form, Space, theme as antdTheme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import { profileService as defaultProfileService } from '@/api/profile';
import type { ProfileService } from '@/api/profile';
import { redirectToAuthorizeUrl } from '@/pages/login/wechat-redirect-navigation';
import { useAuthStore } from '@/stores/auth-store';
import type { OAuth2BindingResp, ProfileResp } from '@/types/profile';
import { createAvatarUploadAdapter } from './avatar-upload';
import type { AvatarUploadResult } from './avatar-upload';
import { BasicProfileCard } from './basic-profile-card';
import type { ProfileFormValues } from './basic-profile-card';
import {
  buildProfilePayload,
  createAvatarPreviewUrl,
  keepSavedAvatar,
  mergeProfileIntoCurrentUser,
  revokeAvatarPreviewUrl,
} from './profile-save';
import { profileStorageService } from './profile-storage-service';
import { LoginRecordsCard, OAuth2BindingsCard, PasswordCard } from './section-cards';
import type { PasswordFormValues } from './section-cards';

export interface ProfileInfoPageProps {
  service?: ProfileService;
  uploadAvatar?: (file: File) => Promise<AvatarUploadResult>;
}

export function ProfileInfoPage({ service: serviceProp, uploadAvatar }: ProfileInfoPageProps) {
  const service = serviceProp ?? defaultProfileService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();
  const setStoredUser = useAuthStore((state) => state.setUser);
  const [form] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();

  const [profile, setProfile] = useState<ProfileResp>();
  const [avatarUrl, setAvatarUrl] = useState<string>();
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
    async (values: ProfileFormValues, nextAvatarUrl: string | undefined, avatarPreviewUrl?: string) => {
      const updatedProfile = await service.updateProfile(buildProfilePayload(values, nextAvatarUrl));
      const nextProfile = keepSavedAvatar(updatedProfile, nextAvatarUrl);
      setProfile(nextProfile);
      setAvatarUrl(nextProfile.avatar);
      syncStoredUser(nextProfile, avatarPreviewUrl);
      form.setFieldsValue({
        nickname: nextProfile.nickname,
        email: nextProfile.email,
        phone: nextProfile.phone,
      });
    },
    [form, service, syncStoredUser],
  );

  const submitProfile = useCallback(
    async (values: ProfileFormValues) => {
      setSaving(true);
      try {
        await saveProfile(values, avatarUrl);
        notice.success(t('auth.profileInfo.feedback.profileUpdateSuccess'));
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.profileUpdateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Profile update failed', message);
      } finally {
        setSaving(false);
      }
    },
    [avatarUrl, notice, saveProfile, t],
  );

  const avatarUpload = useMemo(() => {
    if (uploadAvatar) return uploadAvatar;
    if (!profile?.id) return undefined;
    return createAvatarUploadAdapter(profileStorageService, profile.id).uploadAvatar;
  }, [profile?.id, uploadAvatar]);

  const uploadAvatarFile = useCallback(
    async (file: File) => {
      if (!avatarUpload) throw new Error(t('auth.profileInfo.feedback.profileLoadFailed'));
      const result = await avatarUpload(file);
      const avatarPreviewUrl = createAvatarPreviewUrl(file);
      setSaving(true);
      try {
        await saveProfile(form.getFieldsValue(), result.avatarUrl, avatarPreviewUrl);
        notice.success(t('auth.profileInfo.feedback.profileUpdateSuccess'));
      } catch (error: unknown) {
        revokeAvatarPreviewUrl(avatarPreviewUrl);
        const message = error instanceof Error ? error.message : String(error);
        console.error('Profile avatar auto-save failed', message);
        throw new Error(t('auth.profileInfo.feedback.profileUpdateFailed'));
      } finally {
        setSaving(false);
      }
      return result;
    },
    [avatarUpload, form, notice, saveProfile, t],
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

  return (
    <>
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
          uploadAvatarFile={uploadAvatarFile}
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
    </>
  );
}

export default ProfileInfoPage;

import { CameraOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Descriptions, Form, Input, Space, Tag, Typography, Upload, message, theme as antdTheme } from 'antd';
import type { FormInstance, UploadProps } from 'antd';
import { createStyles } from 'antd-style';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { ProfileResp, UpdateProfileReq } from '@/types/profile';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AvatarUploadResult } from './avatar-upload';

export type ProfileFormValues = Omit<UpdateProfileReq, 'avatar'>;

const useStyles = createStyles(({ token }) => ({
  avatar: {
    background: token.colorPrimary,
    boxShadow: token.boxShadowTertiary,
  },
  avatarUploadTrigger: {
    position: 'relative',
    display: 'inline-flex',
    padding: 0,
    border: 0,
    borderRadius: '50%',
    background: 'transparent',
    color: 'inherit',
    lineHeight: 0,
    cursor: 'pointer',
    '&:focus-visible': {
      outline: `${token.lineWidthFocus}px solid ${token.colorPrimaryBorder}`,
      outlineOffset: token.marginXXS,
    },
    '&:hover .nebula-profile-avatar-overlay, &:focus-visible .nebula-profile-avatar-overlay': {
      opacity: 1,
    },
  },
  avatarUploadTriggerDisabled: {
    cursor: 'not-allowed',
    opacity: token.opacityLoading,
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: token.colorBgMask,
    color: token.colorTextLightSolid,
    fontSize: token.fontSizeLG,
    opacity: 0,
    pointerEvents: 'none',
    transition: `opacity ${token.motionDurationMid} ${token.motionEaseOut}`,
  },
  avatarHint: {
    display: 'block',
  },
}));

interface LocalAvatarPreview {
  readonly url: string;
  readonly avatarUrl?: string;
}

interface BasicProfileCardProps {
  readonly profile?: ProfileResp;
  readonly avatarUrl?: string;
  readonly avatarPreviewUrl?: string;
  readonly form: FormInstance<ProfileFormValues>;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly uploadDisabled: boolean;
  readonly onRefresh: () => void | Promise<void>;
  readonly onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  readonly uploadAvatarFile: (file: File) => Promise<AvatarUploadResult>;
}

function getAvatarUploadErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createLocalAvatarPreview(file: File): LocalAvatarPreview | undefined {
  if (typeof URL.createObjectURL !== 'function') return undefined;
  return { url: URL.createObjectURL(file) };
}

export function BasicProfileCard({
  profile,
  avatarUrl,
  avatarPreviewUrl,
  form,
  loading,
  saving,
  uploadDisabled,
  onRefresh,
  onSubmit,
  uploadAvatarFile,
}: BasicProfileCardProps) {
  const { t } = useNebulaI18n();
  const { token } = antdTheme.useToken();
  const { styles } = useStyles();
  const [localAvatarPreview, setLocalAvatarPreview] = useState<LocalAvatarPreview>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const renderNotProvided = (value: string | number | undefined) => value ?? t('auth.profileInfo.empty.notProvided');
  const avatarFallback = profile?.nickname?.slice(0, 1) ?? profile?.username?.slice(0, 1);
  const avatarAlt = t('auth.profileInfo.fields.avatar');
  const avatarDisplayUrl = localAvatarPreview?.url ?? avatarPreviewUrl;
  const avatarUploadDisabled = uploadDisabled || avatarUploading;

  useEffect(() => {
    if (!localAvatarPreview?.avatarUrl) return;
    if (avatarUrl !== localAvatarPreview.avatarUrl) {
      setLocalAvatarPreview(undefined);
    }
  }, [avatarUrl, localAvatarPreview?.avatarUrl]);

  useEffect(() => {
    const previewUrl = localAvatarPreview?.url;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [localAvatarPreview?.url]);

  const beforeAvatarUpload = useCallback<NonNullable<UploadProps['beforeUpload']>>(
    (file) => {
      const preview = createLocalAvatarPreview(file);
      if (preview) setLocalAvatarPreview(preview);
      setAvatarUploading(true);
      void uploadAvatarFile(file)
        .then((result) => {
          if (preview) setLocalAvatarPreview({ ...preview, avatarUrl: result.avatarUrl });
        })
        .catch((error: unknown) => {
          setLocalAvatarPreview(undefined);
          void message.error(getAvatarUploadErrorMessage(error, t('auth.profileInfo.feedback.avatarUploadFailed')));
        })
        .finally(() => {
          setAvatarUploading(false);
        });
      return Upload.LIST_IGNORE;
    },
    [t, uploadAvatarFile],
  );

  const avatarTriggerClassName = useMemo(
    () => `${styles.avatarUploadTrigger}${avatarUploadDisabled ? ` ${styles.avatarUploadTriggerDisabled}` : ''}`,
    [avatarUploadDisabled, styles.avatarUploadTrigger, styles.avatarUploadTriggerDisabled],
  );

  return (
    <Card title={t('auth.profileInfo.sections.basic')} loading={loading} extra={<Button icon={<ReloadOutlined />} onClick={() => void onRefresh()}>{t('auth.profileInfo.actions.refresh')}</Button>}>
      <Space orientation="vertical" size={token.marginMD} className="w-full">
        <Space align="center" size={token.marginMD}>
          <Space orientation="vertical" align="center" size={token.marginXXS}>
            <Upload accept="image/*" disabled={avatarUploadDisabled} showUploadList={false} beforeUpload={beforeAvatarUpload}>
              <button type="button" aria-label={t('auth.profileInfo.actions.uploadAvatar')} className={avatarTriggerClassName} disabled={avatarUploadDisabled}>
                <Avatar src={avatarDisplayUrl} alt={avatarAlt} size={88} className={styles.avatar}>
                  {avatarFallback}
                </Avatar>
                <span className={`${styles.avatarOverlay} nebula-profile-avatar-overlay`} aria-hidden="true">
                  {avatarUploading ? <LoadingOutlined /> : <CameraOutlined />}
                </span>
              </button>
            </Upload>
            <Typography.Text type="secondary" className={styles.avatarHint}>{t('auth.profileInfo.hints.avatarUpload')}</Typography.Text>
          </Space>
          <Descriptions column={2} size="small">
            <Descriptions.Item label={t('auth.profileInfo.fields.accountName')}>{renderNotProvided(profile?.username)}</Descriptions.Item>
            <Descriptions.Item label={t('auth.profileInfo.fields.displayName')}>{renderNotProvided(profile?.nickname)}</Descriptions.Item>
            <Descriptions.Item label={t('auth.profileInfo.fields.status')}>
              <Tag color={profile?.status === 1 ? 'success' : 'default'}>{profile?.status === 1 ? t('auth.profileInfo.status.enabled') : t('auth.profileInfo.status.disabled')}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('auth.profileInfo.fields.createTime')}>{renderNotProvided(profile?.createTime)}</Descriptions.Item>
          </Descriptions>
        </Space>
        <Form form={form} layout="vertical" onFinish={(values) => void onSubmit(values)}>
          <Form.Item name="nickname" label={t('auth.profileInfo.fields.nickname')} htmlFor="profile-nickname">
            <Input id="profile-nickname" allowClear placeholder={t('auth.profileInfo.placeholders.nickname')} />
          </Form.Item>
          <Form.Item name="email" label={t('auth.profileInfo.fields.email')} htmlFor="profile-email" rules={[{ type: 'email', message: t('auth.profileInfo.validation.email') }]}> 
            <Input id="profile-email" allowClear placeholder={t('auth.profileInfo.placeholders.email')} />
          </Form.Item>
          <Form.Item name="phone" label={t('auth.profileInfo.fields.phone')} htmlFor="profile-phone">
            <Input id="profile-phone" allowClear placeholder={t('auth.profileInfo.placeholders.phone')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>{t('auth.profileInfo.actions.save')}</Button>
        </Form>
      </Space>
    </Card>
  );
}

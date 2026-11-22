import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Form, Input, Space, Tag, theme as antdTheme, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useMemo, useRef } from 'react';
import { parseStorageDownloadUrl } from '@/api/storage';
import { NeImageUpload } from '@/components/ne-upload';
import type { NeUploadFile } from '@/components/ne-upload';
import type { UploadTaskDetailResp } from '@/types/storage';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { ProfileResp, UpdateProfileReq } from '@/types/profile';

export type ProfileFormValues = Omit<UpdateProfileReq, 'uploadTaskIds'>;

/** 头像框边长（像素）。 */
const avatarFrameSize = 88;

const useStyles = createStyles(({ token }) => ({
  avatarPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: token.colorPrimary,
    color: token.colorTextLightSolid,
    fontSize: token.fontSizeHeading3,
    fontWeight: token.fontWeightStrong,
    lineHeight: 1,
  },
  avatarHint: {
    display: 'block',
  },
}));

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
  /** 只负责把文件传成临时任务（绑定与保存由页面在回吐回调里发起）。 */
  readonly uploadAvatarTask: (file: File, onProgress?: (percent: number) => void) => Promise<UploadTaskDetailResp>;
  /**
   * 上传成功回调：带上本次的新任务与"被顶掉的旧头像文件"。
   *
   * <p>页面在这里调用保存接口，把 `uploadTaskIds` 与 `deletedFileIds` 一次性提交。</p>
   */
  readonly onAvatarUploaded: (task: UploadTaskDetailResp, removedFileIds: string[]) => void | Promise<void>;
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
  uploadAvatarTask,
  onAvatarUploaded,
}: BasicProfileCardProps) {
  const { t } = useNebulaI18n();
  const { token } = antdTheme.useToken();
  const { styles } = useStyles();
  const renderNotProvided = (value: string | number | undefined) => value ?? t('auth.profileInfo.empty.notProvided');
  const avatarFallback = profile?.nickname?.slice(0, 1) ?? profile?.username?.slice(0, 1);
  const avatarAlt = t('auth.profileInfo.fields.avatar');

  // 业务直传的下载位置：头像地址来自资料响应，页面已把它解析成可直接渲染的地址
  // （受权限保护的 /api/storage/download 会先换成 blob），组件据此装载列表，不再自行发请求。
  // 地址变化（保存成功 / 重新加载资料）会触发组件重新装载，待保存的本地预览随之退场。
  const avatarLocations = useMemo(
    () => {
      // 只认"已解析成可直接渲染"的预览地址：受权限保护的下载地址还没换成 blob 时先不给种子，
      // 让组件保留本地待保存的预览，避免刚上传的图片被一张加载不出来的地址顶掉
      const url = avatarPreviewUrl?.trim();
      if (!url) return [];
      // fileId 从"正式下载地址"反解（预览地址可能是 blob，解析不出）：换图时组件靠它
      // 把被顶掉的旧头像报进"待删除"列表
      const fileId = parseStorageDownloadUrl(avatarUrl?.trim() ?? '')?.fileId;
      return [{ fileId, fileName: avatarAlt, mode: 'PROXY', url } as const];
    },
    [avatarAlt, avatarPreviewUrl, avatarUrl],
  );

  // 上传只产生临时任务；待删除集合由组件同步回吐（onRemovalChange 先于 onUploadSuccess 触发），
  // 页面拿到"新增 + 删除"两个列表后再调保存接口
  const removedFileIdsRef = useRef<string[]>([]);
  const handleRemovalChange = useCallback((fileIds: string[]) => {
    removedFileIdsRef.current = fileIds;
  }, []);

  const handleUploadSuccess = useCallback(
    (_file: NeUploadFile, task: UploadTaskDetailResp) => {
      // 组件的 onRemovalChange 同步先跑，这里读到的一定是本次换图后的最新待删除集合
      void onAvatarUploaded(task, removedFileIdsRef.current);
    },
    [onAvatarUploaded],
  );

  return (
    <Card title={t('auth.profileInfo.sections.basic')} loading={loading} extra={<Button icon={<ReloadOutlined />} onClick={() => void onRefresh()}>{t('auth.profileInfo.actions.refresh')}</Button>}>
      <Space orientation="vertical" size={token.marginMD} className="w-full">
        <Space align="center" size={token.marginMD}>
          <Space orientation="vertical" align="center" size={token.marginXXS}>
            <NeImageUpload
              downloadLocations={avatarLocations}
              uploadRequest={uploadAvatarTask}
              onUploadSuccess={handleUploadSuccess}
              removalMode="deferred"
              onRemovalChange={handleRemovalChange}
              imageAlt={avatarAlt}
              uploadText={t('auth.profileInfo.actions.uploadAvatar')}
              helperText={<Typography.Text type="secondary" className={styles.avatarHint}>{t('auth.profileInfo.hints.avatarUpload')}</Typography.Text>}
              placeholder={avatarFallback ? <span className={styles.avatarPlaceholder}>{avatarFallback}</span> : undefined}
              accept="image/*"
              maxCount={1}
              replaceable
              shape="circle"
              thumbnailSize={avatarFrameSize}
              // 头像没有"清空"能力：不渲染删除按钮，换图靠再次选择
              removable={() => false}
              disabled={uploadDisabled}
            />
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

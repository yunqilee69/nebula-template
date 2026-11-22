import { Alert, App, Button, Col, Descriptions, Divider, Form, Input, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { appStorageService } from '@/api/storage-service';
import { NeImageUpload } from '@/components/ne-upload';
import type { NeUploadFile } from '@/components/ne-upload';
import type { TenantAssetSlot } from '@/types/tenant-profile';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { uploadTenantAssetTask } from './tenant-asset-upload';
import { useTenantProfile } from './tenant-profile-context';

function formatDateTime(value: string | undefined) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

const localeOptions = [
  { value: 'zh-CN', label: '简体中文（zh-CN）' },
  { value: 'en-US', label: 'English（en-US）' },
];

/** 资源位只接受位图：SVG 可能内嵌脚本，统一在前端先拦一次（服务端白名单仍是最终口径）。 */
const assetImageAccept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/x-icon,image/vnd.microsoft.icon';

/**
 * 单值资源位的缩略图尺寸。
 *
 * <p>企业资料图是标识类图片，用 `contain` 的矩形框展示，避免把 Logo 裁掉。</p>
 */
const assetThumbSize = { width: 140, height: 56 } as const;

/** 资源位里有待提交的 taskId 时给出「保存后生效」提示。 */
function pendingSaveHint(taskId: string | undefined, hint: string) {
  return taskId?.trim() ? hint : undefined;
}

/** 企业资料图的业务归属：与后端 `ProfileAssetBinder.SOURCE_ENTITY_TENANT_PROFILE` 一致。 */
const tenantProfileSourceEntity = 'tenant-profile';

/**
 * 高级配置 → 企业信息：企业资料、登录页品牌与企业标识，三块共用一块页面。
 *
 * <p>资料与品牌共用同一个 `PUT /api/auth/tenant/profile`，一次保存覆盖全部字段；
 * 企业标识（企业代码、域名、状态）只读，紧跟在表单下方展示。</p>
 */
export function TenantInfoTab() {
  const { t } = useNebulaI18n();
  const { message } = App.useApp();
  const { form, profile, loading, saving, canUpdate, assetVersion, reportRemovedFileIds, reload, save } = useTenantProfile();
  // 待提交的 taskId 镜像：表单里 `assetTaskIds` 不是受控 Form.Item，`Form.useWatch` 监听不到
  // 它的变更，所以由组件回吐时就地记一份，仅用于「保存后生效」提示
  const [pendingSlotTaskIds, setPendingSlotTaskIds] = useState<Record<string, string | undefined>>({});
  const sourceId = profile?.id;

  // 保存成功后清空提示（provider 用自增的 assetVersion 通知）
  useEffect(() => {
    setPendingSlotTaskIds({});
  }, [assetVersion]);

  // 上传只把文件传成临时任务，返回给组件；绑定与最终地址由保存接口产出
  const uploadAsset = useCallback(
    async (file: File, onProgress?: (percent: number) => void) => {
      if (!file.type.startsWith('image/') || file.type.includes('svg')) {
        throw new Error(t('tenantSettings.feedback.imageOnly'));
      }
      return uploadTenantAssetTask(appStorageService, file, onProgress);
    },
    [t],
  );

  // 四个资源位的上传行为完全一致，只有展示名称与归属来源不同
  const assetUploadProps = useMemo(() => ({
    uploadRequest: uploadAsset,
    accept: assetImageAccept,
    uploadText: t('tenantSettings.actions.upload'),
    removeLabel: (file: NeUploadFile) => `${t('tenantSettings.actions.remove')} ${file.name}`,
    // 已保存的正式文件不在这里删除：资源位的清空要靠保存流程，删底层内容会误伤引用
    removable: (file: NeUploadFile) => Boolean(file.taskId),
    // 换图/删除都延迟到保存时统一释放引用：组件只回吐待删除的 fileId
    removalMode: 'deferred' as const,
    thumbnailSize: assetThumbSize.width,
    thumbnailHeight: assetThumbSize.height,
    maxCount: 1,
    replaceable: true,
    disabled: !canUpdate,
    onUploadSuccess: () => {
      void message.success(t('tenantSettings.feedback.uploadSuccess'));
    },
    onUploadError: (_file: NeUploadFile, error: unknown) => {
      const fallback = t('tenantSettings.feedback.uploadFailed');
      void message.error(error instanceof Error && error.message ? error.message : fallback);
    },
  }), [canUpdate, message, t, uploadAsset]);

  /** 组件回吐文件列表：表单只留待提交的 taskId（图片地址由组件自己解析）。 */
  const handleAssetChange = useCallback(
    (slot: TenantAssetSlot, files: NeUploadFile[]) => {
      const taskId = files[0]?.taskId;
      setPendingSlotTaskIds((prev) => (prev[slot] === taskId ? prev : { ...prev, [slot]: taskId }));
      // `assetTaskIds` 没有对应的 Form.Item（图片地址由组件自己解析），属于"未注册字段"：
      // 它不会进 validateFields()，Form.useWatch 也观察不到，所以这里既写表单又记本地镜像
      const current = (form.getFieldValue('assetTaskIds') ?? {}) as Record<string, string | undefined>;
      form.setFieldsValue({ assetTaskIds: { ...current, [slot]: taskId } });
    },
    [form],
  );


  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert type="info" showIcon title={t('tenantSettings.basic.description')} />
        <Space>
          <Button type="primary" loading={saving} disabled={!canUpdate} onClick={() => void save()}>
            {saving ? t('tenantSettings.actions.saving') : t('tenantSettings.actions.save')}
          </Button>
          <Button onClick={() => void reload()} loading={loading}>
            {t('tenantSettings.actions.refresh')}
          </Button>
        </Space>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label={t('tenantSettings.fields.name')}
                rules={[{ required: true, whitespace: true, message: t('tenantSettings.feedback.nameRequired') }]}
              >
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.name')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="shortName" label={t('tenantSettings.fields.shortName')}>
                <Input maxLength={64} placeholder={t('tenantSettings.placeholders.shortName')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contactEmail" label={t('tenantSettings.fields.contactEmail')}>
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.contactEmail')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contactPhone" label={t('tenantSettings.fields.contactPhone')}>
                <Input maxLength={32} placeholder={t('tenantSettings.placeholders.contactPhone')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="website"
                label={t('tenantSettings.fields.website')}
                rules={[{ pattern: /^https?:\/\//, message: t('tenantSettings.feedback.websiteInvalid') }]}
              >
                <Input maxLength={200} placeholder={t('tenantSettings.placeholders.website')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="industry" label={t('tenantSettings.fields.industry')}>
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.industry')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label={t('tenantSettings.fields.address')}>
                <Input maxLength={255} placeholder={t('tenantSettings.placeholders.address')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="locale" label={t('tenantSettings.fields.locale')}>
                <Select
                  allowClear
                  showSearch
                  options={localeOptions}
                  placeholder={t('tenantSettings.placeholders.locale')}
                  disabled={!canUpdate}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="timezone" label={t('tenantSettings.fields.timezone')}>
                <Input maxLength={64} placeholder={t('tenantSettings.placeholders.timezone')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label={t('tenantSettings.fields.description')}>
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  placeholder={t('tenantSettings.placeholders.description')}
                  disabled={!canUpdate}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label={t('tenantSettings.fields.logo')}
                extra={pendingSaveHint(pendingSlotTaskIds?.['logo'], t('tenantSettings.feedback.pendingSave'))}
              >
                <NeImageUpload
                  {...assetUploadProps}
                  imageAlt={t('tenantSettings.fields.logo')}
                  sourceEntity={tenantProfileSourceEntity}
                  sourceId={sourceId}
                  sourceType="logo"
                  refreshToken={assetVersion}
                  onChange={(files) => handleAssetChange('logo', files)}
                  onRemovalChange={(fileIds) => reportRemovedFileIds('logo', fileIds)}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Divider titlePlacement="start" plain>{t('tenantSettings.tabs.branding')}</Divider>
              <Typography.Text type="secondary">{t('tenantSettings.branding.description')}</Typography.Text>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={t('tenantSettings.fields.loginLogo')}
                extra={pendingSaveHint(pendingSlotTaskIds?.['login-logo'], t('tenantSettings.feedback.pendingSave'))}
              >
                <NeImageUpload
                  {...assetUploadProps}
                  imageAlt={t('tenantSettings.fields.loginLogo')}
                  sourceEntity={tenantProfileSourceEntity}
                  sourceId={sourceId}
                  sourceType="login-logo"
                  refreshToken={assetVersion}
                  onChange={(files) => handleAssetChange('login-logo', files)}
                  onRemovalChange={(fileIds) => reportRemovedFileIds('login-logo', fileIds)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={t('tenantSettings.fields.favicon')}
                extra={pendingSaveHint(pendingSlotTaskIds?.['favicon'], t('tenantSettings.feedback.pendingSave'))}
              >
                <NeImageUpload
                  {...assetUploadProps}
                  imageAlt={t('tenantSettings.fields.favicon')}
                  sourceEntity={tenantProfileSourceEntity}
                  sourceId={sourceId}
                  sourceType="favicon"
                  refreshToken={assetVersion}
                  onChange={(files) => handleAssetChange('favicon', files)}
                  onRemovalChange={(fileIds) => reportRemovedFileIds('favicon', fileIds)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['branding', 'loginTitle']} label={t('tenantSettings.fields.loginTitle')}>
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.loginTitle')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['branding', 'themeColor']} label={t('tenantSettings.fields.themeColor')}>
                <Input maxLength={7} placeholder={t('tenantSettings.placeholders.themeColor')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name={['branding', 'loginSubtitle']} label={t('tenantSettings.fields.loginSubtitle')}>
                <Input maxLength={200} placeholder={t('tenantSettings.placeholders.loginSubtitle')} disabled={!canUpdate} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label={t('tenantSettings.fields.loginBackground')}
                extra={pendingSaveHint(pendingSlotTaskIds?.['login-background'], t('tenantSettings.feedback.pendingSave'))}
              >
                <NeImageUpload
                  {...assetUploadProps}
                  imageAlt={t('tenantSettings.fields.loginBackground')}
                  sourceEntity={tenantProfileSourceEntity}
                  sourceId={sourceId}
                  sourceType="login-background"
                  refreshToken={assetVersion}
                  onChange={(files) => handleAssetChange('login-background', files)}
                  onRemovalChange={(fileIds) => reportRemovedFileIds('login-background', fileIds)}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Divider titlePlacement="start" plain>{t('tenantSettings.tabs.identity')}</Divider>
              {profile ? (
                <Descriptions
                  bordered
                  size="small"
                  column={2}
                  items={[
                    {
                      key: 'code',
                      label: t('tenantSettings.identity.code'),
                      children: <Typography.Text code>{profile.code}</Typography.Text>,
                    },
                    {
                      key: 'status',
                      label: t('tenantSettings.identity.status'),
                      children: (
                        <Tag color={profile.status === 'ACTIVE' ? 'green' : 'default'}>{profile.status || '-'}</Tag>
                      ),
                    },
                    {
                      key: 'domains',
                      label: t('tenantSettings.identity.domains'),
                      span: 2,
                      children: profile.domains.length > 0 ? (
                        <Space wrap size={4}>
                          {profile.domains.map((domain) => (
                            <Tag key={domain.id} color={domain.primaryDomain === 1 ? 'blue' : undefined}>
                              {domain.domain}
                              {domain.primaryDomain === 1 ? `（${t('tenantSettings.identity.primaryDomain')}）` : ''}
                            </Tag>
                          ))}
                        </Space>
                      ) : '-',
                    },
                    {
                      key: 'createTime',
                      label: t('tenantSettings.identity.createdAt'),
                      children: formatDateTime(profile.createTime),
                    },
                    {
                      key: 'updateTime',
                      label: t('tenantSettings.identity.updatedAt'),
                      children: formatDateTime(profile.updateTime),
                    },
                  ]}
                />
              ) : null}
            </Col>
          </Row>
        </Form>
        <Typography.Text type="secondary">{t('tenantSettings.readonlyHint')}</Typography.Text>
      </Space>
    </Spin>
  );
}

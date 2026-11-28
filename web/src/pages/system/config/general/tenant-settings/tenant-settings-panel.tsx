import { Alert, App, Col, Descriptions, Divider, Form, Input, Row, Select, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { appStorageService } from '@/api/storage-service';
import { NeImageUpload } from '@/components/ne-upload';
import type { NeUploadFile } from '@/components/ne-upload';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { TenantAssetSlot } from '@/types/tenant-profile';
import { uploadTenantAssetTask } from './tenant-asset-upload';
import { useTenantProfile } from './tenant-profile-context';

function formatDateTime(value: string | undefined) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

const localeOptions = [
  { value: 'zh-CN', label: '简体中文（zh-CN）' },
  { value: 'en-US', label: 'English（en-US）' },
];

// 与后端品牌资源位的图片类型白名单保持一致：不接受 SVG/HTML 等可执行内容。
const assetImageTypes = ['image/png', 'image/jpeg', 'image/gif'] as const;
const assetImageAccept = assetImageTypes.join(',');
const assetThumbSize = { width: 140, height: 56 } as const;
const tenantProfileSourceEntity = 'tenant-profile';

function pendingSaveHint(taskId: string | undefined, hint: string) {
  return taskId?.trim() ? hint : undefined;
}

function useTenantAssetControls() {
  const { t } = useNebulaI18n();
  const { message } = App.useApp();
  const { form, canUpdate, assetVersion, reportRemovedFileIds } = useTenantProfile();
  const [pendingSlotTaskIds, setPendingSlotTaskIds] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    setPendingSlotTaskIds({});
  }, [assetVersion]);

  const uploadAsset = useCallback(
    async (file: File, onProgress?: (percent: number) => void) => {
      if (!(assetImageTypes as readonly string[]).includes(file.type)) {
        throw new Error(t('tenantSettings.feedback.imageOnly'));
      }
      return uploadTenantAssetTask(appStorageService, file, onProgress);
    },
    [t],
  );

  const assetUploadProps = useMemo(() => ({
    uploadRequest: uploadAsset,
    accept: assetImageAccept,
    uploadText: t('tenantSettings.actions.upload'),
    removeLabel: (file: NeUploadFile) => `${t('tenantSettings.actions.remove')} ${file.name}`,
    removable: (file: NeUploadFile) => Boolean(file.taskId),
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

  const handleAssetChange = useCallback(
    (slot: TenantAssetSlot, files: NeUploadFile[]) => {
      const taskId = files[0]?.taskId;
      setPendingSlotTaskIds((previous) => (previous[slot] === taskId ? previous : { ...previous, [slot]: taskId }));
      const current = (form.getFieldValue('assetTaskIds') ?? {}) as Record<string, string | undefined>;
      form.setFieldsValue({ assetTaskIds: { ...current, [slot]: taskId } });
    },
    [form],
  );

  const renderAsset = useCallback((
    slot: TenantAssetSlot,
    label: string,
    sourceId: string | undefined,
    hint: string | undefined,
  ) => (
    <Form.Item
      label={label}
      tooltip={hint}
      extra={pendingSaveHint(pendingSlotTaskIds[slot], t('tenantSettings.feedback.pendingSave'))}
    >
      <NeImageUpload
        {...assetUploadProps}
        imageAlt={label}
        sourceEntity={tenantProfileSourceEntity}
        sourceId={sourceId}
        sourceType={slot}
        refreshToken={assetVersion}
        onChange={(files) => handleAssetChange(slot, files)}
        onRemovalChange={(fileIds) => reportRemovedFileIds(slot, fileIds)}
      />
    </Form.Item>
  ), [assetUploadProps, assetVersion, handleAssetChange, pendingSlotTaskIds, reportRemovedFileIds, t]);

  return { renderAsset };
}

/**
 * 品牌与站点：图片资源位放在最上方，企业资料与品牌资料按组排在下面，
 * 全部字段共用租户资料表单与同一次保存。
 */
export function TenantSettingsPanel() {
  const { t } = useNebulaI18n();
  const { profile, canUpdate } = useTenantProfile();
  const { renderAsset } = useTenantAssetControls();
  const sourceId = profile?.id;

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Divider titlePlacement="start" plain>{t('tenantSettings.groups.assets')}</Divider>
      <Alert type="info" showIcon title={t('tenantSettings.branding.description')} />
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {renderAsset('logo', t('tenantSettings.fields.logo'), sourceId, t('tenantSettings.assetHints.logo'))}
        </Col>
        <Col xs={24} md={12}>
          {renderAsset('favicon', t('tenantSettings.fields.favicon'), sourceId, t('tenantSettings.assetHints.favicon'))}
        </Col>
        <Col xs={24} md={12}>
          {renderAsset(
            'login-background',
            t('tenantSettings.fields.loginBackground'),
            sourceId,
            t('tenantSettings.assetHints.loginBackground'),
          )}
        </Col>
      </Row>

      <Divider titlePlacement="start" plain>{t('tenantSettings.groups.profile')}</Divider>
      <Alert type="info" showIcon title={t('tenantSettings.basic.description')} />
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label={t('tenantSettings.fields.name')}
            rules={[{ required: true, whitespace: true, message: t('tenantSettings.feedback.nameRequired') }]}
          >
            <Input disabled={!canUpdate} maxLength={100} placeholder={t('tenantSettings.placeholders.name')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="shortName" label={t('tenantSettings.fields.shortName')}>
            <Input disabled={!canUpdate} maxLength={64} placeholder={t('tenantSettings.placeholders.shortName')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="contactEmail" label={t('tenantSettings.fields.contactEmail')}>
            <Input disabled={!canUpdate} maxLength={100} placeholder={t('tenantSettings.placeholders.contactEmail')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="contactPhone" label={t('tenantSettings.fields.contactPhone')}>
            <Input disabled={!canUpdate} maxLength={32} placeholder={t('tenantSettings.placeholders.contactPhone')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="website"
            label={t('tenantSettings.fields.website')}
            rules={[{ pattern: /^https?:\/\//, message: t('tenantSettings.feedback.websiteInvalid') }]}
          >
            <Input disabled={!canUpdate} maxLength={200} placeholder={t('tenantSettings.placeholders.website')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="industry" label={t('tenantSettings.fields.industry')}>
            <Input disabled={!canUpdate} maxLength={100} placeholder={t('tenantSettings.placeholders.industry')} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="address" label={t('tenantSettings.fields.address')}>
            <Input disabled={!canUpdate} maxLength={255} placeholder={t('tenantSettings.placeholders.address')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="locale" label={t('tenantSettings.fields.locale')}>
            <Select
              allowClear
              disabled={!canUpdate}
              showSearch
              options={localeOptions}
              placeholder={t('tenantSettings.placeholders.locale')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="timezone" label={t('tenantSettings.fields.timezone')}>
            <Input disabled={!canUpdate} maxLength={64} placeholder={t('tenantSettings.placeholders.timezone')} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="description" label={t('tenantSettings.fields.description')}>
            <Input.TextArea
              disabled={!canUpdate}
              rows={3}
              maxLength={1000}
              showCount
              placeholder={t('tenantSettings.placeholders.description')}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider titlePlacement="start" plain>{t('tenantSettings.groups.branding')}</Divider>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name={['branding', 'loginTitle']} label={t('tenantSettings.fields.loginTitle')}>
            <Input disabled={!canUpdate} maxLength={100} placeholder={t('tenantSettings.placeholders.loginTitle')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name={['branding', 'themeColor']} label={t('tenantSettings.fields.themeColor')}>
            <Input disabled={!canUpdate} maxLength={7} placeholder={t('tenantSettings.placeholders.themeColor')} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name={['branding', 'loginSubtitle']} label={t('tenantSettings.fields.loginSubtitle')}>
            <Input disabled={!canUpdate} maxLength={200} placeholder={t('tenantSettings.placeholders.loginSubtitle')} />
          </Form.Item>
        </Col>
      </Row>

      <Divider titlePlacement="start" plain>{t('tenantSettings.groups.footer')}</Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item name={['branding', 'footerCopyright']} label={t('tenantSettings.fields.footerCopyright')}>
            <Input
              disabled={!canUpdate}
              maxLength={200}
              placeholder={t('tenantSettings.placeholders.footerCopyright')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name={['branding', 'footerIcp']} label={t('tenantSettings.fields.footerIcp')}>
            <Input disabled={!canUpdate} maxLength={100} placeholder={t('tenantSettings.placeholders.footerIcp')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name={['branding', 'footerWebsite']}
            label={t('tenantSettings.fields.footerWebsite')}
            rules={[{ pattern: /^https?:\/\//, message: t('tenantSettings.feedback.websiteInvalid') }]}
          >
            <Input disabled={!canUpdate} maxLength={200} placeholder={t('tenantSettings.placeholders.footerWebsite')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name={['branding', 'footerContactEmail']} label={t('tenantSettings.fields.footerContactEmail')}>
            <Input
              disabled={!canUpdate}
              maxLength={100}
              placeholder={t('tenantSettings.placeholders.footerContactEmail')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name={['branding', 'footerContactPhone']} label={t('tenantSettings.fields.footerContactPhone')}>
            <Input
              disabled={!canUpdate}
              maxLength={32}
              placeholder={t('tenantSettings.placeholders.footerContactPhone')}
            />
          </Form.Item>
        </Col>
      </Row>

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
      <Typography.Text type="secondary">{t('tenantSettings.readonlyHint')}</Typography.Text>
    </Space>
  );
}

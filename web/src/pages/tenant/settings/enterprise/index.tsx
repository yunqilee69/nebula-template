import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { TabsProps } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { TenantOAuthProvidersPage } from '../oauth-providers';
import { TenantAssetUpload } from './asset-upload';

type TabKey = 'basic' | 'branding' | 'security' | 'identity';

const localeOptions = [
  { value: 'zh-CN', label: '简体中文（zh-CN）' },
  { value: 'en-US', label: 'English（en-US）' },
];

const profileUpdatePermission = 'BUTTON:TENANT_PROFILE_UPDATE:Allow';

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

type TenantAssetTaskIds = Partial<Record<TenantAssetSlot, string>>;

/**
 * 企业设置表单值：图片资源位只存待提交的上传任务 id，图片地址来自保存响应。
 */
type TenantProfileFormValues = Omit<UpdateTenantProfileReq, 'uploadTaskIds'> & {
  assetTaskIds?: TenantAssetTaskIds;
};

function toFormValues(profile: TenantProfile): TenantProfileFormValues {
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

function formatDateTime(value: string | undefined) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

/** 数据平面的企业设置：租户管理员维护本企业资料、登录页品牌和第三方登录配置。 */
export function TenantEnterpriseSettingsPage() {
  const { message } = App.useApp();
  const { t } = useNebulaI18n();
  const [form] = Form.useForm<TenantProfileFormValues>();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const canUpdate = hasPermission(permissions, profileUpdatePermission, { roles });
  const canEditCurrentTab = activeTab === 'basic' || activeTab === 'branding';

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

  const handleFinish = async (values: TenantProfileFormValues) => {
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
  };

  const disabled = !canUpdate;

  const items = useMemo<TabsProps['items']>(() => [
    {
      key: 'basic',
      label: t('tenantSettings.tabs.basic'),
      forceRender: true,
      children: (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert type="info" showIcon title={t('tenantSettings.basic.description')} />
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label={t('tenantSettings.fields.name')}
                rules={[{ required: true, whitespace: true, message: t('tenantSettings.feedback.nameRequired') }]}
              >
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.name')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="shortName" label={t('tenantSettings.fields.shortName')}>
                <Input maxLength={64} placeholder={t('tenantSettings.placeholders.shortName')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contactEmail" label={t('tenantSettings.fields.contactEmail')}>
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.contactEmail')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contactPhone" label={t('tenantSettings.fields.contactPhone')}>
                <Input maxLength={32} placeholder={t('tenantSettings.placeholders.contactPhone')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="website"
                label={t('tenantSettings.fields.website')}
                rules={[{ pattern: /^https?:\/\//, message: t('tenantSettings.feedback.websiteInvalid') }]}
              >
                <Input maxLength={200} placeholder={t('tenantSettings.placeholders.website')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="industry" label={t('tenantSettings.fields.industry')}>
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.industry')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label={t('tenantSettings.fields.address')}>
                <Input maxLength={255} placeholder={t('tenantSettings.placeholders.address')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="locale" label={t('tenantSettings.fields.locale')}>
                <Select
                  allowClear
                  showSearch
                  options={localeOptions}
                  placeholder={t('tenantSettings.placeholders.locale')}
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="timezone" label={t('tenantSettings.fields.timezone')}>
                <Input maxLength={64} placeholder={t('tenantSettings.placeholders.timezone')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label={t('tenantSettings.fields.description')}>
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  placeholder={t('tenantSettings.placeholders.description')}
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name={['assetTaskIds', 'logo']}>
                <TenantAssetUpload
                  savedUrl={profile?.logo}
                  label={t('tenantSettings.fields.logo')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={56}
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
          </Row>
        </Space>
      ),
    },
    {
      key: 'branding',
      label: t('tenantSettings.tabs.branding'),
      forceRender: true,
      children: (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert type="info" showIcon title={t('tenantSettings.branding.description')} />
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name={['assetTaskIds', 'login-logo']}>
                <TenantAssetUpload
                  savedUrl={profile?.branding?.loginLogo}
                  label={t('tenantSettings.fields.loginLogo')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={48}
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['assetTaskIds', 'favicon']}>
                <TenantAssetUpload
                  savedUrl={profile?.branding?.favicon}
                  label={t('tenantSettings.fields.favicon')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={32}
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['branding', 'loginTitle']} label={t('tenantSettings.fields.loginTitle')}>
                <Input maxLength={100} placeholder={t('tenantSettings.placeholders.loginTitle')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['branding', 'themeColor']} label={t('tenantSettings.fields.themeColor')}>
                <Input maxLength={7} placeholder={t('tenantSettings.placeholders.themeColor')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name={['branding', 'loginSubtitle']} label={t('tenantSettings.fields.loginSubtitle')}>
                <Input maxLength={200} placeholder={t('tenantSettings.placeholders.loginSubtitle')} disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name={['assetTaskIds', 'login-background']}>
                <TenantAssetUpload
                  savedUrl={profile?.branding?.loginBackground}
                  label={t('tenantSettings.fields.loginBackground')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={96}
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
          </Row>
        </Space>
      ),
    },
    {
      key: 'security',
      label: t('tenantSettings.tabs.security'),
      children: (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert type="info" showIcon title={t('tenantSettings.security.description')} />
          <TenantOAuthProvidersPage />
        </Space>
      ),
    },
    {
      key: 'identity',
      label: t('tenantSettings.tabs.identity'),
      children: profile ? (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert type="info" showIcon title={t('tenantSettings.readonlyHint')} />
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
        </Space>
      ) : null,
    },
  ], [disabled, profile, t]);

  return (
    <Card
      title={t('tenantSettings.title')}
      extra={(
        <Space>
          {canEditCurrentTab ? (
            <Button
              type="primary"
              loading={saving}
              disabled={disabled}
              onClick={() => form.submit()}
            >
              {saving ? t('tenantSettings.actions.saving') : t('tenantSettings.actions.save')}
            </Button>
          ) : null}
          <Button onClick={() => void load()} loading={loading}>
            {t('tenantSettings.actions.refresh')}
          </Button>
        </Space>
      )}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Text type="secondary">{t('tenantSettings.description')}</Typography.Text>
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => void handleFinish(values)}
          >
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as TabKey)}
              items={items}
            />
          </Form>
        </Spin>
      </Space>
    </Card>
  );
}

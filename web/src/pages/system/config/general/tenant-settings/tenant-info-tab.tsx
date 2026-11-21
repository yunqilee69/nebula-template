import { Alert, Button, Col, Descriptions, Divider, Form, Input, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { TenantAssetUpload } from './asset-upload';
import { useTenantProfile } from './tenant-profile-context';

function formatDateTime(value: string | undefined) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

const localeOptions = [
  { value: 'zh-CN', label: '简体中文（zh-CN）' },
  { value: 'en-US', label: 'English（en-US）' },
];

/**
 * 高级配置 → 企业信息：企业资料、登录页品牌与企业标识，三块共用一块页面。
 *
 * <p>资料与品牌共用同一个 `PUT /api/auth/tenant/profile`，一次保存覆盖全部字段；
 * 企业标识（企业代码、域名、状态）只读，紧跟在表单下方展示。</p>
 */
export function TenantInfoTab() {
  const { t } = useNebulaI18n();
  const { form, profile, loading, saving, canUpdate, reload, save } = useTenantProfile();

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
              <Form.Item name={['assetTaskIds', 'logo']}>
                <TenantAssetUpload
                  savedUrl={profile?.logo}
                  label={t('tenantSettings.fields.logo')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={56}
                  disabled={!canUpdate}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Divider titlePlacement="start" plain>{t('tenantSettings.tabs.branding')}</Divider>
              <Typography.Text type="secondary">{t('tenantSettings.branding.description')}</Typography.Text>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['assetTaskIds', 'login-logo']}>
                <TenantAssetUpload
                  savedUrl={profile?.branding?.loginLogo}
                  label={t('tenantSettings.fields.loginLogo')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={48}
                  disabled={!canUpdate}
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
                  disabled={!canUpdate}
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
              <Form.Item name={['assetTaskIds', 'login-background']}>
                <TenantAssetUpload
                  savedUrl={profile?.branding?.loginBackground}
                  label={t('tenantSettings.fields.loginBackground')}
                  uploadText={t('tenantSettings.actions.upload')}
                  removeText={t('tenantSettings.actions.remove')}
                  previewHeight={96}
                  disabled={!canUpdate}
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

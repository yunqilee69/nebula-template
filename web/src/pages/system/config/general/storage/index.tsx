import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EncryptedValueField } from '@/components/encrypted-value-field';
import type { EncryptedValueChange } from '@/components/encrypted-value-field';
import { storageSettingsService } from '@/services/storage-settings';
import { useAuthStore } from '@/stores/auth-store';
import type {
  StorageBackendSettings,
  StorageSettings,
  UpdateStorageSettingsRequest,
} from '@/types/storage-settings';
import { hasPermission } from '@/utils/permissions';

/** 保存按钮权限码：与后端 STORAGE_SETTINGS_UPDATE 对应。 */
const storageUpdatePermission = 'BUTTON:STORAGE_SETTINGS_UPDATE:Allow';

/** 「跟随 application.yml」的哨兵取值，与后端 StorageContentProviders.APPLICATION 一致。 */
const APPLICATION = 'application';

/** 没有可配置项的内置后端（数据库）。 */
const DB_BACKEND = 'db';
const FILESYSTEM_BACKEND = 'filesystem';

/** 需要 region、且 endpoint 可留空的对象存储。 */
const COS_BACKEND = 'tencent-cos';

const BACKEND_LABELS: Record<string, string> = {
  [APPLICATION]: '跟随 application.yml（默认）',
  [FILESYSTEM_BACKEND]: '本地文件系统',
  [DB_BACKEND]: '数据库（storage_content 表）',
  minio: 'MinIO',
  'aliyun-oss': '阿里云 OSS',
  [COS_BACKEND]: '腾讯云 COS',
};

/** 表单状态：只保留用户可编辑的字段，避免把只读视图字段一起提交。 */
interface FormState {
  backendType: string;
  filesystemBaseDir: string;
  endpoint: string;
  region: string;
  bucket: string;
  createBucketIfMissing: boolean;
  directDownloadEnabled: boolean;
  directDownloadExpireSeconds: number;
  maxFileSize?: number;
  chunkThreshold?: number;
  chunkSize?: number;
  allowedExtensions: string;
  tempRetentionDays?: number;
}

/** 加密字段的编辑意图：keep 省略字段、set 提交新明文、clear 提交空串。 */
interface CredentialIntents {
  accessKey?: EncryptedValueChange;
  secretKey?: EncryptedValueChange;
}

function backendLabel(type: string): string {
  return BACKEND_LABELS[type] ?? type;
}

function isObjectStorage(type: string): boolean {
  return type !== APPLICATION && type !== DB_BACKEND && type !== FILESYSTEM_BACKEND;
}

function toFormState(settings: StorageSettings): FormState {
  const backend = settings.tenant ?? {};
  return {
    backendType: backend.type || APPLICATION,
    filesystemBaseDir: backend.filesystemBaseDir ?? '',
    endpoint: backend.endpoint ?? '',
    region: backend.region ?? '',
    bucket: backend.bucket ?? '',
    createBucketIfMissing: backend.createBucketIfMissing ?? true,
    directDownloadEnabled: backend.directDownloadEnabled ?? false,
    directDownloadExpireSeconds: backend.directDownloadExpireSeconds ?? 300,
    maxFileSize: settings.uploadPolicy?.maxFileSize,
    chunkThreshold: settings.uploadPolicy?.chunkThreshold,
    chunkSize: settings.uploadPolicy?.chunkSize,
    allowedExtensions: settings.uploadPolicy?.allowedExtensions ?? '',
    tempRetentionDays: settings.uploadPolicy?.tempRetentionDays,
  };
}

/** 组装保存请求：凭据按三态翻译，`keep` 直接省略字段（后端视为保持）。 */
function toRequest(form: FormState, intents: CredentialIntents): UpdateStorageSettingsRequest {
  const request: UpdateStorageSettingsRequest = {
    backendType: form.backendType,
    maxFileSize: form.maxFileSize,
    chunkThreshold: form.chunkThreshold,
    chunkSize: form.chunkSize,
    allowedExtensions: form.allowedExtensions,
    tempRetentionDays: form.tempRetentionDays,
  };
  if (form.backendType === APPLICATION) {
    return request;
  }
  if (form.backendType === FILESYSTEM_BACKEND) {
    request.filesystemBaseDir = form.filesystemBaseDir.trim();
    return request;
  }
  if (form.backendType === DB_BACKEND) {
    return request;
  }
  request.endpoint = form.endpoint.trim();
  request.region = form.region.trim();
  request.bucket = form.bucket.trim();
  request.createBucketIfMissing = form.createBucketIfMissing;
  request.directDownloadEnabled = form.directDownloadEnabled;
  request.directDownloadExpireSeconds = form.directDownloadExpireSeconds;
  if (intents.accessKey?.kind === 'set') {
    request.accessKey = intents.accessKey.value;
  } else if (intents.accessKey?.kind === 'clear') {
    request.accessKey = '';
  }
  if (intents.secretKey?.kind === 'set') {
    request.secretKey = intents.secretKey.value;
  } else if (intents.secretKey?.kind === 'clear') {
    request.secretKey = '';
  }
  return request;
}

/** 字段行：label + 控件 + 说明，避免在别人的 Form 里再套一层 form 元素。 */
function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Typography.Text strong>{props.label}</Typography.Text>
      <div style={{ marginTop: 4 }}>{props.children}</div>
      {props.hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{props.hint}</Typography.Text>
      ) : null}
    </div>
  );
}

/** 只读展示 application.yml 里实际生效的后端配置。 */
function ApplicationPreview({ backend }: { backend?: StorageBackendSettings }) {
  const credentialText = (configured?: boolean) => (configured ? '已配置' : '未配置');
  return (
    <Descriptions
      bordered
      size="small"
      column={2}
      title="application.yml 当前配置"
      items={[
        { key: 'type', label: '后端类型', children: backend?.type ? backendLabel(backend.type) : '-' },
        {
          key: 'location',
          label: backend?.type === FILESYSTEM_BACKEND ? '根目录' : '服务地址',
          children: (backend?.type === FILESYSTEM_BACKEND ? backend?.filesystemBaseDir : backend?.endpoint) || '-',
        },
        { key: 'bucket', label: '桶名', children: backend?.bucket || '-' },
        { key: 'region', label: '地域', children: backend?.region || '-' },
        { key: 'accessKey', label: 'Access Key', children: credentialText(backend?.hasAccessKey) },
        { key: 'secretKey', label: 'Secret Key', children: credentialText(backend?.hasSecretKey) },
        {
          key: 'direct',
          label: '客户端直连',
          children: backend?.directDownloadEnabled
            ? `开启（${backend?.directDownloadExpireSeconds ?? 300} 秒）`
            : '关闭（服务端代理）',
        },
      ]}
    />
  );
}

/**
 * 高级配置 → 存储：两层配置。
 *
 * <p>{@code application.yml} 那一层只读展示；选择「跟随 application.yml」时
 * 在线配置整体不生效，这正是 `storage.backend.type=application` 的语义。</p>
 *
 * <p>存储参数与页面上其它参数一样都落在参数中心，因此放在同一个页面里维护：
 * 用户不必为了「配存储」再去另一个入口找。区别只在于它有独立接口与更严格的校验
 * （后端类型、必填项、上传策略不变式），所以保存动作不并入本页的脏值批量保存。</p>
 */
export function StorageSettingsPanel() {
  const { message } = App.useApp();
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const canUpdate = hasPermission(permissions, storageUpdatePermission, { roles });

  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [intents, setIntents] = useState<CredentialIntents>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 加载失败原因：显式展示，避免面板只剩按钮、看起来像「打不开」。 */
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await storageSettingsService.getSettings();
      setSettings(next);
      setForm(toFormState(next));
      setIntents({});
    } catch (error) {
      // 面板在 tab 里，失败时不能只剩空白：把原因留在页面上，并给一个重试入口
      const reason = error instanceof Error && error.message ? error.message : '未知错误';
      setLoadError(reason);
      setForm(null);
      void message.error('存储配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback((partial: Partial<FormState>) => {
    setForm((previous) => (previous ? { ...previous, ...partial } : previous));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form) {
      return;
    }
    setSaving(true);
    try {
      await storageSettingsService.updateSettings(toRequest(form, intents));
      void message.success('已保存，约 5 秒内生效');
      await load();
    } catch {
      // 失败提示由请求层统一展示
    } finally {
      setSaving(false);
    }
  }, [form, intents, load, message]);

  const backendOptions = useMemo(() => {
    const installed = settings?.installedTypes ?? [];
    const types = [APPLICATION, ...installed.filter((type) => type && type !== APPLICATION)];
    // 去重：同一类型重复出现会让下拉出现重复项与重复 key
    return [...new Set(types)].map((type) => ({ value: type, label: backendLabel(type) }));
  }, [settings]);

  const disabled = !canUpdate;
  const backendType = form?.backendType ?? APPLICATION;
  const showObjectStorage = isObjectStorage(backendType);
  const foreignFileCount = settings?.foreignFileCount ?? 0;
  const ceiling = settings?.maxUploadFileSizeMb;

  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Space>
          <Button onClick={() => void load()} loading={loading}>
            刷新
          </Button>
          <Button type="primary" onClick={() => void handleSave()} loading={saving} disabled={disabled}>
            保存
          </Button>
        </Space>

        <Alert
          type="info"
          showIcon
          title="存储配置分两层：application.yml 是启动配置（只读，改需重启）；这里的在线配置保存在参数中心，按租户生效。选择「跟随 application.yml」时，在线配置整体不生效。"
        />

        {loadError ? (
          <Alert
            type="error"
            showIcon
            title="存储配置加载失败"
            description={`${loadError}。若刚升级过版本，请确认已执行 docs/sql/unreleased 下的权限脚本，并检查当前账号是否具备 STORAGE_SETTINGS_QUERY 权限。`}
            action={(
              <Button size="small" onClick={() => void load()} loading={loading}>
                重试
              </Button>
            )}
          />
        ) : null}

        {form ? (
          <>
            <Card title="后端存储" size="small">
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Field
                  label="存储后端"
                  hint={backendType === APPLICATION
                    ? '正式文件写入 application.yml 指定的后端，下面所有在线字段都不参与解析。'
                    : `已安装的后端：${settings?.installedTypes.join(' / ') || '-'}`}
                >
                  <Select
                    value={backendType}
                    options={backendOptions}
                    disabled={disabled}
                    style={{ maxWidth: 360 }}
                    onChange={(value) => patch({ backendType: value })}
                  />
                </Field>

                {backendType === APPLICATION ? (
                  <ApplicationPreview backend={settings?.application} />
                ) : null}

                {backendType === FILESYSTEM_BACKEND ? (
                  <Field label="文件根目录" hint="相对路径会落到应用工作目录下；目录由服务端创建。">
                    <Input
                      value={form.filesystemBaseDir}
                      disabled={disabled}
                      placeholder="build/nebula-storage/files"
                      onChange={(event) => patch({ filesystemBaseDir: event.target.value })}
                    />
                  </Field>
                ) : null}

                {backendType === DB_BACKEND ? (
                  <Alert
                    type="success"
                    showIcon
                    title="数据库后端无需额外配置：正式文件内容写入 storage_content 表，恒由服务端代理下载。"
                  />
                ) : null}

                {showObjectStorage ? (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Field
                          label="服务地址 endpoint"
                          hint={backendType === COS_BACKEND ? '留空时按地域推导官方域名。' : '例如 http://127.0.0.1:9000'}
                        >
                          <Input
                            value={form.endpoint}
                            disabled={disabled}
                            placeholder={backendType === COS_BACKEND ? '留空按 region 推导' : 'http://127.0.0.1:9000'}
                            onChange={(event) => patch({ endpoint: event.target.value })}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field
                          label="地域 region"
                          hint={backendType === COS_BACKEND ? 'COS 必填，例如 ap-guangzhou。' : '留空即可。'}
                        >
                          <Input
                            value={form.region}
                            disabled={disabled}
                            placeholder={backendType === COS_BACKEND ? 'ap-guangzhou' : '留空即可'}
                            onChange={(event) => patch({ region: event.target.value })}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field label="桶名 bucket" hint={backendType === COS_BACKEND ? 'COS 桶名必须带 APPID 后缀。' : undefined}>
                          <Input
                            value={form.bucket}
                            disabled={disabled}
                            placeholder="nebula-storage"
                            onChange={(event) => patch({ bucket: event.target.value })}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field label="桶不存在时自动创建" hint="多数云厂商的 AK 无建桶权限，生产建议关闭。">
                          <Switch
                            checked={form.createBucketIfMissing}
                            disabled={disabled}
                            onChange={(checked) => patch({ createBucketIfMissing: checked })}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field label="Access Key" hint="加密存储，保存后不再回显。">
                          <EncryptedValueField
                            value={{ configured: settings?.tenant?.hasAccessKey ?? false }}
                            editing={!disabled}
                            disabled={disabled}
                            onChange={(change) => setIntents((previous) => ({ ...previous, accessKey: change }))}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field label="Secret Key" hint="加密存储，保存后不再回显。">
                          <EncryptedValueField
                            value={{ configured: settings?.tenant?.hasSecretKey ?? false }}
                            editing={!disabled}
                            disabled={disabled}
                            onChange={(change) => setIntents((previous) => ({ ...previous, secretKey: change }))}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field label="客户端直链下载" hint="开启后客户端拿临时直链直接取文件；直链在有效期内等效于凭据。">
                          <Switch
                            checked={form.directDownloadEnabled}
                            disabled={disabled}
                            onChange={(checked) => patch({ directDownloadEnabled: checked })}
                          />
                        </Field>
                      </Col>
                      <Col xs={24} md={12}>
                        <Field label="直链有效期（秒）" hint="上限 3600 秒。">
                          <InputNumber
                            min={1}
                            max={3600}
                            value={form.directDownloadExpireSeconds}
                            disabled={disabled || !form.directDownloadEnabled}
                            style={{ width: 160 }}
                            onChange={(value) => patch({ directDownloadExpireSeconds: value ?? 300 })}
                          />
                        </Field>
                      </Col>
                    </Row>
                  </>
                ) : null}

                {backendType !== APPLICATION && foreignFileCount > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={`当前有 ${foreignFileCount} 个正式文件不在「${backendLabel(backendType)}」上`}
                    description="切换后这些文件的读取仍指向原后端：若原后端不可用，它们会读不到。切换前请先迁移内容（当前版本未提供在线迁移入口）。"
                  />
                ) : null}

                <Typography.Text type="secondary">
                  {`当前生效来源：${settings?.source === 'APPLICATION' ? 'application.yml' : '在线配置'}；保存后约 5 秒内生效。`}
                </Typography.Text>
              </Space>
            </Card>

            <Card title="上传策略" size="small">
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Field
                      label="单文件大小上限（MB）"
                      hint={ceiling ? `不能超过静态传输口径 ${ceiling}MB（改它需重启）。` : undefined}
                    >
                      <InputNumber
                        min={1}
                        max={2047}
                        value={form.maxFileSize}
                        disabled={disabled}
                        style={{ width: '100%' }}
                        onChange={(value) => patch({ maxFileSize: value ?? undefined })}
                      />
                    </Field>
                  </Col>
                  <Col xs={24} md={8}>
                    <Field label="分片上传阈值（MB）" hint="超过该值必须走分片上传。">
                      <InputNumber
                        min={1}
                        max={2047}
                        value={form.chunkThreshold}
                        disabled={disabled}
                        style={{ width: '100%' }}
                        onChange={(value) => patch({ chunkThreshold: value ?? undefined })}
                      />
                    </Field>
                  </Col>
                  <Col xs={24} md={8}>
                    <Field label="分片大小（MB）" hint="需满足 分片大小 ≤ 分片阈值 ≤ 单文件上限。">
                      <InputNumber
                        min={1}
                        max={2047}
                        value={form.chunkSize}
                        disabled={disabled}
                        style={{ width: '100%' }}
                        onChange={(value) => patch({ chunkSize: value ?? undefined })}
                      />
                    </Field>
                  </Col>
                  <Col xs={24} md={12}>
                    <Field label="允许的扩展名" hint="逗号分隔，留空表示不限制。">
                      <Input
                        value={form.allowedExtensions}
                        disabled={disabled}
                        placeholder="jpg,png,pdf"
                        onChange={(event) => patch({ allowedExtensions: event.target.value })}
                      />
                    </Field>
                  </Col>
                  <Col xs={24} md={12}>
                    <Field label="临时任务保留天数" hint="超期的临时文件由定时任务清理。">
                      <InputNumber
                        min={1}
                        max={3650}
                        value={form.tempRetentionDays}
                        disabled={disabled}
                        style={{ width: '100%' }}
                        onChange={(value) => patch({ tempRetentionDays: value ?? undefined })}
                      />
                    </Field>
                  </Col>
                </Row>
                {!canUpdate ? <Tag>只读：缺少保存存储配置的权限</Tag> : null}
              </Space>
            </Card>
          </>
        ) : null}
      </Space>
    </Spin>
  );
}

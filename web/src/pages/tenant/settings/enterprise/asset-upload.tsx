import { App, Button, Space, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useState } from 'react';
import { appStorageService } from '@/api/storage-service';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import { revokeTenantAssetPreviewUrl, uploadTenantAsset } from './tenant-asset-upload';
import type { TenantAssetStorageService } from './tenant-asset-upload';

interface TenantAssetUploadProps {
  /** 待提交的上传任务 id：随租户资料保存提交，保存成功后由页面清空。 */
  value?: string;
  onChange?: (value?: string) => void;
  /** 已保存的图片地址：没有待提交任务时展示它。 */
  savedUrl?: string;
  label: string;
  uploadText: string;
  removeText: string;
  previewHeight?: number;
  disabled?: boolean;
  service?: TenantAssetStorageService;
}

interface PendingAsset {
  readonly taskId: string;
  readonly previewUrl?: string;
}

/** 企业设置里的图片字段：上传只产生待提交的 taskId，绑定与最终地址由保存接口产出。 */
export function TenantAssetUpload({
  value,
  onChange,
  savedUrl,
  label,
  uploadText,
  removeText,
  previewHeight = 48,
  disabled = false,
  service = appStorageService,
}: TenantAssetUploadProps) {
  const { message } = App.useApp();
  const { t } = useNebulaI18n();
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<PendingAsset>();
  const savedPreviewUrl = useStoragePreviewUrl(savedUrl);

  useEffect(() => {
    const previewUrl = pending?.previewUrl;
    return () => revokeTenantAssetPreviewUrl(previewUrl);
  }, [pending?.previewUrl]);

  useEffect(() => {
    // 表单里的待提交任务被清空（保存成功或撤销选择）时撤掉本地预览
    if (pending && pending.taskId !== value) setPending(undefined);
  }, [pending, value]);

  const beforeUpload: NonNullable<UploadProps['beforeUpload']> = (file) => {
    const isImage = file.type.startsWith('image/') && !file.type.includes('svg');
    if (!isImage) {
      void message.error(t('tenantSettings.feedback.imageOnly'));
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    void uploadTenantAsset(service, file)
      .then((outcome) => {
        setPending({ taskId: outcome.taskId, previewUrl: outcome.previewUrl });
        onChange?.(outcome.taskId);
        void message.success(t('tenantSettings.feedback.uploadSuccess'));
      })
      .catch(() => {
        void message.error(t('tenantSettings.feedback.uploadFailed'));
      })
      .finally(() => setUploading(false));
    return Upload.LIST_IGNORE;
  };

  const previewSrc = pending?.previewUrl ?? savedPreviewUrl ?? savedUrl;

  return (
    <Space orientation="vertical" size={8}>
      <Typography.Text>{label}</Typography.Text>
      <Space align="center" wrap>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={label}
            style={{ maxHeight: previewHeight, maxWidth: 240, objectFit: 'contain' }}
          />
        ) : null}
        <Upload
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/x-icon,image/vnd.microsoft.icon"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={disabled || uploading}
        >
          <Button loading={uploading} disabled={disabled}>{uploadText}</Button>
        </Upload>
        {pending ? (
          <Button type="link" danger disabled={disabled} onClick={() => onChange?.(undefined)}>
            {removeText}
          </Button>
        ) : null}
        {pending ? (
          <Typography.Text type="secondary">{t('tenantSettings.feedback.pendingSave')}</Typography.Text>
        ) : null}
      </Space>
    </Space>
  );
}

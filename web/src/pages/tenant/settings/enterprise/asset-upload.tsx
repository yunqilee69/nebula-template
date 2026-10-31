import { App, Button, Space, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { appStorageService } from '@/api/storage-service';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import { uploadTenantAsset } from './tenant-asset-upload';
import type { TenantAssetStorageService } from './tenant-asset-upload';

interface TenantAssetUploadProps {
  value?: string;
  onChange?: (value?: string) => void;
  tenantId?: string;
  sourceType: string;
  label: string;
  uploadText: string;
  removeText: string;
  previewHeight?: number;
  disabled?: boolean;
  service?: TenantAssetStorageService;
}

/** 企业设置里的图片字段：上传后把存储下载地址写回表单。 */
export function TenantAssetUpload({
  value,
  onChange,
  tenantId,
  sourceType,
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
  const previewUrl = useStoragePreviewUrl(value);

  const beforeUpload: NonNullable<UploadProps['beforeUpload']> = (file) => {
    const isImage = file.type.startsWith('image/') && !file.type.includes('svg');
    if (!isImage) {
      void message.error(t('tenantSettings.feedback.imageOnly'));
      return Upload.LIST_IGNORE;
    }
    if (!tenantId) {
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    void uploadTenantAsset(service, tenantId, file, sourceType)
      .then((url) => {
        onChange?.(url);
        void message.success(t('tenantSettings.feedback.uploadSuccess'));
      })
      .catch(() => {
        void message.error(t('tenantSettings.feedback.uploadFailed'));
      })
      .finally(() => setUploading(false));
    return Upload.LIST_IGNORE;
  };

  return (
    <Space orientation="vertical" size={8}>
      <Typography.Text>{label}</Typography.Text>
      <Space align="center" wrap>
        {value ? (
          <img
            src={previewUrl ?? value}
            alt={label}
            style={{ maxHeight: previewHeight, maxWidth: 240, objectFit: 'contain' }}
          />
        ) : null}
        <Upload
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/x-icon,image/vnd.microsoft.icon"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={disabled || uploading || !tenantId}
        >
          <Button loading={uploading} disabled={disabled || !tenantId}>{uploadText}</Button>
        </Upload>
        {value ? (
          <Button type="link" danger disabled={disabled} onClick={() => onChange?.(undefined)}>
            {removeText}
          </Button>
        ) : null}
      </Space>
    </Space>
  );
}

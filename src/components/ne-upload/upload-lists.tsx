import { DeleteOutlined, FileOutlined } from '@ant-design/icons';
import { Button, Flex, Image, Progress, Typography, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import type { NeUploadFile } from './types';

interface FileUploadListProps {
  readonly files: NeUploadFile[];
  readonly uploadButton: ReactNode;
  readonly onRemove: (file: NeUploadFile) => void | Promise<void>;
  readonly disabled?: boolean;
}

export function FileUploadList({ files, uploadButton, onRemove, disabled }: FileUploadListProps) {
  const { token } = antdTheme.useToken();
  return (
    <Flex vertical gap={token.marginXS} role="list">
      {files.map((file) => (
        <Flex key={file.uid} role="listitem" align="center" gap={token.marginSM} style={{ padding: token.paddingSM, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG }}>
          <FileOutlined aria-hidden="true" />
          <Flex vertical style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text ellipsis>{file.name}</Typography.Text>
            {file.status === 'uploading' ? <Progress percent={file.percent ?? 0} size="small" /> : null}
            {file.status === 'error' ? <Typography.Text type="danger" role="alert">{file.errorMessage}</Typography.Text> : null}
          </Flex>
          <Button aria-label={`删除 ${file.name}`} type="text" icon={<DeleteOutlined />} disabled={disabled} onClick={() => void onRemove(file)} />
        </Flex>
      ))}
      {uploadButton}
    </Flex>
  );
}

interface ImageUploadListProps {
  readonly files: NeUploadFile[];
  readonly shape: 'square' | 'circle';
  readonly size: number;
  readonly preview: boolean;
  readonly uploadButton: ReactNode;
  readonly onRemove: (file: NeUploadFile) => void | Promise<void>;
  readonly disabled?: boolean;
}

function UploadImagePreview({ file, size, preview }: { readonly file: NeUploadFile; readonly size: number; readonly preview: boolean }) {
  const sourceUrl = file.thumbUrl ?? file.url;
  const previewUrl = useStoragePreviewUrl(sourceUrl);

  if (!previewUrl) {
    return (
      <Flex align="center" justify="center" style={{ width: '100%', height: '100%' }} aria-label={`文件占位: ${file.name}`}>
        <FileOutlined aria-hidden="true" />
      </Flex>
    );
  }

  return <Image src={previewUrl} alt={file.name} width={size} height={size} preview={preview} style={{ objectFit: 'cover' }} />;
}

export function ImageUploadList({ files, shape, size, preview, uploadButton, onRemove, disabled }: ImageUploadListProps) {
  const { token } = antdTheme.useToken();
  const radius = shape === 'circle' ? '50%' : token.borderRadiusLG;
  return (
    <Flex gap={token.marginSM} wrap role="list">
      {files.map((file) => (
        <div key={file.uid} role="listitem" style={{ width: size, position: 'relative' }}>
          <div style={{ width: size, height: size, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: radius, background: token.colorFillAlter }}>
            {file.thumbUrl || file.url ? (
              <UploadImagePreview file={file} size={size} preview={preview} />
            ) : (
              <Flex align="center" justify="center" style={{ width: '100%', height: '100%' }} aria-label={`文件占位: ${file.name}`}>
                <FileOutlined aria-hidden="true" />
              </Flex>
            )}
          </div>
          <Button aria-label={`删除 ${file.name}`} type="text" size="small" icon={<DeleteOutlined />} disabled={disabled} onClick={() => void onRemove(file)} style={{ position: 'absolute', top: 4, right: 4, background: token.colorBgElevated }} />
        </div>
      ))}
      {uploadButton}
    </Flex>
  );
}

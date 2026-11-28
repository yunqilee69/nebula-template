import { DeleteOutlined, FileOutlined } from '@ant-design/icons';
import { Button, Image, Progress, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import type { NeUploadFile } from './types';

const useFileListStyles = createStyles(({ token }) => ({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXS,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginSM,
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  icon: {
    color: token.colorTextTertiary,
  },
}));

interface ImageListStyleProps {
  readonly thumbSize: number;
  readonly thumbHeight: number;
  readonly shape: 'square' | 'circle';
}

const useImageListStyles = createStyles(({ token }, props: ImageListStyleProps) => {
  const thumbRadius = props.shape === 'circle' ? '50%' : token.borderRadiusLG;
  return {
    list: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: token.marginSM,
    },
    item: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: token.marginXXS,
      width: props.thumbSize,
    },
    frame: {
      width: props.thumbSize,
      height: props.thumbHeight,
      overflow: 'hidden',
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: thumbRadius,
      background: token.colorFillAlter,
    },
    // 叠在缩略图上的删除按钮：定位用间距 token，底色 + 阴影保证在任意图片上都有对比度
    deleteButton: {
      position: 'absolute',
      top: token.marginXXS,
      right: token.marginXXS,
      background: token.colorBgElevated,
      borderRadius: token.borderRadiusSM,
      boxShadow: token.boxShadowTertiary,
    },
  };
});

const useImagePreviewStyles = createStyles(({ token }, props: { readonly fit: 'cover' | 'contain' }) => ({
  thumbnail: {
    display: 'block',
    width: '100%',
    height: '100%',
    // 圆形头像需要铺满裁切；矩形资源位（Logo / 背景图）用 contain，避免把标识裁掉
    objectFit: props.fit,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    color: token.colorTextTertiary,
  },
}));

const useErrorStateStyles = createStyles(({ token }) => ({
  row: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: token.marginXXS,
  },
  text: {
    fontSize: token.fontSizeSM,
    wordBreak: 'break-word',
  },
  retryButton: {
    padding: 0,
    height: 'auto',
    fontSize: token.fontSizeSM,
  },
}));

interface UploadErrorStateProps {
  readonly file: NeUploadFile;
  readonly onRetry?: (file: NeUploadFile) => void;
  readonly disabled?: boolean;
}

/** 上传失败的统一错误态：错误原因 + 可重试入口（有原始文件时才给出）。 */
function UploadErrorState({ file, onRetry, disabled }: UploadErrorStateProps) {
  const { styles } = useErrorStateStyles();
  return (
    <div className={styles.row}>
      <Typography.Text type="danger" role="alert" className={styles.text}>{file.errorMessage}</Typography.Text>
      {onRetry && file.originFileObj ? (
        <Button type="link" size="small" className={styles.retryButton} disabled={disabled} onClick={() => onRetry(file)}>
          重试
        </Button>
      ) : null}
    </div>
  );
}

interface FileUploadListProps {
  readonly files: NeUploadFile[];
  readonly uploadButton: ReactNode;
  readonly onRemove: (file: NeUploadFile) => void | Promise<void>;
  readonly onRetry?: (file: NeUploadFile) => void;
  readonly disabled?: boolean;
  readonly removeLabel?: (file: NeUploadFile) => string;
  readonly removable?: (file: NeUploadFile) => boolean;
}

export function FileUploadList({
  files,
  uploadButton,
  onRemove,
  onRetry,
  disabled,
  removeLabel,
  removable,
}: FileUploadListProps) {
  const { styles } = useFileListStyles();
  return (
    <div className={styles.list} role="list">
      {files.map((file) => (
        <div key={file.uid} role="listitem" className={styles.item}>
          <FileOutlined aria-hidden="true" className={styles.icon} />
          <div className={styles.main}>
            <Typography.Text ellipsis>{file.name}</Typography.Text>
            {file.status === 'uploading' ? <Progress percent={file.percent ?? 0} size="small" /> : null}
            {file.status === 'error' ? (
              <UploadErrorState file={file} onRetry={onRetry} disabled={disabled} />
            ) : null}
          </div>
          {removable?.(file) === false ? null : (
            <Button
              aria-label={removeLabel?.(file) ?? `删除 ${file.name}`}
              type="text"
              icon={<DeleteOutlined />}
              disabled={disabled}
              onClick={() => void onRemove(file)}
            />
          )}
        </div>
      ))}
      {uploadButton}
    </div>
  );
}

/**
 * 未绑定正式文件的本地图片只有 `originFileObj`，没有服务端地址。
 * 这里用对象 URL 直接预览，并在卸载（含被移除）时释放，避免内存泄漏；不发起任何请求。
 */
function useLocalObjectUrl(file: File | undefined) {
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') return undefined;
    const createdObjectUrl = URL.createObjectURL(file);
    setObjectUrl(createdObjectUrl);
    return () => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(createdObjectUrl);
    };
  }, [file]);

  return objectUrl;
}

function UploadImagePreview({
  file,
  preview,
  imageAlt,
  fit,
  placeholder,
  onPreviewError,
}: {
  readonly file: NeUploadFile;
  readonly preview: boolean;
  readonly imageAlt?: string;
  readonly fit: 'cover' | 'contain';
  readonly placeholder?: ReactNode;
  readonly onPreviewError?: (file: NeUploadFile) => boolean | Promise<boolean>;
}) {
  const { styles } = useImagePreviewStyles({ fit });
  // 本地对象 URL 优先：上传完成但未绑定的图片还没有服务端地址，只有它可预览
  const localObjectUrl = useLocalObjectUrl(file.originFileObj);
  const storagePreviewUrl = useStoragePreviewUrl(file.thumbUrl ?? file.url);
  const previewUrl = localObjectUrl ?? storagePreviewUrl;
  const previewKey = `${file.uid}:${previewUrl ?? ''}`;
  const [failedPreviewKey, setFailedPreviewKey] = useState<string>();

  useEffect(() => {
    setFailedPreviewKey((current) => current && current !== previewKey ? undefined : current);
  }, [previewKey]);

  const alt = imageAlt ?? file.name;
  const showPlaceholder = !previewUrl || failedPreviewKey === previewKey;

  if (showPlaceholder) {
    return (
      <div className={styles.placeholder} role="img" aria-label={imageAlt ?? `文件占位: ${file.name}`}>
        {placeholder ?? <FileOutlined aria-hidden="true" />}
      </div>
    );
  }

  return (
    <Image
      src={previewUrl}
      alt={alt}
      preview={preview}
      className={styles.thumbnail}
      onError={() => {
        void (async () => {
          const refreshed = await onPreviewError?.(file);
          if (refreshed !== true) setFailedPreviewKey(previewKey);
        })();
      }}
    />
  );
}

interface ImageUploadListProps {
  readonly files: NeUploadFile[];
  readonly shape: 'square' | 'circle';
  readonly size: number;
  readonly height: number;
  readonly preview: boolean;
  readonly uploadButton: ReactNode;
  readonly onRemove: (file: NeUploadFile) => void | Promise<void>;
  readonly onRetry?: (file: NeUploadFile) => void;
  readonly disabled?: boolean;
  readonly imageAlt?: string;
  readonly removeLabel?: (file: NeUploadFile) => string;
  readonly removable?: (file: NeUploadFile) => boolean;
  readonly placeholder?: ReactNode;
  /** 预览加载失败（例如对象存储直链过期）时的回调，用于重新解析下载地址 */
  readonly onPreviewError?: (file: NeUploadFile) => boolean | Promise<boolean>;
}

export function ImageUploadList({
  files,
  shape,
  size,
  height,
  preview,
  uploadButton,
  onRemove,
  onRetry,
  disabled,
  imageAlt,
  removeLabel,
  removable,
  placeholder,
  onPreviewError,
}: ImageUploadListProps) {
  const { styles } = useImageListStyles({ thumbSize: size, thumbHeight: height, shape });
  return (
    <div className={styles.list} role="list">
      {files.map((file) => (
        <div key={file.uid} role="listitem" className={styles.item}>
          <div className={styles.frame}>
            <UploadImagePreview
              file={file}
              preview={preview}
              imageAlt={imageAlt}
              fit={shape === 'circle' ? 'cover' : 'contain'}
              placeholder={placeholder}
              onPreviewError={onPreviewError}
            />
          </div>
          {file.status === 'uploading' ? <Progress percent={file.percent ?? 0} size="small" /> : null}
          {file.status === 'error' ? (
            <UploadErrorState file={file} onRetry={onRetry} disabled={disabled} />
          ) : null}
          {removable?.(file) === false ? null : (
            <Button
              aria-label={removeLabel?.(file) ?? `删除 ${file.name}`}
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              disabled={disabled}
              onClick={() => void onRemove(file)}
              className={styles.deleteButton}
            />
          )}
        </div>
      ))}
      {uploadButton}
    </div>
  );
}

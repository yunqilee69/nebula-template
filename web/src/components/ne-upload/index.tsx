import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { buildAcceptAttribute, isExtensionAllowed, parseAllowedExtensions } from '@/api/storage';
import type { StorageDownloadLocation } from '@/api/storage';
import { appStorageService } from '@/api/storage-service';
import { useUploadPolicyStore } from '@/stores/upload-policy-store';
import type { ListStorageFilesBySourceReq, UploadTaskDetailResp } from '../../types/storage';
import type { NeImageUploadProps, NeUploadFile, NeUploadProps } from './types';
import { FileUploadList, ImageUploadList } from './upload-lists';

const defaultMaxCount = 1;

const useStyles = createStyles(({ token }) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  removalHint: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXXS,
  },
}));

function createLocalUid(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown, fallback = '上传失败，请重试') {
  return error instanceof Error && error.message ? error.message : fallback;
}

function mapTaskToFile(current: NeUploadFile, task: UploadTaskDetailResp): NeUploadFile {
  return {
    ...current,
    name: task.fileName || current.name,
    size: task.fileSize ?? current.size,
    mimeType: task.fileMimeType ?? current.mimeType,
    extension: task.fileExtension ?? current.extension,
    hash: task.fileHash ?? current.hash,
    taskId: task.id,
    status: 'done',
    percent: 100,
    errorMessage: undefined,
  };
}

/**
 * 下载位置 → 组件文件条目。
 *
 * <p>{@code url} 直接沿用服务端决议结果：`DIRECT` 是对象存储直链（`<img>` 直接用，不带 Authorization），
 * `PROXY` 是同源相对路径（`useStoragePreviewUrl` 会带 token 取回 blob）。</p>
 */
function mapLocationToUploadFile(location: StorageDownloadLocation, index: number): NeUploadFile {
  const url = location.url;
  return {
    uid: location.fileId ?? url ?? `location-${index}`,
    name: location.fileName ?? location.fileId ?? '',
    size: location.fileSize,
    mimeType: location.fileMimeType,
    fileId: location.fileId,
    url,
    thumbUrl: url,
    status: 'done',
    percent: 100,
  };
}

function buildSourceReq(sourceEntity?: string, sourceId?: string, sourceType?: string): ListStorageFilesBySourceReq | null {
  if (!sourceEntity || !sourceId) return null;
  const trimmedSourceType = sourceType?.trim();
  return trimmedSourceType ? { sourceEntity, sourceId, sourceType: trimmedSourceType } : { sourceEntity, sourceId };
}

export function limitFiles(files: NeUploadFile[], maxCount: number) {
  return files.slice(0, Math.max(0, maxCount));
}

interface NeUploadViewProps extends NeUploadProps {
  variant: 'file' | 'image';
  shape?: 'square' | 'circle';
  thumbnailSize?: number;
  thumbnailHeight?: number;
  placeholder?: ReactNode;
  preview?: boolean;
}

function NeUploadView({
  value,
  defaultValue,
  maxCount = defaultMaxCount,
  replaceable = false,
  accept,
  disabled,
  sourceEntity,
  sourceId,
  sourceType,
  uploadText,
  helperText,
  className,
  style,
  uploadRequest,
  downloadLocations,
  refreshToken,
  onBackfillComplete,
  deleteFile,
  onChange,
  onUploadSuccess,
  onUploadError,
  onRemove,
  onLimitExceeded,
  imageAlt,
  removeLabel,
  removable,
  placeholder,
  removalMode = 'immediate',
  onRemovalChange,
  variant,
  shape = 'square',
  thumbnailSize = 96,
  thumbnailHeight,
  preview = false,
}: NeUploadViewProps) {
  const { message } = App.useApp();
  const { styles, cx } = useStyles();
  const uploadPolicy = useUploadPolicyStore((state) => state.policy);
  const controlled = value !== undefined;
  const [internalFiles, setInternalFiles] = useState<NeUploadFile[]>(defaultValue ?? []);
  const files = controlled ? value : internalFiles;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onBackfillCompleteRef = useRef(onBackfillComplete);
  onBackfillCompleteRef.current = onBackfillComplete;

  const onRemovalChangeRef = useRef(onRemovalChange);
  onRemovalChangeRef.current = onRemovalChange;

  const pendingFilesRef = useRef(files);

  /**
   * 已标记待删除的正式文件（仅 `removalMode='deferred'`）。
   *
   * <p>删除时不调接口，只把文件挪到这里；业务保存成功后组件会重新装载，
   * 装载时清空，避免把已释放的文件再提交一次。</p>
   */
  const [removedFiles, setRemovedFiles] = useState<NeUploadFile[]>([]);
  /** 待删除集合的镜像：上报必须与动作同步，不能等 effect（"上传成功紧接着点保存"会抢不到） */
  const removedFilesRef = useRef<NeUploadFile[]>([]);

  const applyRemovedFiles = useCallback((next: NeUploadFile[]) => {
    removedFilesRef.current = next;
    setRemovedFiles(next);
    onRemovalChangeRef.current?.(next.map((file) => file.fileId!).filter(Boolean));
  }, []);

  /** 记入待删除（幂等：已记过的 fileId 不重复上报）。 */
  const markRemoved = useCallback((candidates: NeUploadFile[]) => {
    const existing = new Set(removedFilesRef.current.map((file) => file.fileId));
    const additions = candidates.filter((file) => file.fileId && !existing.has(file.fileId));
    if (additions.length === 0) return;
    applyRemovedFiles([...removedFilesRef.current, ...additions]);
  }, [applyRemovedFiles]);

  useEffect(() => {
    if (controlled) pendingFilesRef.current = files;
  }, [controlled, files]);

  const visibleFiles = useMemo(() => limitFiles(files, maxCount), [files, maxCount]);
  const atLimit = visibleFiles.length >= maxCount;
  const canReplaceSingleFile = replaceable && maxCount === 1;
  // 扩展名白名单以服务端为准：显式 accept 优先，其次由缓存的 storage.upload 策略推导
  const effectiveAccept = accept
    ?? buildAcceptAttribute(uploadPolicy.allowedExtensions)
    ?? (variant === 'image' ? 'image/*' : undefined);

  const applyUpdate = useCallback(
    (updater: (prev: NeUploadFile[]) => NeUploadFile[]) => {
      const nextFiles = limitFiles(updater(pendingFilesRef.current), maxCount);
      pendingFilesRef.current = nextFiles;
      if (!controlled) setInternalFiles(nextFiles);
      onChangeRef.current?.(nextFiles);
    },
    [controlled, maxCount],
  );

  // 业务直传数组按内容（url 序列）判定变化：调用方每次渲染重建数组不应该触发重新装载
  const downloadLocationsKey = useMemo(
    () => (downloadLocations ?? []).map((location) => location.url ?? '').join('\n'),
    [downloadLocations],
  );

  // 来源参数指纹：source 三元组 + 直传数组 + 外部刷新令牌。用于区分"来源变了"与"同一个来源重跑一次"
  const seedKey = [sourceEntity ?? '', sourceId ?? '', sourceType ?? '', downloadLocationsKey, String(refreshToken ?? '')]
    .join('|');

  useEffect(() => {
    const sourceReq = buildSourceReq(sourceEntity, sourceId, sourceType);
    const hasSuppliedLocations = downloadLocationsKey.length > 0;
    // 二选一：业务直传优先（零请求），否则按业务归属向服务端解析下载位置
    if (!hasSuppliedLocations && !sourceReq) return;

    let active = true;
    previewRetryRef.current.clear();
    const resolving = hasSuppliedLocations
      ? Promise.resolve<readonly StorageDownloadLocation[]>(downloadLocations ?? [])
      : appStorageService.getDownloadLocationsBySource(sourceReq!);

    resolving
      .then((items) => {
        if (!active) return;
        const currentMaxCount = maxCountRef.current;
        const seeded = (items ?? []).map(mapLocationToUploadFile);
        // 组件不负责 bind，本地条目必须按"这次装载是不是重新装载"区别对待：
        // - 首次装载：只要没有 fileId 就保留——它可能是装载请求还在飞的时候传完的（有 taskId、未 bind）；
        // - 重新装载（业务保存成功 / 归属变化）：已拿到 taskId 的"待保存"文件已被服务端接管，让位给新种子，
        //   只留还在上传或上传失败的条目。
        const isReload = lastSeedKeyRef.current !== null && lastSeedKeyRef.current !== seedKey;
        const localEntries = pendingFilesRef.current.filter(
          (file) => !file.fileId && (isReload ? !file.taskId : true),
        );
        // 本地条目排在前面：单值资源位换图时，正在上传/待保存的本地文件必须顶掉已保存的那张
        const merged = limitFiles([...localEntries, ...seeded], currentMaxCount);
        // 只有"来源真的变了"才算重新装载（服务端状态已刷新，通常是保存成功）：清空待删除列表，
        // 避免把已释放的文件再提交一次。effect 因依赖变化重跑时不能清，否则刚标记的删除会丢。
        // 装载即代表服务端状态已刷新（首次进入或保存成功）：待删除列表随之清空，避免重复提交
        applyRemovedFiles([]);
        lastSeedKeyRef.current = seedKey;
        pendingFilesRef.current = merged;
        if (!controlledRef.current) setInternalFiles(merged);
        onChangeRef.current?.(merged);
        onBackfillCompleteRef.current?.(merged, true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        void messageRef.current.error(getErrorMessage(error));
        onBackfillCompleteRef.current?.(pendingFilesRef.current, false);
      });

    return () => {
      active = false;
    };
    // 只依赖来源指纹：`downloadLocations` 已归一成内容字符串，其余可变参数走 ref，
    // 保证"同一个来源只装载一次"，重跑不会误清刚标记的待删除文件
  }, [applyRemovedFiles, seedKey]);


  /** 上一次装载用的是哪一组"来源参数"：只有来源真的变了才算重新装载 */
  const lastSeedKeyRef = useRef<string | null>(null);
  // 下面几个参数会被 effect 读到，但不应把 effect 拉成"每次渲染都重跑"（重跑会误清待删除列表）
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;
  const maxCountRef = useRef(maxCount);
  maxCountRef.current = maxCount;
  const messageRef = useRef(message);
  messageRef.current = message;
  /** 已尝试重解析的文件 uid：同一个装载周期只重试一次，避免新直链再次失效时无限循环 */
  const previewRetryRef = useRef(new Set<string>());

  /**
   * 预览加载失败时重新解析一次下载位置。
   *
   * <p>对象存储直链带有效期（默认 300 秒），页面停留久了 `<img>` 会 403；
   * 用 fileId 重新问一次服务端即可自愈，不需要用户刷新页面。</p>
   */
  const refreshPreview = useCallback(
    async (file: NeUploadFile): Promise<boolean> => {
      if (!file.fileId || previewRetryRef.current.has(file.uid)) return false;
      previewRetryRef.current.add(file.uid);
      try {
        const locations = await appStorageService.getDownloadLocation(file.fileId);
        const nextUrl = locations[0]?.url;
        if (!nextUrl) return false;
        applyUpdate((prev) => prev.map((item) => (
          item.uid === file.uid ? { ...item, url: nextUrl, thumbUrl: nextUrl } : item
        )));
        return true;
      } catch {
        // 重解析失败就保持占位，不打扰用户；下次挂载会重新装载
        return false;
      }
    },
    [applyUpdate],
  );

  const removeFile = useCallback(
    async (file: NeUploadFile) => {
      // 延迟删除：只记下 fileId，由业务保存时统一释放引用（保存失败则恢复）
      if (removalMode === 'deferred') {
        markRemoved([file]);
        applyUpdate((prev) => prev.filter((item) => item.uid !== file.uid));
        if (!onRemove) return;
        try {
          await onRemove(file);
        } catch (error) {
          void message.error(getErrorMessage(error, '移除失败，请重试'));
        }
        return;
      }
      // 只有已有正式文件 id 的才是服务端文件；未绑定的上传任务只清本地状态，不触发正式删除
      if (deleteFile && file.fileId) {
        try {
          await deleteFile(file);
        } catch (error) {
          void message.error(getErrorMessage(error, '删除失败，请重试'));
          return;
        }
      }
      applyUpdate((prev) => prev.filter((item) => item.uid !== file.uid));
      if (!onRemove) return;
      try {
        await onRemove(file);
      } catch (error) {
        // 外部移除钩子失败不得静默：至少要让用户知道这次移除没生效
        void message.error(getErrorMessage(error, '移除失败，请重试'));
      }
    },
    [applyUpdate, deleteFile, markRemoved, message, onRemove, removalMode],
  );

  const uploadOne = useCallback(
    async (file: File) => {
      // 单值资源位换图：被顶掉的已保存文件在延迟删除模式下也要释放，否则旧记录永久残留
      const displaced = maxCount === 1
        ? pendingFilesRef.current.filter((item) => Boolean(item.fileId))
        : [];
      const localFile: NeUploadFile = {
        uid: createLocalUid(file),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        // 保留原始文件，未绑定正式文件时用它生成本地预览
        originFileObj: file,
        status: 'uploading',
        percent: 0,
      };

      applyUpdate((prev) =>
        maxCount === 1 ? [localFile] : [...prev, localFile],
      );

      try {
        if (!uploadRequest) throw new Error('未配置上传方法');
        const task = await uploadRequest(file, (percent) => {
          applyUpdate((prev) =>
            prev.map((item) => (item.uid === localFile.uid && item.status === 'uploading' ? { ...item, percent } : item)),
          );
        });
        const doneFile = mapTaskToFile(localFile, task);
        applyUpdate((prev) =>
          prev.map((item) => (item.uid === localFile.uid ? doneFile : item)),
        );
        // 上传成功才把被顶掉的旧文件计入待删除：上传失败时旧文件其实没被替换
        markRemoved(displaced);
        onUploadSuccess?.(doneFile, task);
      } catch (error) {
        const errorFile: NeUploadFile = { ...localFile, status: 'error', errorMessage: getErrorMessage(error) };
        applyUpdate((prev) =>
          prev.map((item) => (item.uid === localFile.uid ? errorFile : item)),
        );
        onUploadError?.(errorFile, error);
      }
    },
    [applyUpdate, markRemoved, maxCount, onUploadError, onUploadSuccess, uploadRequest],
  );

  const retryFile = useCallback(
    (file: NeUploadFile) => {
      const originFile = file.originFileObj;
      if (!originFile) return;
      // 先摘掉失败的旧条目，避免重试成功后列表里同时存在两条同名记录
      applyUpdate((prev) => prev.filter((item) => item.uid !== file.uid));
      void uploadOne(originFile);
    },
    [applyUpdate, uploadOne],
  );

  /** 撤销全部待删除：把文件放回列表（数量受 maxCount 约束）。 */
  const restoreRemoved = useCallback(() => {
    applyUpdate((prev) => limitFiles([...removedFilesRef.current, ...prev], maxCount));
    applyRemovedFiles([]);
  }, [applyUpdate, applyRemovedFiles, maxCount]);

  const visibleFilesRef = useRef(visibleFiles);
  visibleFilesRef.current = visibleFiles;

  const overflowBatchRef = useRef<File[] | null>(null);

  const beforeUpload: UploadProps['beforeUpload'] = (file, selectedFiles) => {
    const currentVisible = visibleFilesRef.current;
    const remaining = canReplaceSingleFile || maxCount === 1 ? 1 : Math.max(0, maxCount - currentVisible.length);
    const allowedFiles = selectedFiles.slice(0, remaining);
    const overflowFiles = selectedFiles.slice(remaining);

    if (overflowFiles.length > 0 && overflowBatchRef.current !== selectedFiles) {
      overflowBatchRef.current = selectedFiles;
      onLimitExceeded?.(overflowFiles, maxCount);
      if (!onLimitExceeded) void message.warning(`最多只能上传 ${maxCount} 个文件`);
    }

    if (allowedFiles.includes(file)) {
      // accept 只是选择器提示（拖拽/改后缀可绕过），服务端才是权威；这里提前拦一次避免白传流量
      if (isExtensionAllowed(uploadPolicy.allowedExtensions, file.name)) {
        void uploadOne(file);
      } else {
        void message.error(`该文件类型不允许上传（允许：${parseAllowedExtensions(uploadPolicy.allowedExtensions).join('、')}）`);
      }
    }
    return Upload.LIST_IGNORE;
  };

  // 按钮文案可自定义，无障碍名称必须与可见文案一致，否则读屏读到的和看到的不一样
  const defaultUploadText = variant === 'image' ? '上传图片' : '上传附件';
  const uploadLabel = uploadText ?? defaultUploadText;
  const uploadAriaLabel = typeof uploadLabel === 'string' ? uploadLabel : defaultUploadText;

  const uploadButton = (
    <Upload accept={effectiveAccept} disabled={disabled} showUploadList={false} beforeUpload={beforeUpload} multiple={maxCount > 1}>
      {canReplaceSingleFile || !atLimit ? (
        <Button aria-label={uploadAriaLabel} icon={<PlusOutlined />} disabled={disabled}>
          {uploadLabel}
        </Button>
      ) : null}
    </Upload>
  );

  return (
    <div className={cx(styles.root, className)} style={style}>
      {variant === 'image' ? (
        <ImageUploadList
          files={visibleFiles}
          shape={shape}
          size={thumbnailSize}
          height={thumbnailHeight ?? thumbnailSize}
          preview={preview}
          uploadButton={uploadButton}
          onRemove={removeFile}
          onRetry={retryFile}
          disabled={disabled}
          imageAlt={imageAlt}
          removeLabel={removeLabel}
          removable={removable}
          placeholder={placeholder}
          onPreviewError={refreshPreview}
        />
      ) : (
        <FileUploadList
          files={visibleFiles}
          uploadButton={uploadButton}
          onRemove={removeFile}
          onRetry={retryFile}
          disabled={disabled}
          removeLabel={removeLabel}
          removable={removable}
        />
      )}
      {removalMode === 'deferred' && removedFiles.length > 0 ? (
        <Typography.Text type="secondary" className={styles.removalHint}>
          已标记删除 {removedFiles.length} 个文件，保存后生效
          <Button type="link" size="small" disabled={disabled} onClick={restoreRemoved}>
            撤销
          </Button>
        </Typography.Text>
      ) : null}
      {helperText ? <Typography.Text type="secondary">{helperText}</Typography.Text> : null}
    </div>
  );
}

export function NeUpload(props: NeUploadProps) {
  return <NeUploadView {...props} variant="file" />;
}

export function NeImageUpload({
  accept,
  maxCount = defaultMaxCount,
  preview = true,
  ...rest
}: NeImageUploadProps) {
  // accept 不在这里兜底成 image/*：留给视图先按策略白名单推导，未配置白名单时才回退到 image/*
  return <NeUploadView {...rest} accept={accept} maxCount={maxCount} preview={preview} variant="image" />;
}

export type { NeImageUploadProps, NeUploadFile, NeUploadProps, NeUploadStatus } from './types';

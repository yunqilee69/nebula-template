import { DeleteOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Tabs, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { NeUpload } from '@/components/ne-upload';
import { createPolicyUploadRequest } from '@/api/storage';
import { appStorageService } from '@/api/storage-service';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { storageFileService as defaultStorageFileService } from '@/services/storage-files';
import type { StorageFileService } from '@/services/storage-files';
import { storageUploadTaskService as defaultStorageUploadTaskService } from '@/services/storage-upload-tasks';
import type { StorageUploadTaskService } from '@/services/storage-upload-tasks';
import { ensureUploadPolicy, useUploadPolicyStore } from '@/stores/upload-policy-store';
import type { StorageFileResp, UploadTaskDetailResp, UploadTaskStatus } from '@/types/storage';

const storageFileDeletePermission = 'API:STORAGE_FILE_DELETE:Allow';
const storageUploadPermission = 'API:STORAGE_UPLOAD:Allow';
const storageUploadTaskDeletePermission = 'API:STORAGE_UPLOAD_TASK_DELETE:Allow';

type StorageTabKey = 'files' | 'uploadTasks';

/** 正式文件表格搜索项。 */
interface StorageFileQuery {
  fileName?: string;
  sourceEntity?: string;
  sourceId?: string;
  sourceType?: string;
}

/** 临时上传任务表格搜索项。 */
interface StorageUploadTaskQuery {
  fileName?: string;
  taskMode?: string;
  status?: UploadTaskStatus;
  uploadUserId?: string;
}

export interface StorageFileManagementPageProps {
  /** 便于测试注入正式文件服务。 */
  readonly service?: StorageFileService;
  /** 便于测试注入临时上传任务服务。 */
  readonly uploadTaskService?: StorageUploadTaskService;
}

/** 文件大小展示：超过 1KB 逐级换算，保留一位小数。 */
function formatFileSize(size: number | undefined) {
  if (!size || size <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${unitIndex === 0 ? value : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatTaskStatus(status: UploadTaskStatus, t: (key: any) => string) {
  const keyByStatus: Record<UploadTaskStatus, string> = {
    INIT: 'storageManage.taskStatuses.init',
    UPLOADING: 'storageManage.taskStatuses.uploading',
    COMPLETED: 'storageManage.taskStatuses.completed',
    FAILED: 'storageManage.taskStatuses.failed',
  };
  return t(keyByStatus[status]);
}

function formatTaskMode(taskMode: string, t: (key: any) => string) {
  if (taskMode === 'simple') return t('storageManage.taskModes.simple');
  if (taskMode === 'chunk') return t('storageManage.taskModes.chunk');
  return taskMode || '-';
}

function formatDateTime(value: unknown) {
  return typeof value === 'string' && value ? value : '-';
}

interface StorageFilesTableProps {
  readonly service: StorageFileService;
}

function StorageFilesTable({ service }: StorageFilesTableProps) {
  const { t } = useNebulaI18n();
  const { message } = App.useApp();
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);

  const requestFiles = useCallback(
    (params: StorageFileQuery & NebulaPageReq) => service.pageFiles({
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      fileName: params.fileName,
      sourceEntity: params.sourceEntity,
      sourceId: params.sourceId,
      sourceType: params.sourceType,
    }),
    [service],
  );

  const handleDownload = useCallback(
    async (file: StorageFileResp) => {
      try {
        await service.downloadFile(file);
      } catch (error: unknown) {
        message.error(error instanceof Error && error.message ? error.message : t('storageManage.feedback.downloadFailed'));
      }
    },
    [message, service, t],
  );

  const handleShare = useCallback(
    async (file: StorageFileResp) => {
      try {
        const signed = await service.createSignedDownload({ fileId: file.id, filename: file.fileName });
        if (!signed?.url) {
          message.error(t('storageManage.feedback.shareMissingUrl'));
          return;
        }
        await copyText(signed.url);
        message.success(
          t('storageManage.feedback.shareCopied').replace(
            '{expireAt}',
            new Date(signed.expireAtEpochSecond * 1000).toLocaleString(),
          ),
        );
      } catch (error: unknown) {
        message.error(error instanceof Error && error.message ? error.message : t('storageManage.feedback.shareFailed'));
      }
    },
    [message, service, t],
  );

  const handleDelete = useCallback(
    async (file: StorageFileResp) => {
      try {
        await service.deleteFile(file.id);
        message.success(t('storageManage.feedback.deleteSuccess'));
        await actionRef.current?.reload();
      } catch (error: unknown) {
        message.error(error instanceof Error && error.message ? error.message : t('storageManage.feedback.deleteFailed'));
      }
    },
    [message, service, t],
  );

  const columns = useMemo<NebulaProColumns<StorageFileResp>[]>(() => [
    {
      title: t('storageManage.columns.fileName'),
      dataIndex: 'fileName',
      ellipsis: true,
    },
    {
      title: t('storageManage.fields.sourceEntity'),
      dataIndex: 'sourceEntity',
      hideInTable: true,
    },
    {
      title: t('storageManage.fields.sourceId'),
      dataIndex: 'sourceId',
      hideInTable: true,
    },
    {
      title: t('storageManage.fields.sourceType'),
      dataIndex: 'sourceType',
      hideInTable: true,
    },
    {
      title: t('storageManage.columns.fileSize'),
      dataIndex: 'fileSize',
      width: 110,
      search: false,
      render: (_value, file) => formatFileSize(file.fileSize),
    },
    {
      title: t('storageManage.columns.mimeType'),
      dataIndex: 'fileMimeType',
      width: 180,
      search: false,
      ellipsis: true,
      render: (_value, file) => file.fileMimeType ?? '-',
    },
    {
      title: t('storageManage.columns.source'),
      key: 'source',
      width: 260,
      search: false,
      render: (_value, file) => {
        const parts = [file.sourceEntity, file.sourceId, file.sourceType].filter(Boolean);
        return parts.length > 0 ? <Typography.Text ellipsis>{parts.join(' / ')}</Typography.Text> : '-';
      },
    },
    {
      title: t('storageManage.columns.extension'),
      dataIndex: 'fileExtension',
      width: 90,
      search: false,
      render: (_value, file) => (file.fileExtension ? <Tag>{file.fileExtension}</Tag> : '-'),
    },
    {
      title: t('storageManage.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      render: (value) => formatDateTime(value),
    },
    {
      title: t('storageManage.columns.actions'),
      key: 'actions',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_value, file) => [
        <Button key="download" type="link" size="small" icon={<DownloadOutlined />} onClick={() => void handleDownload(file)}>
          {t('storageManage.actions.download')}
        </Button>,
        <Button key="share" type="link" size="small" icon={<LinkOutlined />} onClick={() => void handleShare(file)}>
          {t('storageManage.actions.share')}
        </Button>,
        <Access key="delete" permission={storageFileDeletePermission} fallback={null}>
          <Popconfirm
            title={t('storageManage.confirm.deleteTitle')}
            description={t('storageManage.confirm.deleteContent').replace('{fileName}', file.fileName)}
            okText={t('common.actions.confirm')}
            cancelText={t('common.actions.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(file)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t('storageManage.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [handleDelete, handleDownload, handleShare, t]);

  return (
    <NebulaProTable<StorageFileResp, StorageFileQuery>
      actionRef={actionRef}
      rowKey="id"
      headerTitle={t('storageManage.title')}
      columns={columns}
      request={requestFiles}
      search={{ labelWidth: 'auto', defaultCollapsed: false }}
      scroll={{ x: 1200 }}
    />
  );
}

interface StorageUploadTasksTableProps {
  readonly service: StorageUploadTaskService;
}

function StorageUploadTasksTable({ service }: StorageUploadTasksTableProps) {
  const { t } = useNebulaI18n();
  const { message } = App.useApp();
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const uploadPolicy = useUploadPolicyStore((state) => state.policy);
  const uploadPolicyLoaded = useUploadPolicyStore((state) => state.loaded);

  useEffect(() => {
    if (!uploadPolicyLoaded) void ensureUploadPolicy();
  }, [uploadPolicyLoaded]);

  const requestTasks = useCallback(
    (params: StorageUploadTaskQuery & NebulaPageReq) => service.pageUploadTasks({
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      fileName: params.fileName,
      taskMode: params.taskMode,
      status: params.status,
      uploadUserId: params.uploadUserId,
    }),
    [service],
  );

  const uploadRequest = useMemo(
    () => createPolicyUploadRequest(appStorageService, uploadPolicy),
    [uploadPolicy],
  );

  const handleUploadSuccess = useCallback(async () => {
    message.success(t('storageManage.feedback.uploadSuccess'));
    await actionRef.current?.reload();
  }, [message, t]);

  const handleUploadError = useCallback((error: unknown) => {
    message.error(error instanceof Error && error.message ? error.message : t('storageManage.feedback.uploadFailed'));
  }, [message, t]);

  const handleDelete = useCallback(
    async (task: UploadTaskDetailResp) => {
      try {
        await service.deleteUploadTask(task.id);
        message.success(t('storageManage.feedback.deleteTaskSuccess'));
        await actionRef.current?.reload();
      } catch (error: unknown) {
        message.error(error instanceof Error && error.message ? error.message : t('storageManage.feedback.deleteTaskFailed'));
      }
    },
    [message, service, t],
  );

  const columns = useMemo<NebulaProColumns<UploadTaskDetailResp>[]>(() => [
    {
      title: t('storageManage.columns.taskId'),
      dataIndex: 'id',
      width: 220,
      search: false,
      ellipsis: true,
    },
    {
      title: t('storageManage.columns.fileName'),
      dataIndex: 'fileName',
      ellipsis: true,
    },
    {
      title: t('storageManage.fields.taskMode'),
      dataIndex: 'taskMode',
      valueEnum: {
        simple: { text: t('storageManage.taskModes.simple') },
        chunk: { text: t('storageManage.taskModes.chunk') },
      },
      render: (_value, task) => formatTaskMode(task.taskMode, t),
    },
    {
      title: t('storageManage.columns.fileSize'),
      dataIndex: 'fileSize',
      width: 110,
      search: false,
      render: (_value, task) => formatFileSize(task.fileSize),
    },
    {
      title: t('storageManage.columns.mimeType'),
      dataIndex: 'fileMimeType',
      width: 180,
      search: false,
      ellipsis: true,
      render: (_value, task) => task.fileMimeType ?? '-',
    },
    {
      title: t('storageManage.columns.extension'),
      dataIndex: 'fileExtension',
      width: 90,
      search: false,
      render: (_value, task) => (task.fileExtension ? <Tag>{task.fileExtension}</Tag> : '-'),
    },
    {
      title: t('storageManage.columns.fileHash'),
      dataIndex: 'fileHash',
      width: 220,
      search: false,
      ellipsis: true,
      render: (_value, task) => task.fileHash ?? '-',
    },
    {
      title: t('storageManage.columns.status'),
      dataIndex: 'status',
      width: 120,
      valueEnum: {
        INIT: { text: t('storageManage.taskStatuses.init') },
        UPLOADING: { text: t('storageManage.taskStatuses.uploading') },
        COMPLETED: { text: t('storageManage.taskStatuses.completed') },
        FAILED: { text: t('storageManage.taskStatuses.failed') },
      },
      render: (_value, task) => formatTaskStatus(task.status, t),
    },
    {
      title: t('storageManage.columns.bound'),
      dataIndex: 'bound',
      width: 140,
      search: false,
      render: (_value, task) => task.bound ? t('storageManage.bound.yes') : t('storageManage.bound.no'),
    },
    {
      title: t('storageManage.columns.chunkCount'),
      dataIndex: 'chunkCount',
      width: 100,
      search: false,
      render: (_value, task) => task.chunkCount ?? '-',
    },
    {
      title: t('storageManage.columns.uploadedChunkCount'),
      dataIndex: 'uploadedChunkCount',
      width: 130,
      search: false,
      render: (_value, task) => task.uploadedChunkCount ?? '-',
    },
    {
      title: t('storageManage.columns.uploadUserId'),
      dataIndex: 'uploadUserId',
      width: 150,
      search: false,
      ellipsis: true,
      render: (_value, task) => task.uploadUserId ?? '-',
    },
    {
      title: t('storageManage.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      render: (value) => formatDateTime(value),
    },
    {
      title: t('storageManage.columns.updateTime'),
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      render: (value) => formatDateTime(value),
    },
    {
      title: t('storageManage.columns.lastChunkTime'),
      dataIndex: 'lastChunkTime',
      width: 180,
      search: false,
      render: (value) => formatDateTime(value),
    },
    {
      title: t('storageManage.columns.actions'),
      key: 'actions',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_value, task) => (
        <Access permission={storageUploadTaskDeletePermission} fallback={null}>
          <Popconfirm
            title={t('storageManage.confirm.deleteTaskTitle')}
            description={t('storageManage.confirm.deleteTaskContent').replace('{fileName}', task.fileName)}
            okText={t('common.actions.confirm')}
            cancelText={t('common.actions.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(task)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t('storageManage.actions.deleteTask')}
            </Button>
          </Popconfirm>
        </Access>
      ),
    },
  ], [handleDelete, t]);

  return (
    <NebulaProTable<UploadTaskDetailResp, StorageUploadTaskQuery>
      actionRef={actionRef}
      rowKey="id"
      headerTitle={t('storageManage.tabs.uploadTasks')}
      columns={columns}
      request={requestTasks}
      search={{ labelWidth: 'auto', defaultCollapsed: false }}
      scroll={{ x: 2200 }}
      toolBarRender={() => [
        <Access key="upload" permission={storageUploadPermission} fallback={null}>
          <NeUpload
            maxCount={1}
            replaceable
            removable={() => false}
            uploadText={t('storageManage.actions.upload')}
            uploadRequest={uploadRequest}
            onUploadSuccess={() => void handleUploadSuccess()}
            onUploadError={(_file, error) => handleUploadError(error)}
          />
        </Access>,
      ]}
    />
  );
}

/**
 * 存储管理：正式文件与临时上传任务分 Tab 展示。
 *
 * 正式文件保留下载、分享和正式文件删除行为；临时任务只展示元数据，上传和临时任务删除分别受接口权限控制。
 */
export function StorageFileManagementPage({
  service = defaultStorageFileService,
  uploadTaskService = defaultStorageUploadTaskService,
}: StorageFileManagementPageProps) {
  const { t } = useNebulaI18n();
  const [activeTabKey, setActiveTabKey] = useState<StorageTabKey>('files');

  const handleTabChange = useCallback((key: string) => {
    if (key === 'files' || key === 'uploadTasks') setActiveTabKey(key);
  }, []);

  return (
    <Tabs
      activeKey={activeTabKey}
      onChange={handleTabChange}
      items={[
        {
          key: 'files',
          label: t('storageManage.tabs.files'),
          children: activeTabKey === 'files' ? <StorageFilesTable service={service} /> : null,
        },
        {
          key: 'uploadTasks',
          label: t('storageManage.tabs.uploadTasks'),
          children: activeTabKey === 'uploadTasks' ? <StorageUploadTasksTable service={uploadTaskService} /> : null,
        },
      ]}
    />
  );
}

/** 复制文本：优先用剪贴板 API，不可用时退回隐藏输入框方案（http 环境下 clipboard 不可用）。 */
async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

export default StorageFileManagementPage;

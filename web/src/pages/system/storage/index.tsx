import { DeleteOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Tag, Typography } from 'antd';
import { useCallback, useMemo, useRef } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { StorageFileResp } from '@/types/storage';
import { storageFileService as defaultStorageFileService } from '@/services/storage-files';
import type { StorageFileService } from '@/services/storage-files';

/**
 * 删除正式文件需要的接口权限码：与后端 `StorageApiCodes.STORAGE_FILE_DELETE` 对应。
 * 删除入口按它显隐；服务端另有同样的准入校验。
 */
const storageFileDeletePermission = 'API:STORAGE_FILE_DELETE:Allow';

/** 表格搜索项。 */
interface StorageFileQuery {
  fileName?: string;
  sourceEntity?: string;
  sourceId?: string;
  sourceType?: string;
}

export interface StorageFileManagementPageProps {
  /** 便于测试注入替身。 */
  readonly service?: StorageFileService;
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

/**
 * 存储管理：以表格查看当前租户内的全部正式文件，支持下载、分享、删除。
 *
 * <p>三个操作都走后端既有接口，因此都会被审计记录：
 * 下载 = `GET /api/storage/download`（`STORAGE_FILE_QUERY`），
 * 分享 = `POST /api/storage/generate-signed-url`（`STORAGE_FILE_QUERY`，审计 `GENERATE_SIGNED_URL`），
 * 删除 = `DELETE /api/storage/files/{id}`（`STORAGE_FILE_DELETE`，审计 `DELETE_FILE`）。</p>
 *
 * <p>删除只删记录不删内容：内容按 `storageKey` 共享，零引用时由后端回收。</p>
 */
export function StorageFileManagementPage({ service = defaultStorageFileService }: StorageFileManagementPageProps) {
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

  /** 下载：交给存储 API 的封装解析下载位置（DIRECT 直链、PROXY 代理），再触发浏览器保存。 */
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

  /** 分享：申请短时签名地址并复制到剪贴板，直接发给第三方即可下载。 */
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
        // 删掉的可能是当前页最后一条：交给表格刷新，越界时它会自动回退
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
    // 归属三元组：只作为搜索项（表格里合并成一列展示）
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
      render: (value) => (typeof value === 'string' && value ? value : '-'),
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

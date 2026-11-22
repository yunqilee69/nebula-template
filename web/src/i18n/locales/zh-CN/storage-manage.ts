import type { NebulaStorageManageMessages } from '../../types';

export const storageManage: NebulaStorageManageMessages = {
  title: '存储管理',
  actions: {
    refresh: '刷新',
    search: '查询',
    reset: '重置',
    download: '下载',
    share: '分享',
    delete: '删除',
  },
  columns: {
    fileName: '文件名',
    fileSize: '大小',
    mimeType: '类型',
    source: '业务归属',
    extension: '来源',
    createTime: '创建时间',
    actions: '操作',
  },
  fields: {
    fileName: '文件名',
    sourceEntity: '来源实体',
    sourceId: '来源ID',
    sourceType: '来源类型',
  },
  placeholders: {
    fileName: '按文件名模糊查询',
    sourceEntity: '如 contract',
    sourceId: '业务记录 ID',
    sourceType: '如 attachment',
  },
  confirm: {
    deleteTitle: '删除文件',
    deleteContent: '确认删除「{fileName}」？只解除本条记录，若其它记录仍引用同一内容则内容保留。',
  },
  feedback: {
    loadFailed: '加载文件列表失败',
    downloadFailed: '下载失败',
    shareMissingUrl: '生成分享链接失败',
    shareFailed: '生成分享链接失败',
    shareCopied: '分享链接已复制，有效期至 {expireAt}',
    deleteSuccess: '已删除',
    deleteFailed: '删除失败',
  },
};

import type { NebulaStorageManageMessages } from '../../types';

export const storageManage: NebulaStorageManageMessages = {
  title: 'Storage',
  actions: {
    refresh: 'Refresh',
    search: 'Search',
    reset: 'Reset',
    download: 'Download',
    share: 'Share',
    delete: 'Delete',
  },
  columns: {
    fileName: 'File name',
    fileSize: 'Size',
    mimeType: 'Type',
    source: 'Business source',
    extension: 'Format',
    createTime: 'Created at',
    actions: 'Actions',
  },
  fields: {
    fileName: 'File name',
    sourceEntity: 'Source entity',
    sourceId: 'Source ID',
    sourceType: 'Source type',
  },
  placeholders: {
    fileName: 'Search by file name',
    sourceEntity: 'e.g. contract',
    sourceId: 'Business record ID',
    sourceType: 'e.g. attachment',
  },
  confirm: {
    deleteTitle: 'Delete file',
    deleteContent: 'Delete "{fileName}"? Only this record is removed; the content is kept while other records still reference it.',
  },
  feedback: {
    loadFailed: 'Failed to load files',
    downloadFailed: 'Download failed',
    shareMissingUrl: 'Failed to create the share link',
    shareFailed: 'Failed to create the share link',
    shareCopied: 'Share link copied, valid until {expireAt}',
    deleteSuccess: 'Deleted',
    deleteFailed: 'Delete failed',
  },
};

import type { NebulaPageReq, NebulaPageResp } from '@/components/nebula-pro-table/params';
import { request } from '@/request/request';
import type { UploadTaskDetailResp } from '@/types/storage';

/** 临时上传任务分页条件。 */
export interface StorageUploadTaskPageQuery extends NebulaPageReq {
  taskMode?: string;
  fileName?: string;
  status?: string;
  uploadUserId?: string;
}

export interface StorageUploadTaskService {
  /** 分页查询当前租户的上传任务元数据。 */
  pageUploadTasks: (query: StorageUploadTaskPageQuery) => Promise<NebulaPageResp<UploadTaskDetailResp>>;
  /** 删除临时上传任务及其临时内容，不影响绑定后的正式文件。 */
  deleteUploadTask: (taskId: string) => Promise<void>;
}

export const storageUploadTaskService: StorageUploadTaskService = {
  pageUploadTasks: (query) => request<NebulaPageResp<UploadTaskDetailResp>>({
    method: 'POST',
    url: '/api/storage/upload-tasks/page',
    data: query,
  }),

  deleteUploadTask: async (taskId) => {
    await request<void>({
      method: 'DELETE',
      url: `/api/storage/upload-tasks/${encodeURIComponent(taskId)}`,
    });
  },
};

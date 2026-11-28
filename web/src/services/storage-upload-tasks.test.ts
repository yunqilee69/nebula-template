import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { storageUploadTaskService } from './storage-upload-tasks';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('storageUploadTaskService', () => {
  it('pages temporary upload tasks with all supported filters', async () => {
    mockedRequest.mockResolvedValue({ data: [], total: 0 });

    await storageUploadTaskService.pageUploadTasks({
      pageNum: 2,
      pageSize: 20,
      taskMode: 'chunk',
      fileName: 'contract',
      status: 'COMPLETED',
      uploadUserId: 'user-1',
    });

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/storage/upload-tasks/page',
      data: {
        pageNum: 2,
        pageSize: 20,
        taskMode: 'chunk',
        fileName: 'contract',
        status: 'COMPLETED',
        uploadUserId: 'user-1',
      },
    });
  });

  it('deletes a temporary upload task with an encoded id', async () => {
    mockedRequest.mockResolvedValue(undefined);

    await storageUploadTaskService.deleteUploadTask('task/1');

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/api/storage/upload-tasks/task%2F1',
    });
  });
});

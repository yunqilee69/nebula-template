import { describe, expect, it, vi } from 'vitest';
import { createStorageService, parseStorageDownloadUrl } from './storage';

describe('createStorageService', () => {
  it('uploads a simple file with multipart fields', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'task-1', fileName: 'a.txt', status: 'COMPLETED', taskMode: 'simple' });
    const service = createStorageService(request);
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });

    await expect(service.uploadSimpleFile(file)).resolves.toMatchObject({ id: 'task-1' });

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/upload',
      method: 'post',
      data: expect.any(FormData),
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = request.mock.calls[0][0].data as FormData;
    expect(data.get('file')).toBe(file);
    expect(data.get('fileName')).toBe('a.txt');
  });

  it('omits sourceType when listing all files for a source', async () => {
    const request = vi.fn().mockResolvedValue([]);
    const service = createStorageService(request);

    await service.listFilesBySource({ sourceEntity: 'contract', sourceId: 'c-1', sourceType: '' });

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/files/list-by-source',
      method: 'post',
      data: { sourceEntity: 'contract', sourceId: 'c-1' },
    });
  });

  it('keeps sourceType when listing a specific source slot', async () => {
    const request = vi.fn().mockResolvedValue([]);
    const service = createStorageService(request);

    await service.listFilesBySource({ sourceEntity: 'contract', sourceId: 'c-1', sourceType: 'attachment' });

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/files/list-by-source',
      method: 'post',
      data: { sourceEntity: 'contract', sourceId: 'c-1', sourceType: 'attachment' },
    });
  });

  it('builds authenticated download URLs', () => {
    const service = createStorageService(vi.fn());

    expect(service.getDownloadUrl('file-1', '合同.pdf')).toBe('/api/storage/download?fileId=file-1&filename=%E5%90%88%E5%90%8C.pdf');
  });

  it('downloads files as blobs through the authenticated request client', async () => {
    const blob = new Blob(['avatar'], { type: 'image/png' });
    const request = vi.fn().mockResolvedValue(blob);
    const service = createStorageService(request);

    await expect(service.downloadFile('file-1', 'avatar.png')).resolves.toBe(blob);

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/download?fileId=file-1&filename=avatar.png',
      method: 'get',
      responseType: 'blob',
    });
  });

  it('parses storage download URLs for authenticated preview loading', () => {
    expect(parseStorageDownloadUrl('/api/storage/download?fileId=file-1&filename=avatar.png')).toEqual({
      fileId: 'file-1',
      filename: 'avatar.png',
    });
    expect(parseStorageDownloadUrl('https://cdn.example.com/avatar.png')).toBeUndefined();
  });

  it('binds an upload task to a source', async () => {
    const request = vi.fn().mockResolvedValue('ok');
    const service = createStorageService(request);

    await service.bindUploadTask('task-1', { sourceEntity: 'contract', sourceId: 'c-1' });

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/upload-tasks/task-1/bind',
      method: 'post',
      data: { sourceEntity: 'contract', sourceId: 'c-1' },
    });
  });

  it('gets file detail by id', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'file-1', fileName: 'a.txt' });
    const service = createStorageService(request);

    await service.getFileDetail('file-1');

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/files/file-1',
      method: 'get',
    });
  });

  it('deletes a file by id', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const service = createStorageService(request);

    await service.deleteFile('file-1');

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/files/file-1',
      method: 'delete',
    });
  });
});

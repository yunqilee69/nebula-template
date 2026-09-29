import { describe, expect, it, vi } from 'vitest';
import {
  buildAcceptAttribute,
  createStorageService,
  isExtensionAllowed,
  parseAllowedExtensions,
  parseStorageDownloadUrl,
  uploadFileWithPolicy,
} from './storage';

/** 2.5MB 文件 + 1MB 分片：切成 1MB/1MB/0.5MB 三片，覆盖「不足一片的尾片」。 */
function createChunkCase() {
  const policy = { maxFileSize: 100, chunkThreshold: 1, chunkSize: 1, allowedExtensions: '', tempRetentionDays: 14 };
  const file = new File([new Uint8Array(2.5 * 1024 * 1024)], 'big.bin', { type: 'application/octet-stream' });
  return { policy, file };
}

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
      onUploadProgress: undefined,
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

  it('uploads an upload-task part through PUT with the part number in the path', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'task-1', fileName: 'a.bin', status: 'UPLOADING', taskMode: 'chunk' });
    const service = createStorageService(request);

    await service.uploadTaskPart('task-1', 2, new Blob(['part']));

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/upload-tasks/task-1/parts/2',
      method: 'put',
      data: expect.any(FormData),
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: undefined,
    });
  });

  it('creates an upload task with the server-computed chunk plan', async () => {
    const request = vi.fn().mockResolvedValue('task-1');
    const service = createStorageService(request);

    await service.createUploadTask({ fileName: 'a.bin', fileSize: 12 * 1024 * 1024, chunkSize: 5 * 1024 * 1024, chunkCount: 3 });

    expect(request).toHaveBeenCalledWith({
      url: '/api/storage/upload-tasks',
      method: 'post',
      data: { fileName: 'a.bin', fileSize: 12 * 1024 * 1024, chunkSize: 5 * 1024 * 1024, chunkCount: 3 },
    });
  });
});

describe('upload policy helpers', () => {
  it('parses comma separated extensions case-insensitively, with or without dots', () => {
    expect(parseAllowedExtensions('.JPG, png ,,JPEG')).toEqual(['jpg', 'png', 'jpeg']);
    expect(parseAllowedExtensions(undefined)).toEqual([]);
    expect(parseAllowedExtensions('   ')).toEqual([]);
  });

  it('treats a blank whitelist as unrestricted and a dotless file name as rejected', () => {
    expect(isExtensionAllowed('', 'a.txt')).toBe(true);
    expect(isExtensionAllowed(undefined, 'a.txt')).toBe(true);
    expect(isExtensionAllowed('jpg,png', 'avatar.PNG')).toBe(true);
    expect(isExtensionAllowed('.jpg,.png', 'avatar.gif')).toBe(false);
    expect(isExtensionAllowed('jpg,png', 'avatar')).toBe(false);
  });

  it('builds an accept attribute only when a whitelist is configured', () => {
    expect(buildAcceptAttribute('jpg,png')).toBe('.jpg,.png');
    expect(buildAcceptAttribute('')).toBeUndefined();
    expect(buildAcceptAttribute(undefined)).toBeUndefined();
  });
});

describe('uploadFileWithPolicy', () => {
  const policy = { maxFileSize: 100, chunkThreshold: 10, chunkSize: 5, allowedExtensions: '', tempRetentionDays: 14 };

  function createServiceStub() {
    return {
      uploadSimpleFile: vi.fn().mockResolvedValue({ id: 'task-simple' }),
      createUploadTask: vi.fn().mockResolvedValue('task-chunk'),
      uploadTaskPart: vi.fn().mockResolvedValue({ id: 'task-chunk' }),
      completeUploadTask: vi.fn().mockResolvedValue({ id: 'task-chunk' }),
    };
  }

  it('uploads small files in a single request', async () => {
    const service = createServiceStub();
    const file = new File(['small'], 'a.txt', { type: 'text/plain' });

    await expect(uploadFileWithPolicy(service, policy, file)).resolves.toMatchObject({ id: 'task-simple' });

    expect(service.uploadSimpleFile).toHaveBeenCalledWith(file, { onUploadProgress: expect.any(Function) });
    expect(service.createUploadTask).not.toHaveBeenCalled();
  });

  it('rejects a file outside the whitelist before spending band width', async () => {
    const service = createServiceStub();
    const file = new File(['x'], 'a.gif', { type: 'image/gif' });

    await expect(uploadFileWithPolicy(service, { ...policy, allowedExtensions: 'jpg,png' }, file))
      .rejects.toThrow('该文件类型不允许上传（允许：jpg、png）');
    expect(service.uploadSimpleFile).not.toHaveBeenCalled();
  });

  it('rejects a file above the size ceiling before spending band width', async () => {
    const service = createServiceStub();
    await expect(uploadFileWithPolicy(service, { ...policy, maxFileSize: 0.000001 }, new File(['x'.repeat(10)], 'a.png')))
      .rejects.toThrow('文件大小超出上限（最大 0.000001MB）');
    expect(service.uploadSimpleFile).not.toHaveBeenCalled();
  });

  it('slices files above the threshold into ordered parts and reports real progress', async () => {
    const service = createServiceStub();
    const { policy: chunkPolicy, file } = createChunkCase();
    const progress: number[] = [];

    await expect(uploadFileWithPolicy(service, chunkPolicy, file, { onProgress: (percent) => progress.push(percent) }))
      .resolves.toMatchObject({ id: 'task-chunk' });

    expect(service.createUploadTask).toHaveBeenCalledWith({ fileName: 'big.bin', fileSize: file.size, chunkSize: 1024 * 1024, chunkCount: 3 });
    expect(service.uploadTaskPart.mock.calls.map((call) => call[1])).toEqual([1, 2, 3]);
    expect(service.completeUploadTask).toHaveBeenCalledWith('task-chunk');
    expect(progress[progress.length - 1]).toBe(100);
  });

  it('retries a failing part with the same part number because re-uploading is idempotent server side', async () => {
    const service = createServiceStub();
    const { policy: chunkPolicy, file } = createChunkCase();
    service.uploadTaskPart
      .mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }))
      .mockResolvedValue({ id: 'task-chunk' });

    await uploadFileWithPolicy(service, chunkPolicy, file);

    expect(service.uploadTaskPart.mock.calls.map((call) => call[1])).toEqual([1, 1, 2, 3]);
  });

  it('does not retry business rejections returned with a 4xx response', async () => {
    const service = createServiceStub();
    const { policy: chunkPolicy, file } = createChunkCase();
    service.uploadTaskPart.mockRejectedValue(Object.assign(new Error('bad part'), { isAxiosError: true, response: { status: 400 } }));

    await expect(uploadFileWithPolicy(service, chunkPolicy, file)).rejects.toThrow('bad part');

    expect(service.uploadTaskPart).toHaveBeenCalledTimes(1);
  });
});

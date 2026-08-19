import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { paramService } from './param';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('paramService', () => {
  describe('pageParams', () => {
    it('calls POST /api/param/page with pagination data', async () => {
      mockedRequest.mockResolvedValue({ data: [], total: 0 });

      await paramService.pageParams({ pageNum: 1, pageSize: 10, paramKey: 'APP_' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/param/page',
        data: { pageNum: 1, pageSize: 10, paramKey: 'APP_' },
      });
    });
  });

  describe('getParam', () => {
    it('calls GET /api/param/{id}', async () => {
      mockedRequest.mockResolvedValue({ id: 'param-1', paramKey: 'APP_NAME', paramName: 'App Name' });

      await paramService.getParam('param-1');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/param/param-1',
      });
    });
  });

  describe('createParam', () => {
    it('calls POST /api/param with param data', async () => {
      mockedRequest.mockResolvedValue('param-1');

      await paramService.createParam({ paramKey: 'APP_NAME', paramName: 'App Name' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/param',
        data: { paramKey: 'APP_NAME', paramName: 'App Name' },
      });
    });
  });

  describe('updateParam', () => {
    it('calls PUT /api/param/{id} with param data', async () => {
      mockedRequest.mockResolvedValue('param-1');

      await paramService.updateParam('param-1', { paramName: 'Updated Name' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/api/param/param-1',
        data: { paramName: 'Updated Name' },
      });
    });
  });

  describe('deleteParam', () => {
    it('calls DELETE /api/param/{id}', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await paramService.deleteParam('param-1');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/api/param/param-1',
      });
    });
  });

  describe('getValueByKey', () => {
    it('calls GET /api/param/key/{paramKey}', async () => {
      mockedRequest.mockResolvedValue('Nebula Web');

      await paramService.getValueByKey('APP_NAME');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/param/key/APP_NAME',
      });
    });
  });

  describe('saveOrUpdateByKey', () => {
    it('calls PUT /api/param/key/{paramKey} with data', async () => {
      mockedRequest.mockResolvedValue('APP_NAME');

      await paramService.saveOrUpdateByKey('APP_NAME', {
        paramName: 'Application Name',
        paramValue: 'Updated Value',
        dataType: 'STRING',
        moduleCode: 'system',
      });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/api/param/key/APP_NAME',
        data: {
          paramName: 'Application Name',
          paramValue: 'Updated Value',
          dataType: 'STRING',
          moduleCode: 'system',
        },
      });
    });
  });

  describe('getByKey', () => {
    it('calls GET /api/param/key/{paramKey}/detail', async () => {
      mockedRequest.mockResolvedValue({ paramKey: 'APP_NAME', paramName: 'App Name' });

      await paramService.getByKey('APP_NAME');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/param/key/APP_NAME/detail',
      });
    });
  });

  describe('getIntegerValue', () => {
    it('calls GET /api/param/key/{paramKey}/integer', async () => {
      mockedRequest.mockResolvedValue(42);

      await paramService.getIntegerValue('MAX_CONNECTIONS');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/param/key/MAX_CONNECTIONS/integer',
      });
    });
  });

  describe('getBooleanValue', () => {
    it('calls GET /api/param/key/{paramKey}/boolean', async () => {
      mockedRequest.mockResolvedValue(true);

      await paramService.getBooleanValue('FEATURE_ENABLED');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/param/key/FEATURE_ENABLED/boolean',
      });
    });
  });

  describe('listByModule', () => {
    it('calls GET /api/param/module/{moduleCode}', async () => {
      mockedRequest.mockResolvedValue([]);

      await paramService.listByModule('SYSTEM');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/param/module/SYSTEM',
      });
    });
  });

  describe('batchUpdateValues', () => {
    it('calls POST /api/param/batch-update-values with batch data', async () => {
      mockedRequest.mockResolvedValue({ successCount: 2, failCount: 0 });

      await paramService.batchUpdateValues([
        { paramKey: 'APP_NAME', paramValue: 'New App' },
        { paramKey: 'APP_VERSION', paramValue: '2.0' },
      ]);

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/param/batch-update-values',
        data: [
          { paramKey: 'APP_NAME', paramValue: 'New App' },
          { paramKey: 'APP_VERSION', paramValue: '2.0' },
        ],
      });
    });
  });

  describe('error propagation', () => {
    it('propagates request failures from pageParams', async () => {
      const error = new Error('Network error');
      mockedRequest.mockRejectedValue(error);

      await expect(paramService.pageParams({ pageNum: 1, pageSize: 10 })).rejects.toThrow('Network error');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/param/page',
        data: { pageNum: 1, pageSize: 10 },
      });
    });
  });
});

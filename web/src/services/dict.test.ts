import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { dictService } from './dict';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dictService', () => {
  describe('pageTypes', () => {
    it('calls POST /api/dict/types/page with pagination data', async () => {
      mockedRequest.mockResolvedValue({ data: [], total: 0 });

      await dictService.pageTypes({ pageNum: 1, pageSize: 10, code: 'STATUS' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/dict/types/page',
        data: { pageNum: 1, pageSize: 10, code: 'STATUS' },
      });
    });
  });

  describe('getType', () => {
    it('calls GET /api/dict/types/{id}', async () => {
      mockedRequest.mockResolvedValue({ id: 'type-1', code: 'STATUS', name: 'Status Type' });

      await dictService.getType('type-1');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/dict/types/type-1',
      });
    });
  });

  describe('createType', () => {
    it('calls POST /api/dict/types with type data', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await dictService.createType({ code: 'STATUS', name: 'Status Type' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/dict/types',
        data: { code: 'STATUS', name: 'Status Type' },
      });
    });
  });

  describe('updateType', () => {
    it('calls PUT /api/dict/types/{id} with type data', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await dictService.updateType('type-1', { name: 'Updated Name' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/api/dict/types/type-1',
        data: { name: 'Updated Name' },
      });
    });
  });

  describe('deleteType', () => {
    it('calls DELETE /api/dict/types/{id}', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await dictService.deleteType('type-1');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/api/dict/types/type-1',
      });
    });
  });

  describe('pageItems', () => {
    it('calls POST /api/dict/items/page with pagination data', async () => {
      mockedRequest.mockResolvedValue({ data: [], total: 0 });

      await dictService.pageItems({ pageNum: 1, pageSize: 20, dictCode: 'STATUS' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/dict/items/page',
        data: { pageNum: 1, pageSize: 20, dictCode: 'STATUS' },
      });
    });
  });

  describe('getItem', () => {
    it('calls GET /api/dict/items/{id}', async () => {
      mockedRequest.mockResolvedValue({ id: 'item-1', name: 'Active', itemValue: 'ACTIVE' });

      await dictService.getItem('item-1');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/dict/items/item-1',
      });
    });
  });

  describe('createItem', () => {
    it('calls POST /api/dict/items with item data', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await dictService.createItem({ dictCode: 'STATUS', name: 'Active', itemValue: 'ACTIVE' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/dict/items',
        data: { dictCode: 'STATUS', name: 'Active', itemValue: 'ACTIVE' },
      });
    });
  });

  describe('updateItem', () => {
    it('calls PUT /api/dict/items/{id} with item data', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await dictService.updateItem('item-1', { name: 'Updated Item', itemValue: 'UPDATED' });

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/api/dict/items/item-1',
        data: { name: 'Updated Item', itemValue: 'UPDATED' },
      });
    });
  });

  describe('deleteItem', () => {
    it('calls DELETE /api/dict/items/{id}', async () => {
      mockedRequest.mockResolvedValue(undefined);

      await dictService.deleteItem('item-1');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/api/dict/items/item-1',
      });
    });
  });

  describe('listItemsByCode', () => {
    it('calls GET /api/dict/items/dict/{dictCode}', async () => {
      mockedRequest.mockResolvedValue([]);

      await dictService.listItemsByCode('STATUS');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/dict/items/dict/STATUS',
      });
    });
  });

  describe('error propagation', () => {
    it('propagates request failures from pageTypes', async () => {
      const error = new Error('Network error');
      mockedRequest.mockRejectedValue(error);

      await expect(dictService.pageTypes({ pageNum: 1, pageSize: 10 })).rejects.toThrow('Network error');

      expect(mockedRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/dict/types/page',
        data: { pageNum: 1, pageSize: 10 },
      });
    });
  });
});
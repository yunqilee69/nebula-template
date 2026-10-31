import { request } from '@/lib/http';
import type { PageResult, PlatformPerson } from '@/types';

export interface PersonPageQuery {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

export const personApi = {
  page: (query: PersonPageQuery) =>
    request<PageResult<PlatformPerson>>('/api/auth/persons', { query: { ...query } }),
};

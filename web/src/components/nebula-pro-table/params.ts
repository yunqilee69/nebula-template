import type { SortOrder } from 'antd/es/table/interface';

export const NEBULA_TABLE_DEFAULT_PAGE_SIZE = 10;

export interface NebulaPageReq {
  pageNum: number;
  pageSize: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
}

export interface NebulaPageResp<RecordType> {
  data: RecordType[];
  total: number;
}

export type ProTableRawParams<Query extends object> = Query & {
  current?: number;
  pageSize?: number;
  keyword?: string;
};

function isMeaningfulValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function getPrimarySort(sort: Record<string, SortOrder>) {
  for (const [fieldName, sortOrder] of Object.entries(sort)) {
    if (sortOrder === 'ascend') {
      return { orderName: fieldName, orderType: 'asc' as const };
    }
    if (sortOrder === 'descend') {
      return { orderName: fieldName, orderType: 'desc' as const };
    }
  }
  return {};
}

export function buildNebulaTableRequestParams<Query extends object>(
  params: ProTableRawParams<Query>,
  sort: Record<string, SortOrder> = {},
): Query & NebulaPageReq {
  const { current, pageSize, keyword: _keyword, ...query } = params;
  const nextParams: Record<string, unknown> = {
    pageNum: current ?? 1,
    pageSize: pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
  };

  for (const [key, value] of Object.entries(query)) {
    if (isMeaningfulValue(value)) {
      nextParams[key] = value;
    }
  }

  return {
    ...nextParams,
    ...getPrimarySort(sort),
  } as Query & NebulaPageReq;
}

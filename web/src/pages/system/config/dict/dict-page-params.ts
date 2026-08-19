import { NEBULA_TABLE_DEFAULT_PAGE_SIZE } from '@/components/nebula-pro-table/params';
import type { NebulaPageReq } from '@/components/nebula-pro-table/params';
import type { DictItemPageReq, DictTypePageReq } from '@/types/dict';

export interface DictTypeQuery {
  readonly code?: string;
  readonly name?: string;
}

export interface DictItemQuery {
  readonly dictCode?: string;
  readonly name?: string;
  readonly enabled?: boolean;
}

type DictTypePageParams = Partial<DictTypeQuery & NebulaPageReq>;
type DictItemPageParams = Partial<DictItemQuery & NebulaPageReq>;

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function buildPageReq(params?: Partial<NebulaPageReq>): NebulaPageReq {
  const req: NebulaPageReq = {
    pageNum: params?.pageNum ?? 1,
    pageSize: params?.pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
  };

  if (params?.orderName) req.orderName = params.orderName;
  if (params?.orderType) req.orderType = params.orderType;

  return req;
}

export function buildDictTypePageReq(params?: DictTypePageParams): DictTypePageReq {
  const req: DictTypePageReq = buildPageReq(params);
  const code = normalizeOptionalText(params?.code);
  const name = normalizeOptionalText(params?.name);

  if (code) req.code = code;
  if (name) req.name = name;

  return req;
}

export function buildDictItemPageReq(params?: DictItemPageParams): DictItemPageReq {
  const req: DictItemPageReq = buildPageReq(params);
  const dictCode = normalizeOptionalText(params?.dictCode);
  const name = normalizeOptionalText(params?.name);

  if (dictCode) req.dictCode = dictCode;
  if (name) req.name = name;
  if (params?.enabled !== undefined) req.enabled = params.enabled;

  return req;
}

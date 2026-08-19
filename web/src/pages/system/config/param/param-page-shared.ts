import {
  NEBULA_TABLE_DEFAULT_PAGE_SIZE,
  type NebulaPageReq,
} from '@/components/nebula-pro-table/params';
import { DataType, type DataType as ParamDataType, type SystemParamPageReq } from '@/types/param';

export interface ParamQuery {
  paramKey?: string;
  paramName?: string;
  dataType?: ParamDataType;
  moduleCode?: string;
}

export type ParamTableParams = Partial<ParamQuery & NebulaPageReq>;

export type NormalizedParamValue = string | number | boolean | undefined;

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeStringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeIntegerValue(value: unknown): number | undefined {
  const normalized = normalizeStringValue(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function normalizeDoubleValue(value: unknown): number | undefined {
  const normalized = normalizeStringValue(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }

  const normalized = normalizeStringValue(value)?.toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

function normalizeMultipleItems(value: readonly unknown[]): string | undefined {
  const items = value
    .map((item) => normalizeStringValue(item))
    .filter((item): item is string => item !== undefined);
  return items.length > 0 ? JSON.stringify(items) : undefined;
}

function normalizeMultipleValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return normalizeMultipleItems(value);

  const normalized = normalizeStringValue(value);
  if (!normalized) return undefined;
  if (!normalized.startsWith('[')) return normalized;

  try {
    const parsed: unknown = JSON.parse(normalized);
    return Array.isArray(parsed) ? normalizeMultipleItems(parsed) : undefined;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

export function buildParamPageReq(params: ParamTableParams = {}): SystemParamPageReq {
  const req: SystemParamPageReq = {
    pageNum: params.pageNum ?? 1,
    pageSize: params.pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
  };
  const paramKey = normalizeOptionalText(params.paramKey);
  const paramName = normalizeOptionalText(params.paramName);
  const moduleCode = normalizeOptionalText(params.moduleCode);

  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  if (paramKey) req.paramKey = paramKey;
  if (paramName) req.paramName = paramName;
  if (params.dataType) req.dataType = params.dataType;
  if (moduleCode) req.moduleCode = moduleCode;

  return req;
}

export function normalizeParamValue(value: unknown, dataType: ParamDataType): NormalizedParamValue {
  switch (dataType) {
    case DataType.STRING:
      return normalizeStringValue(value);
    case DataType.INT:
      return normalizeIntegerValue(value);
    case DataType.DOUBLE:
      return normalizeDoubleValue(value);
    case DataType.BOOLEAN:
      return normalizeBooleanValue(value);
    case DataType.SINGLE:
      return normalizeStringValue(value);
    case DataType.MULTIPLE:
      return normalizeMultipleValue(value);
  }
}

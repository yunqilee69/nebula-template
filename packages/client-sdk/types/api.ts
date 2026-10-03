/**
 * 统一响应信封与分页契约。
 *
 * <p>服务端统一返回 `{code, message, data}`，且 `code` 序列化为 <b>字符串</b>（如 `"0"`）。
 * 业务错误不使用 HTTP 状态码承载，`message` 已是本地化文案，客户端直接展示，不自建 code→文案映射。</p>
 */
export interface ApiEnvelope<T> {
  /** 业务码，字符串形式；`"0"` 表示成功。 */
  code: string;
  /** 已本地化的提示文案。 */
  message: string;
  data: T;
}

/** 成功业务码。 */
export const API_SUCCESS_CODE = '0';

/** 分页结果，对应后端 `PageResp<T>`。 */
export interface PageResp<T> {
  data: T[];
  total: number;
}

/** 分页请求基类，对应后端 `BasePageReq`。 */
export interface BasePageReq {
  pageNum?: number;
  pageSize?: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
}

/** 默认分页大小，与后端 `BasePageReq.pageSize` 默认值一致。 */
export const DEFAULT_PAGE_SIZE = 20;

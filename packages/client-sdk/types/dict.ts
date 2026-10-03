/** 字典契约，对应后端 `nebula-dict` 的 `DictItemTreeResp`。 */

/** 字典项（树形）。 */
export interface DictItemTreeResp {
  id: string;
  dictCode?: string;
  name?: string;
  parentId?: string;
  itemValue?: string;
  sort?: number;
  enabled?: boolean;
  tagColor?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  children?: DictItemTreeResp[];
}

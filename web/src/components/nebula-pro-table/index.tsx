import { ProTable } from '@ant-design/pro-components';
import type { ProTableProps } from '@ant-design/pro-components';
import type { SortOrder } from 'antd/es/table/interface';
import type { ReactElement } from 'react';
import { buildNebulaTableRequestParams, NEBULA_TABLE_DEFAULT_PAGE_SIZE } from './params';
import type { NebulaPageReq, NebulaPageResp, ProTableRawParams } from './params';
import './toolbar.css';

const DEFAULT_TABLE_OPTIONS: ProTableProps<Record<string, any>, Record<string, any>, any>['options'] = {
  density: false,
  fullScreen: true,
  reload: true,
  setting: true,
};

export type NebulaProTableRequest<RecordType, Query extends object> = (
  params: Query & NebulaPageReq,
) => Promise<NebulaPageResp<RecordType>>;

export interface NebulaProTableProps<
  RecordType extends Record<string, any>,
  Query extends object = Record<string, any>,
  ValueType = 'text',
> extends Omit<ProTableProps<RecordType, Query & Record<string, any>, ValueType>, 'request' | 'toolbar'> {
  request?: NebulaProTableRequest<RecordType, Query>;
  toolbar?: ProTableProps<RecordType, Query & Record<string, any>, ValueType>['toolbar'] | false;
}

export function NebulaProTable<
  RecordType extends Record<string, any>,
  Query extends object = Record<string, any>,
  ValueType = 'text',
>({ request, pagination, className, toolbar, toolBarRender, options, ...props }: NebulaProTableProps<RecordType, Query, ValueType>): ReactElement {
  const wrappedRequest: ProTableProps<RecordType, Query & Record<string, any>, ValueType>['request'] = request
    ? async (params, sort) => {
        const page = await request(
          buildNebulaTableRequestParams<Query>(
            params as ProTableRawParams<Query>,
            sort as Record<string, SortOrder>,
          ),
        );

        return {
          data: page.data,
          total: page.total,
          success: true,
        };
      }
    : undefined;

  const mergedPagination = pagination === false
    ? false
    : {
        defaultPageSize: NEBULA_TABLE_DEFAULT_PAGE_SIZE,
        showSizeChanger: true,
        ...pagination,
      };

  const mergedClassName = `nebula-pro-table-toolbar${className ? ` ${className}` : ''}`;
  const hideToolbar = toolbar === false;
  const mergedOptions = hideToolbar ? false : (options ?? DEFAULT_TABLE_OPTIONS);
  const mergedToolBarRender = hideToolbar ? false : toolBarRender;
  const mergedToolbar = hideToolbar ? undefined : toolbar;

  return (
    <ProTable<RecordType, Query & Record<string, any>, ValueType>
      rowKey="id"
      search={{ labelWidth: 'auto' }}
      options={mergedOptions}
      pagination={mergedPagination}
      {...props}
      className={mergedClassName}
      request={wrappedRequest}
      toolbar={mergedToolbar}
      toolBarRender={mergedToolBarRender}
    />
  );
}

export type { ActionType as NebulaProTableAction, ProColumns as NebulaProColumns } from '@ant-design/pro-components';
export type { NebulaPageReq, NebulaPageResp } from './params';

import type { NebulaAuditMessages } from '../../types';

export const audit: NebulaAuditMessages = {
  columns: {
    id: '审计记录ID',
    operatorId: '操作人ID',
    operatorName: '操作人名称',
    module: '模块',
    action: '操作',
    resourceType: '资源类型',
    resourceId: '资源ID',
    resourceName: '资源名称',
    requestParams: '请求参数',
    responseData: '响应数据',
    requestIp: '请求IP',
    resultStatus: '执行状态',
    resultMessage: '结果信息',
    createTime: '创建时间',
    updateTime: '更新时间',
    actions: '操作',
  },
  actions: {
    detail: '详情',
  },
  status: {
    success: '成功',
    failure: '失败',
  },
  modal: {
    detailTitle: '审计记录详情',
    basicInfo: '基本信息',
  },
  pagination: {
    total: '共 {count} 条记录',
  },
};

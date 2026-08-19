import type { NebulaAuditMessages } from '../../types';

export const audit: NebulaAuditMessages = {
  columns: {
    id: 'Audit Record ID',
    operatorId: 'Operator ID',
    operatorName: 'Operator Name',
    module: 'Module',
    action: 'Action',
    resourceType: 'Resource Type',
    resourceId: 'Resource ID',
    resourceName: 'Resource Name',
    requestParams: 'Request Parameters',
    responseData: 'Response Data',
    requestIp: 'Request IP',
    resultStatus: 'Result Status',
    resultMessage: 'Result Message',
    createTime: 'Create Time',
    updateTime: 'Update Time',
    actions: 'Actions',
  },
  actions: {
    detail: 'Details',
  },
  status: {
    success: 'Success',
    failure: 'Failure',
  },
  modal: {
    detailTitle: 'Audit Record Detail',
    basicInfo: 'Basic Information',
  },
  pagination: {
    total: 'Total {count} records',
  },
};

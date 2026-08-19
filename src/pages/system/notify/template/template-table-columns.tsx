import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';
import { Access } from '@/components/access';
import { DictSelect } from '@/components/dict-select';
import type { NebulaProColumns } from '@/components/nebula-pro-table';
import type { NotifyTemplateResp } from '@/types/notify';
import { NOTIFY_CHANNEL_TYPE } from './template-page-helpers';

interface TemplateColumnActions {
  readonly openDetail: (record: NotifyTemplateResp) => void;
  readonly openEditForm: (record: NotifyTemplateResp) => void;
  readonly removeTemplate: (record: NotifyTemplateResp) => void;
}

export function createTemplateColumns({ openDetail, openEditForm, removeTemplate }: TemplateColumnActions): NebulaProColumns<NotifyTemplateResp>[] {
  return [
    { title: '模板编码', dataIndex: 'templateCode', fixed: 'left', width: 160, sorter: true },
    { title: '模板名称', dataIndex: 'templateName', width: 180, sorter: true, responsive: ['sm'] },
    { title: '通知渠道', dataIndex: 'channelType', hideInTable: true, formItemRender: () => <DictSelect dictCode={NOTIFY_CHANNEL_TYPE} placeholder="请选择通知渠道" showDisabled={false} /> },
    { title: '备注', dataIndex: 'remark', width: 220, search: false, responsive: ['lg'] },
    { title: '创建时间', dataIndex: 'createTime', width: 170, valueType: 'dateTime', search: false, sorter: true, responsive: ['xl'] },
    {
      title: '操作', key: 'actions', fixed: 'right', width: 168, valueType: 'option', search: false,
      render: (_, record) => [
        <Button key="detail" type="link" icon={<EyeOutlined />} aria-label="查看" onClick={() => openDetail(record)}><span className="hidden sm:inline">查看</span></Button>,
        <Access key="edit" permission="NOTIFY_TEMPLATE_EDIT" fallback={null}>
          <Button type="link" icon={<EditOutlined />} aria-label="编辑" onClick={() => openEditForm(record)}><span className="hidden sm:inline">编辑</span></Button>
        </Access>,
        <Access key="delete" permission="NOTIFY_TEMPLATE_DELETE" fallback={null}>
          <Popconfirm title="确定删除该通知模板吗？" okText="删除" cancelText="取消" onConfirm={() => removeTemplate(record)}><Button type="link" danger icon={<DeleteOutlined />} aria-label="删除"><span className="hidden sm:inline">删除</span></Button></Popconfirm>
        </Access>,
      ],
    },
  ];
}

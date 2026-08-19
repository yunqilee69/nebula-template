import { SendOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Form, Input, Select, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthManagementService } from '@/api/auth-management';
import { Access } from '@/components/access';
import { useDictItems } from '@/components/dict-select';
import { useNotice } from '@/hooks/use-notice';
import type { NotifyService } from '@/services/notify';
import type {
  ChannelType,
  NotifyChannelTargetResp,
  NotifySendResultResp,
  NotifyTemplateDetailResp,
  NotifyTemplateResp,
  ReceiverItem,
} from '@/types/notify';
import { ReceiverSelector } from './receiver-selector';
import { SendConfirmationModal } from './send-confirmation-modal';
import { createSendPlan, extractCustomTemplateVariables } from './send-page-helpers';
import type { ValidSendPlan } from './send-page-helpers';
import { SendResultTable } from './send-result-table';

const NOTIFY_CHANNEL_TYPE = 'NOTIFY_CHANNEL_TYPE';
const WECOM_CHANNEL = 'WECOM_GROUP_WEBHOOK';
const FEISHU_CHANNEL = 'FEISHU_GROUP_WEBHOOK';
const DINGTALK_CHANNEL = 'DINGTALK_GROUP_WEBHOOK';

type SendFormValues = {
  readonly channelTypes?: readonly ChannelType[];
  readonly templateId?: string;
  readonly templateParams?: Readonly<Record<string, string>>;
  readonly channelTargetIds?: Readonly<Record<string, string>>;
};

type TemplateParamField = {
  readonly name: string;
  readonly label: string;
  readonly required: boolean;
  readonly placeholder?: string;
};

export type NotificationSendService = Pick<
  NotifyService,
  'pageNotifyTemplates' | 'getNotifyTemplate' | 'pageNotifyChannelTargets' | 'sendNotify'
>;
export type NotificationSendAuthService = Pick<AuthManagementService, 'getOrgTree' | 'listRoles' | 'pageUsers'>;

export type NotificationSendPanelProps = {
  readonly notifyService: NotificationSendService;
  readonly authService: NotificationSendAuthService;
  readonly initialTemplateId?: string;
  readonly showCard?: boolean;
};

function invalidPlanMessage(reason: Exclude<ReturnType<typeof createSendPlan>, ValidSendPlan>['reason']): string {
  switch (reason) {
    case 'CHANNELS_REQUIRED':
      return '请选择至少一个通知渠道';
    case 'RECIPIENTS_REQUIRED':
      return '请选择至少一个有效接收用户';
    case 'EMAIL_RECIPIENTS_REQUIRED':
      return '邮件渠道至少需要一个配置了邮箱的用户';
    case 'WECOM_TARGET_REQUIRED':
      return '企业微信群机器人渠道请选择一个投递目标';
    case 'FEISHU_TARGET_REQUIRED':
      return '飞书群机器人渠道请选择一个投递目标';
    case 'DINGTALK_TARGET_REQUIRED':
      return '钉钉群机器人渠道请选择一个投递目标';
  }
}

function defaultTemplateParams(detail: NotifyTemplateDetailResp): Readonly<Record<string, string>> {
  const params: Record<string, string> = {};
  for (const field of detail.fields ?? []) {
    if (field.fieldCode.trim() && field.defaultValue?.trim()) {
      params[field.fieldCode.trim()] = field.defaultValue.trim();
    }
  }
  return params;
}

function buildTemplateParamFields(
  detail: NotifyTemplateDetailResp | undefined,
  channelTypes: readonly ChannelType[],
): readonly TemplateParamField[] {
  if (!detail) return [];
  const selectedChannels = new Set(channelTypes);
  const fields = new Map<string, TemplateParamField>();
  for (const field of detail.fields ?? []) {
    const name = field.fieldCode.trim();
    if (!name) continue;
    fields.set(name, {
      name,
      label: field.fieldName || name,
      required: field.requiredFlag ?? false,
      ...(field.exampleValue ? { placeholder: field.exampleValue } : {}),
    });
  }
  for (const variant of detail.variants ?? []) {
    if (!selectedChannels.has(variant.channelType)) continue;
    for (const name of extractCustomTemplateVariables(variant.subjectTemplate, variant.contentTemplate)) {
      if (!fields.has(name)) fields.set(name, { name, label: name, required: true });
    }
  }
  return [...fields.values()];
}

export function NotificationSendPanel({
  notifyService: service,
  authService,
  initialTemplateId,
  showCard = true,
}: NotificationSendPanelProps) {
  const notice = useNotice();
  const [form] = Form.useForm<SendFormValues>();
  const [templates, setTemplates] = useState<readonly NotifyTemplateResp[]>([]);
  const [templateDetail, setTemplateDetail] = useState<NotifyTemplateDetailResp>();
  const [channelTargets, setChannelTargets] = useState<readonly NotifyChannelTargetResp[]>([]);
  const [templateListLoading, setTemplateListLoading] = useState(false);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);
  const [receiverItems, setReceiverItems] = useState<readonly ReceiverItem[]>([]);
  const [pendingPlan, setPendingPlan] = useState<ValidSendPlan>();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<readonly NotifySendResultResp[]>([]);

  const loadTemplateDetail = useCallback(async (templateId: string | undefined) => {
    setTemplateDetail(undefined);
    form.setFieldValue('templateParams', {});
    form.setFieldValue('channelTypes', []);
    form.setFieldValue('channelTargetIds', {});
    if (!templateId) return;
    setTemplateDetailLoading(true);
    try {
      const detail = await service.getNotifyTemplate(templateId);
      setTemplateDetail(detail);
      form.setFieldValue('templateParams', defaultTemplateParams(detail));
      form.setFieldValue('channelTypes', (detail.variants ?? []).filter((variant) => variant.enabled).map((variant) => variant.channelType));
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('通知模板详情加载失败');
        return;
      }
      throw error;
    } finally {
      setTemplateDetailLoading(false);
    }
  }, [form, notice, service]);

  useEffect(() => {
    let active = true;
    setTemplateListLoading(true);
    service.pageNotifyTemplates({ pageNum: 1, pageSize: 100 })
      .then((page) => {
        if (active) setTemplates(page.data);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          notice.error('通知模板加载失败');
          return;
        }
        throw error;
      })
      .finally(() => {
        if (active) setTemplateListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notice, service]);

  useEffect(() => {
    let active = true;
    setTargetLoading(true);
    service.pageNotifyChannelTargets({ pageNum: 1, pageSize: 100 })
      .then((page) => {
        if (active) setChannelTargets(page.data);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          notice.error('通知渠道目标加载失败');
          return;
        }
        throw error;
      })
      .finally(() => {
        if (active) setTargetLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notice, service]);

  useEffect(() => {
    form.resetFields();
    setReceiverItems([]);
    setPendingPlan(undefined);
    setConfirmationOpen(false);
    setResults([]);
    if (!initialTemplateId) {
      setTemplateDetail(undefined);
      return;
    }
    form.setFieldValue('templateId', initialTemplateId);
    void loadTemplateDetail(initialTemplateId);
  }, [form, initialTemplateId, loadTemplateDetail]);

  const selectedChannelTypes = Form.useWatch('channelTypes', form) ?? [];
  const includesUserRecipientChannel = selectedChannelTypes.includes('SITE') || selectedChannelTypes.includes('EMAIL');
  const includesWecomTargetChannel = selectedChannelTypes.includes(WECOM_CHANNEL);
  const includesFeishuTargetChannel = selectedChannelTypes.includes(FEISHU_CHANNEL);
  const includesDingTalkTargetChannel = selectedChannelTypes.includes(DINGTALK_CHANNEL);
  const variables = useMemo(
    () => buildTemplateParamFields(templateDetail, selectedChannelTypes),
    [selectedChannelTypes, templateDetail],
  );

  const { options: allChannelOptions, loading: dictLoading } = useDictItems(NOTIFY_CHANNEL_TYPE, true);

  const channelOptions = useMemo(() => {
    if (!templateDetail) return allChannelOptions;
    const enabledTypes = new Set(
      (templateDetail.variants ?? []).filter((v) => v.enabled).map((v) => v.channelType),
    );
    return allChannelOptions.filter((opt) => enabledTypes.has(opt.value));
  }, [allChannelOptions, templateDetail]);

  const previewSend = useCallback(async () => {
    const values = await form.validateFields().then(
      (validatedValues) => validatedValues,
      () => undefined,
    );
    if (!values) return;
    if (!templateDetail) {
      notice.error('请等待通知模板详情加载完成');
      return;
    }
    const plan = createSendPlan({
      channelTypes: values.channelTypes ?? [],
      receiverItems,
      templateCode: templateDetail.templateCode,
      templateParams: values.templateParams ?? {},
      channelTargetIds: values.channelTargetIds,
    });
    switch (plan.kind) {
      case 'INVALID':
        notice.error(invalidPlanMessage(plan.reason));
        return;
      case 'VALID':
        setPendingPlan(plan);
        setConfirmationOpen(true);
        return;
    }
  }, [form, notice, receiverItems, templateDetail]);

  const confirmSend = useCallback(async () => {
    if (!pendingPlan || sending) return;
    setSending(true);
    try {
      const sendResults = await service.sendNotify(pendingPlan.request);
      setResults(sendResults);
      setConfirmationOpen(false);
      setPendingPlan(undefined);
      notice.success('通知发送请求已完成');
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('通知发送失败');
        return;
      }
      throw error;
    } finally {
      setSending(false);
    }
  }, [notice, pendingPlan, sending, service]);

  const templateLoading = templateListLoading || templateDetailLoading;
  const formContent = (
    <Form<SendFormValues> form={form} layout="vertical">
      <Form.Item
        name="channelTypes"
        label="通知渠道"
        rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一个通知渠道' }]}
      >
        <Select
          mode="multiple"
          aria-label="通知渠道"
          allowClear={false}
          loading={dictLoading}
          disabled={!templateDetail}
          options={channelOptions}
          placeholder={templateDetail ? '请选择通知渠道' : '请先选择通知模板'}
          showSearch
        />
      </Form.Item>

      {includesWecomTargetChannel ? (
        <Form.Item
          name={['channelTargetIds', WECOM_CHANNEL]}
          label="企业微信群机器人目标"
          rules={[{ required: true, message: '请选择企业微信群机器人目标' }]}
        >
          <Select
            aria-label="企业微信群机器人目标"
            loading={targetLoading}
            options={channelTargets
              .filter((target) => target.channelType === WECOM_CHANNEL)
              .map((target) => ({
                value: target.id,
                label: `${target.targetName} (${target.endpointUrl})`,
              }))}
            placeholder="请选择企业微信群机器人目标"
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      ) : null}

      {includesFeishuTargetChannel ? (
        <Form.Item
          name={['channelTargetIds', FEISHU_CHANNEL]}
          label="飞书群机器人目标"
          rules={[{ required: true, message: '请选择飞书群机器人目标' }]}
        >
          <Select
            aria-label="飞书群机器人目标"
            loading={targetLoading}
            options={channelTargets
              .filter((target) => target.channelType === FEISHU_CHANNEL)
              .map((target) => ({
                value: target.id,
                label: `${target.targetName} (${target.endpointUrl})`,
              }))}
            placeholder="请选择飞书群机器人目标"
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      ) : null}

      {includesDingTalkTargetChannel ? (
        <Form.Item
          name={['channelTargetIds', DINGTALK_CHANNEL]}
          label="钉钉群机器人目标"
          rules={[{ required: true, message: '请选择钉钉群机器人目标' }]}
        >
          <Select
            aria-label="钉钉群机器人目标"
            loading={targetLoading}
            options={channelTargets
              .filter((target) => target.channelType === DINGTALK_CHANNEL)
              .map((target) => ({
                value: target.id,
                label: `${target.targetName} (${target.endpointUrl})`,
              }))}
            placeholder="请选择钉钉群机器人目标"
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      ) : null}

      <Form.Item
        name="templateId"
        label="通知模板"
        rules={[{ required: true, message: '请选择通知模板' }]}
      >
        <Select
          aria-label="通知模板"
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          loading={templateLoading}
          disabled={templates.length === 0}
          placeholder="选择启用的通知模板"
          options={templates.map((template) => ({
            value: template.id,
            label: `${template.templateName} (${template.templateCode})`,
          }))}
          onChange={(templateId: string | undefined) => void loadTemplateDetail(templateId)}
        />
      </Form.Item>

      {templateDetailLoading && form.getFieldValue('templateId') ? <Spin size="small" /> : null}
      {templateDetail ? (
        <Typography.Paragraph type="secondary">
          已加载模板：{templateDetail.templateName} ({templateDetail.templateCode})
        </Typography.Paragraph>
      ) : null}

      {variables.map((variable) => (
        <Form.Item
          key={variable.name}
          name={['templateParams', variable.name]}
          label={variable.label}
          rules={[{ required: variable.required, message: `请输入模板参数 ${variable.name}` }]}
        >
          <Input aria-label={variable.name} placeholder={variable.placeholder ?? `输入 ${variable.name}`} />
        </Form.Item>
      ))}

      {includesUserRecipientChannel ? (
        <Form.Item label="接收对象" required>
          <ReceiverSelector service={authService} value={receiverItems} onChange={setReceiverItems} />
        </Form.Item>
      ) : null}

      <Access permission="NOTIFY_SEND_EXECUTE" fallback={null}>
        <Button type="primary" icon={<SendOutlined />} onClick={() => void previewSend()}>
          预览并发送
        </Button>
      </Access>
    </Form>
  );

  return (
    <Flex vertical gap="large">
      {showCard ? <Card title="发送通知">{formContent}</Card> : formContent}
      <SendResultTable results={results} />
      <SendConfirmationModal
        open={confirmationOpen}
        plan={pendingPlan}
        confirming={sending}
        onConfirm={() => void confirmSend()}
        onCancel={() => {
          setConfirmationOpen(false);
          setPendingPlan(undefined);
        }}
      />
    </Flex>
  );
}

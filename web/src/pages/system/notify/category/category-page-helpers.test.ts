import { describe, expect, it } from 'vitest';
import type { NotifyCategoryResp } from '@/types/notify';
import {
  buildNotifyCategoryPageReq,
  DEFAULT_CATEGORY_SORT,
  toCreateNotifyCategoryReq,
  toNotifyCategoryFormValues,
  toUpdateNotifyCategoryReq,
} from './category-page-helpers';
import type { CategoryFormValues } from './category-page-helpers';

const CATEGORY: NotifyCategoryResp = {
  id: 'cat-1',
  code: 'ORDER_REMINDER',
  name: '订单提醒',
  description: '订单状态变更提醒',
  mandatory: true,
  defaultEnabled: false,
  sort: 110,
  allowedChannels: ['SITE', 'PUSH'],
  builtin: false,
  enabled: false,
  remark: '备注',
};

const formValues: CategoryFormValues = {
  code: ' ORDER_REMINDER ',
  name: ' 订单提醒 ',
  description: ' 说明 ',
  mandatory: false,
  defaultEnabled: true,
  sort: 120,
  allowedChannels: ['SITE'],
  enabled: true,
  remark: ' 备注 ',
};

describe('buildNotifyCategoryPageReq', () => {
  it('trims text filters and drops blank ones', () => {
    expect(buildNotifyCategoryPageReq({ pageNum: 2, pageSize: 20, code: ' ORDER ', name: '   ' })).toEqual({
      pageNum: 2,
      pageSize: 20,
      code: 'ORDER',
    });
  });

  it('keeps an explicit false enabled filter', () => {
    expect(buildNotifyCategoryPageReq({ enabled: false })).toEqual({
      pageNum: 1,
      pageSize: 10,
      enabled: false,
    });
  });

  it('carries sort parameters through', () => {
    expect(buildNotifyCategoryPageReq({ orderName: 'sort', orderType: 'asc' })).toEqual({
      pageNum: 1,
      pageSize: 10,
      orderName: 'sort',
      orderType: 'asc',
    });
  });
});

describe('toCreateNotifyCategoryReq', () => {
  it('trims text and keeps explicit switches', () => {
    expect(toCreateNotifyCategoryReq(formValues)).toEqual({
      code: 'ORDER_REMINDER',
      name: '订单提醒',
      description: '说明',
      mandatory: false,
      defaultEnabled: true,
      sort: 120,
      allowedChannels: ['SITE'],
      enabled: true,
      remark: '备注',
    });
  });

  it('applies the default sort and drops blank optional text', () => {
    expect(toCreateNotifyCategoryReq({
      code: 'CUSTOM',
      name: '自定义',
      allowedChannels: ['SITE'],
    })).toEqual({
      code: 'CUSTOM',
      name: '自定义',
      mandatory: false,
      defaultEnabled: true,
      sort: DEFAULT_CATEGORY_SORT,
      allowedChannels: ['SITE'],
      enabled: true,
    });
  });

  it('treats an explicit false switch as off rather than missing', () => {
    const req = toCreateNotifyCategoryReq({
      code: 'CUSTOM',
      name: '自定义',
      allowedChannels: ['SITE'],
      mandatory: false,
      defaultEnabled: false,
      enabled: false,
    });

    expect(req.mandatory).toBe(false);
    expect(req.defaultEnabled).toBe(false);
    expect(req.enabled).toBe(false);
  });
});

describe('toUpdateNotifyCategoryReq', () => {
  it('never carries the code', () => {
    const req = toUpdateNotifyCategoryReq(formValues);

    expect(req).not.toHaveProperty('code');
    expect(req.name).toBe('订单提醒');
  });
});

describe('toNotifyCategoryFormValues', () => {
  it('maps the detail response into form values', () => {
    expect(toNotifyCategoryFormValues(CATEGORY)).toEqual({
      code: 'ORDER_REMINDER',
      name: '订单提醒',
      description: '订单状态变更提醒',
      mandatory: true,
      defaultEnabled: false,
      sort: 110,
      allowedChannels: ['SITE', 'PUSH'],
      enabled: false,
      remark: '备注',
    });
  });

  it('defaults missing switches to enabled and sort to the default', () => {
    expect(toNotifyCategoryFormValues({ id: 'cat-2', code: 'CUSTOM', name: '自定义' })).toEqual({
      code: 'CUSTOM',
      name: '自定义',
      mandatory: false,
      defaultEnabled: true,
      sort: DEFAULT_CATEGORY_SORT,
      allowedChannels: [],
      enabled: true,
    });
  });
});

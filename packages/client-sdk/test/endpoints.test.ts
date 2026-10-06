import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_ENDPOINTS,
  DICT_ENDPOINTS,
  FRONTEND_ENDPOINTS,
  NOTIFY_ENDPOINTS,
  PARAM_ENDPOINTS,
  STORAGE_ENDPOINTS,
  isAnonymousEndpoint,
} from '../endpoints.ts';

test('EndpointsTest.pathsMatchServerContracts', () => {
  assert.equal(AUTH_ENDPOINTS.currentUser, '/api/auth/current-user');
  assert.equal(AUTH_ENDPOINTS.refresh, '/api/auth/refresh');
  assert.equal(FRONTEND_ENDPOINTS.init, '/api/frontend/init');
  assert.equal(FRONTEND_ENDPOINTS.appReleaseCheck, '/api/frontend/app-release/check');
  assert.equal(STORAGE_ENDPOINTS.upload, '/api/storage/upload');
  assert.equal(STORAGE_ENDPOINTS.filesPage, '/api/storage/files/page');
  assert.equal(STORAGE_ENDPOINTS.download, '/api/storage/download');
  assert.equal(STORAGE_ENDPOINTS.downloadLocation, '/api/storage/download-location');
  assert.equal(NOTIFY_ENDPOINTS.preferencesCurrent, '/api/notify/preferences/current');
  assert.equal(NOTIFY_ENDPOINTS.siteMessagesUnreadCount, '/api/notify/site-messages/unread-count');
  assert.equal(NOTIFY_ENDPOINTS.pushDevices, '/api/notify/push-devices');
});

test('EndpointsTest.pathParamsAreEncoded', () => {
  assert.equal(STORAGE_ENDPOINTS.uploadTaskPart('t/1', 3), '/api/storage/upload-tasks/t%2F1/parts/3');
  assert.equal(STORAGE_ENDPOINTS.bindUploadTask('abc'), '/api/storage/upload-tasks/abc/bind');
  assert.equal(STORAGE_ENDPOINTS.file('f 1'), '/api/storage/files/f%201');
  assert.equal(DICT_ENDPOINTS.itemsByCode('order/status'), '/api/dict/items/dict/order%2Fstatus');
  assert.equal(PARAM_ENDPOINTS.boolean('a.b'), '/api/param/key/a.b/boolean');
  assert.equal(NOTIFY_ENDPOINTS.pushDevice('d/1'), '/api/notify/push-devices/d%2F1');
});

test('EndpointsTest.anonymousWhitelist', () => {
  assert.equal(isAnonymousEndpoint('/api/frontend/init'), true);
  assert.equal(isAnonymousEndpoint('/api/frontend/init?platform=ANDROID'), true);
  assert.equal(isAnonymousEndpoint('/api/auth/login'), true);
  assert.equal(isAnonymousEndpoint('/api/auth/current-user'), false);
  assert.equal(isAnonymousEndpoint('/api/auth/logout'), false);
});

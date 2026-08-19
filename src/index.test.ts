import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { permissionService } from './index';
import type { PermissionService, PermissionSubjectBundle } from './index';

describe('public package exports', () => {
  it('exports the permission service singleton and public types', () => {
    const service: PermissionService = permissionService;
    const bundle: PermissionSubjectBundle = { orgs: [], roles: [], users: [] };

    expect(typeof service.listSubjects).toBe('function');
    expect(typeof service.listMenuTree).toBe('function');
    expect(bundle.orgs).toEqual([]);
  });
});

describe('repository demo file organization', () => {
  it('keeps standalone demo HTML files under docs/demo instead of the repository root', () => {
    const root = process.cwd();

    expect(existsSync(resolve(root, 'auth-management-demo.html'))).toBe(false);
    expect(existsSync(resolve(root, 'permission-config-demo.html'))).toBe(false);
    expect(existsSync(resolve(root, 'docs/demo/auth-management-demo.html'))).toBe(true);
    expect(existsSync(resolve(root, 'docs/demo/permission-config-demo.html'))).toBe(true);
  });
});

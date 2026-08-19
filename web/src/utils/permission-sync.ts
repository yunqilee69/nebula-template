import type { PermissionService } from '@/api/permission';
import type {
  PermissionGrantResp,
  PermissionEffect,
  PermissionResourceReq,
  PermissionSubject,
  SaveSubjectPermissionItem,
} from '@/types/permission';

interface SyncSubjectPermissionsInput {
  service: PermissionService;
  subject: PermissionSubject;
  existingPermissions: PermissionGrantResp[];
  desiredPermissions: SaveSubjectPermissionItem[];
}

function getPermissionKey(permission: PermissionResourceReq) {
  return `${permission.resourceType}:${permission.resourceId}`;
}

function getEffectGroupKey(effect: PermissionEffect, scope: string | undefined) {
  return `${effect}:${scope ?? ''}`;
}

function addResourceToGroup(
  groups: Map<string, { effect: PermissionEffect; scope?: string; resources: PermissionResourceReq[] }>,
  permission: SaveSubjectPermissionItem,
) {
  const key = getEffectGroupKey(permission.effect, permission.scope);
  const group = groups.get(key) ?? { effect: permission.effect, scope: permission.scope, resources: [] };
  group.resources.push({
    resourceType: permission.resourceType,
    resourceId: permission.resourceId,
  });
  groups.set(key, group);
}

export async function syncSubjectPermissions({
  service,
  subject,
  existingPermissions,
  desiredPermissions,
}: SyncSubjectPermissionsInput): Promise<PermissionGrantResp[]> {
  const existingByKey = new Map(existingPermissions.map((permission) => [getPermissionKey(permission), permission]));
  const desiredByKey = new Map(desiredPermissions.map((permission) => [getPermissionKey(permission), permission]));
  const createGroups = new Map<string, { effect: PermissionEffect; scope?: string; resources: PermissionResourceReq[] }>();
  const updateGroups = new Map<string, { effect: PermissionEffect; scope?: string; resources: PermissionResourceReq[] }>();
  const deleteResources: PermissionResourceReq[] = [];
  const nextPermissions: PermissionGrantResp[] = [];

  desiredByKey.forEach((desired, key) => {
    const existing = existingByKey.get(key);
    if (!existing) {
      addResourceToGroup(createGroups, desired);
      return;
    }

    nextPermissions.push({
      ...existing,
      effect: desired.effect,
      scope: desired.scope,
    });

    if (existing.effect !== desired.effect || existing.scope !== desired.scope) {
      addResourceToGroup(updateGroups, desired);
    }
  });

  existingByKey.forEach((existing, key) => {
    if (!desiredByKey.has(key)) {
      deleteResources.push({
        resourceType: existing.resourceType,
        resourceId: existing.resourceId,
      });
    }
  });

  const createTasks = Array.from(createGroups.values()).map(async (group) => {
    const ids = await service.createPermissions({
      subjectType: subject.type,
      subjectId: subject.id,
      resources: group.resources,
      effect: group.effect,
      scope: group.scope,
    });

    group.resources.forEach((resource, index) => {
      nextPermissions.push({
        id: ids[index] ?? `${resource.resourceType}:${resource.resourceId}`,
        subjectType: subject.type,
        subjectId: subject.id,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
        effect: group.effect,
        scope: group.scope,
      });
    });
  });

  await Promise.all([
    ...Array.from(updateGroups.values()).map((group) => service.updatePermissions({
      subjectType: subject.type,
      subjectId: subject.id,
      resources: group.resources,
      effect: group.effect,
      scope: group.scope,
    })),
    ...createTasks,
    deleteResources.length > 0
      ? service.removePermissionsBySubjectAndResources({
        subjectType: subject.type,
        subjectId: subject.id,
        resources: deleteResources,
      })
      : Promise.resolve(),
  ]);

  return nextPermissions;
}

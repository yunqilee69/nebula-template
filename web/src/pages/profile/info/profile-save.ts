import type { CurrentUser } from '@/types/auth';
import type { ProfileResp, ProfileUploadTaskIds, UpdateProfileReq } from '@/types/profile';
import type { ProfileFormValues } from './basic-profile-card';

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

/** 待提交的头像上传任务：只有存在未提交的 taskId 时才带上，避免覆盖已保存的头像。 */
export function buildAvatarUploadTaskIds(avatarTaskId: string | undefined): ProfileUploadTaskIds | undefined {
  const taskId = normalizeOptionalText(avatarTaskId);
  return taskId ? { avatar: [taskId] } : undefined;
}

/**
 * 组装保存个人资料的请求体。
 *
 * <p>头像只提交 `uploadTaskIds.avatar`，绑定与最终地址都由后端保存流程产出，前端不再提交头像地址。</p>
 */
export function buildProfilePayload(
  values: ProfileFormValues,
  avatarTaskId?: string,
  deletedFileIds?: readonly string[],
): UpdateProfileReq {
  const uploadTaskIds = buildAvatarUploadTaskIds(avatarTaskId);
  const removed = (deletedFileIds ?? []).map(normalizeOptionalText).filter((fileId): fileId is string => Boolean(fileId));
  return {
    nickname: normalizeOptionalText(values.nickname),
    email: normalizeOptionalText(values.email),
    phone: normalizeOptionalText(values.phone),
    ...(uploadTaskIds ? { uploadTaskIds } : {}),
    // 与 uploadTaskIds 同批提交：后端先绑定新的、再释放这些（只删记录，内容按引用计数回收）
    ...(removed.length > 0 ? { deletedFileIds: removed } : {}),
  };
}

export function mergeProfileIntoCurrentUser(
  currentUser: CurrentUser | null,
  nextProfile: ProfileResp,
  avatarPreviewUrl?: string,
): CurrentUser | undefined {
  if (!currentUser || currentUser.id !== nextProfile.id) return undefined;

  const nextName =
    normalizeOptionalText(nextProfile.nickname) ?? normalizeOptionalText(nextProfile.username) ?? currentUser.username ?? currentUser.id;
  const nextUsername = normalizeOptionalText(nextProfile.username);
  const nextAvatar = normalizeOptionalText(nextProfile.avatar);
  const { avatarPreview, ...currentUserWithoutAvatarPreview } = currentUser;

  return {
    ...currentUserWithoutAvatarPreview,
    name: nextName,
    ...(nextUsername ? { username: nextUsername } : {}),
    ...(nextAvatar ? { avatar: nextAvatar } : {}),
    ...(avatarPreviewUrl ? { avatarPreview: avatarPreviewUrl } : {}),
  };
}

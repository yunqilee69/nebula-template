import type { CurrentUser } from '@/types/auth';
import type { ProfileResp, UpdateProfileReq } from '@/types/profile';
import type { ProfileFormValues } from './basic-profile-card';

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

export function buildProfilePayload(values: ProfileFormValues, avatarUrl: string | undefined): UpdateProfileReq {
  return {
    nickname: normalizeOptionalText(values.nickname),
    avatar: normalizeOptionalText(avatarUrl),
    email: normalizeOptionalText(values.email),
    phone: normalizeOptionalText(values.phone),
  };
}

export function keepSavedAvatar(updatedProfile: ProfileResp, avatarUrl: string | undefined): ProfileResp {
  const nextAvatarUrl = normalizeOptionalText(avatarUrl);
  return nextAvatarUrl ? { ...updatedProfile, avatar: nextAvatarUrl } : updatedProfile;
}

export function createAvatarPreviewUrl(file: File): string | undefined {
  if (typeof URL.createObjectURL !== 'function') return undefined;
  return URL.createObjectURL(file);
}

export function revokeAvatarPreviewUrl(avatarPreviewUrl: string | undefined) {
  if (avatarPreviewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(avatarPreviewUrl);
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

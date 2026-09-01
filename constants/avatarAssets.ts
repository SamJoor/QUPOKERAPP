import type { ImageSourcePropType } from "react-native";

export const avatarLibrary = {
  seb: require("../assets/avatars/seb-head-avatar.png"),
  aniah: require("../assets/avatars/aniah-head-avatar.png"),
  sean: require("../assets/avatars/sean-head-avatar.png"),
  sam: require("../assets/avatars/sam-head-avatar.png")
} as const satisfies Record<string, ImageSourcePropType>;

export type AvatarKey = keyof typeof avatarLibrary;
export const avatarKeys = Object.keys(avatarLibrary) as AvatarKey[];

export const avatarSources: ImageSourcePropType[] = avatarKeys.map((key) => avatarLibrary[key]);

export const sebAvatar = avatarLibrary.seb;

export function isAvatarKey(value?: string | null): value is AvatarKey {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(avatarLibrary, value as string);
}

/** Real photo uploads (avatar_url) always win over a picked stock head (avatar_key).
 * Falls back to cycling through the stock set by index when neither is set. */
export function resolveAvatarSource(
  entity?: { avatar_url?: string | null; avatar_key?: string | null } | null,
  fallbackIndex = 0
): ImageSourcePropType {
  if (entity?.avatar_url) return { uri: entity.avatar_url };
  if (isAvatarKey(entity?.avatar_key)) return avatarLibrary[entity.avatar_key];
  return avatarSources[((fallbackIndex % avatarSources.length) + avatarSources.length) % avatarSources.length];
}

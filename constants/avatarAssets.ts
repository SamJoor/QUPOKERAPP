import type { ImageSourcePropType } from "react-native";

export const avatarLibrary = {
  seb: require("../assets/avatars/seb-head-avatar.png"),
  aniah: require("../assets/avatars/aniah-head-avatar.png"),
  sean: require("../assets/avatars/sean-head-avatar.png"),
  sam: require("../assets/avatars/sam-head-avatar.png")
} as const satisfies Record<string, ImageSourcePropType>;

export type AvatarKey = keyof typeof avatarLibrary;
export const avatarKeys = Object.keys(avatarLibrary) as AvatarKey[];

export function isAvatarKey(value?: string | null): value is AvatarKey {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(avatarLibrary, value as string);
}

/** An uploaded photo wins, then a head the member picked themselves. Returns nothing when
 * they have neither, so ProfileAvatar shows their initials - never another member's face. */
export function resolveAvatarSource(
  entity?: { full_name?: string | null; avatar_url?: string | null; avatar_key?: string | null } | null
): ImageSourcePropType | undefined {
  if (entity?.avatar_url) return { uri: entity.avatar_url };
  if (isAvatarKey(entity?.avatar_key)) return avatarLibrary[entity.avatar_key];
  return undefined;
}

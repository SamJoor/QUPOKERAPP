import type { ImageSourcePropType } from "react-native";

export const avatarLibrary = {
  seb: require("../assets/avatars/seb-head-avatar.png"),
  aniah: require("../assets/avatars/aniah-head-avatar.png"),
  sean: require("../assets/avatars/sean-head-avatar.png"),
  sam: require("../assets/avatars/sam-head-avatar.png")
} as const satisfies Record<string, ImageSourcePropType>;

export const memberPhotoLibrary = {
  "antonio rosado": require("../assets/profile-photos/antonio-rosado.png"),
  "sebastian salazar": require("../assets/profile-photos/sebastian-salazar-avatar.png"),
  "sam joor": require("../assets/profile-photos/sam-joor-city.png"),
  "josh venditto": require("../assets/profile-photos/josh-venditto.jpg"),
  "michael alvarado": require("../assets/profile-photos/michael-alvarado-avatar.png"),
  "quinn crawford": require("../assets/profile-photos/quinn-crawford-avatar.png")
} as const satisfies Record<string, ImageSourcePropType>;

export type AvatarKey = keyof typeof avatarLibrary;
export const avatarKeys = Object.keys(avatarLibrary) as AvatarKey[];

export const avatarSources: ImageSourcePropType[] = avatarKeys.map((key) => avatarLibrary[key]);

export const sebAvatar = avatarLibrary.seb;

export function isAvatarKey(value?: string | null): value is AvatarKey {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(avatarLibrary, value as string);
}

/** Curated club-member photos keep the temporary roster visually consistent.
 * Everyone else prefers an uploaded photo, then a picked stock head. */
export function resolveAvatarSource(
  entity?: { full_name?: string | null; avatar_url?: string | null; avatar_key?: string | null } | null,
  fallbackIndex = 0
): ImageSourcePropType {
  const memberName = entity?.full_name?.trim().toLowerCase();
  if (memberName && Object.prototype.hasOwnProperty.call(memberPhotoLibrary, memberName)) {
    return memberPhotoLibrary[memberName as keyof typeof memberPhotoLibrary];
  }
  if (entity?.avatar_url) return { uri: entity.avatar_url };
  if (isAvatarKey(entity?.avatar_key)) return avatarLibrary[entity.avatar_key];
  return avatarSources[((fallbackIndex % avatarSources.length) + avatarSources.length) % avatarSources.length];
}

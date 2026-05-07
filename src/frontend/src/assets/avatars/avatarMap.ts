import placeholderPng from './common/placeholder.png';

export type AvatarMeta = {
  src: string;
  fallbackText: string;
};

/** MVP：用户与 NPC 共用一张占位图，后续按 `common/`、`hulaguan/` 替换为独立资源 */
const PLACEHOLDER = placeholderPng as string;

const USER_AVATAR: AvatarMeta = {
  src: PLACEHOLDER,
  fallbackText: '你',
};

const DEFAULT_NPC_AVATAR: AvatarMeta = {
  src: PLACEHOLDER,
  fallbackText: '将',
};

const NPC_AVATAR_MAP: Record<string, AvatarMeta> = {
  吕布: { src: PLACEHOLDER, fallbackText: '吕' },
};

export function getUserAvatar(): AvatarMeta {
  return USER_AVATAR;
}

export function getNpcAvatar(speaker: string): AvatarMeta {
  return (
    NPC_AVATAR_MAP[speaker] ?? {
      ...DEFAULT_NPC_AVATAR,
      src: PLACEHOLDER,
      fallbackText: speaker.trim().slice(0, 1) || DEFAULT_NPC_AVATAR.fallbackText,
    }
  );
}

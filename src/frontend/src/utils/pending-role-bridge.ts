import Taro from '@tarojs/taro';
import type { PlayerRoleProfile } from '../types/player-role';

const KEY = 'mud_pending_player_role_v1';

function isOcProfile(v: Record<string, unknown>): v is PlayerRoleProfile {
  return v.mode === 'oc' && typeof v.name === 'string' && typeof v.background === 'string';
}

function isGeneralProfile(v: Record<string, unknown>): v is PlayerRoleProfile {
  return v.mode === 'general' && typeof v.generalName === 'string';
}

function normalizeProfile(raw: unknown): PlayerRoleProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  if (isOcProfile(v) && v.name.trim() && v.background.trim()) {
    return { mode: 'oc', name: v.name.trim(), background: v.background.trim() };
  }
  if (isGeneralProfile(v) && v.generalName.trim()) {
    return { mode: 'general', generalName: v.generalName.trim() };
  }
  return null;
}

/** 跳转 stage 前写入，避免 navigateTo 与 zustand 时序导致首跳读不到 pending */
export function stashPlayerRoleBeforeNavigate(profile: PlayerRoleProfile): void {
  try {
    Taro.setStorageSync(KEY, profile);
  } catch {
    /* 存储满或禁用时忽略，仍依赖内存 pending */
  }
}

/** 读取并删除暂存（新开局云调用前消费一次） */
export function consumeStashedPlayerRole(): PlayerRoleProfile | null {
  try {
    const raw = Taro.getStorageSync(KEY);
    try {
      Taro.removeStorageSync(KEY);
    } catch {
      /* ignore */
    }
    return normalizeProfile(raw);
  } catch {
    return null;
  }
}

export function clearStashedPlayerRole(): void {
  try {
    Taro.removeStorageSync(KEY);
  } catch {
    /* ignore */
  }
}

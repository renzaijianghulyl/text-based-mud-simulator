/** 与云函数 sanitizePlayerRoleProfile / Session.playerRoleProfile 对齐 */

export type PlayerRoleMode = 'oc' | 'general';

export interface OriginalCharacterProfile {
  mode: 'oc';
  name: string;
  background: string;
}

export interface GeneralRoleProfile {
  mode: 'general';
  generalName: string;
}

export type PlayerRoleProfile = OriginalCharacterProfile | GeneralRoleProfile;

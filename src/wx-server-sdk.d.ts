declare module 'wx-server-sdk' {
  interface MsgSecCheckOptions {
    content: string;
    version: 2;
    scene: number;
    openid: string;
    /** 微信侧仍接受 nickname/title/signature 等可选辅助字段 */
    nickname?: string;
    title?: string;
    signature?: string;
  }

  interface MsgSecCheckResult {
    /** 微信成功返回时通常为 0，不出现也表示成功 */
    errCode?: number;
    errMsg?: string;
    result?: {
      suggest?: 'pass' | 'risky' | 'review' | string;
      label?: number;
    };
    /** 详细分类，部分基础库返回 */
    detail?: Array<{
      strategy?: string;
      errcode?: number;
      suggest?: string;
      label?: number;
      keyword?: string;
    }>;
  }

  interface WxServerSDK {
    readonly DYNAMIC_CURRENT_ENV: unique symbol;
    init(options: { env?: symbol | string; traceUser?: boolean }): void;
    getWXContext(): { OPENID?: string; APPID?: string; UNIONID?: string };
    database(): {
      collection(name: string): {
        doc(id: string): {
          get(): Promise<{ data: Record<string, unknown> }>;
          set(options: { data: Record<string, unknown> }): Promise<unknown>;
          remove(): Promise<{ stats: { removed: number } }>;
        };
        where(condition: Record<string, unknown>): {
          limit(n: number): { get(): Promise<{ data: Record<string, unknown>[] }> };
          remove(): Promise<{ stats: { removed: number } }>;
        };
        add(options: { data: Record<string, unknown> }): Promise<unknown>;
      };
    };
    openapi: {
      security: {
        msgSecCheck(opts: MsgSecCheckOptions): Promise<MsgSecCheckResult>;
      };
    };
  }
  const wx: WxServerSDK;
  export = wx;
}

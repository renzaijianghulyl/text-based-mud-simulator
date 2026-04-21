declare module 'wx-server-sdk' {
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
  }
  const wx: WxServerSDK;
  export = wx;
}

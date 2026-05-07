import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import './app.scss';

function safeCloudInit() {
  if (process.env.TARO_ENV !== 'weapp') return;
  const cloud = (Taro as unknown as { cloud?: { init?: (opts: { traceUser: boolean }) => unknown } }).cloud;
  if (!cloud || typeof cloud.init !== 'function') return;
  try {
    const maybePromise = cloud.init({ traceUser: true });
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === 'function') {
      void (maybePromise as Promise<unknown>).catch((e) => {
        console.warn('cloud init async', e);
      });
    }
  } catch (e) {
    console.warn('cloud init', e);
  }
}

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    safeCloudInit();
  });
  return children;
}

import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import './app.scss';

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    if (process.env.TARO_ENV === 'weapp') {
      try {
        Taro.cloud.init({ traceUser: true });
      } catch (e) {
        console.warn('cloud init', e);
      }
    }
  });
  return children;
}

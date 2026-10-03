/**
 * React Native 应用入口。
 * @format
 */

// RN 0.77 旧架构（bridge 模式）已知问题：RN$Bridgeless 被无条件置 true，
// JS 侧 setUpTimers 跳过 setImmediate polyfill，而 C++ 侧仅在 bridgeless 特性开启时安装，
// 导致 setImmediate 缺失。queueMicrotask 在该路径下始终会被 polyfill，用其兜底。
if (typeof global.setImmediate !== 'function') {
  global.setImmediate = (fn, ...args) =>
    global.queueMicrotask(() => fn(...args));
  global.clearImmediate = () => {};
}

import { AppRegistry } from 'react-native';
import App from './App.tsx';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

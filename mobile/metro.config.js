const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// RNOH（鸿蒙）平台解析器：react-native 导入重定向到 @react-native-oh/react-native-harmony，
// 并支持 .harmony.ts(x) 平台后缀。iOS/Android 平台不受影响。
const rnohMetroConfig = require('@react-native-oh/react-native-harmony/metro.config.js');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  // 端无关共享包与基座同仓，且代码以相对路径引入 ../packages/client-sdk，
  // 必须把仓库根加入 watchFolders，否则 Metro 无法解析项目根之外的模块。
  watchFolders: [path.resolve(__dirname, '..')],
};

module.exports = mergeConfig(
  mergeConfig(getDefaultConfig(__dirname), rnohMetroConfig.createHarmonyMetroConfig()),
  config,
);

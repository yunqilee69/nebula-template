import { RNApp } from '@rnoh/react-native-openharmony';
import { MetroJSBundleProvider } from '@rnoh/react-native-openharmony';
import { SafeAreaViewPackage } from '@react-native-oh-tpl/react-native-safe-area-context';

@Entry
@Component
struct Index {
  build() {
    Column() {
      RNApp({
        rnInstanceConfig: {
          createRNPackages: (ctx) => [new SafeAreaViewPackage(ctx)]
        },
        appKey: 'NebulaMobile',
        jsBundleProvider: new MetroJSBundleProvider(
          'http://localhost:8081/index.bundle?platform=harmony&dev=true&minify=false',
          ['NebulaMobile'])
      })
    }
    .height('100%')
    .width('100%')
  }
}

import {Platform} from 'react-native';
import {NitroModules} from 'react-native-nitro-modules';
import type {AliBandSdk as AliBandSdkSpec} from './specs/AliBandSdk.nitro';

export type * from './specs/AliBandSdk.nitro';

/** null where the native side is not implemented yet (iOS). */
export const AliBandSdk: AliBandSdkSpec | null =
  Platform.OS === 'android'
    ? NitroModules.createHybridObject<AliBandSdkSpec>('AliBandSdk')
    : null;

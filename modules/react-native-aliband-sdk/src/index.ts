import {Platform} from 'react-native';
import {NitroModules} from 'react-native-nitro-modules';
import type {AliBandSdk as AliBandSdkSpec} from './specs/AliBandSdk.nitro';

export type * from './specs/AliBandSdk.nitro';

/** Android + iOS (on the iOS simulator every call rejects: the bracelet SDK is iPhone-only). */
export const AliBandSdk: AliBandSdkSpec | null =
  Platform.OS === 'android' || Platform.OS === 'ios'
    ? NitroModules.createHybridObject<AliBandSdkSpec>('AliBandSdk')
    : null;

import {images} from '@assets';
import React from 'react';

export type ImageKeys = keyof typeof images;

export type ScreenComponents = {
  HomeScreen: React.ComponentType<any>;
  DeviceScreen: React.ComponentType<any>;
  SettingScreen: React.ComponentType<any>;
};

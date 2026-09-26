import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  DebugScreen,
  DeviceReportScreen,
  LiveReadingsScreen,
  SyncStatusScreen,
} from '@screen';
import {RootStackParamList} from '@types';
import {localize} from '@languages';

const AppStack = createNativeStackNavigator<RootStackParamList>();

const AppStackNavigator = () => {
  return (
    <AppStack.Group>
      <AppStack.Screen
        name="LiveReadingsScreen"
        component={LiveReadingsScreen}
        options={{
          headerShown: true,
          headerTitle: localize('LiveReadingsScreen'),
        }}
      />
      <AppStack.Screen
        name="SyncStatusScreen"
        component={SyncStatusScreen}
        options={{headerShown: true, headerTitle: localize('SyncStatusScreen')}}
      />
      <AppStack.Screen
        name="DeviceReportScreen"
        component={DeviceReportScreen}
        options={{
          headerShown: true,
          headerTitle: localize('DeviceReportScreen'),
        }}
      />
      {__DEV__ && (
        <AppStack.Screen
          name="DebugScreen"
          component={DebugScreen}
          options={{headerShown: true, headerTitle: localize('DebugScreen')}}
        />
      )}
    </AppStack.Group>
  );
};

export {AppStackNavigator};

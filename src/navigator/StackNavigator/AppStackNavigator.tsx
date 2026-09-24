import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  DebugScreen,
  LiveReadingsScreen,
  SyncStatusScreen,
  WebViewScreen,
} from '@screen';
import {RootStackParamList} from '@types';
import {localize} from '@languages';

const AppStack = createNativeStackNavigator<RootStackParamList>();

const AppStackNavigator = () => {
  return (
    <AppStack.Group>
      <AppStack.Screen
        name="WebViewScreen"
        component={WebViewScreen}
        options={({route}) => {
          return {
            headerTitle: route.params?.title ?? '',
            headerShown: true,
          };
        }}
      />
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

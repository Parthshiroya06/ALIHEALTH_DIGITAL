import React from 'react';
import {View} from 'react-native';
import WebView from 'react-native-webview';
import {RouteProp, useRoute} from '@react-navigation/native';
import {RootStackParamList} from '@types';
import {styles} from './style';

const WebViewScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'WebViewScreen'>>();

  return (
    <View style={styles.container}>
      <WebView source={{uri: route.params.url}} />
    </View>
  );
};

export {WebViewScreen};

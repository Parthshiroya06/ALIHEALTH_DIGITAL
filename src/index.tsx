import React from 'react';
import {Provider} from 'react-redux';
import {persistor, store} from '@store';
import {PersistGate} from 'redux-persist/integration/react';

import {PaperProvider} from 'react-native-paper';
import {StackNavigator} from '@navigator';
import {setI18nConfig} from '@languages';
import {SafeAreaProvider} from 'react-native-safe-area-context';

setI18nConfig();

const App = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <StackNavigator />
          </PersistGate>
        </Provider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;

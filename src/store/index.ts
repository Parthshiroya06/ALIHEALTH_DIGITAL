import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {configureStore} from '@reduxjs/toolkit';
import rootReducer from '@reducers';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  //blacklist: ['userDetails'], // It's remove data once app is close
  whitelist: ['userDetails', 'deviceDetails', 'healthData'], // healthData keeps the offline sync queue
};

const persistedReducer = persistReducer(persistConfig, rootReducer as any);
const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }),
});

const persistor = persistStore(store);
export {store, persistor};
export type AppDispatch = typeof store.dispatch;

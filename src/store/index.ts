import {persistStore, persistReducer} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {configureStore} from '@reduxjs/toolkit';
import rootReducer from '@reducers';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // Merge saved slices into the initial state, so fields added in new app versions get their defaults
  stateReconciler: autoMergeLevel2,
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

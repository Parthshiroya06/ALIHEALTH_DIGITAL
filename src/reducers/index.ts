import {combineReducers} from '@reduxjs/toolkit';
import {userDetails} from './userDetails';
import {deviceDetails} from './deviceDetails';
import {healthData} from './healthData';

const rootReducer = combineReducers({
  userDetails: userDetails,
  deviceDetails: deviceDetails,
  healthData: healthData,
});
export type RootReducer = ReturnType<typeof rootReducer>;
export default rootReducer;

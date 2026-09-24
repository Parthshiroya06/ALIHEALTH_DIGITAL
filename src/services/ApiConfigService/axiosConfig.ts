import axios, {AxiosError} from 'axios';
import {BASE_URL} from './app-setting';
import {Alert} from 'react-native';

export const getAxiosInstance = () => {
  // Lazy require avoids a circular import (store -> reducers -> ... -> services)
  const {store} = require('../../store');
  const authToken: string | null = store?.getState()?.userDetails?.authToken;

  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? {Authorization: 'Bearer ' + authToken} : {}),
    },
  });

  instance.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const message =
        axiosError.response?.data?.message ?? 'Something went wrong.';

      if (status === 400) {
        Alert.alert('Bad Request', message);
      } else if (status === 401) {
        // TODO: refresh token (endpoints.refreshToken), then retry
        Alert.alert('Unauthorized', message);
      } else if (status === 500) {
        Alert.alert('Server Error', 'Try again later.');
      }

      return Promise.reject({
        status: status,
        message: message,
        original: error,
      });
    },
  );

  return instance;
};

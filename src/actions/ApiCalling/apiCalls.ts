import {getAxiosInstance} from '@services';
import {Dispatch} from 'redux';

// Errors are handled centrally in the axiosConfig interceptor.
export const performGetRequest = (endpoint: string) => {
  return async (_dispatch: Dispatch, _getState: any): Promise<any> => {
    let wrapper = getAxiosInstance();
    const response = await wrapper.get(endpoint);
    return response.data;
  };
};

export const performPostRequest = (endPoint: string, jsonRequest: any) => {
  return async (_dispatch: Dispatch, _getState: any): Promise<any> => {
    let wrapper = getAxiosInstance();
    const response = await wrapper.post(endPoint, jsonRequest);
    return response;
  };
};

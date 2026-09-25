import {useEffect, useState} from 'react';
import {subscribeDebugLog} from '@services';

export const useDebugLog = () => {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => subscribeDebugLog(setLines), []);
  return lines;
};

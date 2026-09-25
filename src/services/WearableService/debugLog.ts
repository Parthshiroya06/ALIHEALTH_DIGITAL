// In-memory log for the Debug screen (POC). Never put health values or tokens here.
const MAX_LINES = 200;
let lines: string[] = [];
const listeners = new Set<(lines: string[]) => void>();

export const addDebugLog = (message: string) => {
  if (!__DEV__) {
    return;
  }
  lines = [
    `${new Date().toISOString().slice(11, 19)} ${message}`,
    ...lines,
  ].slice(0, MAX_LINES);
  listeners.forEach(listener => listener(lines));
};

export const subscribeDebugLog = (listener: (lines: string[]) => void) => {
  listeners.add(listener);
  listener(lines);
  return () => {
    listeners.delete(listener);
  };
};

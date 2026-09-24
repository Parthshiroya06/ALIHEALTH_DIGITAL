/**
 * @format
 */

// The full App render test needs Jest mocks for the native modules
// (react-native-ble-plx, device-info, webview, lottie, async-storage...).
// Until those mocks are added in a jest setup file, the logic is covered by
// healthData.test.ts and bleParsers.test.ts.
test.skip('renders correctly', () => {});

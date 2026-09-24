// Standard Bluetooth SIG GATT services / characteristics (full 128-bit form)
export const BleUUID = {
  HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  // TODO: add vendor (H Band / E500) service UUIDs once the SDK/protocol docs arrive
};

export const BleConfig = {
  SCAN_TIMEOUT_MS: 15000,
};

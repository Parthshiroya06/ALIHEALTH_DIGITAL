// Standard Bluetooth SIG GATT services / characteristics (full 128-bit form)
export const BleUUID = {
  HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  // TODO: add E500 service UUIDs once its SDK/protocol docs arrive
};

// Services advertised by Veepoo (H Band) bracelets – used to recognise them in a scan
// Veepoo (H Band) services – also exposed by the E500, which is Veepoo-based
export const HBandServiceUUIDs = [
  'f0020001-0451-4000-b000-000000000000',
  'f0030001-0451-4000-b000-000000000000',
  'f0080001-0451-4000-b000-000000000000',
];

export const HBandConfig = {
  PASSWORD: '0000', // Veepoo default device password
  // TODO: replace with the user's real profile (used by the band for calories, distance, BP)
  DEFAULT_PROFILE: {
    sex: 'male',
    age: 30,
    heightCm: 170,
    weightKg: 65,
    stepGoal: 8000,
  },
  // Continuous measurements (HR, SpO2) are stored at most once per interval
  LIVE_STORE_INTERVAL_MS: 30000,
  // Namespace for deterministic clientIds (uuid v5), so re-synced history dedups on the API
  CLIENT_ID_NAMESPACE: '6f1c2a3e-8b4d-4e5f-9a7b-2c3d4e5f6a7b',
};

export const BleConfig = {
  SCAN_TIMEOUT_MS: 15000,
  // Time the user has to accept the "Turn on Bluetooth" popup
  BLUETOOTH_ON_TIMEOUT_MS: 20000,
};

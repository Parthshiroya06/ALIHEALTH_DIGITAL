module.exports = {
  preset: '@react-native/jest-preset',
  // uuid v14 ships ES modules only
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|uuid)/)',
  ],
};

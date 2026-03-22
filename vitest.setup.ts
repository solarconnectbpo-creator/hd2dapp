/** Expo / RN expect this in JS runtimes */
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

process.env.EXPO_OS = "ios";

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Must stay last — Reanimated 4 ships its worklets plugin separately.
    plugins: ['react-native-worklets/plugin'],
  };
};

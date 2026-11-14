module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel', // <--- Required for SDK 49 routing
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@app': './src/app',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@theme': './src/themes',
            '@themes': './src/themes',
            '@models': './src/models',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@config': './src/config',
            '@navigation': './src/navigation',
            '@assets': './src/assets',
            '@types': './src/types',
          },
        },
      ],
      'react-native-reanimated/plugin', // <--- MUST be the last plugin in the array!
    ],
  };
};
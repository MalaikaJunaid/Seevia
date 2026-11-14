const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Asset extensions (For your ML Models)
config.resolver.assetExts.push('tflite','txt','bin','pt');

// 2. Source extensions (CRITICAL for Firebase)
config.resolver.sourceExts.push('cjs','mjs');

module.exports = config;

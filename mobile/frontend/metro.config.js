const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client's ESM build (via engine.io-client) uses extension-less
// relative imports (e.g. "./transport.js" resolving to a .ts source) that
// Metro's resolver can't follow. Forcing CJS resolution for these two
// packages avoids the "Unable to resolve ./transport.js" bundling error.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_conditionNames = ['require', 'react-native'];

module.exports = config;

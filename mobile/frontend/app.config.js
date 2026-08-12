require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  expo: {
    name: 'AnyWork',
    slug: 'kaamsaathi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'kaamsaathi',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kaamsaathi.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'AnyWork uses your location to show nearby jobs and let you set your work location.',
        NSPhotoLibraryUsageDescription: 'AnyWork needs access to your photos so you can set a profile picture.',
        NSCameraUsageDescription: 'AnyWork needs camera access so you can take a profile picture.',
        // Lets Linking.canOpenURL('tel:...') work correctly if it's ever used again —
        // without this, it rejects on iOS even for a perfectly callable number.
        LSApplicationQueriesSchemes: ['tel'],
      },
    },
    android: {
      package: 'com.kaamsaathi.app',
      // Built APKs don't reliably auto-resize behind the keyboard the way Expo Go's host
      // activity does (edge-to-edge changes how the window responds to windowSoftInputMode) —
      // being explicit here plus KeyboardAvoidingView's Android "height" behavior (see chat/AI
      // assistant/phone-entry screens) is what actually pushes the input row above the keyboard
      // in a release build, not just in Expo Go.
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        backgroundColor: '#E4622A',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'READ_MEDIA_IMAGES'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    updates: {
      enabled: false,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'AnyWork uses your location to show nearby jobs and let you set your work location.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'AnyWork needs access to your photos so you can set a profile picture.',
        },
      ],
      'expo-font',
      'expo-status-bar',
      '@react-native-community/datetimepicker',
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
        },
      ],
      [
        'expo-notifications',
        {
          color: '#F45B18',
        },
      ],
    ],
  },
};

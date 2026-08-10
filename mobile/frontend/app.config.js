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
    ],
  },
};

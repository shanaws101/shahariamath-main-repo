import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shahariamath.app',
  appName: 'Shaharia Math',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F97316',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#F97316',
      style: 'LIGHT',
    },
  },
  android: {
    backgroundColor: '#ffffff',
  },
};

export default config;

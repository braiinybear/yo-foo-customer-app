import 'dotenv/config';

export default {
  expo: {
    name: "food-delivery-customer",
    slug: "food-delivery-customer",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "food-delivery-customer",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.braiinyfood.fooddeliverycustomer"
    },
    android: {
      usesCleartextTraffic: true,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services.json",
      package: "com.braiinyfood.fooddeliverycustomer",
      config: {
        googleMaps: {
          // This pulls the key from your .env file locally
          // or from EAS Secrets during a cloud build.
          apiKey:process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/app-logo.png",
          "imageWidth": 160,
          "resizeMode": "contain",
          "backgroundColor": "#FFFFFF"
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to save your address."
        }
      ],
      "expo-dev-client",
      "expo-secure-store",
      "expo-font"
    ],
    experiments: {
      "typedRoutes": true,
      "reactCompiler": true
    },
    extra: {
      router: {},
      eas: {
        projectId: "96b106b8-8b07-404f-b458-c7410e8640bc"
      },
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    }
  }
};
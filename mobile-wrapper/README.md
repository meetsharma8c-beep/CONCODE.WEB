# AI Sigma Gateway — Mobile Packaging & Native Wrapping Production Guide

This handbook provides the complete, production-grade instructions for wrapping the **AI Sigma Gateway** web application into native mobile applications for **iOS** and **Android**, as well as deploying it as an installable **Progressive Web App (PWA)**.

---

## Architecture Overview

The application is architected with mobile-first responsiveness, safe-area inset compliance (`viewport-fit=cover`), touch gesture orbit mechanics, and zero-telemetry client-side vault storage.

You can package and deploy it via three battle-tested strategies:

| Strategy | Target | Engine | App Store Ready | Effort |
| :--- | :--- | :--- | :--- | :--- |
| **1. Capacitor (Recommended)** | iOS (.ipa) & Android (.apk/.aab) | Native WKWebView / Chrome Custom Tab | Yes (App Store & Google Play) | Low (5 mins) |
| **2. Progressive Web App (PWA)** | iOS & Android Home Screen | System Web App Container | Add to Home Screen | Instant |
| **3. Flutter / React Native Wrapper**| Existing Native Enterprise Apps | `InAppWebView` / `react-native-webview` | Custom Native Integration | Moderate |

---

## Method 1: Packaging with Capacitor (iOS & Android Native)

Capacitor is the modern native runtime created by Ionic that compiles web applications directly into native Xcode and Android Studio projects without compromising performance.

### 1. Prerequisites
- **Node.js**: v18+ (verified on v24.18.0)
- **iOS**: macOS with Xcode 15+ and CocoaPods (`sudo gem install cocoapods`)
- **Android**: Android Studio Hedgehog+ with Android SDK 34

### 2. Project Configuration
The project is already configured with [`capacitor.config.json`](file:///Users/ms/Downloads/CONCODE.WEB/capacitor.config.json):
```json
{
  "appId": "com.concode.aisigma",
  "appName": "AI Sigma Gateway",
  "webDir": "public/projects/ai-sigma-gateway",
  "bundledWebRuntime": false
}
```

### 3. Step-by-Step Build Commands

#### Install Capacitor Dependencies:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/status-bar @capacitor/keyboard @capacitor/haptics
```

#### Build / Add Platforms:
```bash
# Add iOS Native Platform (Generates ios/ folder with Xcode Workspace)
npx cap add ios

# Add Android Native Platform (Generates android/ folder with Gradle Project)
npx cap add android
```

#### Sync Web Assets into Native Projects:
Whenever you edit HTML/CSS/JS in `public/projects/ai-sigma-gateway/`:
```bash
npx cap sync
```

#### Launch Native IDEs to Compile & Sign:
```bash
# Open Xcode (iOS)
npx cap open ios

# Open Android Studio (Android)
npx cap open android
```

### 4. Compiling Binaries

#### iOS (.ipa / TestFlight / App Store):
1. In Xcode, select the `App` target.
2. Under **Signing & Capabilities**, select your Apple Developer Team.
3. Select **Product > Destination > Any iOS Device (arm64)**.
4. Select **Product > Archive**.
5. Once archiving finishes, click **Distribute App** to upload directly to TestFlight or export the signed `.ipa`.

#### Android (.apk / .aab / Google Play):
1. In Android Studio, wait for Gradle sync to complete.
2. Select **Build > Generate Signed Bundle / APK**.
3. Choose **Android App Bundle (.aab)** for Google Play Store, or **APK** for direct testing/sideloading.
4. Select or create your Release Keystore and click **Finish**.
5. The signed `.aab` or `.apk` will be output to `android/app/release/`.

---

## Method 2: Progressive Web App (PWA) Zero-Install

The application includes full PWA configuration out-of-the-box:
- **Manifest**: [`public/projects/ai-sigma-gateway/manifest.json`](file:///Users/ms/Downloads/CONCODE.WEB/public/projects/ai-sigma-gateway/manifest.json)
- **Service Worker**: [`public/projects/ai-sigma-gateway/sw.js`](file:///Users/ms/Downloads/CONCODE.WEB/public/projects/ai-sigma-gateway/sw.js)
- **Icons**: High-resolution vector SVGs (`icon-192.svg`, `icon-512.svg`).

### How Users Install on Mobile:
1. **iOS (Safari)**:
   - Open `http://<your-ip-or-domain>/project/ai-sigma-gateway/` in Safari.
   - Tap the **Share** button (`⎋` with arrow).
   - Tap **Add to Home Screen**.
   - The app launches in full-screen standalone mode with no browser URL bar or navigation buttons.
2. **Android (Chrome)**:
   - Open the URL in Chrome.
   - Tap the three dots `⋮` > **Install App** or tap the prompt at the bottom of the screen.
   - The app installs as a native APK-like standalone application.

---

## Method 3: Ready-to-Use Native Flutter Container

If you are embedding AI Sigma Gateway into an existing Flutter application, copy the template below:

### `pubspec.yaml`
```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_inappwebview: ^6.0.0
```

### `lib/main.dart`
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF030712),
    ),
  );
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: AISigmaMobileApp(),
  ));
}

class AISigmaMobileApp extends StatefulWidget {
  const AISigmaMobileApp({super.key});

  @override
  State<AISigmaMobileApp> createState() => _AISigmaMobileAppState();
}

class _AISigmaMobileAppState extends State<AISigmaMobileApp> {
  InAppWebViewController? webViewController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      body: SafeArea(
        child: InAppWebView(
          initialUrlRequest: URLRequest(
            url: WebUri("https://your-domain.com/project/ai-sigma-gateway/"),
          ),
          initialSettings: InAppWebViewSettings(
            isInspectable: true,
            transparentBackground: true,
            useHybridComposition: true,
            supportZoom: false,
            allowsInlineMediaPlayback: true,
            cacheEnabled: true,
          ),
          onWebViewCreated: (controller) {
            webViewController = controller;
          },
        ),
      ),
    );
  }
}
```

---

## Method 4: Ready-to-Use Native React Native Container

If you are embedding AI Sigma Gateway into a React Native / Expo application:

### `App.tsx`
```tsx
import React from 'react';
import { StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <WebView
        source={{ uri: 'https://your-domain.com/project/ai-sigma-gateway/' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        bounces={false}
        overScrollMode="never"
        scalesPageToFit={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  webview: {
    flex: 1,
    backgroundColor: '#030712',
  },
});
```

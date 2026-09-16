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
            url: WebUri("http://localhost:3000/project/ai-sigma-gateway/"),
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

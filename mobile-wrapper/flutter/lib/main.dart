import 'package:flutter/foundation.dart';
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
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const MaterialApp(
    title: 'AI Sigma Frontier Gateway',
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
  PullToRefreshController? pullToRefreshController;

  String currentUrl = "http://localhost:3000/project/ai-sigma-gateway/";
  double loadingProgress = 0;
  bool isLoading = true;
  bool hasError = false;
  String errorMessage = '';
  bool canGoBack = false;

  @override
  void initState() {
    super.initState();
    pullToRefreshController = kIsWeb
        ? null
        : PullToRefreshController(
            settings: PullToRefreshSettings(
              color: const Color(0xFF00F0FF),
              backgroundColor: const Color(0xFF0D111C),
            ),
            onRefresh: () async {
              if (defaultTargetPlatform == TargetPlatform.android) {
                webViewController?.reload();
              } else if (defaultTargetPlatform == TargetPlatform.iOS) {
                webViewController?.loadUrl(
                  urlRequest: URLRequest(url: await webViewController?.getUrl()),
                );
              }
            },
          );
  }

  void _showHostSwitchDialog() {
    final controller = TextEditingController(text: currentUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0B0D14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF00F0FF), width: 1),
        ),
        title: const Text(
          'Target Gateway Host',
          style: TextStyle(
            color: Color(0xFF00F0FF),
            fontFamily: 'monospace',
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select a preset or enter target host:',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                ActionChip(
                  label: const Text('Localhost (3000)'),
                  backgroundColor: const Color(0xFF161B26),
                  labelStyle: const TextStyle(color: Color(0xFF00F0FF), fontSize: 11),
                  onPressed: () {
                    controller.text = "http://localhost:3000/project/ai-sigma-gateway/";
                  },
                ),
                ActionChip(
                  label: const Text('Android (10.0.2.2)'),
                  backgroundColor: const Color(0xFF161B26),
                  labelStyle: const TextStyle(color: Color(0xFF10B981), fontSize: 11),
                  onPressed: () {
                    controller.text = "http://10.0.2.2:3000/project/ai-sigma-gateway/";
                  },
                ),
                ActionChip(
                  label: const Text('Production (concode.me)'),
                  backgroundColor: const Color(0xFF161B26),
                  labelStyle: const TextStyle(color: Color(0xFFA855F7), fontSize: 11),
                  onPressed: () {
                    controller.text = "https://concode.me/project/ai-sigma-gateway/";
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF121622),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Colors.white24),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF00F0FF)),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00F0FF),
              foregroundColor: Colors.black,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                currentUrl = controller.text.trim();
                hasError = false;
                isLoading = true;
              });
              webViewController?.loadUrl(
                urlRequest: URLRequest(url: WebUri(currentUrl)),
              );
            },
            child: const Text('Connect', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !canGoBack,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (webViewController != null && await webViewController!.canGoBack()) {
          webViewController!.goBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF030712),
        body: SafeArea(
          child: Stack(
            children: [
              // Main WebView Container
              InAppWebView(
                initialUrlRequest: URLRequest(
                  url: WebUri(currentUrl),
                ),
                pullToRefreshController: pullToRefreshController,
                initialSettings: InAppWebViewSettings(
                  isInspectable: kDebugMode,
                  transparentBackground: true,
                  useHybridComposition: true,
                  supportZoom: false,
                  allowsInlineMediaPlayback: true,
                  cacheEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  javaScriptEnabled: true,
                  useShouldOverrideUrlLoading: true,
                ),
                onWebViewCreated: (controller) {
                  webViewController = controller;
                },
                onLoadStart: (controller, url) async {
                  setState(() {
                    isLoading = true;
                    hasError = false;
                  });
                  final canBack = await controller.canGoBack();
                  setState(() {
                    canGoBack = canBack;
                  });
                },
                onProgressChanged: (controller, progress) {
                  if (progress == 100) {
                    pullToRefreshController?.endRefreshing();
                  }
                  setState(() {
                    loadingProgress = progress / 100;
                    if (progress >= 100) {
                      isLoading = false;
                    }
                  });
                },
                onLoadStop: (controller, url) async {
                  pullToRefreshController?.endRefreshing();
                  final canBack = await controller.canGoBack();
                  setState(() {
                    isLoading = false;
                    canGoBack = canBack;
                  });
                },
                onReceivedError: (controller, request, error) {
                  pullToRefreshController?.endRefreshing();
                  setState(() {
                    hasError = true;
                    errorMessage = error.description;
                  });
                },
                onReceivedHttpError: (controller, request, errorResponse) {
                  if (errorResponse.statusCode >= 500) {
                    setState(() {
                      hasError = true;
                      errorMessage = "Server error (HTTP ${errorResponse.statusCode})";
                    });
                  }
                },
              ),

              // Animated Top Progress Bar
              if (isLoading && loadingProgress < 1.0)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: loadingProgress,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00F0FF)),
                    minHeight: 2.5,
                  ),
                ),

              // Graceful Offline / Connection Error Fallback
              if (hasError)
                Positioned.fill(
                  child: Container(
                    color: const Color(0xFF05070D),
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFFF0055), width: 1.5),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFFF0055).withOpacity(0.2),
                                blurRadius: 24,
                                spreadRadius: 4,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.wifi_off_rounded,
                            color: Color(0xFFFF0055),
                            size: 48,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          "CONCODE GATEWAY OFFLINE",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          errorMessage.isNotEmpty
                              ? errorMessage
                              : "Unable to establish connection to target CONCODE node.",
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white60,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          currentUrl,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Color(0xFF00F0FF),
                            fontSize: 11,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 28),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF00F0FF),
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: () {
                                setState(() {
                                  hasError = false;
                                  isLoading = true;
                                });
                                webViewController?.reload();
                              },
                              icon: const Icon(Icons.refresh_rounded, size: 18),
                              label: const Text(
                                "Retry Connection",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF00F0FF),
                                side: const BorderSide(color: Color(0xFF00F0FF)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: _showHostSwitchDialog,
                              icon: const Icon(Icons.settings_ethernet, size: 18),
                              label: const Text("Change Host"),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LeadTriangleApp());
}

class LeadTriangleApp extends StatelessWidget {
  const LeadTriangleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LeadTriangle Ops',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Inter',
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          background: const Color(0xFFF8FAFC),
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

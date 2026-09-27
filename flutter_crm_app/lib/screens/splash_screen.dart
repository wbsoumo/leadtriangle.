import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/telephony_service.dart';
import 'permission_screen.dart';
import 'login_screen.dart';
import 'home_dashboard_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final ApiService _apiService = ApiService();
  final TelephonyService _telephonyService = TelephonyService();

  @override
  void initState() {
    super.initState();
    _checkAppFlow();
  }

  Future<void> _checkAppFlow() async {
    await Future.delayed(const Duration(seconds: 2));

    // 1. Check Phone Permission
    final hasPermission = await _telephonyService.checkCallPermissions();
    if (!mounted) return;

    if (!hasPermission) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const PermissionScreen()),
      );
      return;
    }

    // 2. Check Session
    final session = await _apiService.checkSession();
    if (!mounted) return;

    if (session['success'] == true && session['data']?['is_logged_in'] == true) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeDashboardScreen()),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x332563EB),
                    blurRadius: 20,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: const Center(
                child: Text(
                  '▲',
                  style: TextStyle(
                    fontSize: 40,
                    color: Colors.white,
                    fontWeight: FontWeight.extrabold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'LeadTriangle',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Operation Executive BPO Calling App',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 40),
            const CircularProgressIndicator(
              color: Color(0xFF2563EB),
              strokeWidth: 3,
            ),
          ],
        ),
      ),
    );
  }
}

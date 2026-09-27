import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ApiService apiService = ApiService();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('Executive Profile & Settings', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                shape: BoxShape.circle,
                boxShadow: const [BoxShadow(color: Color(0x332563EB), blurRadius: 12, offset: Offset(0, 4))],
              ),
              child: const Center(
                child: Text('E', style: TextStyle(fontSize: 36, color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Operation Executive', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 4),
            const Text('Role: Telecalling & Lead Qualification', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            const SizedBox(height: 40),
            
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.shield_outlined, color: Color(0xFF2563EB)),
                    title: const Text('Call Tracking & Privacy Mode', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Only LeadTriangle calls are recorded', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A)),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.sync_rounded, color: Color(0xFF2563EB)),
                    title: const Text('Web Dashboard Call Sync', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Real-time 5-sec active call polling active', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A)),
                  ),
                ],
              ),
            ),

            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: () async {
                  await apiService.logout();
                  if (context.mounted) {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  }
                },
                icon: const Icon(Icons.logout_rounded, color: Colors.white),
                label: const Text('Logout Securely', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

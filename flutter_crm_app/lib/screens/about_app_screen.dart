import 'package:flutter/material.dart';

class AboutAppScreen extends StatelessWidget {
  const AboutAppScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('About App', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [BoxShadow(color: Color(0x332563EB), blurRadius: 16, offset: Offset(0, 6))],
                ),
                child: const Icon(Icons.change_history_rounded, size: 54, color: Colors.white),
              ),
              const SizedBox(height: 20),
              const Text(
                'LeadTriangle CRM',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 4),
              const Text(
                'Operation Executive & Telecalling System',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Version 1.0.0 (Build 100)',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                ),
              ),
              const SizedBox(height: 32),

              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildInfoRow('Developed By', 'LeadTriangle Technologies'),
                    const Divider(height: 16),
                    _buildInfoRow('Target Environment', 'Production Cloud CRM'),
                    const Divider(height: 16),
                    _buildInfoRow('Realtime Web Sync', 'Active (5s Polling)'),
                    const Divider(height: 16),
                    _buildInfoRow('Build Date', 'September 2026'),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('You are on the latest version v1.0.0'),
                      backgroundColor: Color(0xFF16A34A),
                    ),
                  );
                },
                icon: const Icon(Icons.system_update_rounded, size: 18),
                label: const Text('Check for Updates', style: TextStyle(fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
        Text(value, style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w700)),
      ],
    );
  }
}

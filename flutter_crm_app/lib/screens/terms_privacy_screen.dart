import 'package:flutter/material.dart';

class TermsPrivacyScreen extends StatelessWidget {
  const TermsPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Terms & Privacy', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'LeadTriangle CRM & Calling Platform Terms',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Last Updated: September 27, 2026\nVersion 1.0.0',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                  ),
                  SizedBox(height: 16),
                  Text(
                    '1. Call Log Data Confidentiality\n'
                    'All customer call logs, remarks, follow-up notes, and lead information entered into LeadTriangle mobile application remain strict corporate property. Unauthorised distribution or export of lead database is prohibited.\n\n'
                    '2. Operation Executive Responsibilities\n'
                    'Telecallers and executives must accurately record call duration, outcomes, and client remarks in real-time to maintain CRM funnel integrity.\n\n'
                    '3. Privacy & Device Permissions\n'
                    'LeadTriangle requests Phone State & Call Log permissions strictly to detect ongoing business calling sessions and automate lead outcome submissions. Personal non-CRM calls are excluded.',
                    style: TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

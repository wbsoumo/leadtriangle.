import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Help & Support', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20.0),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Icon(Icons.headset_mic_rounded, color: Colors.white, size: 36),
                SizedBox(height: 12),
                Text(
                  'LeadTriangle Support Desk',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                SizedBox(height: 6),
                Text(
                  'Need assistance with calling logs, lead assignment, or mobile app features? We are available 24/7.',
                  style: TextStyle(fontSize: 13, color: Color(0xFFDBEAFE), height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text('Contact Channels', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),

          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEFF6FF),
                    child: Icon(Icons.phone_rounded, color: Color(0xFF2563EB), size: 20),
                  ),
                  title: const Text('Helpline Number', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: const Text('+91 98765 43210 (Toll Free)', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  trailing: const Icon(Icons.call_made_rounded, color: Color(0xFF2563EB), size: 18),
                  onTap: () => launchUrl(Uri.parse('tel:+919876543210')),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFDCFCE7),
                    child: Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF16A34A), size: 20),
                  ),
                  title: const Text('WhatsApp Operations Support', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: const Text('Chat with LeadTriangle team', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  trailing: const Icon(Icons.open_in_new_rounded, color: Color(0xFF16A34A), size: 18),
                  onTap: () => launchUrl(Uri.parse('https://wa.me/919876543210?text=Hi%20LeadTriangle%20Support')),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFF3E8FF),
                    child: Icon(Icons.email_outlined, color: Color(0xFF9333EA), size: 20),
                  ),
                  title: const Text('Email Support', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: const Text('support@leadtriangle.online', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  trailing: const Icon(Icons.email_rounded, color: Color(0xFF9333EA), size: 18),
                  onTap: () => launchUrl(Uri.parse('mailto:support@leadtriangle.online')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text('Frequently Asked Questions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),

          _buildFaqItem('How does call tracking sync with web dashboard?', 'When you trigger a call inside LeadTriangle mobile app, a 5-second polling system updates your active call on the browser web dashboard so admins can view live calls.'),
          _buildFaqItem('What happens if I miss a follow-up date?', 'Missed follow-ups are automatically moved into your "Overdue Follow-ups" queue on both mobile app and web dashboard for priority resolution.'),
          _buildFaqItem('How do I log offline calls or direct inbound calls?', 'The app detects direct calls from registered numbers and prompts a call log modal with outcome selection.'),
        ],
      ),
    );
  }

  Widget _buildFaqItem(String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: ExpansionTile(
        title: Text(question, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(answer, style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), height: 1.4)),
          ),
        ],
      ),
    );
  }
}

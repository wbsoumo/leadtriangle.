import 'package:flutter/material.dart';

class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({super.key});

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  String _selectedLanguage = 'English';
  bool _darkMode = false;
  bool _autoDialerNext = true;
  String _syncFrequency = '5 Seconds';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('App Settings', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
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
          const Text('Preferences & Language', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
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
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
                    child: const Icon(Icons.language_rounded, color: Color(0xFF2563EB), size: 20),
                  ),
                  title: const Text('App Language', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: Text(_selectedLanguage, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                  onTap: _showLanguageDialog,
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: _darkMode,
                  onChanged: (val) => setState(() => _darkMode = val),
                  activeColor: const Color(0xFF2563EB),
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
                    child: const Icon(Icons.dark_mode_outlined, color: Color(0xFF475569), size: 20),
                  ),
                  title: const Text('Dark Theme', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: const Text('Switch to high-contrast dark theme', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text('Telecalling & Web Dashboard Sync', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  value: _autoDialerNext,
                  onChanged: (val) => setState(() => _autoDialerNext = val),
                  activeColor: const Color(0xFF2563EB),
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
                    child: const Icon(Icons.forward_to_inbox_rounded, color: Color(0xFF16A34A), size: 20),
                  ),
                  title: const Text('Auto-Prompt Next Lead Call', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: const Text('Prompt next call popup right after submitting call outcome', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: Color(0xFFFFF7ED), shape: BoxShape.circle),
                    child: const Icon(Icons.sync_rounded, color: Color(0xFFD97706), size: 20),
                  ),
                  title: const Text('Dashboard Live Polling Sync', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  subtitle: Text('Current interval: $_syncFrequency', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                  onTap: _showSyncDialog,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Language', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: ['English', 'Hindi (हिंदी)', 'Bengali (বাংলা)', 'Marathi (मराठी)'].map((lang) {
            return RadioListTile<String>(
              title: Text(lang),
              value: lang,
              groupValue: _selectedLanguage,
              onChanged: (val) {
                if (val != null) {
                  setState(() => _selectedLanguage = val);
                  Navigator.pop(ctx);
                }
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showSyncDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Live Sync Interval', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: ['3 Seconds', '5 Seconds', '10 Seconds', '30 Seconds'].map((freq) {
            return RadioListTile<String>(
              title: Text(freq),
              value: freq,
              groupValue: _syncFrequency,
              onChanged: (val) {
                if (val != null) {
                  setState(() => _syncFrequency = val);
                  Navigator.pop(ctx);
                }
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}

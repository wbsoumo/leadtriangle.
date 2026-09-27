import 'package:flutter/material.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _callReminders = true;
  bool _followupAlerts = true;
  bool _newLeadAssigned = true;
  bool _meetingAlerts = true;
  bool _soundEnabled = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
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
          const Text('Alert Preferences', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),

          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                _buildSwitchTile(
                  title: 'Call Reminders',
                  subtitle: 'Get alerts before scheduled calling sessions',
                  value: _callReminders,
                  onChanged: (val) => setState(() => _callReminders = val),
                  icon: Icons.phone_callback_rounded,
                  iconColor: const Color(0xFF2563EB),
                ),
                const Divider(height: 1),
                _buildSwitchTile(
                  title: 'Follow-up Alerts',
                  subtitle: 'Notify when a followup time is approaching',
                  value: _followupAlerts,
                  onChanged: (val) => setState(() => _followupAlerts = val),
                  icon: Icons.access_alarm_rounded,
                  iconColor: const Color(0xFF9333EA),
                ),
                const Divider(height: 1),
                _buildSwitchTile(
                  title: 'New Lead Assignment',
                  subtitle: 'Notification when manager assigns new leads',
                  value: _newLeadAssigned,
                  onChanged: (val) => setState(() => _newLeadAssigned = val),
                  icon: Icons.person_add_alt_1_rounded,
                  iconColor: const Color(0xFF16A34A),
                ),
                const Divider(height: 1),
                _buildSwitchTile(
                  title: 'Meeting Reminders',
                  subtitle: 'Pop-up notification for client demo/meeting',
                  value: _meetingAlerts,
                  onChanged: (val) => setState(() => _meetingAlerts = val),
                  icon: Icons.event_rounded,
                  iconColor: const Color(0xFFD97706),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text('Sound & Vibration', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: _buildSwitchTile(
              title: 'Ringtone & Vibration',
              subtitle: 'Play sound for high priority lead reminders',
              value: _soundEnabled,
              onChanged: (val) => setState(() => _soundEnabled = val),
              icon: Icons.volume_up_rounded,
              iconColor: const Color(0xFF0284C7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required IconData icon,
    required Color iconColor,
  }) {
    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      activeColor: const Color(0xFF2563EB),
      secondary: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.12),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
    );
  }
}

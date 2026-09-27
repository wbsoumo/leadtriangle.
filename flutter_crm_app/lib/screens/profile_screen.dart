import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'my_details_screen.dart';
import 'change_password_screen.dart';
import 'notification_settings_screen.dart';
import 'app_settings_screen.dart';
import 'help_support_screen.dart';
import 'terms_privacy_screen.dart';
import 'about_app_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  Map<String, dynamic>? _userData;

  // Stats
  int _totalCallsWeek = 48;
  int _connectedCallsWeek = 22;
  int _connectRatePercent = 46;
  int _pendingFollowups = 5;
  int _targetAchievementPercent = 33;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);
    try {
      final sessionRes = await _apiService.checkSession();
      if (sessionRes['success'] == true && sessionRes['data'] != null && sessionRes['data']['user'] != null) {
        _userData = sessionRes['data']['user'];
      }

      final stats = await _apiService.fetchDashboardMetrics();
      if (stats.isNotEmpty) {
        final totalLeads = (stats['total_assigned'] ?? stats['total_leads'] ?? 24) as int;
        final calledToday = (stats['calls_today'] ?? 8) as int;

        _pendingFollowups = (stats['followups_today'] ?? 5) as int;
        _targetAchievementPercent = totalLeads > 0 ? ((calledToday / totalLeads) * 100).round() : 33;

        if (stats['outcomes_breakdown'] != null) {
          _connectedCallsWeek = (stats['outcomes_breakdown']['connected'] ?? 22) as int;
        }

        if (stats['weekly_calls'] != null) {
          final Map<String, dynamic> wc = stats['weekly_calls'];
          int sum = 0;
          wc.forEach((_, val) => sum += (val as num).toInt());
          if (sum > 0) _totalCallsWeek = sum;
          _connectRatePercent = _totalCallsWeek > 0 ? ((_connectedCallsWeek / _totalCallsWeek) * 100).round() : 46;
        }
      }
    } catch (e) {
      debugPrint('Error loading profile: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final userName = _userData?['name'] ?? 'Ankit Sharma';
    final roleName = _userData?['role_display'] ?? _userData?['role_name'] ?? 'Operation Executive';
    final teamName = _userData?['team_name'] ?? 'Sales Team';
    final email = _userData?['email'] ?? 'ankit.sharma@company.com';
    final mobile = _userData?['mobile'] ?? '+91 98765 43210';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfileData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Top Header (Title + Settings Gear)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Profile',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined, color: Color(0xFF0F172A), size: 24),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AppSettingsScreen()));
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // 2. Main Profile Info Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Circular Avatar
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: const Color(0xFF7DD3FC),
                        child: Text(
                          _getInitials(userName),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // User Details Column
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              userName,
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              roleName,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 10),

                            // Detail Rows
                            _buildInfoRowIcon(Icons.business_outlined, teamName),
                            const SizedBox(height: 5),
                            _buildInfoRowIcon(Icons.mail_outline_rounded, email),
                            const SizedBox(height: 5),
                            _buildInfoRowIcon(Icons.phone_outlined, mobile),
                          ],
                        ),
                      ),

                      // Edit Button Pill
                      InkWell(
                        onTap: () async {
                          final updated = await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => MyDetailsScreen(userData: _userData)),
                          );
                          if (updated == true) {
                            _loadProfileData();
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.edit_outlined, size: 14, color: Color(0xFF2563EB)),
                              SizedBox(width: 4),
                              Text('Edit', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. Stats Row (4 Cards)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      _buildProfileStatColumn(
                        icon: Icons.phone_outlined,
                        iconColor: const Color(0xFF2563EB),
                        iconBg: const Color(0xFFEFF6FF),
                        value: '$_totalCallsWeek',
                        title: 'Total Calls',
                        subtitle: '(This Week)',
                      ),
                      _buildStatDivider(),
                      _buildProfileStatColumn(
                        icon: Icons.phone_callback_outlined,
                        iconColor: const Color(0xFF16A34A),
                        iconBg: const Color(0xFFDCFCE7),
                        value: '$_connectedCallsWeek',
                        title: 'Connected',
                        subtitle: '($_connectRatePercent%)',
                      ),
                      _buildStatDivider(),
                      _buildProfileStatColumn(
                        icon: Icons.access_time_rounded,
                        iconColor: const Color(0xFFEF4444),
                        iconBg: const Color(0xFFFEE2E2),
                        value: '$_pendingFollowups',
                        title: 'Pending',
                        subtitle: 'Follow-ups',
                      ),
                      _buildStatDivider(),
                      _buildProfileStatColumn(
                        icon: Icons.track_changes_rounded,
                        iconColor: const Color(0xFF9333EA),
                        iconBg: const Color(0xFFF3E8FF),
                        value: '$_targetAchievementPercent%',
                        title: 'Target',
                        subtitle: 'Achievement',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 4. Menu Section Group 1 (Account Settings)
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      _buildMenuItem(
                        icon: Icons.person_outline_rounded,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF2563EB),
                        title: 'My Details',
                        subtitle: 'View and update your profile information',
                        onTap: () async {
                          final updated = await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => MyDetailsScreen(userData: _userData)),
                          );
                          if (updated == true) {
                            _loadProfileData();
                          }
                        },
                      ),
                      const Divider(height: 1, indent: 64),
                      _buildMenuItem(
                        icon: Icons.lock_outline_rounded,
                        iconBg: const Color(0xFFF3E8FF),
                        iconColor: const Color(0xFF9333EA),
                        title: 'Change Password',
                        subtitle: 'Update your account password',
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen()));
                        },
                      ),
                      const Divider(height: 1, indent: 64),
                      _buildMenuItem(
                        icon: Icons.notifications_none_rounded,
                        iconBg: const Color(0xFFFFF7ED),
                        iconColor: const Color(0xFFEA580C),
                        title: 'Notifications',
                        subtitle: 'Manage app notifications',
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationSettingsScreen()));
                        },
                      ),
                      const Divider(height: 1, indent: 64),
                      _buildMenuItem(
                        icon: Icons.palette_outlined,
                        iconBg: const Color(0xFFECFDF5),
                        iconColor: const Color(0xFF10B981),
                        title: 'App Settings',
                        subtitle: 'Language, Theme and preferences',
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const AppSettingsScreen()));
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 5. Menu Section Group 2 (Support & Legal)
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      _buildMenuItem(
                        icon: Icons.help_outline_rounded,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF2563EB),
                        title: 'Help & Support',
                        subtitle: 'Get help or contact support',
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpSupportScreen()));
                        },
                      ),
                      const Divider(height: 1, indent: 64),
                      _buildMenuItem(
                        icon: Icons.article_outlined,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF2563EB),
                        title: 'Terms & Privacy',
                        subtitle: 'View app terms and privacy policy',
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsPrivacyScreen()));
                        },
                      ),
                      const Divider(height: 1, indent: 64),
                      _buildMenuItem(
                        icon: Icons.info_outline_rounded,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF2563EB),
                        title: 'About App',
                        subtitle: 'Version 1.0.0',
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const AboutAppScreen()));
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 6. Red Logout Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await _apiService.logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                    icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 20),
                    label: const Text('Logout', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFFEF4444))),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFEF2F2),
                      foregroundColor: const Color(0xFFEF4444),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRowIcon(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildProfileStatColumn({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String value,
    required String title,
    required String subtitle,
  }) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)), textAlign: TextAlign.center),
          Text(subtitle, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w500, color: Color(0xFF94A3B8)), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildStatDivider() {
    return Container(
      width: 1,
      height: 48,
      color: const Color(0xFFF1F5F9),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: iconBg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1), size: 20),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return 'AS';
  }
}

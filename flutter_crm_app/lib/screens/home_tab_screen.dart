import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeTabScreen extends StatefulWidget {
  const HomeTabScreen({super.key});

  @override
  State<HomeTabScreen> createState() => _HomeTabScreenState();
}

class _HomeTabScreenState extends State<HomeTabScreen> {
  final ApiService _apiService = ApiService();

  String _userName = 'Ankit Sharma';
  bool _isLoading = true;

  // Live Stats from Database
  int _totalAssigned = 0;
  int _calledToday = 0;
  int _remaining = 0;
  int _followupsToday = 0;
  int _overdueFollowups = 0;
  int _contactedLeads = 0;
  int _qualifiedLeads = 0;
  int _meetingsToday = 0;

  // Outcomes
  int _outcomesConnected = 0;
  int _outcomesNoAnswer = 0;
  int _outcomesBusy = 0;
  int _outcomesSwitchedOff = 0;
  int _outcomesWrongNumber = 0;

  // Weekly Calls
  Map<String, int> _weeklyCalls = {
    'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
  };

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final sessionRes = await _apiService.checkSession();
      if (sessionRes['success'] == true && sessionRes['data'] != null && sessionRes['data']['user'] != null) {
        _userName = sessionRes['data']['user']['name'] ?? 'User';
      }

      final data = await _apiService.fetchDashboardMetrics();
      if (data.isNotEmpty) {
        _totalAssigned = (data['total_assigned'] ?? data['total_leads'] ?? 0) as int;
        _calledToday = (data['calls_today'] ?? 0) as int;
        _remaining = (data['remaining_calls'] ?? 0) as int;
        _followupsToday = (data['followups_today'] ?? 0) as int;
        _overdueFollowups = (data['overdue_followups'] ?? 0) as int;
        _contactedLeads = (data['contacted_leads'] ?? 0) as int;
        _qualifiedLeads = (data['qualified_leads'] ?? 0) as int;
        _meetingsToday = (data['meetings_today'] ?? 0) as int;

        if (data['outcomes_breakdown'] != null) {
          final ob = data['outcomes_breakdown'];
          _outcomesConnected = (ob['connected'] ?? 0) as int;
          _outcomesNoAnswer = (ob['no_answer'] ?? 0) as int;
          _outcomesBusy = (ob['busy'] ?? 0) as int;
          _outcomesSwitchedOff = (ob['switched_off'] ?? 0) as int;
          _outcomesWrongNumber = (ob['wrong_number'] ?? 0) as int;
        }

        if (data['weekly_calls'] != null) {
          final Map<String, dynamic> wc = data['weekly_calls'];
          wc.forEach((key, val) {
            if (_weeklyCalls.containsKey(key)) {
              _weeklyCalls[key] = (val as num).toInt();
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading dashboard metrics: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final double progressPercent = _totalAssigned > 0
        ? (_calledToday / _totalAssigned).clamp(0.0, 1.0)
        : 0.0;
    final int progressInt = (progressPercent * 100).round();

    // Sum weekly calls
    final int totalWeeklyCalls = _weeklyCalls.values.fold(0, (sum, item) => sum + item);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Top Greeting Profile Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: const Color(0xFFEFF6FF),
                          child: Text(
                            _getInitials(_userName),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Good Morning,',
                              style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                            ),
                            Text(
                              _userName,
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 1),
                            const Text(
                              'Let\'s make some calls today!',
                              style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Stack(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF0F172A), size: 26),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Notifications up to date')),
                            );
                          },
                        ),
                        Positioned(
                          right: 12,
                          top: 12,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFFEF4444),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 2. Date Filter Bar Card
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.calendar_today_outlined, size: 18, color: Color(0xFF64748B)),
                          SizedBox(width: 10),
                          Text(
                            'Today, Live Summary',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                      const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B), size: 22),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. 4 Key Stat Cards Grid (2x2)
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 1.6,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  children: [
                    _buildStatCard(
                      icon: Icons.phone_outlined,
                      iconBg: const Color(0xFFDBEAFE),
                      iconColor: const Color(0xFF2563EB),
                      cardBg: const Color(0xFFF0F7FF),
                      count: '$_totalAssigned',
                      label: 'Total Assigned',
                    ),
                    _buildStatCard(
                      icon: Icons.phone_callback_outlined,
                      iconBg: const Color(0xFFDCFCE7),
                      iconColor: const Color(0xFF16A34A),
                      cardBg: const Color(0xFFF0FDF4),
                      count: '$_calledToday',
                      label: 'Called Today',
                    ),
                    _buildStatCard(
                      icon: Icons.access_time_rounded,
                      iconBg: const Color(0xFFFEE2E2),
                      iconColor: const Color(0xFFEF4444),
                      cardBg: const Color(0xFFFEF2F2),
                      count: '$_remaining',
                      label: 'Remaining',
                    ),
                    _buildStatCard(
                      icon: Icons.calendar_month_outlined,
                      iconBg: const Color(0xFFF3E8FF),
                      iconColor: const Color(0xFF9333EA),
                      cardBg: const Color(0xFFFAF5FF),
                      count: '$_followupsToday',
                      label: 'Follow-ups Today',
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // 4. Calling Progress Section
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Calling Progress', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                          Row(
                            children: [
                              Text('$_calledToday / $_totalAssigned ', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                              Text('($progressInt%)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Progress Line
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: progressPercent,
                          minHeight: 10,
                          backgroundColor: const Color(0xFFEFF6FF),
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // 5 Step Funnel Nodes
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildFunnelStep('$_totalAssigned', 'Assigned', const Color(0xFFEFF6FF), const Color(0xFF2563EB)),
                          const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFFCBD5E1)),
                          _buildFunnelStep('$_calledToday', 'Called', const Color(0xFFDCFCE7), const Color(0xFF16A34A)),
                          const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFFCBD5E1)),
                          _buildFunnelStep('$_followupsToday', 'Follow-ups', const Color(0xFFF3E8FF), const Color(0xFF9333EA)),
                          const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFFCBD5E1)),
                          _buildFunnelStep('$_qualifiedLeads', 'Interested', const Color(0xFFFEF3C7), const Color(0xFFD97706)),
                          const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFFCBD5E1)),
                          _buildFunnelStep('$_meetingsToday', 'Meeting', const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 5. Call Outcomes (Today) Section
                _buildSectionHeader('Call Outcomes', '(Today)', () {}),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildOutcomeTile('$_outcomesConnected', 'Connected', Icons.phone_in_talk_rounded, const Color(0xFFDCFCE7), const Color(0xFF16A34A)),
                      const SizedBox(width: 10),
                      _buildOutcomeTile('$_outcomesNoAnswer', 'No Answer', Icons.phone_missed_rounded, const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
                      const SizedBox(width: 10),
                      _buildOutcomeTile('$_outcomesBusy', 'Busy', Icons.phone_paused_rounded, const Color(0xFFFEF3C7), const Color(0xFFD97706)),
                      const SizedBox(width: 10),
                      _buildOutcomeTile('$_outcomesSwitchedOff', 'Switched Off', Icons.block_rounded, const Color(0xFFF1F5F9), const Color(0xFF64748B)),
                      const SizedBox(width: 10),
                      _buildOutcomeTile('$_outcomesWrongNumber', 'Wrong Number', Icons.redo_rounded, const Color(0xFFEFF6FF), const Color(0xFF2563EB)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 6. Follow-ups (Today) Section
                _buildSectionHeader('Follow-ups', '(Today)', () {}),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildFollowupSummaryTile('${_followupsToday + _overdueFollowups}', 'Total', Icons.calendar_month_outlined, const Color(0xFFEFF6FF), const Color(0xFF2563EB)),
                    const SizedBox(width: 8),
                    _buildFollowupSummaryTile('$_overdueFollowups', 'Overdue', Icons.access_time_filled_rounded, const Color(0xFFFEF2F2), const Color(0xFFEF4444)),
                    const SizedBox(width: 8),
                    _buildFollowupSummaryTile('$_followupsToday', 'Today', Icons.query_builder_rounded, const Color(0xFFF0F9FF), const Color(0xFF0284C7)),
                    const SizedBox(width: 8),
                    _buildFollowupSummaryTile('$_qualifiedLeads', 'Qualified', Icons.schedule_rounded, const Color(0xFFFAF5FF), const Color(0xFF9333EA)),
                  ],
                ),
                const SizedBox(height: 20),

                // 7. Performance & Target Cards Row (2 Columns)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left: Performance Chart Card
                    Expanded(
                      flex: 5,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: const [
                                Text('Performance', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFF64748B)),
                              ],
                            ),
                            const Text('(This Week)', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500)),
                            const SizedBox(height: 12),

                            // Mini Stats Row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildMiniStat('$totalWeeklyCalls', 'Total Calls'),
                                _buildMiniStat('$_outcomesConnected', 'Connected'),
                                _buildMiniStat('${totalWeeklyCalls > 0 ? ((_outcomesConnected / totalWeeklyCalls) * 100).round() : 0}%', 'Connect Rate'),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Weekly Bar Chart Graphic
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                _buildBarItem('Mon', _calculateBarHeight(_weeklyCalls['Mon'] ?? 0)),
                                _buildBarItem('Tue', _calculateBarHeight(_weeklyCalls['Tue'] ?? 0)),
                                _buildBarItem('Wed', _calculateBarHeight(_weeklyCalls['Wed'] ?? 0)),
                                _buildBarItem('Thu', _calculateBarHeight(_weeklyCalls['Thu'] ?? 0)),
                                _buildBarItem('Fri', _calculateBarHeight(_weeklyCalls['Fri'] ?? 0)),
                                _buildBarItem('Sat', _calculateBarHeight(_weeklyCalls['Sat'] ?? 0)),
                                _buildBarItem('Sun', _calculateBarHeight(_weeklyCalls['Sun'] ?? 0)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Right: My Target Card
                    Expanded(
                      flex: 4,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: const [
                                Text('My Target', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFF64748B)),
                              ],
                            ),
                            const SizedBox(height: 14),

                            // Target Circular Progress Ring
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                SizedBox(
                                  width: 70,
                                  height: 70,
                                  child: CircularProgressIndicator(
                                    value: progressPercent,
                                    strokeWidth: 7,
                                    backgroundColor: const Color(0xFFEFF6FF),
                                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                                  ),
                                ),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text('$progressInt%', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                    Text('$_calledToday/$_totalAssigned', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Text('Daily Calling Target', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                            const SizedBox(height: 10),

                            // Trophy Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.emoji_events_rounded, size: 14, color: Color(0xFF2563EB)),
                                  const SizedBox(width: 4),
                                  Text('$_remaining calls left', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  double _calculateBarHeight(int count) {
    if (count <= 0) return 4.0;
    return (count * 4.0).clamp(6.0, 48.0);
  }

  // Stat Card Component
  Widget _buildStatCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required Color cardBg,
    required String count,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: iconBg.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              Text(
                count,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
              ),
              const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF94A3B8)),
            ],
          ),
        ],
      ),
    );
  }

  // Funnel Step Node Component
  Widget _buildFunnelStep(String count, String label, Color bg, Color color) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
          alignment: Alignment.center,
          child: Text(count, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
      ],
    );
  }

  // Section Header Component
  Widget _buildSectionHeader(String title, String subtitle, VoidCallback onTap) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(width: 6),
            Text(subtitle, style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
          ],
        ),
        InkWell(
          onTap: onTap,
          child: Row(
            children: const [
              Text('View All', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
              Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF2563EB)),
            ],
          ),
        ),
      ],
    );
  }

  // Call Outcome Tile Widget
  Widget _buildOutcomeTile(String count, String label, IconData icon, Color bg, Color color) {
    return Container(
      width: 82,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: bg.withOpacity(0.4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: bg),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 6),
          Text(count, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  // Followup Summary Tile Widget
  Widget _buildFollowupSummaryTile(String count, String label, IconData icon, Color bg, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 14),
                const SizedBox(width: 4),
                Text(count, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
              ],
            ),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniStat(String val, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(val, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildBarItem(String day, double height) {
    return Column(
      children: [
        Container(
          width: 10,
          height: height,
          decoration: BoxDecoration(
            color: const Color(0xFF818CF8),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 6),
        Text(day, style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
      ],
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

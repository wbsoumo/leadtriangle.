import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'leads_list_screen.dart';

class HomeTabScreen extends StatefulWidget {
  final VoidCallback? onNavigateToLeads;

  const HomeTabScreen({super.key, this.onNavigateToLeads});

  @override
  State<HomeTabScreen> createState() => _HomeTabScreenState();
}

class _HomeTabScreenState extends State<HomeTabScreen> {
  final ApiService _apiService = ApiService();

  String _userName = 'Sales Executive';
  bool _isLoading = true;

  // Key Daily Metrics
  int _totalAssigned = 0;
  int _calledToday = 0;
  int _remaining = 0;
  int _followupsToday = 0;
  int _overdueFollowups = 0;
  int _qualifiedLeads = 0;

  // Outcomes
  int _outcomesConnected = 0;
  int _outcomesInterested = 0;
  int _outcomesCallback = 0;
  int _outcomesNotInterested = 0;

  // Weekly Calls
  final Map<String, int> _weeklyCalls = {
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
        _remaining = (data['remaining_calls'] ?? (_totalAssigned > _calledToday ? _totalAssigned - _calledToday : 0)) as int;
        _followupsToday = (data['followups_today'] ?? 0) as int;
        _overdueFollowups = (data['overdue_followups'] ?? 0) as int;
        _qualifiedLeads = (data['qualified_leads'] ?? 0) as int;

        if (data['outcomes_breakdown'] != null) {
          final ob = data['outcomes_breakdown'];
          _outcomesConnected = (ob['connected'] ?? 0) as int;
          _outcomesInterested = (ob['interested'] ?? _qualifiedLeads) as int;
          _outcomesCallback = (ob['busy'] ?? ob['followup'] ?? 0) as int;
          _outcomesNotInterested = (ob['no_answer'] ?? 0) as int;
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
      debugPrint('Error loading dashboard: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'U';
  }

  void _openLeadsQueue() {
    if (widget.onNavigateToLeads != null) {
      widget.onNavigateToLeads!();
    } else {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const LeadsListScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final double progressPercent = _totalAssigned > 0
        ? (_calledToday / _totalAssigned).clamp(0.0, 1.0)
        : 0.0;
    final int progressInt = (progressPercent * 100).round();
    final int totalWeeklyCalls = _weeklyCalls.values.fold(0, (sum, item) => sum + item);
    final int connectRate = totalWeeklyCalls > 0 ? ((_outcomesConnected / totalWeeklyCalls) * 100).round() : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: const Color(0xFF2563EB),
          child: _isLoading
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.only(top: 120),
                    child: CircularProgressIndicator(color: Color(0xFF2563EB)),
                  ),
                )
              : SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                // 1. Header & Greeting Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: const Color(0xFF2563EB),
                          child: Text(
                            _getInitials(_userName),
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  _userName,
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFDCFCE7),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text('Live', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                                ),
                              ],
                            ),
                            const Text(
                              'Executive Calling Station',
                              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.sync_rounded, color: Color(0xFF64748B), size: 22),
                      tooltip: 'Refresh Metrics',
                      onPressed: _loadDashboardData,
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 2. HERO CALLING TARGET CARD (Single primary action station)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: const [
                      BoxShadow(color: Color(0x262563EB), blurRadius: 14, offset: Offset(0, 6)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'TODAY\'S CALLING GOAL',
                            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF93C5FD), letterSpacing: 0.5),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '$progressInt% Completed',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '$_calledToday',
                            style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '/ $_totalAssigned calls completed',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFFDBEAFE)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: progressPercent,
                          minHeight: 8,
                          backgroundColor: Colors.white.withOpacity(0.2),
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF38BDF8)),
                        ),
                      ),
                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton.icon(
                          onPressed: _openLeadsQueue,
                          icon: const Icon(Icons.phone_forwarded_rounded, size: 18),
                          label: const Text('Start Calling Queue →', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF1E3A8A),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 3. PRIORITY WORKLOAD QUEUES (Fresh Leads vs Follow-ups Due)
                Row(
                  children: [
                    // Fresh Leads Queue
                    Expanded(
                      child: InkWell(
                        onTap: _openLeadsQueue,
                        borderRadius: BorderRadius.circular(16),
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
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDCFCE7),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.fiber_new_rounded, color: Color(0xFF16A34A), size: 22),
                                  ),
                                  Text(
                                    '$_remaining',
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const Text('Fresh To-Call', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              const Text('Pending first touch', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Follow-ups Queue
                    Expanded(
                      child: InkWell(
                        onTap: _openLeadsQueue,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: _overdueFollowups > 0 ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: _overdueFollowups > 0 ? const Color(0xFFFEE2E2) : const Color(0xFFEFF6FF),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      Icons.alarm_on_rounded,
                                      color: _overdueFollowups > 0 ? const Color(0xFFDC2626) : const Color(0xFF2563EB),
                                      size: 20,
                                    ),
                                  ),
                                  Text(
                                    '$_followupsToday',
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const Text('Follow-ups', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              Text(
                                _overdueFollowups > 0 ? '$_overdueFollowups Overdue' : 'Due for callback',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: _overdueFollowups > 0 ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // 4. TODAY'S OUTCOME DISPOSITIONS
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Today\'s Call Outcomes',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildOutcomePill('$_outcomesConnected', 'Connected', const Color(0xFF16A34A), const Color(0xFFDCFCE7)),
                          const SizedBox(width: 8),
                          _buildOutcomePill('$_outcomesInterested', 'Interested', const Color(0xFF2563EB), const Color(0xFFEFF6FF)),
                          const SizedBox(width: 8),
                          _buildOutcomePill('$_outcomesCallback', 'Callback', const Color(0xFFD97706), const Color(0xFFFEF3C7)),
                          const SizedBox(width: 8),
                          _buildOutcomePill('$_outcomesNotInterested', 'Missed', const Color(0xFF64748B), const Color(0xFFF1F5F9)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 5. WEEKLY PERFORMANCE SNAPSHOT
                Container(
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
                        children: [
                          const Text(
                            'Weekly Calling Activity',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            '$totalWeeklyCalls calls • $connectRate% connect',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Weekly Bar Graph
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _buildBarItem('Mon', _weeklyCalls['Mon'] ?? 0),
                          _buildBarItem('Tue', _weeklyCalls['Tue'] ?? 0),
                          _buildBarItem('Wed', _weeklyCalls['Wed'] ?? 0),
                          _buildBarItem('Thu', _weeklyCalls['Thu'] ?? 0),
                          _buildBarItem('Fri', _weeklyCalls['Fri'] ?? 0),
                          _buildBarItem('Sat', _weeklyCalls['Sat'] ?? 0),
                          _buildBarItem('Sun', _weeklyCalls['Sun'] ?? 0),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOutcomePill(String count, String label, Color textCol, Color bgCol) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: bgCol,
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Column(
          children: [
            Text(count, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: textCol)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: textCol), overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  Widget _buildBarItem(String day, int count) {
    final double height = count <= 0 ? 4.0 : (count * 3.5).clamp(6.0, 42.0);
    final isMax = count > 10;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(count > 0 ? '$count' : '', style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
        const SizedBox(height: 3),
        Container(
          width: 22,
          height: height,
          decoration: BoxDecoration(
            color: isMax ? const Color(0xFF2563EB) : const Color(0xFF93C5FD),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 6),
        Text(day, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
      ],
    );
  }
}

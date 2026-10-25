import 'package:flutter/material.dart';
import '../models/lead_model.dart';
import '../models/call_log_model.dart';
import '../services/api_service.dart';
import '../services/telephony_service.dart';
import 'call_outcome_modal.dart';

class LeadDetailScreen extends StatefulWidget {
  final LeadModel lead;

  const LeadDetailScreen({super.key, required this.lead});

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen> with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  final TelephonyService _telephonyService = TelephonyService();

  late TabController _tabController;
  late LeadModel _currentLead;

  List<CallLogModel> _callLogs = [];
  final List<String> _notes = [];
  final TextEditingController _noteInputController = TextEditingController();

  bool _isLoadingLogs = true;
  bool _isUpdatingStatus = false;

  final List<Map<String, dynamic>> _availableStatuses = [
    {'id': 1, 'name': 'New Lead', 'color': const Color(0xFF3B82F6)},
    {'id': 4, 'name': 'Contacting', 'color': const Color(0xFF06B6D4)},
    {'id': 6, 'name': 'Follow-up Required', 'color': const Color(0xFFF59E0B)},
    {'id': 7, 'name': 'Meeting Scheduled', 'color': const Color(0xFF8B5CF6)},
    {'id': 8, 'name': 'Qualified Lead', 'color': const Color(0xFF10B981)},
    {'id': 13, 'name': 'Not Interested', 'color': const Color(0xFF6B7280)},
    {'id': 14, 'name': 'Invalid / Unreachable', 'color': const Color(0xFFEF4444)},
  ];

  @override
  void initState() {
    super.initState();
    _currentLead = widget.lead;
    _tabController = TabController(length: 2, vsync: this);
    _loadLogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _noteInputController.dispose();
    super.dispose();
  }

  Future<void> _loadLogs() async {
    setState(() => _isLoadingLogs = true);
    final logs = await _apiService.fetchLeadCallLogs(_currentLead.id);
    setState(() {
      _callLogs = logs;
      _isLoadingLogs = false;
    });
  }

  // Direct Lead Status Update Option (Web Parity)
  Future<void> _showStatusChangeDialog() async {
    final selected = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Update Lead Status',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ..._availableStatuses.map((st) {
                  final color = st['color'] as Color;
                  final isCurrent = _currentLead.statusName.toLowerCase() == (st['name'] as String).toLowerCase();
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                    title: Text(
                      st['name'] as String,
                      style: TextStyle(
                        fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                        color: isCurrent ? color : const Color(0xFF1E293B),
                        fontSize: 14,
                      ),
                    ),
                    trailing: isCurrent ? Icon(Icons.check_circle_rounded, color: color, size: 18) : null,
                    onTap: () => Navigator.pop(ctx, st['id'] as int),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );

    if (selected != null && mounted) {
      setState(() => _isUpdatingStatus = true);
      final res = await _apiService.updateLeadStatus(leadId: _currentLead.id, statusId: selected);
      setState(() => _isUpdatingStatus = false);

      if (res['success'] == true && mounted) {
        final newName = res['status_name'] ?? 'Updated';
        final newColor = res['status_color'] ?? '#2563EB';
        setState(() {
          _currentLead = _currentLead.copyWith(
            statusName: newName,
            statusColor: newColor,
          );
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lead status updated to $newName'), backgroundColor: const Color(0xFF16A34A)),
        );
      }
    }
  }

  Future<void> _makeCall() async {
    final session = await _telephonyService.initiateLeadCall(
      leadId: _currentLead.id,
      phoneNumber: _currentLead.mobile,
    );

    if (session != null && mounted) {
      _openOutcomeModal(session.durationInSeconds);
    }
  }

  Future<void> _openOutcomeModal([int durationSeconds = 0]) async {
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CallOutcomeModal(
        leadId: _currentLead.id,
        leadName: _currentLead.name,
        phone: _currentLead.mobile,
        durationSeconds: durationSeconds,
      ),
    );

    if (updated == true && mounted) {
      _loadLogs();
      // Reload lead details
      final leads = await _apiService.fetchLeads(search: _currentLead.mobile);
      if (leads.isNotEmpty && mounted) {
        setState(() {
          _currentLead = leads.first;
        });
      }
    }
  }

  Future<void> _openWhatsApp() async {
    final ok = await _telephonyService.openWhatsApp(_currentLead.mobile);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open WhatsApp.')),
      );
    }
  }

  void _addNoteModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Add Internal Note',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteInputController,
              maxLines: 3,
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Type notes, requirements, or discussion feedback...',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                onPressed: () {
                  if (_noteInputController.text.trim().isNotEmpty) {
                    setState(() {
                      _notes.insert(0, _noteInputController.text.trim());
                      _noteInputController.clear();
                    });
                    Navigator.pop(ctx);
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Save Note', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          _currentLead.name,
          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 17),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded, color: Color(0xFF64748B)),
            onPressed: _loadLogs,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF2563EB),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF2563EB),
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'Overview & Details'),
            Tab(text: 'Call Activity'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildActivityHistoryTab(),
        ],
      ),
      bottomNavigationBar: _buildBottomActionBar(),
    );
  }

  // 1. STREAMLINED OVERVIEW TAB
  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Interactive Status Banner
          InkWell(
            onTap: _isUpdatingStatus ? null : _showStatusChangeDialog,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _currentLead.statusName.toUpperCase(),
                          style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _currentLead.leadCode.isNotEmpty ? '#${_currentLead.leadCode}' : '',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        _isUpdatingStatus ? 'Updating...' : 'Change Status',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF2563EB), size: 18),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Next Follow-up Alert (if scheduled)
          if (_currentLead.nextFollowupAt != null && _currentLead.nextFollowupAt!.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.alarm_on_rounded, color: Color(0xFFD97706), size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Next Follow-up Scheduled', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: Color(0xFF92400E))),
                        Text(_currentLead.nextFollowupAt!, style: const TextStyle(fontSize: 12, color: Color(0xFFB45309), fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Contact Details Card
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
                const Text('Contact Information', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const SizedBox(height: 14),
                _buildContactRow(Icons.phone_outlined, 'Phone / Mobile', _currentLead.mobile, actionWidget: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.phone_rounded, color: Color(0xFF16A34A), size: 20),
                      onPressed: _makeCall,
                      constraints: const BoxConstraints(),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    IconButton(
                      icon: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 20),
                      onPressed: _openWhatsApp,
                      constraints: const BoxConstraints(),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ],
                )),
                const Divider(height: 20),
                _buildContactRow(Icons.email_outlined, 'Email', _currentLead.email ?? 'No email provided'),
                const Divider(height: 20),
                _buildContactRow(Icons.business_outlined, 'Company', _currentLead.companyName ?? 'Individual'),
                const Divider(height: 20),
                _buildContactRow(Icons.room_outlined, 'City', _currentLead.city ?? '-'),
                const Divider(height: 20),
                _buildContactRow(Icons.filter_alt_outlined, 'Lead Source', _currentLead.sourceName ?? 'Direct Inquiry'),
                const Divider(height: 20),
                _buildContactRow(Icons.category_outlined, 'Service', _currentLead.serviceName ?? 'General'),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Notes Section
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
                    const Text('Internal Notes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    TextButton.icon(
                      onPressed: _addNoteModal,
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text('Add Note', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                if (_notes.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('No notes recorded yet.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  )
                else
                  ..._notes.map((n) => Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.note_rounded, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Expanded(child: Text(n, style: const TextStyle(fontSize: 12.5, color: Color(0xFF1E293B)))),
                          ],
                        ),
                      )),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // 2. CALL ACTIVITY HISTORY TAB
  Widget _buildActivityHistoryTab() {
    if (_isLoadingLogs) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)));
    }
    if (_callLogs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.phone_missed_rounded, size: 40, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 10),
            const Text('No calls logged for this lead yet.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: _makeCall,
              icon: const Icon(Icons.phone_rounded, size: 16),
              label: const Text('Call Now'),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _callLogs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final log = _callLogs[index];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          log.outcomeName,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Color(0xFF2563EB)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${log.durationSeconds}s duration',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  Text(
                    log.calledAt,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                  ),
                ],
              ),
              if (log.remarks.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(log.remarks, style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B))),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildContactRow(IconData icon, String label, String value, {Widget? actionWidget}) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF64748B)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
              Text(value, style: const TextStyle(fontSize: 13.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w700)),
            ],
          ),
        ),
        if (actionWidget != null) actionWidget,
      ],
    );
  }

  // Persistent Focused Bottom Action Bar
  Widget _buildBottomActionBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: _makeCall,
              icon: const Icon(Icons.phone_rounded, size: 18),
              label: const Text('Call Client', style: TextStyle(fontWeight: FontWeight.w800)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF16A34A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: OutlinedButton.icon(
              onPressed: () => _openOutcomeModal(0),
              icon: const Icon(Icons.edit_note_rounded, size: 18),
              label: const Text('Log Outcome', style: TextStyle(fontWeight: FontWeight.w800)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF2563EB),
                side: const BorderSide(color: Color(0xFF2563EB)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 10),
          IconButton(
            onPressed: _openWhatsApp,
            icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF25D366)),
            tooltip: 'WhatsApp',
          ),
        ],
      ),
    );
  }
}

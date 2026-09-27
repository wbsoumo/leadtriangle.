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
  List<CallLogModel> _callLogs = [];
  final List<String> _notes = [];
  final TextEditingController _noteInputController = TextEditingController();
  
  bool _isLoadingLogs = true;
  bool _isStarred = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
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
    final logs = await _apiService.fetchLeadCallLogs(widget.lead.id);
    setState(() {
      _callLogs = logs;
      _isLoadingLogs = false;
    });
  }

  Future<void> _makeCall() async {
    final session = await _telephonyService.initiateLeadCall(
      leadId: widget.lead.id,
      phoneNumber: widget.lead.mobile,
    );

    if (session != null && mounted) {
      final updated = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => CallOutcomeModal(
          leadId: widget.lead.id,
          leadName: widget.lead.name,
          phone: widget.lead.mobile,
          durationSeconds: session.durationInSeconds,
        ),
      );

      if (updated == true) {
        _loadLogs();
      }
    }
  }

  Future<void> _openWhatsApp() async {
    final success = await _telephonyService.openWhatsApp(widget.lead.mobile);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch WhatsApp.')),
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
              'Add Note',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteInputController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Type internal notes or discussion summary...',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  if (_noteInputController.text.trim().isNotEmpty) {
                    setState(() {
                      _notes.insert(0, _noteInputController.text.trim());
                    });
                    _noteInputController.clear();
                    Navigator.of(ctx).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Note added successfully!')),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Save Note', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.lead.name,
          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 19),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF2563EB)),
            onPressed: _openWhatsApp,
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: Color(0xFF64748B)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Edit Lead options available on Web Dashboard')),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: const Color(0xFF2563EB),
          unselectedLabelColor: const Color(0xFF64748B),
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          indicatorColor: const Color(0xFF2563EB),
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'About'),
            Tab(text: 'Activity History'),
            Tab(text: 'Tasks'),
            Tab(text: 'Notes'),
            Tab(text: 'Documents'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAboutTab(),
          _buildActivityHistoryTab(),
          _buildTasksTab(),
          _buildNotesTab(),
          _buildDocumentsTab(),
        ],
      ),
      bottomNavigationBar: _buildBottomActionBar(),
    );
  }

  // 1. ABOUT TAB (Matches User Design Image)
  Widget _buildAboutTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Primary Blue Action Banner / Status Badge
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF283593), // Royal Navy Blue matching screenshot
              borderRadius: BorderRadius.circular(12),
              boxShadow: const [BoxShadow(color: Color(0x1F283593), blurRadius: 8, offset: Offset(0, 3))],
            ),
            child: Row(
              children: [
                const Icon(Icons.nature_people_rounded, color: Colors.white, size: 22),
                const SizedBox(width: 12),
                Text(
                  widget.lead.statusName.toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14.5, letterSpacing: 0.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Lead Header Card (Avatar + 4 Action Buttons)
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
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: const Color(0xFF7DD3FC),
                      child: Text(
                        widget.lead.name.isNotEmpty ? widget.lead.name[0].toUpperCase() : 'L',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.lead.name,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                widget.lead.statusName,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.edit_outlined, size: 14, color: Color(0xFF64748B)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // 4 Action Square Tile Grid
                Row(
                  children: [
                    _buildActionTile(
                      icon: Icons.phone_outlined,
                      label: 'Contact',
                      onTap: _makeCall,
                    ),
                    const SizedBox(width: 10),
                    _buildActionTile(
                      icon: Icons.chat_bubble_outline_rounded,
                      label: 'WhatsApp',
                      onTap: _openWhatsApp,
                    ),
                    const SizedBox(width: 10),
                    _buildActionTile(
                      icon: Icons.near_me_outlined,
                      label: 'Direction',
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('City: ${widget.lead.city ?? "Location specified in lead file"}')),
                        );
                      },
                    ),
                    const SizedBox(width: 10),
                    _buildActionTile(
                      icon: _isStarred ? Icons.star_rounded : Icons.star_outline_rounded,
                      label: 'Star',
                      iconColor: _isStarred ? const Color(0xFFEAB308) : const Color(0xFF2563EB),
                      onTap: () => setState(() => _isStarred = !_isStarred),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Lead Metrics Card (Requirement screenshot matching)
          const Text(
            'Lead Metrics',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 2.2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                _buildMetricTile('85', 'Lead Score'),
                _buildMetricTile('12', 'Engagement Score'),
                _buildMetricTile('Hot', 'Lead Quality'),
                _buildMetricTile('3 Days', 'Age'),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Key Details Section
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
                  children: const [
                    Text('Key Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    Icon(Icons.keyboard_arrow_up_rounded, color: Color(0xFF64748B)),
                  ],
                ),
                const SizedBox(height: 14),
                const Text('Phone Number', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                InkWell(
                  onTap: _makeCall,
                  child: Row(
                    children: [
                      const Text('🇮🇳 ', style: TextStyle(fontSize: 16)),
                      Text(
                        '+91-${widget.lead.mobile}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Email', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(
                  widget.lead.email ?? 'Not Provided',
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: widget.lead.email != null ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Service Requested', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(
                  widget.lead.serviceName ?? 'BPO Telecalling Operations',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // 2. ACTIVITY HISTORY TAB
  Widget _buildActivityHistoryTab() {
    if (_isLoadingLogs) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)));
    }
    if (_callLogs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.history_rounded, size: 48, color: Color(0xFFCBD5E1)),
            SizedBox(height: 12),
            Text('No call activities logged yet.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _callLogs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final log = _callLogs[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
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
                      const Icon(Icons.phone_callback_rounded, size: 16, color: Color(0xFF2563EB)),
                      const SizedBox(width: 8),
                      Text(log.calledAt, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      log.outcomeName,
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Duration: ${log.formattedDuration}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              if (log.remarks.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Remark: ${log.remarks}', style: const TextStyle(fontSize: 13, color: Color(0xFF334155))),
              ],
            ],
          ),
        );
      },
    );
  }

  // 3. TASKS TAB
  Widget _buildTasksTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: const [
              Icon(Icons.alarm_on_rounded, color: Color(0xFF2563EB)),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Scheduled Follow-up Call', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('Due: Today at 11:00 AM', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // 4. NOTES TAB
  Widget _buildNotesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_notes.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            child: const Text('No notes created yet. Use ADD NOTE below.', style: TextStyle(color: Color(0xFF64748B))),
          )
        else
          ..._notes.map((note) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.edit_note_rounded, color: Color(0xFF2563EB), size: 20),
                    const SizedBox(width: 10),
                    Expanded(child: Text(note, style: const TextStyle(fontSize: 13.5, color: Color(0xFF0F172A)))),
                  ],
                ),
              )),
      ],
    );
  }

  // 5. DOCUMENTS TAB
  Widget _buildDocumentsTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.folder_open_rounded, size: 48, color: Color(0xFFCBD5E1)),
          SizedBox(height: 12),
          Text('No documents attached to this lead.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  // Action Tile Helper
  Widget _buildActionTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color iconColor = const Color(0xFF2563EB),
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF0F7FF),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(height: 6),
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Metric Box Helper
  Widget _buildMetricTile(String value, String title) {
    return Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  // Persistent Bottom Action Bar (Matches User Screenshot)
  Widget _buildBottomActionBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildBottomNavItem(
            icon: Icons.ssid_chart_rounded,
            label: 'ADD ACTIVITY',
            onTap: _makeCall,
          ),
          _buildBottomNavItem(
            icon: Icons.note_add_outlined,
            label: 'ADD TASK',
            onTap: _addNoteModal,
          ),
          _buildBottomNavItem(
            icon: Icons.post_add_rounded,
            label: 'ADD NOTE',
            onTap: _addNoteModal,
          ),
          _buildBottomNavItem(
            icon: Icons.keyboard_arrow_up_rounded,
            label: 'MORE',
            onTap: _openWhatsApp,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 22, color: const Color(0xFF334155)),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
          ),
        ],
      ),
    );
  }
}

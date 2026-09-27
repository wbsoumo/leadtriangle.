import 'package:flutter/material.dart';
import '../models/lead_model.dart';
import '../services/api_service.dart';
import '../services/telephony_service.dart';
import 'lead_detail_screen.dart';
import 'call_outcome_modal.dart';

class LeadsListScreen extends StatefulWidget {
  const LeadsListScreen({super.key});

  @override
  State<LeadsListScreen> createState() => _LeadsListScreenState();
}

class _LeadsListScreenState extends State<LeadsListScreen> {
  final ApiService _apiService = ApiService();
  final TelephonyService _telephonyService = TelephonyService();

  List<LeadModel> _allLeads = [];
  List<LeadModel> _filteredLeads = [];
  bool _isLoading = true;

  String _selectedTopPill = 'to_call'; // 'to_call', 'followups', 'called', 'all'
  String _searchQuery = '';
  String _selectedStatusFilter = 'All';
  String _selectedFollowupFilter = 'All';
  String _selectedPriorityFilter = 'All';
  String _sortOption = 'newest';

  final Set<int> _starredLeadIds = {};

  @override
  void initState() {
    super.initState();
    _fetchLeadsData();
  }

  Future<void> _fetchLeadsData() async {
    setState(() => _isLoading = true);
    final leads = await _apiService.fetchLeads(filter: 'all');
    setState(() {
      _allLeads = leads;
      _applyFilters();
      _isLoading = false;
    });
  }

  void _applyFilters() {
    List<LeadModel> temp = List.from(_allLeads);

    // Top Workload Pill Filter
    if (_selectedTopPill == 'to_call') {
      temp = temp.where((l) => l.statusName != 'Converted' && l.statusName != 'Lost').toList();
    } else if (_selectedTopPill == 'followups') {
      temp = temp.where((l) => l.statusName.contains('Follow-up') || l.statusName == 'Contacted').toList();
    } else if (_selectedTopPill == 'called') {
      temp = temp.where((l) => l.statusName != 'New' && l.statusName != 'Fresh Lead').toList();
    }

    // Search Query Filter
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      temp = temp.where((l) =>
        l.name.toLowerCase().contains(q) ||
        l.mobile.contains(q) ||
        (l.companyName ?? '').toLowerCase().contains(q) ||
        l.leadCode.toLowerCase().contains(q)
      ).toList();
    }

    // Detailed Modal Filters
    if (_selectedStatusFilter != 'All') {
      temp = temp.where((l) => l.statusName.toLowerCase() == _selectedStatusFilter.toLowerCase()).toList();
    }
    if (_selectedPriorityFilter != 'All') {
      temp = temp.where((l) => l.priority.toLowerCase() == _selectedPriorityFilter.toLowerCase()).toList();
    }

    // Sorting
    if (_sortOption == 'newest') {
      temp.sort((a, b) => b.id.compareTo(a.id));
    } else if (_sortOption == 'oldest') {
      temp.sort((a, b) => a.id.compareTo(b.id));
    }

    setState(() {
      _filteredLeads = temp;
    });
  }

  Future<void> _makeCall(LeadModel lead) async {
    final session = await _telephonyService.initiateLeadCall(
      leadId: lead.id,
      phoneNumber: lead.mobile,
    );

    if (session != null && mounted) {
      final updated = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => CallOutcomeModal(
          leadId: lead.id,
          leadName: lead.name,
          phone: lead.mobile,
          durationSeconds: session.durationInSeconds,
        ),
      );

      if (updated == true) {
        _fetchLeadsData();
      }
    }
  }

  Future<void> _openWhatsApp(String mobile) async {
    final ok = await _telephonyService.openWhatsApp(mobile);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('WhatsApp application could not be opened.')),
      );
    }
  }

  void _openFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              padding: const EdgeInsets.only(left: 20, right: 20, top: 12, bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag handle indicator
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Filter Leads',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF0F172A), size: 24),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Lead Status Section
                          _buildFilterTitle('Lead Status'),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              'All', 'New', 'Follow-up', 'Contacted', 'Interested', 
                              'Not Interested', 'Qualified', 'Converted', 'Lost', 'Pending'
                            ].map((st) => _buildFilterChip(
                              label: st,
                              isSelected: _selectedStatusFilter == st,
                              onTap: () {
                                setModalState(() => _selectedStatusFilter = st);
                              },
                            )).toList(),
                          ),
                          const SizedBox(height: 20),

                          // Follow-up Section
                          _buildFilterTitle('Follow-up'),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              'All', 'Today', 'Tomorrow', 'Overdue', 'No Follow-up'
                            ].map((fu) => _buildFilterChip(
                              label: fu,
                              isSelected: _selectedFollowupFilter == fu,
                              onTap: () {
                                setModalState(() => _selectedFollowupFilter = fu);
                              },
                            )).toList(),
                          ),
                          const SizedBox(height: 20),

                          // Priority Section
                          _buildFilterTitle('Priority'),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: ['All', 'High', 'Medium', 'Low'].map((pr) => _buildFilterChip(
                              label: pr,
                              isSelected: _selectedPriorityFilter == pr,
                              onTap: () {
                                setModalState(() => _selectedPriorityFilter = pr);
                              },
                            )).toList(),
                          ),
                          const SizedBox(height: 20),

                          // Service Interested Dropdown
                          _buildFilterTitle('Service Interested'),
                          _buildDropdownPicker('Select Service'),
                          const SizedBox(height: 16),

                          // Lead Source Dropdown
                          _buildFilterTitle('Lead Source'),
                          _buildDropdownPicker('Select Source'),
                          const SizedBox(height: 16),

                          // Assigned To Dropdown
                          _buildFilterTitle('Assigned To'),
                          _buildDropdownPicker('Select Operation Executive'),
                          const SizedBox(height: 16),

                          // Date Range Dropdown
                          _buildFilterTitle('Date Range'),
                          _buildDropdownPicker('Select Date Range', icon: Icons.calendar_today_outlined),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setModalState(() {
                              _selectedStatusFilter = 'All';
                              _selectedFollowupFilter = 'All';
                              _selectedPriorityFilter = 'All';
                            });
                            setState(() {
                              _selectedStatusFilter = 'All';
                              _selectedFollowupFilter = 'All';
                              _selectedPriorityFilter = 'All';
                              _applyFilters();
                            });
                            Navigator.of(ctx).pop();
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Reset', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _applyFilters();
                            });
                            Navigator.of(ctx).pop();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Apply Filter', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildFilterTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(text, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
    );
  }

  Widget _buildFilterChip({required String label, required bool isSelected, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildDropdownPicker(String placeholder, {IconData icon = Icons.keyboard_arrow_down_rounded}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(placeholder, style: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500)),
          Icon(icon, color: const Color(0xFF64748B), size: 20),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Calculate counts for top pills
    final toCallCount = _allLeads.where((l) => l.statusName != 'Converted' && l.statusName != 'Lost').length;
    final followupsCount = _allLeads.where((l) => l.statusName.contains('Follow-up') || l.statusName == 'Contacted').length;
    final calledCount = _allLeads.where((l) => l.statusName != 'New' && l.statusName != 'Fresh Lead').length;
    final totalCount = _allLeads.length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar: Title "Leads" + Search & Filter Icons (Requirement Screenshot 1)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Leads',
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.search_rounded, color: Color(0xFF0F172A), size: 26),
                        onPressed: () {},
                      ),
                      IconButton(
                        icon: const Icon(Icons.tune_rounded, color: Color(0xFF0F172A), size: 24),
                        onPressed: _openFilterBottomSheet,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Top Workload Count Horizontal Pills
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  _buildTopCountPill('To Call', toCallCount > 0 ? toCallCount : 16, 'to_call'),
                  const SizedBox(width: 8),
                  _buildTopCountPill('Follow-ups', followupsCount > 0 ? followupsCount : 8, 'followups'),
                  const SizedBox(width: 8),
                  _buildTopCountPill('Called', calledCount > 0 ? calledCount : 8, 'called'),
                  const SizedBox(width: 8),
                  _buildTopCountPill('All', totalCount > 0 ? totalCount : 32, 'all'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Search Bar Input Box
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: TextField(
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                      _applyFilters();
                    });
                  },
                  decoration: const InputDecoration(
                    hintText: 'Search by name, phone, company...',
                    hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13.5),
                    prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 20),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Sort Selector Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Text('Sort by: ', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                      Text('Follow-up Time ⬇', style: TextStyle(fontSize: 12.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w800)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.swap_vert_rounded, size: 14, color: Color(0xFF475569)),
                        SizedBox(width: 4),
                        Text('Newest', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Leads List Area
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchLeadsData,
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                    : _filteredLeads.isEmpty
                        ? const Center(
                            child: Text('No leads found matching criteria.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16.0),
                            itemCount: _filteredLeads.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 14),
                            itemBuilder: (context, index) {
                              final lead = _filteredLeads[index];
                              return _buildLeadItemCard(lead, index);
                            },
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Top Horizontally Scrollable Pill Widget
  Widget _buildTopCountPill(String title, int count, String pillKey) {
    final isSelected = _selectedTopPill == pillKey;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedTopPill = pillKey;
          _applyFilters();
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '$count',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: isSelected ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Lead Card Component Matching Reference UI Screenshot Exactly
  Widget _buildLeadItemCard(LeadModel lead, int index) {
    final avatarColors = [
      const Color(0xFFE0F2FE), // Cyan
      const Color(0xFFF3E8FF), // Purple
      const Color(0xFFFFEDD5), // Orange
      const Color(0xFFDCFCE7), // Green
      const Color(0xFFFCE7F3), // Pink
    ];
    final textColors = [
      const Color(0xFF0284C7),
      const Color(0xFF7E22CE),
      const Color(0xFFC2410C),
      const Color(0xFF15803D),
      const Color(0xFFBE185D),
    ];

    final colorIdx = index % avatarColors.length;
    final isStarred = _starredLeadIds.contains(lead.id);

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => LeadDetailScreen(lead: lead)),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: const [
            BoxShadow(color: Color(0x060F172A), blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Avatar, Name, Company & Star Icon
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: avatarColors[colorIdx],
                  child: Text(
                    _getInitials(lead.name),
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: textColors[colorIdx]),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lead.name,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '+91 ${lead.mobile}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        lead.companyName ?? lead.city ?? 'ABC Private Limited',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    isStarred ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: isStarred ? const Color(0xFFEAB308) : const Color(0xFFCBD5E1),
                    size: 22,
                  ),
                  onPressed: () {
                    setState(() {
                      if (isStarred) {
                        _starredLeadIds.remove(lead.id);
                      } else {
                        _starredLeadIds.add(lead.id);
                      }
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Tag Pills Row (Status & Priority)
            Row(
              children: [
                _buildTagPill(
                  label: lead.statusName.isNotEmpty ? lead.statusName : 'Follow-up Today',
                  icon: Icons.access_time_rounded,
                  bgColor: const Color(0xFFFEF2F2),
                  textColor: const Color(0xFFEF4444),
                ),
                const SizedBox(width: 8),
                _buildTagPill(
                  label: '${lead.priority} Priority',
                  bgColor: const Color(0xFFEFF6FF),
                  textColor: const Color(0xFF2563EB),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Time Row: Calendar + Today, 10:30 AM
            Row(
              children: const [
                Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFF94A3B8)),
                SizedBox(width: 6),
                Text('Today, 10:30 AM', style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
              ],
            ),
            const SizedBox(height: 14),

            // Call & WhatsApp Action Buttons Row (Matching Reference Screenshot)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _makeCall(lead),
                    icon: const Icon(Icons.phone_rounded, size: 16, color: Colors.white),
                    label: const Text('Call', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _openWhatsApp(lead.mobile),
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Color(0xFF16A34A)),
                    label: const Text('WhatsApp', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF16A34A))),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDCFCE7),
                      foregroundColor: const Color(0xFF16A34A),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTagPill({
    required String label,
    IconData? icon,
    required Color bgColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: textColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textColor),
          ),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return 'LD';
  }
}

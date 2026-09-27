import 'package:flutter/material.dart';
import '../models/lead_model.dart';
import '../services/api_service.dart';
import '../services/telephony_service.dart';
import 'lead_detail_screen.dart';
import 'home_tab_screen.dart';
import 'leads_list_screen.dart';
import 'call_outcome_modal.dart';
import 'followups_screen.dart';
import 'profile_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = [
    const HomeTabScreen(),
    const LeadsListScreen(),
    const FollowupsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (idx) => setState(() => _currentIndex = idx),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF2563EB),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11.5),
          items: const [
            BottomNavigationBarViewItem(icon: Icon(Icons.home_outlined), label: 'Home'),
            BottomNavigationBarViewItem(icon: Icon(Icons.people_alt_outlined), label: 'Leads'),
            BottomNavigationBarViewItem(icon: Icon(Icons.calendar_today_outlined), label: 'Follow-ups'),
            BottomNavigationBarViewItem(icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
          ],
        ),
      ),
    );
  }
}

class BottomNavigationBarViewItem extends BottomNavigationBarItem {
  const BottomNavigationBarViewItem({required super.icon, required super.label});
}

class HomeCallingTab extends StatefulWidget {
  const HomeCallingTab({super.key});

  @override
  State<HomeCallingTab> createState() => _HomeCallingTabState();
}

class _HomeCallingTabState extends State<HomeCallingTab> {
  final ApiService _apiService = ApiService();
  final TelephonyService _telephonyService = TelephonyService();

  List<LeadModel> _leads = [];
  bool _isLoading = true;
  String _selectedFilter = 'all';

  final List<String> _filters = [
    'all',
    'fresh',
    'followups',
    'connected',
    'not_connected',
    'interested',
    'not_interested',
    'qualified',
    'converted',
    'pending'
  ];

  @override
  void initState() {
    super.initState();
    _loadLeads();
  }

  Future<void> _loadLeads() async {
    setState(() => _isLoading = true);
    final leads = await _apiService.fetchLeads(filter: _selectedFilter);
    setState(() {
      _leads = leads;
      _isLoading = false;
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
        _loadLeads();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('LeadTriangle Ops', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
            Text('Today\'s Workload Queue', style: TextStyle(color: Color(0xFF64748B), fontSize: 11.5, fontWeight: FontWeight.w500)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _loadLeads,
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF2563EB)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Scrollable Bar (Requirement 5)
          Container(
            height: 54,
            padding: const EdgeInsets.symmetric(vertical: 8),
            color: Colors.white,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filter = _filters[index];
                final isSelected = _selectedFilter == filter;
                return ChoiceChip(
                  label: Text(
                    filter.replaceAll('_', ' ').toUpperCase(),
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? Colors.white : const Color(0xFF475569),
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: const Color(0xFF2563EB),
                  backgroundColor: const Color(0xFFF1F5F9),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedFilter = filter);
                      _loadLeads();
                    }
                  },
                );
              },
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Main Leads List View
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadLeads,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                  : _leads.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.assignment_turned_in_rounded, size: 48, color: Color(0xFFCBD5E1)),
                              SizedBox(height: 12),
                              Text('No leads requiring action right now.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _leads.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 14),
                          itemBuilder: (context, index) {
                            final lead = _leads[index];
                            return InkWell(
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => LeadDetailScreen(lead: lead)),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  boxShadow: const [
                                    BoxShadow(color: Color(0x0A0F172A), blurRadius: 8, offset: Offset(0, 2)),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          lead.leadCode,
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEFF6FF),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            lead.statusName,
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      lead.name,
                                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      lead.serviceName ?? 'BPO Telecalling Service',
                                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                    ),
                                    const SizedBox(height: 14),

                                    // Action Buttons: CALL & WHATSAPP (Requirement 3)
                                    Row(
                                      children: [
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () => _makeCall(lead),
                                            icon: const Icon(Icons.phone_rounded, size: 16, color: Colors.white),
                                            label: const Text('CALL NOW', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: const Color(0xFF2563EB),
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(vertical: 11),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              elevation: 0,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _openWhatsApp(lead.mobile),
                                            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Color(0xFF16A34A)),
                                            label: const Text('WHATSAPP', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF16A34A))),
                                            style: OutlinedButton.styleFrom(
                                              side: const BorderSide(color: Color(0xFF16A34A), width: 1.5),
                                              padding: const EdgeInsets.symmetric(vertical: 11),
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
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

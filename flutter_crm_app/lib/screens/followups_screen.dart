import 'package:flutter/material.dart';
import '../models/lead_model.dart';
import '../services/api_service.dart';
import 'lead_detail_screen.dart';

class FollowupsScreen extends StatefulWidget {
  const FollowupsScreen({super.key});

  @override
  State<FollowupsScreen> createState() => _FollowupsScreenState();
}

class _FollowupsScreenState extends State<FollowupsScreen> {
  final ApiService _apiService = ApiService();
  List<LeadModel> _followupLeads = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFollowups();
  }

  Future<void> _loadFollowups() async {
    setState(() => _isLoading = true);
    final leads = await _apiService.fetchLeads(filter: 'followups');
    setState(() {
      _followupLeads = leads;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('Today\'s Follow-ups Queue', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.extrabold)),
      ),
      body: RefreshIndicator(
        onRefresh: _loadFollowups,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
            : _followupLeads.isEmpty
                ? const Center(
                    child: Text('No pending follow-ups for today.', style: TextStyle(color: Color(0xFF64748B), fontSize: 15)),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _followupLeads.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final lead = _followupLeads[index];
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF7ED),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.access_time_filled_rounded, color: Color(0xFFEA580C)),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(lead.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
                                  const SizedBox(height: 2),
                                  Text(lead.mobile, style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w600, fontSize: 13)),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => LeadDetailScreen(lead: lead)),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Action'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

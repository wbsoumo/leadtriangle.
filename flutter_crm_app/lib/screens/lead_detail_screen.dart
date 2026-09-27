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

class _LeadDetailScreenState extends State<LeadDetailScreen> {
  final ApiService _apiService = ApiService();
  final TelephonyService _telephonyService = TelephonyService();

  List<CallLogModel> _callLogs = [];
  bool _isLoadingLogs = true;

  @override
  void initState() {
    super.initState();
    _loadLogs();
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
        const SnackBar(content: Text('Could not launch WhatsApp. Ensure it is installed.')),
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
        title: Text(widget.lead.leadCode, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Lead Main Info Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [BoxShadow(color: Color(0x0A0F172A), blurRadius: 10, offset: Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.lead.name,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Text(
                          widget.lead.statusName,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.lead.companyName ?? widget.lead.city ?? 'Individual Prospect',
                    style: const TextStyle(fontSize: 13.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.phone_outlined, size: 18, color: Color(0xFF64748B)),
                      const SizedBox(width: 8),
                      Text(widget.lead.mobile, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.business_center_outlined, size: 18, color: Color(0xFF64748B)),
                      const SizedBox(width: 8),
                      Text(widget.lead.serviceName ?? 'BPO Telecalling', style: const TextStyle(fontSize: 13.5, color: Color(0xFF475569))),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Prominent Action Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _makeCall,
                    icon: const Icon(Icons.phone_rounded, color: Colors.white, size: 18),
                    label: const Text('Call Now', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _openWhatsApp,
                    icon: const Icon(Icons.chat_bubble_rounded, color: Colors.white, size: 18),
                    label: const Text('WhatsApp', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Call Timeline Section (Requirement 9 & 12)
            const Text(
              'Call History & Activity Timeline',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 14),

            if (_isLoadingLogs)
              const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
            else if (_callLogs.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Text('No prior call logs recorded for this lead.', style: TextStyle(color: Color(0xFF64748B))),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
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
                                const SizedBox(width: 6),
                                Text(
                                  log.calledAt,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                log.outcomeName,
                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Duration: ${log.formattedDuration}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                        if (log.remarks.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Remark: ${log.remarks}',
                            style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

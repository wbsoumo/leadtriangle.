import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CallOutcomeModal extends StatefulWidget {
  final int leadId;
  final String leadName;
  final String phone;
  final int durationSeconds;
  final int currentStatusId;

  const CallOutcomeModal({
    super.key,
    required this.leadId,
    required this.leadName,
    required this.phone,
    required this.durationSeconds,
    this.currentStatusId = 1,
  });

  @override
  State<CallOutcomeModal> createState() => _CallOutcomeModalState();
}

class _CallOutcomeModalState extends State<CallOutcomeModal> {
  final ApiService _apiService = ApiService();
  final _remarksController = TextEditingController();
  final _meetingTitleController = TextEditingController();
  final _meetingLinkController = TextEditingController();
  final _followupPurposeController = TextEditingController();

  int _selectedOutcomeId = 1; // Default Connected
  late int _selectedStatusId;

  // Interested Sub-branch: 'followup' or 'meeting'
  String _interestedAction = 'followup';

  // Not Interested Sub-branch
  String? _disqualificationReason;

  // Follow-up Scheduling
  bool _scheduleFollowup = false;
  DateTime _followupDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _followupTime = const TimeOfDay(hour: 11, minute: 0);

  // Meeting Scheduling
  DateTime _meetingDate = DateTime.now().add(const Duration(days: 2));
  TimeOfDay _meetingTime = const TimeOfDay(hour: 15, minute: 0);
  String _meetingMode = 'Google Meet';

  bool _isSaving = false;

  final List<Map<String, dynamic>> _outcomes = [
    {'id': 1, 'name': 'Call Connected', 'color': const Color(0xFF10B981)},
    {'id': 3, 'name': 'Interested', 'color': const Color(0xFF2563EB)},
    {'id': 6, 'name': 'Follow-up Needed', 'color': const Color(0xFFF59E0B)},
    {'id': 4, 'name': 'Ringing / No Answer', 'color': const Color(0xFFEAB308)},
    {'id': 7, 'name': 'Not Interested', 'color': const Color(0xFFDC2626)},
    {'id': 8, 'name': 'Invalid / Wrong No.', 'color': const Color(0xFF6B7280)},
  ];

  final List<Map<String, dynamic>> _leadStatuses = [
    {'id': 1, 'name': 'New Lead', 'color': Color(0xFF3B82F6)},
    {'id': 4, 'name': 'Contacting', 'color': Color(0xFF06B6D4)},
    {'id': 6, 'name': 'Follow-up Required', 'color': Color(0xFFF59E0B)},
    {'id': 7, 'name': 'Meeting Scheduled', 'color': Color(0xFF8B5CF6)},
    {'id': 8, 'name': 'Qualified Lead', 'color': Color(0xFF10B981)},
    {'id': 13, 'name': 'Not Interested', 'color': Color(0xFF6B7280)},
    {'id': 14, 'name': 'Invalid / Unreachable', 'color': Color(0xFFEF4444)},
  ];

  final List<String> _disqualificationReasons = [
    'Budget Constraint / Too Expensive',
    'Not Required Currently / Bad Timing',
    'Already Using Competitor Product',
    'Not Decision Maker / Wrong Profile',
    'Missing Required Features',
    'No Budget Allocated',
    'Other / Non-Responsive',
  ];

  @override
  void initState() {
    super.initState();
    _selectedStatusId = widget.currentStatusId > 0 ? widget.currentStatusId : 1;
    _meetingTitleController.text = 'Product Demo • ${widget.leadName}';
    _followupPurposeController.text = 'Follow-up discussion & quote review';
    _onOutcomeChanged(1);
  }

  @override
  void dispose() {
    _remarksController.dispose();
    _meetingTitleController.dispose();
    _meetingLinkController.dispose();
    _followupPurposeController.dispose();
    super.dispose();
  }

  void _onOutcomeChanged(int outcomeId) {
    setState(() {
      _selectedOutcomeId = outcomeId;
      if (outcomeId == 3) {
        // Interested
        _scheduleFollowup = true;
        _selectedStatusId = _interestedAction == 'meeting' ? 7 : 6;
      } else if (outcomeId == 7) {
        // Not Interested
        _selectedStatusId = 13;
        _disqualificationReason ??= _disqualificationReasons.first;
      } else if (outcomeId == 6 || outcomeId == 1) {
        // Connected or Followup
        _selectedStatusId = 6;
        _scheduleFollowup = (outcomeId == 6);
      } else if (outcomeId == 4) {
        // Ringing
        _selectedStatusId = 4;
      } else if (outcomeId == 8) {
        // Invalid
        _selectedStatusId = 14;
      }
    });
  }

  String get _formattedDuration {
    final m = widget.durationSeconds ~/ 60;
    final s = widget.durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _saveOutcome() async {
    if (_remarksController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter call discussion remarks.')),
      );
      return;
    }

    setState(() => _isSaving = true);

    final fDate = '${_followupDate.year}-${_followupDate.month.toString().padLeft(2, '0')}-${_followupDate.day.toString().padLeft(2, '0')}';
    final fTime = '${_followupTime.hour.toString().padLeft(2, '0')}:${_followupTime.minute.toString().padLeft(2, '0')}:00';

    final mDate = '${_meetingDate.year}-${_meetingDate.month.toString().padLeft(2, '0')}-${_meetingDate.day.toString().padLeft(2, '0')}';
    final mTime = '${_meetingTime.hour.toString().padLeft(2, '0')}:${_meetingTime.minute.toString().padLeft(2, '0')}:00';
    final meetingDtCombined = '${mDate}T$mTime';

    final isMeeting = _selectedOutcomeId == 3 && _interestedAction == 'meeting';
    final isFollowup = _scheduleFollowup || (_selectedOutcomeId == 3 && _interestedAction == 'followup') || _selectedOutcomeId == 6;

    final success = await _apiService.logCallOutcome(
      leadId: widget.leadId,
      callOutcomeId: _selectedOutcomeId,
      durationSeconds: widget.durationSeconds,
      remarks: _remarksController.text.trim(),
      statusId: _selectedStatusId,
      disqualificationReason: _selectedOutcomeId == 7 ? _disqualificationReason : null,
      scheduleFollowup: isFollowup,
      followupDate: fDate,
      followupTime: fTime,
      followupPurpose: _followupPurposeController.text.trim(),
      scheduleMeeting: isMeeting,
      meetingDatetime: isMeeting ? meetingDtCombined : null,
      meetingTitle: isMeeting ? _meetingTitleController.text.trim() : null,
      meetingMode: isMeeting ? _meetingMode : null,
      meetingLink: isMeeting ? _meetingLinkController.text.trim() : null,
    );

    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Call log & lead status updated successfully!'),
            backgroundColor: Color(0xFF16A34A),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update call log. Please try again.'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        padding: EdgeInsets.only(
          top: 16,
          left: 20,
          right: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.phone_in_talk_rounded, color: Color(0xFF2563EB), size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.leadName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        '${widget.phone} • Duration: $_formattedDuration',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(false),
                icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
              ),
            ],
          ),
          const Divider(height: 20),

          // Scrollable Content
          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Call Outcome Chips
                  const Text(
                    'Call Outcome *',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _outcomes.map((item) {
                      final isSelected = _selectedOutcomeId == item['id'];
                      final color = item['color'] as Color;
                      return ChoiceChip(
                        label: Text(item['name']),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : color,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                        selected: isSelected,
                        selectedColor: color,
                        backgroundColor: color.withOpacity(0.08),
                        side: BorderSide(color: isSelected ? color : color.withOpacity(0.3)),
                        onSelected: (val) {
                          if (val) _onOutcomeChanged(item['id'] as int);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // 2. Branch: Interested -> Schedule Follow-up OR Meeting
                  if (_selectedOutcomeId == 3) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.star_rounded, color: Color(0xFF16A34A), size: 18),
                              SizedBox(width: 6),
                              Text(
                                'Interested Lead Action',
                                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF15803D)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() {
                                    _interestedAction = 'followup';
                                    _selectedStatusId = 6;
                                  }),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: _interestedAction == 'followup' ? const Color(0xFF16A34A) : Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF16A34A)),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      'Schedule Follow-up',
                                      style: TextStyle(
                                        color: _interestedAction == 'followup' ? Colors.white : const Color(0xFF16A34A),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() {
                                    _interestedAction = 'meeting';
                                    _selectedStatusId = 7;
                                  }),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: _interestedAction == 'meeting' ? const Color(0xFF16A34A) : Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF16A34A)),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      'Schedule Meeting',
                                      style: TextStyle(
                                        color: _interestedAction == 'meeting' ? Colors.white : const Color(0xFF16A34A),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          if (_interestedAction == 'meeting') ...[
                            TextField(
                              controller: _meetingTitleController,
                              style: const TextStyle(fontSize: 13),
                              decoration: const InputDecoration(
                                labelText: 'Meeting Title *',
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () async {
                                      final picked = await showDatePicker(
                                        context: context,
                                        initialDate: _meetingDate,
                                        firstDate: DateTime.now(),
                                        lastDate: DateTime.now().add(const Duration(days: 90)),
                                      );
                                      if (picked != null) setState(() => _meetingDate = picked);
                                    },
                                    icon: const Icon(Icons.calendar_today_rounded, size: 14),
                                    label: Text('${_meetingDate.day}/${_meetingDate.month}/${_meetingDate.year}', style: const TextStyle(fontSize: 12)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: _meetingTime,
                                      );
                                      if (picked != null) setState(() => _meetingTime = picked);
                                    },
                                    icon: const Icon(Icons.access_time_rounded, size: 14),
                                    label: Text(_meetingTime.format(context), style: const TextStyle(fontSize: 12)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            DropdownButtonFormField<String>(
                              value: _meetingMode,
                              isDense: true,
                              style: const TextStyle(fontSize: 13, color: Colors.black),
                              decoration: const InputDecoration(labelText: 'Meeting Mode', border: OutlineInputBorder()),
                              items: const [
                                DropdownMenuItem(value: 'Google Meet', child: Text('Google Meet')),
                                DropdownMenuItem(value: 'Zoom', child: Text('Zoom')),
                                DropdownMenuItem(value: 'In-Person', child: Text('In-Person')),
                                DropdownMenuItem(value: 'Phone Call', child: Text('Phone Call')),
                              ],
                              onChanged: (v) => setState(() => _meetingMode = v ?? 'Google Meet'),
                            ),
                          ] else ...[
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () async {
                                      final picked = await showDatePicker(
                                        context: context,
                                        initialDate: _followupDate,
                                        firstDate: DateTime.now(),
                                        lastDate: DateTime.now().add(const Duration(days: 90)),
                                      );
                                      if (picked != null) setState(() => _followupDate = picked);
                                    },
                                    icon: const Icon(Icons.calendar_today_rounded, size: 14),
                                    label: Text('${_followupDate.day}/${_followupDate.month}/${_followupDate.year}', style: const TextStyle(fontSize: 12)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: _followupTime,
                                      );
                                      if (picked != null) setState(() => _followupTime = picked);
                                    },
                                    icon: const Icon(Icons.access_time_rounded, size: 14),
                                    label: Text(_followupTime.format(context), style: const TextStyle(fontSize: 12)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _followupPurposeController,
                              style: const TextStyle(fontSize: 13),
                              decoration: const InputDecoration(
                                labelText: 'Follow-up Purpose',
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 3. Branch: Not Interested -> Disqualification Reason
                  if (_selectedOutcomeId == 7) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.cancel_rounded, color: Color(0xFFDC2626), size: 18),
                              SizedBox(width: 6),
                              Text(
                                'Disqualification Reason *',
                                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFFDC2626)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          DropdownButtonFormField<String>(
                            value: _disqualificationReason ?? _disqualificationReasons.first,
                            isExpanded: true,
                            isDense: true,
                            style: const TextStyle(fontSize: 12.5, color: Color(0xFF1E293B)),
                            decoration: const InputDecoration(border: OutlineInputBorder(), fillColor: Colors.white, filled: true),
                            items: _disqualificationReasons
                                .map((r) => DropdownMenuItem(value: r, child: Text(r, overflow: TextOverflow.ellipsis)))
                                .toList(),
                            onChanged: (v) => setState(() => _disqualificationReason = v),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 4. Branch: Standard Follow-up Option for Connected / Callback
                  if (_selectedOutcomeId != 3 && _selectedOutcomeId != 7) ...[
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Schedule Next Follow-up', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                      subtitle: const Text('Add date & time reminder', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                      value: _scheduleFollowup,
                      activeColor: const Color(0xFF2563EB),
                      onChanged: (val) => setState(() => _scheduleFollowup = val),
                    ),
                    if (_scheduleFollowup) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: _followupDate,
                                  firstDate: DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 90)),
                                );
                                if (picked != null) setState(() => _followupDate = picked);
                              },
                              icon: const Icon(Icons.calendar_today_rounded, size: 14),
                              label: Text('${_followupDate.day}/${_followupDate.month}/${_followupDate.year}', style: const TextStyle(fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final picked = await showTimePicker(
                                  context: context,
                                  initialTime: _followupTime,
                                );
                                if (picked != null) setState(() => _followupTime = picked);
                              },
                              icon: const Icon(Icons.access_time_rounded, size: 14),
                              label: Text(_followupTime.format(context), style: const TextStyle(fontSize: 12)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                    ],
                  ],

                  // 5. UPDATE LEAD STATUS (Web-Parity Lead Status Selector)
                  const Text(
                    'Update Lead Status *',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _selectedStatusId,
                        isExpanded: true,
                        icon: const Icon(Icons.arrow_drop_down_rounded, color: Color(0xFF2563EB)),
                        items: _leadStatuses.map((st) {
                          final color = st['color'] as Color;
                          return DropdownMenuItem<int>(
                            value: st['id'] as int,
                            child: Row(
                              children: [
                                Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                const SizedBox(width: 8),
                                Text(
                                  st['name'] as String,
                                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: color),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedStatusId = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 6. Discussion Remarks
                  const Text(
                    'Discussion Remarks *',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _remarksController,
                    maxLines: 3,
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Enter notes, client feedback, discussion summary...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Bottom Action Buttons
          Row(
            children: [
              Expanded(
                flex: 1,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : _saveOutcome,
                  icon: _isSaving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check_circle_outline_rounded, size: 18),
                  label: Text(_isSaving ? 'Saving...' : 'Save Remarks & Status'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
}

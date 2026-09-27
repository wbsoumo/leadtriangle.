import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CallOutcomeModal extends StatefulWidget {
  final int leadId;
  final String leadName;
  final String phone;
  final int durationSeconds;

  const CallOutcomeModal({
    super.key,
    required this.leadId,
    required this.leadName,
    required this.phone,
    required this.durationSeconds,
  });

  @override
  State<CallOutcomeModal> createState() => _CallOutcomeModalState();
}

class _CallOutcomeModalState extends State<CallOutcomeModal> {
  final ApiService _apiService = ApiService();
  final _remarksController = TextEditingController();
  
  int _selectedOutcomeId = 1; // Default Connected
  bool _scheduleFollowup = false;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 10, minute: 30);
  bool _isSaving = false;

  final List<Map<String, dynamic>> _outcomes = [
    {'id': 1, 'name': 'Connected', 'color': Color(0xFF16A34A)},
    {'id': 2, 'name': 'Not Connected', 'color': Color(0xFFEF4444)},
    {'id': 3, 'name': 'Qualified / Interested', 'color': Color(0xFF2563EB)},
    {'id': 4, 'name': 'Busy / Line Busy', 'color': Color(0xFFF97316)},
    {'id': 5, 'name': 'No Answer', 'color': Color(0xFF64748B)},
    {'id': 6, 'name': 'Call Back Requested', 'color': Color(0xFF9333EA)},
    {'id': 7, 'name': 'Not Interested', 'color': Color(0xFFDC2626)},
    {'id': 8, 'name': 'Wrong Number', 'color': Color(0xFF94A3B8)},
  ];

  String get _formattedDuration {
    final m = widget.durationSeconds ~/ 60;
    final s = widget.durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _saveOutcome() async {
    setState(() => _isSaving = true);

    final fDate = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
    final fTime = '${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}:00';

    final success = await _apiService.logCallOutcome(
      leadId: widget.leadId,
      callOutcomeId: _selectedOutcomeId,
      durationSeconds: widget.durationSeconds,
      remarks: _remarksController.text.trim(),
      scheduleFollowup: _scheduleFollowup,
      followupDate: fDate,
      followupTime: fTime,
      followupPurpose: 'Scheduled Follow-up Call',
    );

    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Call log & outcome updated!'), backgroundColor: Color(0xFF16A34A)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update call log.'), backgroundColor: Color(0xFFEF4444)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Call Ended • Outcome & Remarks',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.leadName} (${widget.phone}) • Duration: $_formattedDuration',
                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Select Call Outcome:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _outcomes.map((item) {
                final isSelected = _selectedOutcomeId == item['id'];
                final color = item['color'] as Color;
                return ChoiceChip(
                  label: Text(
                    item['name'],
                    style: TextStyle(
                      color: isSelected ? Colors.white : color,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: color,
                  backgroundColor: color.withOpacity(0.1),
                  onSelected: (val) {
                    if (val) setState(() => _selectedOutcomeId = item['id']);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 18),
            const Text('Executive Remarks / Notes:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
            const SizedBox(height: 6),
            TextField(
              controller: _remarksController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Client requirement details, feedback or next steps...',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              ),
            ),
            const SizedBox(height: 14),
            SwitchListTile(
              title: const Text('Schedule Follow-up Call', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              subtitle: const Text('Add reminder for next call date & time', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              value: _scheduleFollowup,
              activeColor: const Color(0xFF2563EB),
              onChanged: (val) => setState(() => _scheduleFollowup = val),
            ),
            if (_scheduleFollowup) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 90)),
                        );
                        if (picked != null) setState(() => _selectedDate = picked);
                      },
                      icon: const Icon(Icons.calendar_today_rounded, size: 16),
                      label: Text('${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: _selectedTime,
                        );
                        if (picked != null) setState(() => _selectedTime = picked);
                      },
                      icon: const Icon(Icons.access_time_rounded, size: 16),
                      label: Text(_selectedTime.format(context)),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveOutcome,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: _isSaving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Save Outcome & Update Lead →', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:leadtriangle_crm_op_exec/models/lead_model.dart';
import 'package:leadtriangle_crm_op_exec/screens/lead_detail_screen.dart';
import 'package:leadtriangle_crm_op_exec/screens/call_outcome_modal.dart';

void main() {
  final testLead = LeadModel(
    id: 99,
    leadCode: 'L-999',
    name: 'Rahul Verma',
    mobile: '9876543210',
    email: 'rahul@test.com',
    companyName: 'Apex Logistics',
    statusName: 'New Lead',
    statusColor: '#3B82F6',
    priority: 'High',
  );

  testWidgets('LeadDetailScreen renders lead info and action buttons', (WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      home: LeadDetailScreen(lead: testLead),
    ));

    expect(find.text('Rahul Verma'), findsWidgets);
    expect(find.text('Call Client'), findsOneWidget);
    expect(find.text('Log Outcome'), findsOneWidget);
    expect(find.text('Change Status'), findsOneWidget);
  });

  testWidgets('CallOutcomeModal renders outcome and lead status options', (WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: CallOutcomeModal(
          leadId: 99,
          leadName: 'Rahul Verma',
          phone: '9876543210',
          durationSeconds: 85,
          currentStatusId: 1,
        ),
      ),
    ));

    expect(find.text('Call Outcome *'), findsOneWidget);
    expect(find.text('Update Lead Status *'), findsOneWidget);
    expect(find.text('Save Remarks & Status'), findsOneWidget);
  });
}

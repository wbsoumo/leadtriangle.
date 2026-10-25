import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:leadtriangle_crm_op_exec/screens/home_dashboard_screen.dart';

void main() {
  testWidgets('Smoke test HomeDashboardScreen tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: HomeDashboardScreen(),
    ));
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Leads'), findsWidgets);
  });
}

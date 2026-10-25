import 'package:flutter/material.dart';
import 'leads_list_screen.dart';

class FreshLeadsScreen extends StatelessWidget {
  const FreshLeadsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: LeadsListScreen(initialFilterPill: 'to_call'),
    );
  }
}

import 'package:flutter/material.dart';
import 'leads_list_screen.dart';

class FollowupsScreen extends StatelessWidget {
  const FollowupsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: LeadsListScreen(initialFilterPill: 'followups'),
    );
  }
}

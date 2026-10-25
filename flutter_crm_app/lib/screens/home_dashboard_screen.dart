import 'package:flutter/material.dart';
import 'home_tab_screen.dart';
import 'leads_list_screen.dart';
import 'activity_screen.dart';
import 'profile_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      HomeTabScreen(onNavigateToLeads: () => setState(() => _currentIndex = 1)),
      const LeadsListScreen(),
      const ActivityScreen(),
      const ProfileScreen(),
    ];

    // Responsive Desktop / Mobile Layout Detection
    return LayoutBuilder(
      builder: (context, constraints) {
        final bool isDesktop = constraints.maxWidth >= 768;

        if (isDesktop) {
          // Desktop (macOS) layout with sleek NavigationRail
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: _currentIndex,
                  onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: Colors.white,
                  selectedIconTheme: const IconThemeData(color: Color(0xFF2563EB)),
                  unselectedIconTheme: const IconThemeData(color: Color(0xFF64748B)),
                  selectedLabelTextStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF2563EB)),
                  unselectedLabelTextStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11, color: Color(0xFF64748B)),
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 24),
                    ),
                  ),
                  destinations: const [
                    NavigationRailDestination(
                      icon: Icon(Icons.home_outlined),
                      selectedIcon: Icon(Icons.home_rounded),
                      label: Text('Home'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.people_alt_outlined),
                      selectedIcon: Icon(Icons.people_alt_rounded),
                      label: Text('Leads'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.access_time_rounded),
                      selectedIcon: Icon(Icons.access_time_filled_rounded),
                      label: Text('Activity'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.person_outline_rounded),
                      selectedIcon: Icon(Icons.person_rounded),
                      label: Text('Profile'),
                    ),
                  ],
                ),
                const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                Expanded(
                  child: IndexedStack(
                    index: _currentIndex,
                    children: tabs,
                  ),
                ),
              ],
            ),
          );
        }

        // Mobile layout with clean BottomNavigationBar
        return Scaffold(
          body: IndexedStack(
            index: _currentIndex,
            children: tabs,
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
              elevation: 0,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home_rounded), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.people_alt_outlined), activeIcon: Icon(Icons.people_alt_rounded), label: 'Leads'),
                BottomNavigationBarItem(icon: Icon(Icons.access_time_rounded), activeIcon: Icon(Icons.access_time_filled_rounded), label: 'Activity'),
                BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), activeIcon: Icon(Icons.person_rounded), label: 'Profile'),
              ],
            ),
          ),
        );
      },
    );
  }
}

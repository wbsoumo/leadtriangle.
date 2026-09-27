import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MyDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? userData;
  const MyDetailsScreen({super.key, this.userData});

  @override
  State<MyDetailsScreen> createState() => _MyDetailsScreenState();
}

class _MyDetailsScreenState extends State<MyDetailsScreen> {
  final ApiService _apiService = ApiService();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;

  bool _isLoading = false;
  String _roleDisplay = 'Operation Executive';
  String _teamName = 'Sales Team';

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.userData?['name'] ?? 'Ankit Sharma');
    _emailController = TextEditingController(text: widget.userData?['email'] ?? 'ankit.sharma@company.com');
    _phoneController = TextEditingController(text: widget.userData?['mobile'] ?? '+91 98765 43210');
    _roleDisplay = widget.userData?['role_display'] ?? widget.userData?['role_name'] ?? 'Operation Executive';
    _teamName = widget.userData?['team_name'] ?? 'Sales Team';

    _fetchLatestUserData();
  }

  Future<void> _fetchLatestUserData() async {
    final res = await _apiService.checkSession();
    if (res['success'] == true && res['data'] != null && res['data']['user'] != null) {
      final user = res['data']['user'];
      if (mounted) {
        setState(() {
          _nameController.text = user['name'] ?? _nameController.text;
          _emailController.text = user['email'] ?? _emailController.text;
          _phoneController.text = user['mobile'] ?? _phoneController.text;
          _roleDisplay = user['role_display'] ?? user['role_name'] ?? _roleDisplay;
          _teamName = user['team_name'] ?? _teamName;
        });
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final res = await _apiService.updateProfile(
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      mobile: _phoneController.text.trim(),
    );
    setState(() => _isLoading = false);

    if (mounted) {
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Profile updated successfully!'),
            backgroundColor: const Color(0xFF16A34A),
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Failed to update profile'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Details', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Center(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: const Color(0xFFDBEAFE),
                      child: Text(
                        _getInitials(_nameController.text),
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _roleDisplay,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _teamName,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              const Text('Personal Information', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
              const SizedBox(height: 14),

              // Name Input
              _buildTextField(
                controller: _nameController,
                label: 'Full Name',
                icon: Icons.person_outline_rounded,
                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter your name' : null,
              ),
              const SizedBox(height: 16),

              // Email Input
              _buildTextField(
                controller: _emailController,
                label: 'Email Address',
                icon: Icons.mail_outline_rounded,
                keyboardType: TextInputType.emailAddress,
                validator: (val) => val == null || !val.contains('@') ? 'Please enter a valid email' : null,
              ),
              const SizedBox(height: 16),

              // Mobile Input
              _buildTextField(
                controller: _phoneController,
                label: 'Mobile Number',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter your phone number' : null,
              ),
              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('Save Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
        decoration: InputDecoration(
          border: InputBorder.none,
          labelText: label,
          labelStyle: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
          prefixIcon: Icon(icon, color: const Color(0xFF2563EB), size: 20),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return 'AS';
  }
}

import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final ApiService _apiService = ApiService();
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _currentPassController = TextEditingController();
  final TextEditingController _newPassController = TextEditingController();
  final TextEditingController _confirmPassController = TextEditingController();

  bool _isLoading = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentPassController.dispose();
    _newPassController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  Future<void> _updatePassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final res = await _apiService.changePassword(
      currentPassword: _currentPassController.text,
      newPassword: _newPassController.text,
    );
    setState(() => _isLoading = false);

    if (mounted) {
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Password changed successfully!'),
            backgroundColor: const Color(0xFF16A34A),
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Failed to change password'),
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
        title: const Text('Change Password', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 18)),
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
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.lock_rounded, color: Color(0xFF9333EA), size: 28),
                    SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        'Ensure your account uses a strong password to maintain CRM call data security.',
                        style: TextStyle(fontSize: 13, color: Color(0xFF6B21A8), fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Current Password Input
              _buildPasswordField(
                controller: _currentPassController,
                label: 'Current Password',
                obscureText: _obscureCurrent,
                onToggleObscure: () => setState(() => _obscureCurrent = !_obscureCurrent),
                validator: (val) => val == null || val.isEmpty ? 'Please enter current password' : null,
              ),
              const SizedBox(height: 16),

              // New Password Input
              _buildPasswordField(
                controller: _newPassController,
                label: 'New Password',
                obscureText: _obscureNew,
                onToggleObscure: () => setState(() => _obscureNew = !_obscureNew),
                validator: (val) {
                  if (val == null || val.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Confirm New Password Input
              _buildPasswordField(
                controller: _confirmPassController,
                label: 'Confirm New Password',
                obscureText: _obscureConfirm,
                onToggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
                validator: (val) {
                  if (val != _newPassController.text) {
                    return 'Passwords do not match';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _updatePassword,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF9333EA),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('Update Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool obscureText,
    required VoidCallback onToggleObscure,
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
        obscureText: obscureText,
        validator: validator,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
        decoration: InputDecoration(
          border: InputBorder.none,
          labelText: label,
          labelStyle: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
          prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFF9333EA), size: 20),
          suffixIcon: IconButton(
            icon: Icon(obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: const Color(0xFF94A3B8), size: 20),
            onPressed: onToggleObscure,
          ),
        ),
      ),
    );
  }
}

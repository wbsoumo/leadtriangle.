import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/lead_model.dart';
import '../models/call_log_model.dart';

class ApiService {
  static const String baseUrl = 'http://leadtriangle.online/api';
  final storage = const FlutterSecureStorage();

  // Helper headers with cookies/session token
  Future<Map<String, String>> _getHeaders() async {
    final sessionCookie = await storage.read(key: 'session_cookie');
    return {
      'Accept': 'application/json',
      if (sessionCookie != null) 'Cookie': sessionCookie,
    };
  }

  // Save session cookie from HTTP headers
  Future<void> _saveSession(http.Response response) async {
    final rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      await storage.write(key: 'session_cookie', value: rawCookie);
    }
  }

  // Login Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth.php?action=login'),
        body: {'email': email, 'password': password},
      );
      await _saveSession(res);
      return jsonDecode(res.body);
    } catch (e) {
      return {'success': false, 'message': 'Network connection error. Please try again.'};
    }
  }

  // Check Current Session
  Future<Map<String, dynamic>> checkSession() async {
    try {
      final headers = await _getHeaders();
      final res = await http.get(Uri.parse('$baseUrl/auth.php?action=check'), headers: headers);
      return jsonDecode(res.body);
    } catch (e) {
      return {'success': false};
    }
  }

  // Get Assigned Workload & Leads
  Future<List<LeadModel>> fetchLeads({String search = '', String filter = 'all'}) async {
    try {
      final headers = await _getHeaders();
      final uri = Uri.parse('$baseUrl/leads.php?action=list&search=${Uri.encodeComponent(search)}&filter=$filter');
      final res = await http.get(uri, headers: headers);
      final data = jsonDecode(res.body);
      if (data['success'] == true && data['data'] != null) {
        final leadsJson = data['data']['leads'] as List;
        return leadsJson.map((l) => LeadModel.fromJson(l)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Start Call API (Mobile Call Initiation)
  Future<int?> startCall(int leadId, String phone) async {
    try {
      final headers = await _getHeaders();
      final res = await http.post(
        Uri.parse('$baseUrl/calls.php?action=start_call'),
        headers: headers,
        body: {'lead_id': leadId.toString(), 'phone': phone},
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        return data['active_call_id'];
      }
    } catch (e) {}
    return null;
  }

  // End Call API (Mobile Call Duration Logging)
  Future<bool> endCall({
    required int leadId,
    required int durationSeconds,
    int callOutcomeId = 1,
    String remarks = '',
  }) async {
    try {
      final headers = await _getHeaders();
      final res = await http.post(
        Uri.parse('$baseUrl/calls.php?action=end_call'),
        headers: headers,
        body: {
          'lead_id': leadId.toString(),
          'duration_seconds': durationSeconds.toString(),
          'call_outcome_id': callOutcomeId.toString(),
          'remarks': remarks,
        },
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  // Save Call Outcome & Schedule Followup/Meeting
  Future<bool> logCallOutcome({
    required int leadId,
    required int callOutcomeId,
    required int durationSeconds,
    required String remarks,
    bool scheduleFollowup = false,
    String? followupDate,
    String? followupTime,
    String? followupPurpose,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = {
        'lead_id': leadId.toString(),
        'call_outcome_id': callOutcomeId.toString(),
        'call_duration': durationSeconds.toString(),
        'remarks': remarks,
        'schedule_followup': scheduleFollowup ? '1' : '0',
        if (followupDate != null) 'followup_date': followupDate,
        if (followupTime != null) 'followup_time': followupTime,
        if (followupPurpose != null) 'followup_purpose': followupPurpose,
      };

      final res = await http.post(
        Uri.parse('$baseUrl/calls.php?action=log'),
        headers: headers,
        body: body,
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  // Fetch Call Timeline for a Lead
  Future<List<CallLogModel>> fetchLeadCallLogs(int leadId) async {
    try {
      final headers = await _getHeaders();
      final res = await http.get(
        Uri.parse('$baseUrl/calls.php?action=list&lead_id=$leadId'),
        headers: headers,
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true && data['data'] != null) {
        final logsJson = data['data'] as List;
        return logsJson.map((c) => CallLogModel.fromJson(c)).toList();
      }
    } catch (e) {}
    return [];
  }

  // Fetch Dashboard Metrics
  Future<Map<String, dynamic>> fetchDashboardMetrics() async {
    try {
      final headers = await _getHeaders();
      final res = await http.get(Uri.parse('$baseUrl/dashboard.php'), headers: headers);
      final data = jsonDecode(res.body);
      if (data['success'] == true && data['data'] != null) {
        return data['data'];
      }
    } catch (e) {}
    return {};
  }

  // Update Profile Info
  Future<Map<String, dynamic>> updateProfile({required String name, required String email, required String mobile}) async {
    try {
      final headers = await _getHeaders();
      final res = await http.post(
        Uri.parse('$baseUrl/auth.php?action=update_profile'),
        headers: headers,
        body: {'name': name, 'email': email, 'mobile': mobile},
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'success': false, 'message': 'Network error while updating profile.'};
    }
  }

  // Change Password
  Future<Map<String, dynamic>> changePassword({required String currentPassword, required String newPassword}) async {
    try {
      final headers = await _getHeaders();
      final res = await http.post(
        Uri.parse('$baseUrl/auth.php?action=change_password'),
        headers: headers,
        body: {'current_password': currentPassword, 'new_password': newPassword},
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'success': false, 'message': 'Network error while changing password.'};
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      final headers = await _getHeaders();
      await http.get(Uri.parse('$baseUrl/auth.php?action=logout'), headers: headers);
    } catch (e) {}
    await storage.deleteAll();
  }
}

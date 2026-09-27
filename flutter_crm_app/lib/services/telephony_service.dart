import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'api_service.dart';

class TelephonyService {
  final ApiService _apiService = ApiService();

  // Check & Request Call Permissions
  Future<bool> checkCallPermissions() async {
    final phoneStatus = await Permission.phone.status;
    if (phoneStatus.isGranted) return true;

    final requestResult = await Permission.phone.request();
    return requestResult.isGranted;
  }

  // Initiate Phone Call associated strictly with a LeadTriangle Lead
  // PRIVACY RULE: Only tracks LeadTriangle initiated calls!
  Future<CallSession?> initiateLeadCall({
    required int leadId,
    required String phoneNumber,
  }) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');

    // Send Call Started event to CRM backend
    await _apiService.startCall(leadId, cleanPhone);
    final startTime = DateTime.now();

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
      return CallSession(
        leadId: leadId,
        phone: cleanPhone,
        startedAt: startTime,
      );
    }
    return null;
  }

  // Open WhatsApp directly for Lead
  Future<bool> openWhatsApp(String phoneNumber) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
    final whatsappUri = Uri.parse('whatsapp://send?phone=$cleanPhone');
    final webUri = Uri.parse('https://wa.me/$cleanPhone');

    if (await canLaunchUrl(whatsappUri)) {
      return await launchUrl(whatsappUri);
    } else if (await canLaunchUrl(webUri)) {
      return await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
    return false;
  }
}

class CallSession {
  final int leadId;
  final String phone;
  final DateTime startedAt;
  DateTime? endedAt;

  CallSession({
    required this.leadId,
    required this.phone,
    required this.startedAt,
  });

  int get durationInSeconds {
    final end = endedAt ?? DateTime.now();
    return end.difference(startedAt).inSeconds;
  }
}

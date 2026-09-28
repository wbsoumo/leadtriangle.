import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'api_service.dart';

class TelephonyService {
  final ApiService _apiService = ApiService();

  // Check & Request Call & Notification Permissions
  Future<bool> checkCallPermissions() async {
    final phoneStatus = await Permission.phone.status;
    final notificationStatus = await Permission.notification.status;

    if (!phoneStatus.isGranted) {
      await Permission.phone.request();
    }

    if (!notificationStatus.isGranted) {
      await Permission.notification.request();
    }

    return (await Permission.phone.isGranted);
  }

  // Initiate Phone Call associated strictly with a LeadTriangle Lead
  Future<CallSession?> initiateLeadCall({
    required int leadId,
    required String phoneNumber,
  }) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');

    // Send Call Started event to central CRM backend
    try {
      await _apiService.startCall(leadId, cleanPhone);
    } catch (_) {}

    final startTime = DateTime.now();

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      try {
        await launchUrl(uri, mode: LaunchMode.externalNonBrowserApplication);
      } catch (err) {
        print("Launch phone dialer error: $err");
      }
    }

    // Always return CallSession so calling flow proceed to Call Outcome dialog
    return CallSession(
      leadId: leadId,
      phone: cleanPhone,
      startedAt: startTime,
    );
  }

  // Open WhatsApp directly for Lead
  Future<bool> openWhatsApp(String phoneNumber) async {
    var digitsOnly = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    if (digitsOnly.length == 10) {
      digitsOnly = '91$digitsOnly'; // Default India country code if 10-digit number
    }
    
    final whatsappAppUri = Uri.parse('whatsapp://send?phone=$digitsOnly');
    final webUri = Uri.parse('https://wa.me/$digitsOnly');
    final apiUri = Uri.parse('https://api.whatsapp.com/send?phone=$digitsOnly');

    try {
      if (await canLaunchUrl(whatsappAppUri)) {
        return await launchUrl(whatsappAppUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}

    try {
      if (await canLaunchUrl(webUri)) {
        return await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}

    try {
      return await launchUrl(apiUri, mode: LaunchMode.externalApplication);
    } catch (e) {
      print("WhatsApp launch error: $e");
      return false;
    }
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

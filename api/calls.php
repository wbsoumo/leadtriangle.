<?php
// api/calls.php - Calling Operations API

header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$userId = $_SESSION['user_id'];
$roleName = $_SESSION['role_name'];
$action = $_GET['action'] ?? $_POST['action'] ?? 'log';

// Auto-ensure active_calls table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS active_calls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lead_id INT NOT NULL,
            user_id INT NOT NULL,
            phone VARCHAR(30) NOT NULL,
            status ENUM('calling', 'connected', 'ended') DEFAULT 'calling',
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            connected_at DATETIME DEFAULT NULL,
            ended_at DATETIME DEFAULT NULL,
            duration_seconds INT DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_active_user (user_id),
            INDEX idx_active_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Exception $e) {}

// 1. START ACTIVE CALL (Mobile App API)
if ($action === 'start_call') {
    $leadId = (int)($_POST['lead_id'] ?? $_GET['lead_id'] ?? 0);
    $phone = trim($_POST['phone'] ?? $_GET['phone'] ?? '');

    if (!$leadId) {
        echo json_encode(['success' => false, 'message' => 'Lead ID is required']);
        exit;
    }

    // Deactivate previous calling states for this user
    $pdo->prepare("UPDATE active_calls SET status = 'ended', ended_at = NOW() WHERE user_id = :uid AND status IN ('calling', 'connected')")
        ->execute(['uid' => $userId]);

    $stmt = $pdo->prepare("
        INSERT INTO active_calls (lead_id, user_id, phone, status, started_at)
        VALUES (:lid, :uid, :phone, 'calling', NOW())
    ");
    $stmt->execute(['lid' => $leadId, 'uid' => $userId, 'phone' => $phone]);
    $activeCallId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Call started',
        'active_call_id' => (int)$activeCallId,
        'started_at' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 2. END ACTIVE CALL (Mobile App API)
if ($action === 'end_call') {
    $leadId = (int)($_POST['lead_id'] ?? $_GET['lead_id'] ?? 0);
    $duration = (int)($_POST['duration_seconds'] ?? $_GET['duration_seconds'] ?? 0);
    $callOutcomeId = (int)($_POST['call_outcome_id'] ?? 1); // Default Connected
    $remarks = trim($_POST['remarks'] ?? '');

    // End active_calls
    $pdo->prepare("
        UPDATE active_calls 
        SET status = 'ended', ended_at = NOW(), duration_seconds = :dur 
        WHERE user_id = :uid AND status IN ('calling', 'connected')
    ")->execute(['dur' => $duration, 'uid' => $userId]);

    if ($leadId) {
        // Log to call_logs
        $logStmt = $pdo->prepare("
            INSERT INTO call_logs (lead_id, user_id, call_outcome_id, call_duration_seconds, remarks, called_at)
            VALUES (:lid, :uid, :oid, :dur, :rem, NOW())
        ");
        $logStmt->execute([
            'lid' => $leadId,
            'uid' => $userId,
            'oid' => $callOutcomeId,
            'dur' => $duration,
            'rem' => $remarks ?: 'Call completed via Mobile App'
        ]);

        // Update lead last_contacted_at
        $pdo->prepare("UPDATE leads SET last_contacted_at = NOW() WHERE id = :lid")
            ->execute(['lid' => $leadId]);
    }

    echo json_encode(['success' => true, 'message' => 'Call ended successfully']);
    exit;
}

// 3. GET ACTIVE CALL (Web CRM Polling & Mobile check)
if ($action === 'get_active_call') {
    try {
        $isManagement = in_array($roleName, ['super_admin', 'admin', 'manager']);
        
        $query = "
            SELECT ac.*, l.name as lead_name, l.company_name, l.mobile as lead_phone, l.status_id as lead_status_id, ls.name as status_name
            FROM active_calls ac
            JOIN leads l ON ac.lead_id = l.id
            LEFT JOIN lead_statuses ls ON l.status_id = ls.id
            WHERE ac.status IN ('calling', 'connected')
              AND ac.started_at >= NOW() - INTERVAL 15 MINUTE
        ";
        
        $params = [];
        if (!$isManagement) {
            $query .= " AND ac.user_id = :uid";
            $params['uid'] = $userId;
        }
        
        $query .= " ORDER BY ac.id DESC LIMIT 1";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $activeCall = $stmt->fetch();

        if ($activeCall) {
            $statuses = $pdo->query("SELECT id, name FROM lead_statuses ORDER BY display_order ASC")->fetchAll();
            $outcomes = $pdo->query("SELECT id, name FROM call_outcomes ORDER BY id ASC")->fetchAll();

            echo json_encode([
                'success' => true,
                'active_call' => true,
                'data' => [
                    'id' => (int)$activeCall['id'],
                    'lead_id' => (int)$activeCall['lead_id'],
                    'lead_name' => $activeCall['lead_name'],
                    'company_name' => $activeCall['company_name'],
                    'phone' => $activeCall['lead_phone'],
                    'status' => $activeCall['status'],
                    'started_at' => $activeCall['started_at'],
                    'lead_status_id' => (int)$activeCall['lead_status_id'],
                    'lead_status' => $activeCall['status_name'],
                    'statuses' => $statuses,
                    'outcomes' => $outcomes
                ]
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'active_call' => false
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => true,
            'active_call' => false
        ]);
    }
    exit;
}

// 4. LOG CALL & REMARK
if ($action === 'log') {
    $leadId = (int)($_POST['lead_id'] ?? 0);
    $callOutcomeId = (int)($_POST['call_outcome_id'] ?? 0);
    $callDuration = (int)($_POST['call_duration'] ?? 0);
    $remarks = trim($_POST['remarks'] ?? '');
    
    // Follow-up scheduling option
    $scheduleFollowup = $_POST['schedule_followup'] ?? '0';
    $followupDate = $_POST['followup_date'] ?? null;
    $followupTime = $_POST['followup_time'] ?? null;
    $followupPurpose = trim($_POST['followup_purpose'] ?? '');

    // Meeting scheduling option
    $scheduleMeeting = $_POST['schedule_meeting'] ?? '0';
    $meetingTitle = trim($_POST['meeting_title'] ?? '');
    $meetingTypeId = (int)($_POST['meeting_type_id'] ?? 1);
    $meetingDate = $_POST['meeting_date'] ?? null;
    $meetingTime = $_POST['meeting_time'] ?? null;
    $meetingMode = $_POST['meeting_mode'] ?? 'Google Meet';
    $meetingLink = trim($_POST['meeting_link'] ?? '');

    if (!$leadId || !$callOutcomeId) {
        echo json_encode(['success' => false, 'message' => 'Lead ID and Call Outcome are required.']);
        exit;
    }

    // Insert Call Log
    $stmt = $pdo->prepare("
        INSERT INTO call_logs (lead_id, user_id, call_outcome_id, call_duration_seconds, remarks, called_at)
        VALUES (:lid, :uid, :oid, :dur, :rem, NOW())
    ");
    $stmt->execute([
        'lid' => $leadId,
        'uid' => $userId,
        'oid' => $callOutcomeId,
        'dur' => $callDuration,
        'rem' => $remarks
    ]);

    // End active_calls for user if matching
    $pdo->prepare("UPDATE active_calls SET status = 'ended', ended_at = NOW() WHERE user_id = :uid AND lead_id = :lid")
        ->execute(['uid' => $userId, 'lid' => $leadId]);

    // Update Lead last_contacted_at & Status based on outcome or explicit selection
    $explicitStatusId = (int)($_POST['lead_status_id'] ?? 0);
    $leadStatusUpdate = $explicitStatusId > 0 ? $explicitStatusId : 5; // Contacted by default
    if (!$explicitStatusId) {
        if (in_array($callOutcomeId, [3, 9])) { // Qualified or Meeting Scheduled
            $leadStatusUpdate = 7;
        } elseif ($callOutcomeId == 10) { // Converted
            $leadStatusUpdate = 11;
        } elseif ($callOutcomeId == 11) { // Lost
            $leadStatusUpdate = 12;
        }
    }

    $leadUpdate = $pdo->prepare("UPDATE leads SET status_id = :st, last_contacted_at = NOW() WHERE id = :lid");
    $leadUpdate->execute(['st' => $leadStatusUpdate, 'lid' => $leadId]);

    // Schedule Follow-up if requested
    if ($scheduleFollowup === '1' && $followupDate && $followupTime) {
        $fuStmt = $pdo->prepare("
            INSERT INTO followups (lead_id, user_id, followup_date, followup_time, purpose, notes, status)
            VALUES (:lid, :uid, :fdate, :ftime, :purp, :notes, 'Pending')
        ");
        $fuStmt->execute([
            'lid'   => $leadId,
            'uid'   => $userId,
            'fdate' => $followupDate,
            'ftime' => $followupTime,
            'purp'  => $followupPurpose ?: 'Call Followup',
            'notes' => $remarks
        ]);

        $pdo->prepare("UPDATE leads SET next_followup_at = :nxt WHERE id = :lid")
            ->execute(['nxt' => "$followupDate $followupTime", 'lid' => $leadId]);
    }

    // Schedule Meeting if requested
    if ($scheduleMeeting === '1' && $meetingDate && $meetingTime) {
        $mtStmt = $pdo->prepare("
            INSERT INTO meetings (lead_id, assigned_user_id, meeting_title, meeting_type_id, meeting_date, meeting_time, meeting_mode, meeting_link, notes, status)
            VALUES (:lid, :uid, :title, :type, :mdate, :mtime, :mode, :link, :notes, 'Scheduled')
        ");
        $mtStmt->execute([
            'lid'   => $leadId,
            'uid'   => $userId,
            'title' => $meetingTitle ?: 'Client Meeting',
            'type'  => $meetingTypeId,
            'mdate' => $meetingDate,
            'mtime' => $meetingTime,
            'mode'  => $meetingMode,
            'link'  => $meetingLink,
            'notes' => $remarks
        ]);

        $pdo->prepare("UPDATE leads SET meeting_scheduled_at = :mdate, status_id = 7 WHERE id = :lid")
            ->execute(['mdate' => "$meetingDate $meetingTime", 'lid' => $leadId]);
    }

    echo json_encode(['success' => true, 'message' => 'Call logged successfully!']);
    exit;
}

// 5. CALL HISTORY LIST
if ($action === 'list') {
    $leadIdFilter = (int)($_GET['lead_id'] ?? 0);
    $query = "
        SELECT c.*, l.name as lead_name, l.mobile as lead_mobile, l.company_name, co.name as outcome_name, co.color_code as outcome_color, u.name as agent_name
        FROM call_logs c
        JOIN leads l ON c.lead_id = l.id
        JOIN call_outcomes co ON c.call_outcome_id = co.id
        JOIN users u ON c.user_id = u.id
        WHERE 1=1
    ";
    $params = [];
    if ($roleName === 'operation_executive') {
        $query .= " AND c.user_id = :uid";
        $params['uid'] = $userId;
    }
    if ($leadIdFilter > 0) {
        $query .= " AND c.lead_id = :lid";
        $params['lid'] = $leadIdFilter;
    }
    $query .= " ORDER BY c.called_at DESC LIMIT 50";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $calls = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $calls]);
    exit;
}

// 6. LOG BACKGROUND MATCHED CALL (Mobile Broadcast / Native Dialer Sync)
if ($action === 'log_background_call') {
    $phone = trim($_POST['phone'] ?? $_GET['phone'] ?? '');
    $duration = (int)($_POST['duration_seconds'] ?? $_GET['duration_seconds'] ?? 0);
    $callType = $_POST['call_type'] ?? 'outgoing';

    if (empty($phone)) {
        echo json_encode(['success' => false, 'message' => 'Phone number required']);
        exit;
    }

    $cleanPhone = preg_replace('/[^\d]/', '', $phone);
    if (strlen($cleanPhone) < 10) {
        echo json_encode(['success' => false, 'message' => 'Invalid phone length']);
        exit;
    }

    $searchPattern = substr($cleanPhone, -10);

    $stmt = $pdo->prepare("
        SELECT id, name FROM leads 
        WHERE RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', ''), 10) = :phone
        LIMIT 1
    ");
    $stmt->execute(['phone' => $searchPattern]);
    $lead = $stmt->fetch();

    if ($lead) {
        $pdo->prepare("
            INSERT INTO call_logs (lead_id, user_id, call_outcome_id, call_duration_seconds, remarks, called_at)
            VALUES (:lid, :uid, 1, :dur, :rem, NOW())
        ")->execute([
            'lid' => $lead['id'],
            'uid' => $userId,
            'dur' => $duration,
            'rem' => "Background Auto-Sync (" . ucfirst($callType) . " Call via Device Dialer)"
        ]);

        $pdo->prepare("UPDATE leads SET last_contacted_at = NOW() WHERE id = :lid")
            ->execute(['lid' => $lead['id']]);

        echo json_encode([
            'success' => true,
            'matched' => true,
            'lead_id' => (int)$lead['id'],
            'lead_name' => $lead['name'],
            'message' => 'Call matched with Lead #' . $lead['id'] . ' (' . $lead['name'] . ') and logged in CRM.'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'matched' => false,
            'message' => 'Phone number not present in lead database.'
        ]);
    }
    exit;
}

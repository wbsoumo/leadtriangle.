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

// 1. LOG CALL & REMARK
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

    // Update Lead last_contacted_at & Status based on outcome
    $leadStatusUpdate = 5; // Contacted by default
    if (in_array($callOutcomeId, [3, 9])) { // Qualified or Meeting Scheduled
        $leadStatusUpdate = 7;
    } elseif ($callOutcomeId == 10) { // Converted
        $leadStatusUpdate = 11;
    } elseif ($callOutcomeId == 11) { // Lost
        $leadStatusUpdate = 12;
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

// 2. CALL HISTORY LIST
if ($action === 'list') {
    $stmt = $pdo->prepare("
        SELECT c.*, l.name as lead_name, l.mobile as lead_mobile, l.company_name, co.name as outcome_name, co.color_code as outcome_color, u.name as agent_name
        FROM call_logs c
        JOIN leads l ON c.lead_id = l.id
        JOIN call_outcomes co ON c.call_outcome_id = co.id
        JOIN users u ON c.user_id = u.id
        " . ($roleName === 'operation_executive' ? "WHERE c.user_id = :uid" : "") . "
        ORDER BY c.called_at DESC
        LIMIT 50
    ");
    if ($roleName === 'operation_executive') {
        $stmt->execute(['uid' => $userId]);
    } else {
        $stmt->execute();
    }
    $calls = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $calls]);
    exit;
}

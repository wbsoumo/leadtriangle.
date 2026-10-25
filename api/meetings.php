<?php
// api/meetings.php - Meeting Management & Calendar API with Scheduling, Rescheduling & Status Sync

header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$userId = (int)$_SESSION['user_id'];
$roleName = $_SESSION['role_name'];
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// 1. LIST MEETINGS (Calendar & List Views)
if ($action === 'list') {
    $filter = $_GET['filter'] ?? 'all'; // today, upcoming, month, all
    $selectedMonth = $_GET['month'] ?? ''; // YYYY-MM
    $statusFilter = $_GET['status'] ?? '';
    $execFilter = !empty($_GET['executive_id']) ? (int)$_GET['executive_id'] : null;

    $where = [];
    $params = [];

    // Role-based visibility scoping
    if ($roleName === 'operation_executive') {
        $where[] = "m.assigned_user_id = :rbac_uid";
        $params['rbac_uid'] = $userId;
    } elseif ($execFilter) {
        $where[] = "m.assigned_user_id = :filter_exec";
        $params['filter_exec'] = $execFilter;
    }

    if ($filter === 'today') {
        $where[] = "m.meeting_date = CURDATE()";
    } elseif ($filter === 'upcoming') {
        $where[] = "m.meeting_date >= CURDATE() AND m.status = 'Scheduled'";
    } elseif (!empty($selectedMonth)) {
        $where[] = "DATE_FORMAT(m.meeting_date, '%Y-%m') = :sel_month";
        $params['sel_month'] = $selectedMonth;
    }

    if (!empty($statusFilter)) {
        $where[] = "m.status = :st_filter";
        $params['st_filter'] = $statusFilter;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT 
            m.*, 
            l.name as lead_name, l.mobile as lead_mobile, l.company_name, l.email as lead_email,
            mt.name as type_name, 
            u.name as agent_name, u.email as agent_email
        FROM meetings m
        JOIN leads l ON m.lead_id = l.id
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.id
        JOIN users u ON m.assigned_user_id = u.id
        $whereClause
        ORDER BY m.meeting_date ASC, m.meeting_time ASC
    ");
    $stmt->execute($params);
    $meetings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch meeting types for UI dropdowns
    $types = $pdo->query("SELECT id, name FROM meeting_types ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $meetings,
        'meeting_types' => $types
    ]);
    exit;
}

// 2. SCHEDULE / CREATE MEETING DIRECTLY
if ($action === 'create' || $action === 'schedule') {
    $leadId = (int)($_POST['lead_id'] ?? 0);
    $assignedUserId = !empty($_POST['assigned_user_id']) ? (int)$_POST['assigned_user_id'] : $userId;
    $meetingTitle = trim($_POST['meeting_title'] ?? '');
    $meetingTypeId = (int)($_POST['meeting_type_id'] ?? 1);
    $meetingDate = trim($_POST['meeting_date'] ?? '');
    $meetingTime = trim($_POST['meeting_time'] ?? '');
    $meetingMode = trim($_POST['meeting_mode'] ?? 'Google Meet');
    $meetingLink = trim($_POST['meeting_link'] ?? '');
    $notes = trim($_POST['notes'] ?? '');

    // Allow combined datetime if provided
    if (!empty($_POST['meeting_datetime'])) {
        $mRaw = trim($_POST['meeting_datetime']);
        if (strpos($mRaw, 'T') !== false) {
            list($meetingDate, $meetingTime) = explode('T', $mRaw);
        } elseif (strpos($mRaw, ' ') !== false) {
            list($meetingDate, $meetingTime) = explode(' ', $mRaw);
        }
    }

    if (!$leadId || empty($meetingDate)) {
        echo json_encode(['success' => false, 'message' => 'Lead ID and Meeting Date are required.']);
        exit;
    }

    if (empty($meetingTime)) {
        $meetingTime = '11:00:00';
    } elseif (strlen($meetingTime) === 5) {
        $meetingTime .= ':00';
    }

    // Verify lead exists
    $lStmt = $pdo->prepare("SELECT id, name, mobile, status_id FROM leads WHERE id = :id");
    $lStmt->execute(['id' => $leadId]);
    $lead = $lStmt->fetch();
    if (!$lead) {
        echo json_encode(['success' => false, 'message' => 'Lead record not found.']);
        exit;
    }

    if (empty($meetingTitle)) {
        $meetingTitle = "Client Demo & Discussion - {$lead['name']}";
    }

    // Conflict Check (Warning if agent already has meeting at exact same date & hour)
    $conflictStmt = $pdo->prepare("SELECT id, meeting_title FROM meetings WHERE assigned_user_id = :uid AND meeting_date = :mdate AND meeting_time = :mtime AND status = 'Scheduled'");
    $conflictStmt->execute(['uid' => $assignedUserId, 'mdate' => $meetingDate, 'mtime' => $meetingTime]);
    $conflict = $conflictStmt->fetch();

    $stmt = $pdo->prepare("
        INSERT INTO meetings (lead_id, assigned_user_id, meeting_title, meeting_type_id, meeting_date, meeting_time, meeting_mode, meeting_link, notes, status, created_at)
        VALUES (:lid, :uid, :title, :type, :mdate, :mtime, :mode, :link, :notes, 'Scheduled', NOW())
    ");
    $stmt->execute([
        'lid'   => $leadId,
        'uid'   => $assignedUserId,
        'title' => $meetingTitle,
        'type'  => $meetingTypeId,
        'mdate' => $meetingDate,
        'mtime' => $meetingTime,
        'mode'  => $meetingMode,
        'link'  => $meetingLink,
        'notes' => $notes
    ]);
    $meetingId = $pdo->lastInsertId();

    // Update lead meeting_scheduled_at & status to Meeting Scheduled (7)
    $pdo->prepare("UPDATE leads SET meeting_scheduled_at = :dt, status_id = 7 WHERE id = :lid")
        ->execute(['dt' => "$meetingDate $meetingTime", 'lid' => $leadId]);

    // Write to activity logs
    try {
        $pdo->prepare("
            INSERT INTO activity_logs (user_id, module, action, record_id, new_value, ip_address)
            VALUES (:uid, 'meetings', 'meeting_scheduled', :rec, :new, :ip)
        ")->execute([
            'uid' => $userId,
            'rec' => $leadId,
            'new' => json_encode([
                'meeting_id' => $meetingId,
                'title' => $meetingTitle,
                'date' => $meetingDate,
                'time' => $meetingTime,
                'mode' => $meetingMode
            ]),
            'ip'  => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    } catch (Exception $e) {}

    echo json_encode([
        'success' => true,
        'message' => 'Meeting scheduled successfully!' . ($conflict ? ' (Note: Another meeting exists at this time slot)' : ''),
        'meeting_id' => $meetingId,
        'has_conflict' => !!$conflict
    ]);
    exit;
}

// 3. RESCHEDULE EXISTING MEETING
if ($action === 'reschedule') {
    $id = (int)($_POST['id'] ?? 0);
    $meetingDate = trim($_POST['meeting_date'] ?? '');
    $meetingTime = trim($_POST['meeting_time'] ?? '');
    $notes = trim($_POST['notes'] ?? '');

    if (!$id || empty($meetingDate)) {
        echo json_encode(['success' => false, 'message' => 'Meeting ID and new date are required.']);
        exit;
    }

    if (empty($meetingTime)) {
        $meetingTime = '11:00:00';
    } elseif (strlen($meetingTime) === 5) {
        $meetingTime .= ':00';
    }

    $mStmt = $pdo->prepare("SELECT * FROM meetings WHERE id = :id");
    $mStmt->execute(['id' => $id]);
    $meeting = $mStmt->fetch();
    if (!$meeting) {
        echo json_encode(['success' => false, 'message' => 'Meeting not found.']);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE meetings 
        SET meeting_date = :mdate, meeting_time = :mtime, notes = CONCAT(COALESCE(notes, ''), '\nRescheduled: ', :notes), status = 'Rescheduled'
        WHERE id = :id
    ");
    $stmt->execute([
        'mdate' => $meetingDate,
        'mtime' => $meetingTime,
        'notes' => $notes ?: 'Rescheduled by telecaller',
        'id'    => $id
    ]);

    // Update lead meeting_scheduled_at
    $pdo->prepare("UPDATE leads SET meeting_scheduled_at = :dt WHERE id = :lid")
        ->execute(['dt' => "$meetingDate $meetingTime", 'lid' => $meeting['lead_id']]);

    // Activity log
    try {
        $pdo->prepare("
            INSERT INTO activity_logs (user_id, module, action, record_id, old_value, new_value, ip_address)
            VALUES (:uid, 'meetings', 'meeting_rescheduled', :rec, :old, :new, :ip)
        ")->execute([
            'uid' => $userId,
            'rec' => $meeting['lead_id'],
            'old' => json_encode(['date' => $meeting['meeting_date'], 'time' => $meeting['meeting_time']]),
            'new' => json_encode(['date' => $meetingDate, 'time' => $meetingTime]),
            'ip'  => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    } catch(Exception $e) {}

    echo json_encode(['success' => true, 'message' => 'Meeting rescheduled successfully!']);
    exit;
}

// 4. UPDATE MEETING STATUS (Completed / Cancelled / No Show)
if ($action === 'update_status') {
    $id = (int)($_POST['id'] ?? 0);
    $status = trim($_POST['status'] ?? 'Completed');

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Meeting ID required']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE meetings SET status = :st WHERE id = :id");
    $stmt->execute(['st' => $status, 'id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Meeting status updated to ' . $status]);
    exit;
}

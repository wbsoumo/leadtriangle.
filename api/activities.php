<?php
// api/activities.php - Activity Feed & Timeline API
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

$filterType = $_GET['type'] ?? 'all'; // all, calls, followups, status_updates, remarks

$callWhere = "WHERE 1=1";
$callParams = [];

if ($roleName === 'operation_executive') {
    $callWhere .= " AND cl.user_id = :uid";
    $callParams['uid'] = $userId;
}

// Fetch Call Logs & Remarks Activity
$sql = "
    SELECT 
        cl.id as activity_id,
        'call' as activity_type,
        cl.lead_id,
        l.name as lead_name,
        l.company_name,
        l.mobile,
        l.priority,
        co.name as outcome_name,
        co.color_code as outcome_color,
        cl.call_duration_seconds,
        cl.remarks,
        cl.called_at as activity_time,
        DATE_FORMAT(cl.called_at, '%d %b %Y') as date_group,
        TIME_FORMAT(cl.called_at, '%h:%i %p') as time_formatted,
        (SELECT CONCAT(f.followup_date, ' ', f.followup_time) FROM followups f WHERE f.lead_id = l.id ORDER BY f.id DESC LIMIT 1) as followup_schedule
    FROM call_logs cl
    JOIN leads l ON cl.lead_id = l.id
    JOIN call_outcomes co ON cl.call_outcome_id = co.id
    $callWhere
    ORDER BY cl.id DESC
    LIMIT 100
";

$stmt = $pdo->prepare($sql);
$stmt->execute($callParams);
$activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Also fetch recently assigned leads as activity
$leadWhere = "WHERE 1=1";
$leadParams = [];
if ($roleName === 'operation_executive') {
    $leadWhere .= " AND l.assigned_executive_id = :l_uid";
    $leadParams['l_uid'] = $userId;
}

$leadSql = "
    SELECT 
        l.id as activity_id,
        'assignment' as activity_type,
        l.id as lead_id,
        l.name as lead_name,
        l.company_name,
        l.mobile,
        l.priority,
        'New Lead Assigned' as outcome_name,
        '#2563eb' as outcome_color,
        0 as call_duration_seconds,
        l.initial_remark as remarks,
        l.created_at as activity_time,
        DATE_FORMAT(l.created_at, '%d %b %Y') as date_group,
        TIME_FORMAT(l.created_at, '%h:%i %p') as time_formatted,
        NULL as followup_schedule
    FROM leads l
    $leadWhere
    ORDER BY l.id DESC
    LIMIT 30
";

$lStmt = $pdo->prepare($leadSql);
$lStmt->execute($leadParams);
$leadActivities = $lStmt->fetchAll(PDO::FETCH_ASSOC);

// Merge activities
$allList = array_merge($activities, $leadActivities);

// Sort by activity_time DESC
usort($allList, function($a, b) {
    return strtotime($b['activity_time']) - strtotime($a['activity_time']);
});

// Calculate Filter Counts
$callsCount = 0;
$followupsCount = 0;
$statusUpdatesCount = 0;
$remarksCount = 0;

foreach ($allList as $act) {
    if ($act['activity_type'] === 'call') {
        $callsCount++;
        $outcome = strtolower($act['outcome_name'] ?? '');
        if (strpos($outcome, 'follow') !== false || !empty($act['followup_schedule'])) {
            $followupsCount++;
        }
        if (!empty($act['remarks'])) {
            $remarksCount++;
        }
    } else if ($act['activity_type'] === 'assignment') {
        $statusUpdatesCount++;
    }
}

// Client filtering by type
if ($filterType === 'calls') {
    $allList = array_values(array_filter($allList, fn($x) => $x['activity_type'] === 'call'));
} else if ($filterType === 'followups') {
    $allList = array_values(array_filter($allList, fn($x) => !empty($x['followup_schedule']) || strpos(strtolower($x['outcome_name'] ?? ''), 'follow') !== false));
} else if ($filterType === 'status_updates') {
    $allList = array_values(array_filter($allList, fn($x) => $x['activity_type'] === 'assignment'));
} else if ($filterType === 'remarks') {
    $allList = array_values(array_filter($allList, fn($x) => !empty($x['remarks'])));
}

echo json_encode([
    'success' => true,
    'data' => [
        'activities' => $allList,
        'counts' => [
            'all' => count($activities) + count($leadActivities),
            'calls' => $callsCount,
            'followups' => $followupsCount,
            'status_updates' => $statusUpdatesCount,
            'remarks' => $remarksCount,
        ]
    ]
]);

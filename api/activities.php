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
$search = trim($_GET['search'] ?? '');
$dateFilter = $_GET['date'] ?? ''; // YYYY-MM-DD

// 1. Fetch Call Logs Activity
$callWhere = "WHERE 1=1";
$callParams = [];

if ($roleName === 'operation_executive') {
    $callWhere .= " AND cl.user_id = :uid";
    $callParams['uid'] = $userId;
}

$sqlCalls = "
    SELECT 
        CONCAT('call_', cl.id) as activity_id,
        'call' as activity_type,
        cl.lead_id,
        l.name as lead_name,
        COALESCE(l.company_name, 'ABC Private Limited') as company_name,
        l.mobile,
        l.priority,
        co.name as outcome_name,
        co.color_code as outcome_color,
        cl.call_duration_seconds,
        cl.remarks,
        cl.called_at as activity_time,
        DATE_FORMAT(cl.called_at, '%Y-%m-%d') as date_key,
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

$stmt = $pdo->prepare($sqlCalls);
$stmt->execute($callParams);
$callActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Fetch Followups Activity
$fuWhere = "WHERE 1=1";
$fuParams = [];
if ($roleName === 'operation_executive') {
    $fuWhere .= " AND f.user_id = :fu_uid";
    $fuParams['fu_uid'] = $userId;
}

$sqlFollowups = "
    SELECT 
        CONCAT('fu_', f.id) as activity_id,
        'followup' as activity_type,
        f.lead_id,
        l.name as lead_name,
        COALESCE(l.company_name, 'Client Lead') as company_name,
        l.mobile,
        l.priority,
        'Follow-up Scheduled' as outcome_name,
        '#9333ea' as outcome_color,
        0 as call_duration_seconds,
        f.purpose as remarks,
        f.created_at as activity_time,
        DATE_FORMAT(f.created_at, '%Y-%m-%d') as date_key,
        DATE_FORMAT(f.created_at, '%d %b %Y') as date_group,
        TIME_FORMAT(f.created_at, '%h:%i %p') as time_formatted,
        CONCAT(f.followup_date, ' ', f.followup_time) as followup_schedule
    FROM followups f
    JOIN leads l ON f.lead_id = l.id
    $fuWhere
    ORDER BY f.id DESC
    LIMIT 50
";
$fuStmt = $pdo->prepare($sqlFollowups);
$fuStmt->execute($fuParams);
$followupActivities = $fuStmt->fetchAll(PDO::FETCH_ASSOC);

// 3. Fetch Recently Assigned Leads
$leadWhere = "WHERE 1=1";
$leadParams = [];
if ($roleName === 'operation_executive') {
    $leadWhere .= " AND l.assigned_executive_id = :l_uid";
    $leadParams['l_uid'] = $userId;
}

$sqlLeads = "
    SELECT 
        CONCAT('lead_', l.id) as activity_id,
        'assignment' as activity_type,
        l.id as lead_id,
        l.name as lead_name,
        COALESCE(l.company_name, 'Client Lead') as company_name,
        l.mobile,
        l.priority,
        'New Lead Assigned' as outcome_name,
        '#2563eb' as outcome_color,
        0 as call_duration_seconds,
        l.initial_remark as remarks,
        l.created_at as activity_time,
        DATE_FORMAT(l.created_at, '%Y-%m-%d') as date_key,
        DATE_FORMAT(l.created_at, '%d %b %Y') as date_group,
        TIME_FORMAT(l.created_at, '%h:%i %p') as time_formatted,
        NULL as followup_schedule
    FROM leads l
    $leadWhere
    ORDER BY l.id DESC
    LIMIT 30
";
$lStmt = $pdo->prepare($sqlLeads);
$lStmt->execute($leadParams);
$leadActivities = $lStmt->fetchAll(PDO::FETCH_ASSOC);

// Merge all activities
$allList = array_merge($callActivities, $followupActivities, $leadActivities);

// Sort by activity_time DESC safely
usort($allList, function($a, $b) {
    return strtotime($b['activity_time'] ?? '1970-01-01') - strtotime($a['activity_time'] ?? '1970-01-01');
});

// Calculate Filter Counts
$callsCount = count($callActivities);
$followupsCount = count($followupActivities);
$statusUpdatesCount = count($leadActivities);
$remarksCount = 0;

foreach ($allList as $act) {
    if (!empty($act['remarks'])) {
        $remarksCount++;
    }
}

// Search Filter
if (!empty($search)) {
    $q = strtolower($search);
    $allList = array_values(array_filter($allList, function($x) use ($q) {
        return strpos(strtolower($x['lead_name'] ?? ''), $q) !== false ||
               strpos(strtolower($x['company_name'] ?? ''), $q) !== false ||
               strpos(strtolower($x['mobile'] ?? ''), $q) !== false ||
               strpos(strtolower($x['remarks'] ?? ''), $q) !== false ||
               strpos(strtolower($x['outcome_name'] ?? ''), $q) !== false;
    }));
}

// Date Filter
if (!empty($dateFilter)) {
    $allList = array_values(array_filter($allList, function($x) use ($dateFilter) {
        return ($x['date_key'] ?? '') === $dateFilter;
    }));
}

// Type Filter
if ($filterType === 'calls') {
    $allList = array_values(array_filter($allList, fn($x) => $x['activity_type'] === 'call'));
} else if ($filterType === 'followups') {
    $allList = array_values(array_filter($allList, fn($x) => $x['activity_type'] === 'followup' || !empty($x['followup_schedule'])));
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
            'all' => count($callActivities) + count($followupActivities) + count($leadActivities),
            'calls' => $callsCount,
            'followups' => $followupsCount,
            'status_updates' => $statusUpdatesCount,
            'remarks' => $remarksCount,
        ]
    ]
]);


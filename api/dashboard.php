<?php
// api/dashboard.php - Dynamic Dashboard API with RBAC & Date/User Filters

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
$teamId = $_SESSION['team_id'];

// Date filter logic
$dateFilter = $_GET['date_filter'] ?? 'this_month';
$startDate = null;
$endDate = null;

$today = date('Y-m-d');
if ($dateFilter === 'today') {
    $startDate = $today . ' 00:00:00';
    $endDate = $today . ' 23:59:59';
} elseif ($dateFilter === 'yesterday') {
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $startDate = $yesterday . ' 00:00:00';
    $endDate = $yesterday . ' 23:59:59';
} elseif ($dateFilter === 'this_week') {
    $startDate = date('Y-m-d 00:00:00', strtotime('monday this week'));
    $endDate = date('Y-m-d 23:59:59', strtotime('sunday this week'));
} elseif ($dateFilter === 'this_month') {
    $startDate = date('Y-m-01 00:00:00');
    $endDate = date('Y-m-t 23:59:59');
} elseif ($dateFilter === 'last_month') {
    $startDate = date('Y-m-01 00:00:00', strtotime('first day of last month'));
    $endDate = date('Y-m-t 23:59:59', strtotime('last day of last month'));
}

// User/Manager filters
$filterExecutive = $_GET['executive_id'] ?? null;
$filterManager = $_GET['manager_id'] ?? null;

// Build base lead condition
$leadWhere = "WHERE is_archived = 0";
$leadParams = [];

if ($startDate && $endDate) {
    $leadWhere .= " AND created_at BETWEEN :start_date AND :end_date";
    $leadParams['start_date'] = $startDate;
    $leadParams['end_date'] = $endDate;
}

if ($roleName === 'operation_executive') {
    $leadWhere .= " AND assigned_executive_id = :exec_id";
    $leadParams['exec_id'] = $userId;
} elseif ($roleName === 'manager') {
    $leadWhere .= " AND (assigned_manager_id = :mgr_id OR assigned_executive_id IN (SELECT id FROM users WHERE team_id = :team_id))";
    $leadParams['mgr_id'] = $userId;
    $leadParams['team_id'] = $teamId;
} else {
    if ($filterExecutive) {
        $leadWhere .= " AND assigned_executive_id = :filter_exec";
        $leadParams['filter_exec'] = $filterExecutive;
    }
    if ($filterManager) {
        $leadWhere .= " AND assigned_manager_id = :filter_mgr";
        $leadParams['filter_mgr'] = $filterManager;
    }
}

// 1. Total Leads Metrics
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM leads $leadWhere");
$stmt->execute($leadParams);
$totalLeads = $stmt->fetch()['total'];

// 2. New Leads Today
$stmt = $pdo->prepare("SELECT COUNT(*) as new_today FROM leads WHERE DATE(created_at) = CURDATE() AND is_archived = 0");
$stmt->execute();
$newLeadsToday = $stmt->fetch()['new_today'];

// 3. Contacted vs Contacting
$stmt = $pdo->prepare("
    SELECT 
        SUM(CASE WHEN status_id IN (5, 8, 9, 10, 11) THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN is_qualified = 1 THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN status_id = 11 THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN status_id = 12 THEN 1 ELSE 0 END) as lost
    FROM leads $leadWhere
");
$stmt->execute($leadParams);
$leadStats = $stmt->fetch();

// 4. Calls Metrics
$callWhere = "WHERE 1=1";
$callParams = [];
if ($startDate && $endDate) {
    $callWhere .= " AND called_at BETWEEN :start_date AND :end_date";
    $callParams['start_date'] = $startDate;
    $callParams['end_date'] = $endDate;
}
if ($roleName === 'operation_executive') {
    $callWhere .= " AND user_id = :c_uid";
    $callParams['c_uid'] = $userId;
}

$stmt = $pdo->prepare("
    SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN DATE(called_at) = CURDATE() THEN 1 ELSE 0 END) as calls_today,
        SUM(CASE WHEN call_outcome_id IN (1, 2, 3, 9, 10) THEN 1 ELSE 0 END) as connected_calls,
        SUM(CASE WHEN call_outcome_id IN (5, 6) THEN 1 ELSE 0 END) as no_answer_busy
    FROM call_logs $callWhere
");
$stmt->execute($callParams);
$callStats = $stmt->fetch();

// 5. Follow-ups Metrics
$fuWhere = "WHERE 1=1";
$fuParams = [];
if ($roleName === 'operation_executive') {
    $fuWhere .= " AND user_id = :fu_uid";
    $fuParams['fu_uid'] = $userId;
}

$stmt = $pdo->prepare("
    SELECT 
        SUM(CASE WHEN followup_date = CURDATE() AND status = 'Pending' THEN 1 ELSE 0 END) as followups_today,
        SUM(CASE WHEN followup_date < CURDATE() AND status = 'Pending' THEN 1 ELSE 0 END) as overdue_followups
    FROM followups $fuWhere
");
$stmt->execute($fuParams);
$fuStats = $stmt->fetch();

// 6. Meetings Metrics
$mtWhere = "WHERE 1=1";
$mtParams = [];
if ($roleName === 'operation_executive') {
    $mtWhere .= " AND assigned_user_id = :mt_uid";
    $mtParams['mt_uid'] = $userId;
}

$stmt = $pdo->prepare("
    SELECT 
        SUM(CASE WHEN meeting_date = CURDATE() AND status = 'Scheduled' THEN 1 ELSE 0 END) as meetings_today,
        SUM(CASE WHEN meeting_date > CURDATE() AND status = 'Scheduled' THEN 1 ELSE 0 END) as upcoming_meetings
    FROM meetings $mtWhere
");
$stmt->execute($mtParams);
$mtStats = $stmt->fetch();

// 7. Projects & Funnel Metrics
$stmt = $pdo->prepare("
    SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN stage_id NOT IN (8, 10) THEN 1 ELSE 0 END) as ongoing_projects,
        SUM(CASE WHEN stage_id = 8 THEN 1 ELSE 0 END) as completed_projects,
        SUM(final_amount) as total_project_value,
        SUM(paid_amount) as total_collected_amount
    FROM projects
");
$stmt->execute();
$projectStats = $stmt->fetch();

// 8. Employee Performance Table (For Admin & Manager)
$employeePerformance = [];
if ($roleName !== 'operation_executive') {
    $empStmt = $pdo->prepare("
        SELECT 
            u.id, u.name, u.email, r.display_name as role,
            (SELECT COUNT(*) FROM leads WHERE assigned_executive_id = u.id AND is_archived = 0) as total_leads,
            (SELECT COUNT(*) FROM call_logs WHERE user_id = u.id AND DATE(called_at) = CURDATE()) as calls_today,
            (SELECT COUNT(*) FROM call_logs WHERE user_id = u.id AND call_outcome_id IN (1,2,3,9,10)) as connected_calls,
            (SELECT COUNT(*) FROM followups WHERE user_id = u.id AND followup_date = CURDATE() AND status = 'Pending') as followups_today,
            (SELECT COUNT(*) FROM meetings WHERE assigned_user_id = u.id AND meeting_date = CURDATE()) as meetings_today,
            (SELECT COUNT(*) FROM leads WHERE assigned_executive_id = u.id AND is_qualified = 1) as qualified_leads
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.status = 'active' AND r.name = 'operation_executive'
        ORDER BY qualified_leads DESC
    ");
    $empStmt->execute();
    $employeePerformance = $empStmt->fetchAll();
}

// 9. Detailed Call Outcomes Breakdown (Today)
$outcomeStmt = $pdo->prepare("
    SELECT 
        SUM(CASE WHEN call_outcome_id IN (1, 2) THEN 1 ELSE 0 END) as connected,
        SUM(CASE WHEN call_outcome_id = 4 THEN 1 ELSE 0 END) as no_answer,
        SUM(CASE WHEN call_outcome_id = 5 THEN 1 ELSE 0 END) as busy,
        SUM(CASE WHEN call_outcome_id = 6 THEN 1 ELSE 0 END) as switched_off,
        SUM(CASE WHEN call_outcome_id = 7 THEN 1 ELSE 0 END) as wrong_number
    FROM call_logs $callWhere AND DATE(called_at) = CURDATE()
");
$outcomeStmt->execute($callParams);
$outcomesBreakdown = $outcomeStmt->fetch();

// 10. Weekly Calls History (Mon - Sun)
$weeklyCalls = ['Mon' => 0, 'Tue' => 0, 'Wed' => 0, 'Thu' => 0, 'Fri' => 0, 'Sat' => 0, 'Sun' => 0];
try {
    $weekStmt = $pdo->prepare("
        SELECT DATE_FORMAT(called_at, '%a') as day_name, COUNT(*) as call_count
        FROM call_logs $callWhere AND called_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE_FORMAT(called_at, '%a')
    ");
    $weekStmt->execute($callParams);
    $rows = $weekStmt->fetchAll();
    foreach ($rows as $r) {
        if (isset($weeklyCalls[$r['day_name']])) {
            $weeklyCalls[$r['day_name']] = (int)$r['call_count'];
        }
    }
} catch (Exception $e) {}

// Conversion Rates
$contactRate = $totalLeads > 0 ? round(($leadStats['contacted'] / $totalLeads) * 100, 1) : 0;
$qualificationRate = $totalLeads > 0 ? round(($leadStats['qualified'] / $totalLeads) * 100, 1) : 0;
$conversionRate = $totalLeads > 0 ? round(($leadStats['converted'] / $totalLeads) * 100, 1) : 0;

$calledTodayCount = (int)($callStats['calls_today'] ?? 0);
$remainingCount = max(0, (int)$totalLeads - $calledTodayCount);

echo json_encode([
    'success' => true,
    'data' => [
        'total_leads' => (int)$totalLeads,
        'total_assigned' => (int)$totalLeads,
        'new_leads_today' => (int)$newLeadsToday,
        'contacted_leads' => (int)($leadStats['contacted'] ?? 0),
        'qualified_leads' => (int)($leadStats['qualified'] ?? 0),
        'converted_leads' => (int)($leadStats['converted'] ?? 0),
        'lost_leads' => (int)($leadStats['lost'] ?? 0),
        'calls_today' => $calledTodayCount,
        'remaining_calls' => $remainingCount,
        'connected_calls' => (int)($callStats['connected_calls'] ?? 0),
        'no_answer_busy' => (int)($callStats['no_answer_busy'] ?? 0),
        'followups_today' => (int)($fuStats['followups_today'] ?? 0),
        'overdue_followups' => (int)($fuStats['overdue_followups'] ?? 0),
        'meetings_today' => (int)($mtStats['meetings_today'] ?? 0),
        'upcoming_meetings' => (int)($mtStats['upcoming_meetings'] ?? 0),
        'total_projects' => (int)($projectStats['total_projects'] ?? 0),
        'ongoing_projects' => (int)($projectStats['ongoing_projects'] ?? 0),
        'completed_projects' => (int)($projectStats['completed_projects'] ?? 0),
        'total_project_value' => (float)($projectStats['total_project_value'] ?? 0),
        'total_collected_amount' => (float)($projectStats['total_collected_amount'] ?? 0),
        'outcomes_breakdown' => [
            'connected' => (int)($outcomesBreakdown['connected'] ?? 0),
            'no_answer' => (int)($outcomesBreakdown['no_answer'] ?? 0),
            'busy' => (int)($outcomesBreakdown['busy'] ?? 0),
            'switched_off' => (int)($outcomesBreakdown['switched_off'] ?? 0),
            'wrong_number' => (int)($outcomesBreakdown['wrong_number'] ?? 0),
        ],
        'weekly_calls' => $weeklyCalls,
        'rates' => [
            'contact_rate' => $contactRate,
            'qualification_rate' => $qualificationRate,
            'conversion_rate' => $conversionRate
        ],
        'employee_performance' => $employeePerformance
    ]
]);

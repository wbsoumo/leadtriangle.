<?php
// api/reports.php - Operational & Performance Reporting API

header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$reportType = $_GET['type'] ?? 'leads';

// 1. LEAD REPORT
if ($reportType === 'leads') {
    $stmt = $pdo->query("
        SELECT 
            ls.name as status_name, 
            COUNT(l.id) as lead_count,
            SUM(CASE WHEN l.is_qualified = 1 THEN 1 ELSE 0 END) as qualified_count
        FROM lead_statuses ls
        LEFT JOIN leads l ON l.status_id = ls.id AND l.is_archived = 0
        GROUP BY ls.id, ls.name, ls.sort_order
        ORDER BY ls.sort_order ASC
    ");
    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

// 2. CALLING PERFORMANCE REPORT
if ($reportType === 'calls') {
    $stmt = $pdo->query("
        SELECT 
            u.name as agent_name,
            COUNT(c.id) as total_calls,
            SUM(CASE WHEN c.call_outcome_id IN (1, 2, 3, 9, 10) THEN 1 ELSE 0 END) as connected_calls,
            SUM(CASE WHEN c.call_outcome_id IN (5, 6) THEN 1 ELSE 0 END) as no_answer_busy,
            SUM(CASE WHEN c.call_outcome_id IN (3, 9) THEN 1 ELSE 0 END) as meetings_scheduled
        FROM users u
        LEFT JOIN call_logs c ON c.user_id = u.id
        WHERE u.role_id = 3 AND u.status = 'active'
        GROUP BY u.id, u.name
        ORDER BY total_calls DESC
    ");
    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

// 3. REVENUE & PROJECT REPORT
if ($reportType === 'revenue') {
    $stmt = $pdo->query("
        SELECT 
            srv.name as service_name,
            COUNT(p.id) as total_projects,
            SUM(p.final_amount) as total_revenue,
            SUM(p.paid_amount) as collected_amount,
            SUM(p.final_amount - p.paid_amount) as pending_amount
        FROM services srv
        LEFT JOIN projects p ON p.service_id = srv.id
        GROUP BY srv.id, srv.name
        ORDER BY total_revenue DESC
    ");
    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

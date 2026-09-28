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

$action = $_GET['action'] ?? 'json';

// Handle CSV Download
if ($action === 'export') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="crm_analytics_report_' . $reportType . '_' . date('Y-m-d') . '.csv"');
    $output = fopen('php://output', 'w');

    if ($reportType === 'leads') {
        fputcsv($output, ['Lead Status Stage', 'Total Leads Count', 'Qualified Leads', 'Qualification Rate %']);
        $stmt = $pdo->query("
            SELECT ls.name as status_name, COUNT(l.id) as lead_count,
                   SUM(CASE WHEN l.is_qualified = 1 THEN 1 ELSE 0 END) as qualified_count
            FROM lead_statuses ls
            LEFT JOIN leads l ON l.status_id = ls.id AND l.is_archived = 0
            GROUP BY ls.id, ls.name, ls.sort_order ORDER BY ls.sort_order ASC
        ");
        while ($r = $stmt->fetch()) {
            $rate = $r['lead_count'] > 0 ? round(($r['qualified_count'] / $r['lead_count']) * 100, 1) . '%' : '0%';
            fputcsv($output, [$r['status_name'], $r['lead_count'], $r['qualified_count'], $rate]);
        }
    } elseif ($reportType === 'calls') {
        fputcsv($output, ['Executive Name', 'Total Calls Made', 'Connected Calls', 'No Answer / Busy', 'Meetings Scheduled']);
        $stmt = $pdo->query("
            SELECT u.name as agent_name, COUNT(c.id) as total_calls,
                   SUM(CASE WHEN c.call_outcome_id IN (1, 2, 3, 9, 10) THEN 1 ELSE 0 END) as connected_calls,
                   SUM(CASE WHEN c.call_outcome_id IN (5, 6) THEN 1 ELSE 0 END) as no_answer_busy,
                   SUM(CASE WHEN c.call_outcome_id IN (3, 9) THEN 1 ELSE 0 END) as meetings_scheduled
            FROM users u LEFT JOIN call_logs c ON c.user_id = u.id WHERE u.status = 'active'
            GROUP BY u.id, u.name ORDER BY total_calls DESC
        ");
        while ($r = $stmt->fetch()) {
            fputcsv($output, [$r['agent_name'], $r['total_calls'], $r['connected_calls'], $r['no_answer_busy'], $r['meetings_scheduled']]);
        }
    } elseif ($reportType === 'revenue') {
        fputcsv($output, ['Service Name', 'Total Projects', 'Total Revenue (INR)', 'Collected Amount (INR)', 'Pending Amount (INR)']);
        $stmt = $pdo->query("
            SELECT srv.name as service_name, COUNT(p.id) as total_projects,
                   COALESCE(SUM(p.final_amount), 0) as total_revenue,
                   COALESCE(SUM(p.paid_amount), 0) as collected_amount,
                   COALESCE(SUM(p.final_amount - p.paid_amount), 0) as pending_amount
            FROM services srv LEFT JOIN projects p ON p.service_id = srv.id GROUP BY srv.id, srv.name ORDER BY total_revenue DESC
        ");
        while ($r = $stmt->fetch()) {
            fputcsv($output, [$r['service_name'], $r['total_projects'], $r['total_revenue'], $r['collected_amount'], $r['pending_amount']]);
        }
    }
    fclose($output);
    exit;
}

// 1. LEAD STATUS & QUALIFICATION REPORT
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

// 2. TELECALLING PERFORMANCE REPORT BY EXECUTIVE
if ($reportType === 'calls') {
    $stmt = $pdo->query("
        SELECT 
            u.name as agent_name,
            u.email as agent_email,
            COUNT(c.id) as total_calls,
            SUM(CASE WHEN c.call_outcome_id IN (1, 2, 3, 9, 10) THEN 1 ELSE 0 END) as connected_calls,
            SUM(CASE WHEN c.call_outcome_id IN (5, 6) THEN 1 ELSE 0 END) as no_answer_busy,
            SUM(CASE WHEN c.call_outcome_id IN (3, 9) THEN 1 ELSE 0 END) as meetings_scheduled
        FROM users u
        LEFT JOIN call_logs c ON c.user_id = u.id
        WHERE u.status = 'active'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_calls DESC
    ");
    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

// 3. REVENUE & FINANCIAL REPORT BY SERVICE
if ($reportType === 'revenue') {
    $stmt = $pdo->query("
        SELECT 
            srv.name as service_name,
            COUNT(p.id) as total_projects,
            COALESCE(SUM(p.final_amount), 0) as total_revenue,
            COALESCE(SUM(p.paid_amount), 0) as collected_amount,
            COALESCE(SUM(p.final_amount - p.paid_amount), 0) as pending_amount
        FROM services srv
        LEFT JOIN projects p ON p.service_id = srv.id
        GROUP BY srv.id, srv.name
        ORDER BY total_revenue DESC
    ");
    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

// 4. LEAD SOURCE CONVERSION PERFORMANCE
if ($reportType === 'source') {
    $stmt = $pdo->query("
        SELECT 
            src.name as source_name,
            COUNT(l.id) as total_leads,
            SUM(CASE WHEN l.is_qualified = 1 THEN 1 ELSE 0 END) as qualified_leads,
            SUM(CASE WHEN l.status_id = 11 THEN 1 ELSE 0 END) as converted_projects
        FROM lead_sources src
        LEFT JOIN leads l ON l.lead_source_id = src.id AND l.is_archived = 0
        GROUP BY src.id, src.name
        ORDER BY total_leads DESC
    ");
    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

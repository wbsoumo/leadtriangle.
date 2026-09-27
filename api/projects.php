<?php
// api/projects.php - Project Management Workspace & Conversion API

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
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// 1. LIST PROJECTS
if ($action === 'list') {
    $where = [];
    $params = [];

    if ($roleName === 'manager') {
        $where[] = "p.assigned_manager_id = :mgr_id";
        $params['mgr_id'] = $userId;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT 
            p.*, 
            srv.name as service_name,
            ps.name as stage_name, ps.color_code as stage_color,
            u_mgr.name as manager_name
        FROM projects p
        LEFT JOIN services srv ON p.service_id = srv.id
        LEFT JOIN project_stages ps ON p.stage_id = ps.id
        LEFT JOIN users u_mgr ON p.assigned_manager_id = u_mgr.id
        $whereClause
        ORDER BY p.id DESC
    ");
    $stmt->execute($params);
    $projects = $stmt->fetchAll();

    // Mask financial information for Operation Executive if present
    if ($roleName === 'operation_executive') {
        foreach ($projects as &$prj) {
            unset($prj['quoted_amount']);
            unset($prj['final_amount']);
            unset($prj['advance_amount']);
            unset($prj['paid_amount']);
        }
    }

    echo json_encode(['success' => true, 'data' => $projects]);
    exit;
}

// 2. CONVERT OPPORTUNITY TO PROJECT
if ($action === 'convert') {
    if ($roleName === 'operation_executive') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $opportunityId = (int)($_POST['opportunity_id'] ?? 0);
    $finalAmount = (float)($_POST['final_amount'] ?? 0);
    $advanceAmount = (float)($_POST['advance_amount'] ?? 0);
    $deliveryDate = $_POST['expected_delivery_date'] ?? null;

    if (!$opportunityId) {
        echo json_encode(['success' => false, 'message' => 'Opportunity ID required']);
        exit;
    }

    $oppStmt = $pdo->prepare("SELECT o.*, l.name as client_name, l.company_name, l.mobile, l.email FROM opportunities o JOIN leads l ON o.lead_id = l.id WHERE o.id = :id");
    $oppStmt->execute(['id' => $opportunityId]);
    $opp = $oppStmt->fetch();

    if (!$opp) {
        echo json_encode(['success' => false, 'message' => 'Opportunity not found']);
        exit;
    }

    // Code generator
    $codeStmt = $pdo->query("SELECT MAX(id) as max_id FROM projects");
    $nextId = ((int)$codeStmt->fetch()['max_id']) + 2001;
    $prjCode = 'PRJ-' . $nextId;

    $stmt = $pdo->prepare("
        INSERT INTO projects (project_code, opportunity_id, lead_id, client_name, company_name, phone, email, service_id, assigned_manager_id, quoted_amount, final_amount, advance_amount, paid_amount, payment_status, stage_id, start_date, expected_delivery_date)
        VALUES (:code, :opp_id, :lid, :cname, :comp, :phone, :email, :srv, :mgr, :qamt, :famt, :adv, :paid, :pst, 1, CURDATE(), :ddate)
    ");

    $payStatus = ($advanceAmount >= $finalAmount) ? 'Paid' : (($advanceAmount > 0) ? 'Partial' : 'Unpaid');

    $stmt->execute([
        'code'   => $prjCode,
        'opp_id' => $opportunityId,
        'lid'    => $opp['lead_id'],
        'cname'  => $opp['client_name'],
        'comp'   => $opp['company_name'],
        'phone'  => $opp['mobile'],
        'email'  => $opp['email'],
        'srv'    => $opp['service_id'],
        'mgr'    => $opp['assigned_manager_id'],
        'qamt'   => $opp['expected_value'],
        'famt'   => $finalAmount ?: $opp['expected_value'],
        'adv'    => $advanceAmount,
        'paid'   => $advanceAmount,
        'pst'    => $payStatus,
        'ddate'  => $deliveryDate
    ]);

    $projectId = $pdo->lastInsertId();

    // Record Advance Payment if made
    if ($advanceAmount > 0) {
        $pdo->prepare("INSERT INTO payments (project_id, amount, payment_mode, payment_date, recorded_by, notes) VALUES (:pid, :amt, 'UPI', CURDATE(), :uid, 'Advance payment on conversion')")
            ->execute(['pid' => $projectId, 'amt' => $advanceAmount, 'uid' => $userId]);
    }

    // Update Opportunity status to Won & Lead to Converted
    $pdo->prepare("UPDATE opportunities SET status = 'Won', won_at = NOW(), stage_id = 8 WHERE id = :id")->execute(['id' => $opportunityId]);
    $pdo->prepare("UPDATE leads SET status_id = 11 WHERE id = :id")->execute(['id' => $opp['lead_id']]);

    echo json_encode(['success' => true, 'message' => 'Opportunity converted to Project successfully!', 'project_code' => $prjCode]);
    exit;
}

// 3. PROJECT WORKSPACE DETAILS
if ($action === 'detail') {
    $projectId = (int)($_GET['id'] ?? 0);
    if (!$projectId) {
        echo json_encode(['success' => false, 'message' => 'Project ID required']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT p.*, srv.name as service_name, ps.name as stage_name, ps.color_code as stage_color, u_mgr.name as manager_name
        FROM projects p
        LEFT JOIN services srv ON p.service_id = srv.id
        LEFT JOIN project_stages ps ON p.stage_id = ps.id
        LEFT JOIN users u_mgr ON p.assigned_manager_id = u_mgr.id
        WHERE p.id = :id
    ");
    $stmt->execute(['id' => $projectId]);
    $project = $stmt->fetch();

    if (!$project) {
        echo json_encode(['success' => false, 'message' => 'Project not found']);
        exit;
    }

    // Project Updates Timeline
    $upStmt = $pdo->prepare("SELECT pu.*, u.name as user_name FROM project_updates pu JOIN users u ON pu.user_id = u.id WHERE pu.project_id = :id ORDER BY pu.created_at DESC");
    $upStmt->execute(['id' => $projectId]);
    $updates = $upStmt->fetchAll();

    // Payments
    $payStmt = $pdo->prepare("SELECT pay.*, u.name as user_name FROM payments pay JOIN users u ON pay.recorded_by = u.id WHERE pay.project_id = :id ORDER BY pay.payment_date DESC");
    $payStmt->execute(['id' => $projectId]);
    $payments = $payStmt->fetchAll();

    if ($roleName === 'operation_executive') {
        unset($project['quoted_amount']);
        unset($project['final_amount']);
        unset($project['advance_amount']);
        unset($project['paid_amount']);
        $payments = [];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'project' => $project,
            'updates' => $updates,
            'payments' => $payments
        ]
    ]);
    exit;
}

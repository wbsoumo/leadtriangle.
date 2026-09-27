<?php
// api/funnel.php - Sales Funnel & Opportunities API

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
$action = $_GET['action'] ?? $_POST['action'] ?? 'kanban';

// 1. KANBAN BOARD VIEW
if ($action === 'kanban') {
    // Fetch all stages
    $stagesStmt = $pdo->query("SELECT * FROM funnel_stages ORDER BY stage_order ASC");
    $stages = $stagesStmt->fetchAll();

    // Fetch opportunities
    $where = ["o.status = 'Open'"];
    $params = [];

    if ($roleName === 'manager') {
        $where[] = "o.assigned_manager_id = :mgr_id";
        $params['mgr_id'] = $userId;
    }

    $whereClause = "WHERE " . implode(" AND ", $where);

    $oppStmt = $pdo->prepare("
        SELECT 
            o.*, 
            l.name as client_name, l.company_name, l.mobile as phone, l.email,
            srv.name as service_name,
            u_mgr.name as manager_name,
            fs.name as stage_name
        FROM opportunities o
        JOIN leads l ON o.lead_id = l.id
        LEFT JOIN services srv ON o.service_id = srv.id
        LEFT JOIN users u_mgr ON o.assigned_manager_id = u_mgr.id
        JOIN funnel_stages fs ON o.stage_id = fs.id
        $whereClause
        ORDER BY o.id DESC
    ");
    $oppStmt->execute($params);
    $opportunities = $oppStmt->fetchAll();

    // Group by stage
    $kanban = [];
    $totalPipelineValue = 0;
    foreach ($stages as $stage) {
        $kanban[$stage['id']] = [
            'stage' => $stage,
            'items' => [],
            'stage_value' => 0
        ];
    }

    foreach ($opportunities as $opp) {
        if (isset($kanban[$opp['stage_id']])) {
            $kanban[$opp['stage_id']]['items'][] = $opp;
            $val = (float)$opp['expected_value'];
            $kanban[$opp['stage_id']]['stage_value'] += $val;
            $totalPipelineValue += $val;
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'kanban' => array_values($kanban),
            'total_opportunities' => count($opportunities),
            'total_pipeline_value' => $totalPipelineValue
        ]
    ]);
    exit;
}

// 2. PUSH QUALIFIED LEAD TO FUNNEL
if ($action === 'push_lead') {
    $leadId = (int)($_POST['lead_id'] ?? 0);
    $expectedValue = (float)($_POST['expected_value'] ?? 0);
    $serviceId = !empty($_POST['service_id']) ? (int)$_POST['service_id'] : null;
    $managerId = !empty($_POST['assigned_manager_id']) ? (int)$_POST['assigned_manager_id'] : $userId;
    $notes = trim($_POST['notes'] ?? '');

    if (!$leadId) {
        echo json_encode(['success' => false, 'message' => 'Lead ID required']);
        exit;
    }

    $leadStmt = $pdo->prepare("SELECT * FROM leads WHERE id = :id");
    $leadStmt->execute(['id' => $leadId]);
    $lead = $leadStmt->fetch();

    if (!$lead) {
        echo json_encode(['success' => false, 'message' => 'Lead not found']);
        exit;
    }

    // Code generator
    $codeStmt = $pdo->query("SELECT MAX(id) as max_id FROM opportunities");
    $nextId = ((int)$codeStmt->fetch()['max_id']) + 101;
    $oppCode = 'OPP-' . $nextId;

    // Create Opportunity
    $stmt = $pdo->prepare("
        INSERT INTO opportunities (opportunity_code, lead_id, title, service_id, assigned_manager_id, stage_id, expected_value, notes, status)
        VALUES (:code, :lid, :title, :srv, :mgr, 1, :val, :notes, 'Open')
    ");

    $stmt->execute([
        'code'  => $oppCode,
        'lid'   => $leadId,
        'title' => ($lead['company_name'] ?: $lead['name']) . ' - Sales Opportunity',
        'srv'   => $serviceId ?: $lead['service_id'],
        'mgr'   => $managerId ?: ($lead['assigned_manager_id'] ?: 2),
        'val'   => $expectedValue,
        'notes' => $notes
    ]);

    // Update Lead to Qualified
    $pdo->prepare("UPDATE leads SET is_qualified = 1, status_id = 8 WHERE id = :id")->execute(['id' => $leadId]);

    echo json_encode(['success' => true, 'message' => 'Lead pushed to Sales Funnel successfully!', 'opportunity_code' => $oppCode]);
    exit;
}

// 3. MOVE STAGE
if ($action === 'move_stage') {
    $oppId = (int)($_POST['opportunity_id'] ?? 0);
    $newStageId = (int)($_POST['stage_id'] ?? 0);

    if (!$oppId || !$newStageId) {
        echo json_encode(['success' => false, 'message' => 'Opportunity ID and Stage ID required']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE opportunities SET stage_id = :st WHERE id = :id");
    $stmt->execute(['st' => $newStageId, 'id' => $oppId]);

    // Log Activity
    $pdo->prepare("INSERT INTO opportunity_activities (opportunity_id, user_id, to_stage_id) VALUES (:oid, :uid, :to_st)")
        ->execute(['oid' => $oppId, 'uid' => $userId, 'to_st' => $newStageId]);

    echo json_encode(['success' => true, 'message' => 'Opportunity stage updated']);
    exit;
}

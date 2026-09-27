<?php
// api/leads.php - Lead Management API with RBAC, Filters, Duplicate Detection & Assignment

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
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

function logActivity($pdo, $module, $action, $recordId, $oldVal = null, $newVal = null) {
    $stmt = $pdo->prepare("INSERT INTO activity_logs (user_id, module, action, record_id, old_value, new_value, ip_address) VALUES (:uid, :mod, :act, :rec, :old, :new, :ip)");
    $stmt->execute([
        'uid' => $_SESSION['user_id'],
        'mod' => $module,
        'act' => $action,
        'rec' => $recordId,
        'old' => is_array($oldVal) ? json_encode($oldVal) : $oldVal,
        'new' => is_array($newVal) ? json_encode($newVal) : $newVal,
        'ip'  => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);
}

// 1. LIST LEADS
if ($action === 'list') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 15)));
    $offset = ($page - 1) * $limit;

    $search = trim($_GET['search'] ?? '');
    $statusId = $_GET['status_id'] ?? null;
    $sourceId = $_GET['source_id'] ?? null;
    $serviceId = $_GET['service_id'] ?? null;
    $priority = $_GET['priority'] ?? null;
    $managerId = $_GET['manager_id'] ?? null;
    $executiveId = $_GET['executive_id'] ?? null;
    $isQualified = $_GET['is_qualified'] ?? null;
    $callingQueue = $_GET['calling_queue'] ?? null;

    $where = ["l.is_archived = 0"];
    $params = [];

    // Role-based visibility scoping
    if ($roleName === 'operation_executive') {
        $where[] = "l.assigned_executive_id = :rbac_exec_id";
        $params['rbac_exec_id'] = $userId;
    } elseif ($roleName === 'manager') {
        $where[] = "(l.assigned_manager_id = :rbac_mgr_id OR l.assigned_executive_id IN (SELECT id FROM users WHERE team_id = :rbac_team_id))";
        $params['rbac_mgr_id'] = $userId;
        $params['rbac_team_id'] = $teamId;
    }

    if (!empty($search)) {
        $where[] = "(l.name LIKE :search OR l.mobile LIKE :search OR l.email LIKE :search OR l.company_name LIKE :search OR l.lead_code LIKE :search)";
        $params['search'] = "%$search%";
    }
    if (!empty($statusId)) {
        $where[] = "l.status_id = :status_id";
        $params['status_id'] = $statusId;
    }
    if (!empty($sourceId)) {
        $where[] = "l.lead_source_id = :source_id";
        $params['source_id'] = $sourceId;
    }
    if (!empty($serviceId)) {
        $where[] = "l.service_id = :service_id";
        $params['service_id'] = $serviceId;
    }
    if (!empty($priority)) {
        $where[] = "l.priority = :priority";
        $params['priority'] = $priority;
    }
    if (!empty($managerId)) {
        $where[] = "l.assigned_manager_id = :manager_id";
        $params['manager_id'] = $managerId;
    }
    if (!empty($executiveId)) {
        $where[] = "l.assigned_executive_id = :executive_id";
        $params['executive_id'] = $executiveId;
    }
    if ($isQualified !== null && $isQualified !== '') {
        $where[] = "l.is_qualified = :is_qualified";
        $params['is_qualified'] = (int)$isQualified;
    }
    if ($callingQueue === '1') {
        // Today's pending leads to call or follow up
        $where[] = "(DATE(l.next_followup_at) = CURDATE() OR l.status_id IN (1, 2, 3, 4, 6))";
    }

    $whereClause = "WHERE " . implode(" AND ", $where);

    // Count Total
    $countSql = "SELECT COUNT(*) as total FROM leads l $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalRecords = (int)$countStmt->fetch()['total'];

    // Fetch Records
    $sql = "
        SELECT 
            l.*, 
            ls.name as status_name, ls.color_code as status_color,
            src.name as source_name,
            srv.name as service_name,
            u_exec.name as executive_name,
            u_mgr.name as manager_name
        FROM leads l
        LEFT JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN lead_sources src ON l.lead_source_id = src.id
        LEFT JOIN services srv ON l.service_id = srv.id
        LEFT JOIN users u_exec ON l.assigned_executive_id = u_exec.id
        LEFT JOIN users u_mgr ON l.assigned_manager_id = u_mgr.id
        $whereClause
        ORDER BY l.id DESC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue(":$k", $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $leads = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'leads' => $leads,
            'pagination' => [
                'total' => $totalRecords,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($totalRecords / $limit)
            ]
        ]
    ]);
    exit;
}

// 2. CHECK DUPLICATE
if ($action === 'check_duplicate') {
    $mobile = trim($_GET['mobile'] ?? $_POST['mobile'] ?? '');
    if (empty($mobile)) {
        echo json_encode(['success' => false, 'message' => 'Mobile number required']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, lead_code, name, mobile, status_id FROM leads WHERE mobile = :mobile AND is_archived = 0");
    $stmt->execute(['mobile' => $mobile]);
    $existing = $stmt->fetch();

    if ($existing) {
        echo json_encode([
            'success' => true,
            'is_duplicate' => true,
            'existing_lead' => $existing,
            'message' => 'Possible duplicate lead found with this mobile number.'
        ]);
    } else {
        echo json_encode(['success' => true, 'is_duplicate' => false]);
    }
    exit;
}

// 3. CREATE LEAD
if ($action === 'create') {
    $name = trim($_POST['name'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $companyName = trim($_POST['company_name'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $state = trim($_POST['state'] ?? '');
    $leadSourceId = !empty($_POST['lead_source_id']) ? (int)$_POST['lead_source_id'] : null;
    $serviceId = !empty($_POST['service_id']) ? (int)$_POST['service_id'] : null;
    $assignedManagerId = !empty($_POST['assigned_manager_id']) ? (int)$_POST['assigned_manager_id'] : null;
    $assignedExecutiveId = !empty($_POST['assigned_executive_id']) ? (int)$_POST['assigned_executive_id'] : null;
    $priority = $_POST['priority'] ?? 'Medium';
    $initialRemark = trim($_POST['initial_remark'] ?? '');

    if (empty($name) || empty($mobile)) {
        echo json_encode(['success' => false, 'message' => 'Name and Mobile number are required.']);
        exit;
    }

    // Check Duplicate Mobile
    $dupCheck = $pdo->prepare("SELECT id FROM leads WHERE mobile = :mobile AND is_archived = 0");
    $dupCheck->execute(['mobile' => $mobile]);
    if ($dupCheck->fetch()) {
        echo json_encode(['success' => false, 'message' => 'A lead with this mobile number already exists!']);
        exit;
    }

    // Generate Lead Code
    $codeStmt = $pdo->query("SELECT MAX(id) as max_id FROM leads");
    $nextId = ((int)$codeStmt->fetch()['max_id']) + 1001;
    $leadCode = 'LEAD-' . $nextId;

    // Default status: Pending (ID 2) or Assigned if executive selected
    $statusId = 2; // Pending
    if ($assignedExecutiveId) {
        $statusId = 3; // Assigned
    }

    $stmt = $pdo->prepare("
        INSERT INTO leads (lead_code, name, mobile, email, company_name, city, state, lead_source_id, service_id, assigned_manager_id, assigned_executive_id, priority, status_id, initial_remark, created_by)
        VALUES (:code, :name, :mobile, :email, :company, :city, :state, :source, :service, :mgr, :exec, :priority, :status, :remark, :cby)
    ");

    $stmt->execute([
        'code'     => $leadCode,
        'name'     => $name,
        'mobile'   => $mobile,
        'email'    => $email,
        'company'  => $companyName,
        'city'     => $city,
        'state'    => $state,
        'source'   => $leadSourceId,
        'service'  => $serviceId,
        'mgr'      => $assignedManagerId,
        'exec'     => $assignedExecutiveId,
        'priority' => $priority,
        'status'   => $statusId,
        'remark'   => $initialRemark,
        'cby'      => $userId
    ]);

    $leadId = $pdo->lastInsertId();
    logActivity($pdo, 'leads', 'created', $leadId, null, ['name' => $name, 'mobile' => $mobile]);

    echo json_encode(['success' => true, 'message' => 'Lead created successfully!', 'lead_id' => $leadId, 'lead_code' => $leadCode]);
    exit;
}

// 4. GET LEAD DETAILS (Full timeline & info)
if ($action === 'detail') {
    $leadId = (int)($_GET['id'] ?? 0);
    if (!$leadId) {
        echo json_encode(['success' => false, 'message' => 'Lead ID required']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT 
            l.*, 
            ls.name as status_name, ls.color_code as status_color,
            src.name as source_name,
            srv.name as service_name,
            u_exec.name as executive_name, u_exec.mobile as executive_mobile,
            u_mgr.name as manager_name
        FROM leads l
        LEFT JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN lead_sources src ON l.lead_source_id = src.id
        LEFT JOIN services srv ON l.service_id = srv.id
        LEFT JOIN users u_exec ON l.assigned_executive_id = u_exec.id
        LEFT JOIN users u_mgr ON l.assigned_manager_id = u_mgr.id
        WHERE l.id = :id AND l.is_archived = 0
    ");
    $stmt->execute(['id' => $leadId]);
    $lead = $stmt->fetch();

    if (!$lead) {
        echo json_encode(['success' => false, 'message' => 'Lead not found']);
        exit;
    }

    // Call history
    $callStmt = $pdo->prepare("
        SELECT c.*, co.name as outcome_name, co.color_code as outcome_color, u.name as agent_name
        FROM call_logs c
        JOIN call_outcomes co ON c.call_outcome_id = co.id
        JOIN users u ON c.user_id = u.id
        WHERE c.lead_id = :id
        ORDER BY c.called_at DESC
    ");
    $callStmt->execute(['id' => $leadId]);
    $calls = $callStmt->fetchAll();

    // Followups
    $fuStmt = $pdo->prepare("
        SELECT f.*, u.name as agent_name
        FROM followups f
        JOIN users u ON f.user_id = u.id
        WHERE f.lead_id = :id
        ORDER BY f.followup_date DESC, f.followup_time DESC
    ");
    $fuStmt->execute(['id' => $leadId]);
    $followups = $fuStmt->fetchAll();

    // Meetings
    $mtStmt = $pdo->prepare("
        SELECT m.*, mt.name as type_name, u.name as agent_name
        FROM meetings m
        JOIN meeting_types mt ON m.meeting_type_id = mt.id
        JOIN users u ON m.assigned_user_id = u.id
        WHERE m.lead_id = :id
        ORDER BY m.meeting_date DESC
    ");
    $mtStmt->execute(['id' => $leadId]);
    $meetings = $mtStmt->fetchAll();

    // Opportunities & Projects
    $oppStmt = $pdo->prepare("SELECT o.*, fs.name as stage_name FROM opportunities o JOIN funnel_stages fs ON o.stage_id = fs.id WHERE o.lead_id = :id");
    $oppStmt->execute(['id' => $leadId]);
    $opportunities = $oppStmt->fetchAll();

    $prjStmt = $pdo->prepare("SELECT p.*, ps.name as stage_name FROM projects p JOIN project_stages ps ON p.stage_id = ps.id WHERE p.lead_id = :id");
    $prjStmt->execute(['id' => $leadId]);
    $projects = $prjStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'lead' => $lead,
            'calls' => $calls,
            'followups' => $followups,
            'meetings' => $meetings,
            'opportunities' => $opportunities,
            'projects' => $projects
        ]
    ]);
    exit;
}

// 5. ASSIGN / BULK ASSIGN LEADS
if ($action === 'assign') {
    if ($roleName === 'operation_executive') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $leadIds = $_POST['lead_ids'] ?? [];
    if (!is_array($leadIds)) {
        $leadIds = [$leadIds];
    }
    $executiveId = !empty($_POST['executive_id']) ? (int)$_POST['executive_id'] : null;

    if (empty($leadIds) || !$executiveId) {
        echo json_encode(['success' => false, 'message' => 'Select leads and executive for assignment.']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE leads SET assigned_executive_id = :exec_id, status_id = 3 WHERE id = :id");
    $histStmt = $pdo->prepare("INSERT INTO lead_assignments_history (lead_id, new_executive_id, assigned_by) VALUES (:lid, :exec_id, :by)");

    foreach ($leadIds as $id) {
        $stmt->execute(['exec_id' => $executiveId, 'id' => $id]);
        $histStmt->execute(['lid' => $id, 'exec_id' => $executiveId, 'by' => $userId]);
    }

    logActivity($pdo, 'leads', 'assigned', 0, null, ['count' => count($leadIds), 'executive_id' => $executiveId]);

    echo json_encode(['success' => true, 'message' => count($leadIds) . ' lead(s) assigned successfully!']);
    exit;
}

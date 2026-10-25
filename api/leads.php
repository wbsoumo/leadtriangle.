<?php
// api/leads.php - Lead Management API with Full Specification (CRUD, Search, Filters, RBAC, Auto-Assign & CSV Export)

header('Content-Type: application/json');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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

// Auto-migration: ensure row_color column exists on leads table
try {
    $pdo->exec("ALTER TABLE leads ADD COLUMN row_color VARCHAR(30) NULL DEFAULT NULL AFTER status_id");
} catch (Exception $e) {}

// Auto-migration: ensure standard status values exist in lead_statuses
try {
    $standardStatuses = [
        ['New', '#3B82F6'],
        ['Connected', '#10B981'],
        ['Not Interested', '#6B7280'],
        ['Follow-up Needed', '#F59E0B'],
        ['Ringing', '#EAB308'],
        ['Not Responding', '#F97316'],
        ['Invalid Number', '#EF4444'],
        ['Calling', '#06B6D4']
    ];
    $checkStatus = $pdo->prepare("SELECT id FROM lead_statuses WHERE name = :nm");
    $insertStatus = $pdo->prepare("INSERT INTO lead_statuses (name, color_code, is_system) VALUES (:nm, :col, 1)");
    foreach ($standardStatuses as $st) {
        $checkStatus->execute(['nm' => $st[0]]);
        if (!$checkStatus->fetch()) {
            $insertStatus->execute(['nm' => $st[0], 'col' => $st[1]]);
        }
    }
} catch (Exception $e) {}

// Auto-migration: ensure call outcomes exist in call_outcomes
try {
    $standardOutcomes = [
        ['Call Connected', 'connected', '#10B981'],
        ['Calling', 'connected', '#06B6D4'],
        ['Not Interested', 'connected', '#6B7280'],
        ['Ringing', 'not_connected', '#EAB308'],
        ['Not Responding', 'not_connected', '#F97316'],
        ['Invalid Number', 'unreachable', '#EF4444'],
        ['Follow-up Needed', 'connected', '#F59E0B']
    ];
    $checkOutcome = $pdo->prepare("SELECT id FROM call_outcomes WHERE name = :nm");
    $insertOutcome = $pdo->prepare("INSERT INTO call_outcomes (name, category, color_code) VALUES (:nm, :cat, :col)");
    foreach ($standardOutcomes as $oc) {
        $checkOutcome->execute(['nm' => $oc[0]]);
        if (!$checkOutcome->fetch()) {
            $insertOutcome->execute(['nm' => $oc[0], 'cat' => $oc[1], 'col' => $oc[2]]);
        }
    }
} catch (Exception $e) {}

// Check raw JSON body if $_GET or $_POST action is empty
$rawInputData = null;
if (empty($_GET['action']) && empty($_POST['action'])) {
    $bodyContent = file_get_contents('php://input');
    if (!empty($bodyContent)) {
        $rawInputData = json_decode($bodyContent, true);
    }
}

$action = $_GET['action'] ?? $_POST['action'] ?? ($rawInputData['action'] ?? 'list');

function logActivity($pdo, $module, $action, $recordId, $oldVal = null, $newVal = null) {
    try {
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
    } catch (Exception $e) {}
}

// 1. LIST & WORKSPACE LEADS
if ($action === 'list' || $action === 'workspace') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 15)));
    $offset = ($page - 1) * $limit;

    $filter = $_GET['filter'] ?? 'all';
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

    if ($filter === 'to_call') {
        $where[] = "((SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) = 0 AND l.last_contacted_at IS NULL)";
    } elseif ($filter === 'followups' || $filter === 'followup') {
        $where[] = "(l.status_id = 6 OR EXISTS (SELECT 1 FROM followups f WHERE f.lead_id = l.id AND f.status = 'Pending') OR EXISTS (SELECT 1 FROM call_logs cl WHERE cl.lead_id = l.id AND cl.call_outcome_id IN (3, 6)))";
    } elseif ($filter === 'called') {
        $where[] = "((SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) > 0 OR l.last_contacted_at IS NOT NULL)";
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
    
    // Additional workspace filters
    $rowColor = trim($_GET['row_color'] ?? '');
    if (!empty($rowColor)) {
        if ($rowColor === 'default' || $rowColor === 'none') {
            $where[] = "(l.row_color IS NULL OR l.row_color = '')";
        } else {
            $where[] = "l.row_color = :row_color";
            $params['row_color'] = $rowColor;
        }
    }

    $followupDate = trim($_GET['followup_date'] ?? '');
    if (!empty($followupDate)) {
        if ($followupDate === 'today') {
            $where[] = "DATE(l.next_followup_at) = CURDATE()";
        } elseif ($followupDate === 'upcoming') {
            $where[] = "DATE(l.next_followup_at) > CURDATE()";
        } elseif ($followupDate === 'overdue') {
            $where[] = "(DATE(l.next_followup_at) < CURDATE() AND l.next_followup_at IS NOT NULL)";
        } elseif ($followupDate === 'has_followup') {
            $where[] = "l.next_followup_at IS NOT NULL";
        } else {
            $where[] = "DATE(l.next_followup_at) = :followup_date";
            $params['followup_date'] = $followupDate;
        }
    }

    // Specific Status Name Filter (e.g. 'New', 'Connected', 'Not Interested', 'Ringing', 'Not Responding', 'Invalid Number', 'Follow-up Needed', 'Calling')
    $statusName = trim($_GET['status_name'] ?? '');
    if (!empty($statusName)) {
        $where[] = "ls.name = :status_name";
        $params['status_name'] = $statusName;
    }

    // Unconnected Filter
    if ($filter === 'unconnected') {
        $where[] = "(l.status_id = 1 OR ls.name IN ('New', 'Pending', 'Unconnected', 'Switched Off', 'Not Reachable', 'Ringing', 'Not Responding', 'Busy') OR (SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) = 0)";
    }

    if ($callingQueue === '1') {
        if ($filter !== 'called' && $filter !== 'all' && empty($statusId)) {
            $where[] = "(DATE(l.next_followup_at) = CURDATE() OR l.status_id IN (1, 2, 3, 4, 6))";
        }
    }

    // Sorting
    $sortBy = $_GET['sort_by'] ?? 'id';
    $sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    $allowedSort = [
        'id' => 'l.id',
        'name' => 'l.name',
        'mobile' => 'l.mobile',
        'company' => 'l.company_name',
        'status' => 'ls.name',
        'created_at' => 'l.created_at',
        'next_followup' => 'l.next_followup_at',
        'last_contacted' => 'l.last_contacted_at'
    ];
    $orderByClause = $allowedSort[$sortBy] ?? 'l.id';

    $whereClause = "WHERE " . implode(" AND ", $where);

    // Count Total
    $countSql = "SELECT COUNT(*) as total FROM leads l $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalRecords = (int)$countStmt->fetch()['total'];

    // Fetch Records with Latest Call Outcome
    $sql = "
        SELECT 
            l.*, 
            ls.name as status_name, ls.color_code as status_color,
            src.name as source_name,
            srv.name as service_name,
            u_exec.name as executive_name,
            u_mgr.name as manager_name,
            (SELECT co.name FROM call_logs cl JOIN call_outcomes co ON cl.call_outcome_id = co.id WHERE cl.lead_id = l.id ORDER BY cl.id DESC LIMIT 1) as latest_call_outcome,
            (SELECT cl.called_at FROM call_logs cl WHERE cl.lead_id = l.id ORDER BY cl.id DESC LIMIT 1) as latest_call_at,
            (SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) as call_count
        FROM leads l
        LEFT JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN lead_sources src ON l.lead_source_id = src.id
        LEFT JOIN services srv ON l.service_id = srv.id
        LEFT JOIN users u_exec ON l.assigned_executive_id = u_exec.id
        LEFT JOIN users u_mgr ON l.assigned_manager_id = u_mgr.id
        $whereClause
        ORDER BY $orderByClause $sortOrder
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

    // Summary counts for tabs
    $countsWhere = "WHERE l.is_archived = 0";
    $countsParams = [];
    if ($roleName === 'operation_executive') {
        $countsWhere .= " AND l.assigned_executive_id = :exec_id";
        $countsParams['exec_id'] = $userId;
    }
    $countsSql = "
        SELECT 
            COUNT(*) as total_count,
            SUM(CASE WHEN ((SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) = 0 AND l.last_contacted_at IS NULL) THEN 1 ELSE 0 END) as to_call_count,
            SUM(CASE WHEN (l.status_id = 6 OR EXISTS (SELECT 1 FROM followups f WHERE f.lead_id = l.id AND f.status = 'Pending') OR EXISTS (SELECT 1 FROM call_logs cl WHERE cl.lead_id = l.id AND cl.call_outcome_id IN (3, 6))) THEN 1 ELSE 0 END) as followups_count,
            SUM(CASE WHEN ((SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) > 0 OR l.last_contacted_at IS NOT NULL) THEN 1 ELSE 0 END) as called_count
        FROM leads l $countsWhere
    ";
    $cStmt = $pdo->prepare($countsSql);
    $cStmt->execute($countsParams);
    $summaryCounts = $cStmt->fetch();

    foreach ($leads as &$leadItem) {
        if (!isset($leadItem['phone']) && isset($leadItem['mobile'])) {
            $leadItem['phone'] = $leadItem['mobile'];
        }
        if (!isset($leadItem['next_followup_date']) && isset($leadItem['next_followup_at'])) {
            $leadItem['next_followup_date'] = $leadItem['next_followup_at'];
        }
        if (!isset($leadItem['last_remarks'])) {
            $leadItem['last_remarks'] = $leadItem['latest_call_outcome'] ?? $leadItem['initial_remark'] ?? '-';
        }
    }
    unset($leadItem);

    echo json_encode([
        'success' => true,
        'data' => $leads,
        'leads' => $leads,
        'pagination' => [
            'total' => $totalRecords,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($totalRecords / $limit)
        ],
        'counts' => [
            'to_call' => (int)($summaryCounts['to_call_count'] ?? 0),
            'followups' => (int)($summaryCounts['followups_count'] ?? 0),
            'called' => (int)($summaryCounts['called_count'] ?? 0),
            'all' => (int)($summaryCounts['total_count'] ?? 0),
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
    // Role-based permission: Telecallers / Operations Executives cannot create leads
    if ($roleName === 'operation_executive') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Permission denied: Only Administrators and Managers can add new leads.']);
        exit;
    }
    $name = trim($_POST['name'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $alternateMobile = trim($_POST['alternate_mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $companyName = trim($_POST['company_name'] ?? '');
    $location = trim($_POST['location'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $state = trim($_POST['state'] ?? '');
    $industry = trim($_POST['industry'] ?? '');
    $leadSourceId = !empty($_POST['lead_source_id']) ? (int)$_POST['lead_source_id'] : null;
    $serviceId = !empty($_POST['service_id']) ? (int)$_POST['service_id'] : null;
    $leadType = $_POST['lead_type'] ?? 'Outbound';
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
    $statusId = $assignedExecutiveId ? 3 : 2;

    $stmt = $pdo->prepare("
        INSERT INTO leads (lead_code, name, mobile, alternate_mobile, email, company_name, location, city, state, industry, lead_source_id, service_id, lead_type, assigned_manager_id, assigned_executive_id, priority, status_id, initial_remark, created_by)
        VALUES (:code, :name, :mobile, :alt_mob, :email, :company, :loc, :city, :state, :ind, :source, :service, :ltype, :mgr, :exec, :priority, :status, :remark, :cby)
    ");

    $stmt->execute([
        'code'     => $leadCode,
        'name'     => $name,
        'mobile'   => $mobile,
        'alt_mob'  => $alternateMobile,
        'email'    => $email,
        'company'  => $companyName,
        'loc'      => $location,
        'city'     => $city,
        'state'    => $state,
        'ind'      => $industry,
        'source'   => $leadSourceId,
        'service'  => $serviceId,
        'ltype'    => $leadType,
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
if ($action === 'detail' || $action === 'get') {
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

    // Call history with agent details
    $callStmt = $pdo->prepare("
        SELECT c.*, co.name as outcome_name, co.color_code as outcome_color, u.name as agent_name, u.email as agent_email
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
        ORDER BY m.meeting_date DESC, m.meeting_time DESC
    ");
    $mtStmt->execute(['id' => $leadId]);
    $meetings = $mtStmt->fetchAll();

    // Opportunities
    $oppStmt = $pdo->prepare("
        SELECT o.*, fs.name as stage_name, u.name as manager_name
        FROM opportunities o
        JOIN funnel_stages fs ON o.stage_id = fs.id
        LEFT JOIN users u ON o.assigned_manager_id = u.id
        WHERE o.lead_id = :id
        ORDER BY o.id DESC
    ");
    $oppStmt->execute(['id' => $leadId]);
    $opportunities = $oppStmt->fetchAll();

    // Projects
    $prjStmt = $pdo->prepare("
        SELECT p.*, ps.name as stage_name
        FROM projects p
        LEFT JOIN project_stages ps ON p.stage_id = ps.id
        WHERE p.lead_id = :id
        ORDER BY p.id DESC
    ");
    $prjStmt->execute(['id' => $leadId]);
    $projects = $prjStmt->fetchAll();

    // Assignment & Reassignment History
    $ahStmt = $pdo->prepare("
        SELECT ah.*, u_prev.name as previous_agent, u_new.name as new_agent, u_by.name as assigned_by_name
        FROM lead_assignments_history ah
        LEFT JOIN users u_prev ON ah.previous_executive_id = u_prev.id
        LEFT JOIN users u_new ON ah.new_executive_id = u_new.id
        LEFT JOIN users u_by ON ah.assigned_by = u_by.id
        WHERE ah.lead_id = :id
        ORDER BY ah.id DESC
    ");
    $ahStmt->execute(['id' => $leadId]);
    $assignmentsHistory = $ahStmt->fetchAll();

    // Notes
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lead_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lead_id INT NOT NULL,
                user_id INT NOT NULL,
                note_text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_note_lead (lead_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } catch (Exception $e) {}

    // Documents
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lead_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lead_id INT NOT NULL,
                user_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_doc_lead (lead_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } catch (Exception $e) {}

    $notesStmt = $pdo->prepare("SELECT n.*, u.name as author_name FROM lead_notes n JOIN users u ON n.user_id = u.id WHERE n.lead_id = :id ORDER BY n.created_at DESC");
    $notesStmt->execute(['id' => $leadId]);
    $notes = $notesStmt->fetchAll();

    $docsStmt = $pdo->prepare("SELECT d.*, u.name as author_name FROM lead_documents d JOIN users u ON d.user_id = u.id WHERE d.lead_id = :id ORDER BY d.uploaded_at DESC");
    $docsStmt->execute(['id' => $leadId]);
    $documents = $docsStmt->fetchAll();

    // Full Lead Activity Logs
    $actStmt = $pdo->prepare("
        SELECT al.*, u.name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.record_id = :id AND al.module IN ('leads', 'calls')
        ORDER BY al.id DESC
    ");
    $actStmt->execute(['id' => $leadId]);
    $logs = $actStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'lead' => $lead,
            'calls' => $calls,
            'followups' => $followups,
            'meetings' => $meetings,
            'opportunities' => $opportunities,
            'projects' => $projects,
            'notes' => $notes,
            'documents' => $documents,
            'assignments_history' => $assignmentsHistory
        ],
        'logs' => $logs
    ]);
    exit;
}

// 4b. ADD NOTE
if ($action === 'add_note') {
    $leadId = (int)($_POST['lead_id'] ?? 0);
    $noteText = trim($_POST['note_text'] ?? '');
    if (!$leadId || empty($noteText)) {
        echo json_encode(['success' => false, 'message' => 'Lead ID and Note text required']);
        exit;
    }

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS lead_notes (id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT NOT NULL, user_id INT NOT NULL, note_text TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    } catch(Exception $e) {}

    $stmt = $pdo->prepare("INSERT INTO lead_notes (lead_id, user_id, note_text, created_at) VALUES (:lid, :uid, :txt, NOW())");
    $stmt->execute(['lid' => $leadId, 'uid' => $userId, 'txt' => $noteText]);

    echo json_encode(['success' => true, 'message' => 'Note saved successfully!']);
    exit;
}

// 4d. UPDATE ROW COLOR (Google Sheets Style)
if ($action === 'update_row_color') {
    $leadId = (int)($_POST['lead_id'] ?? ($rawInputData['lead_id'] ?? 0));
    $rowColor = trim($_POST['row_color'] ?? ($rawInputData['row_color'] ?? ''));

    if (!$leadId) {
        echo json_encode(['success' => false, 'message' => 'Lead ID required']);
        exit;
    }

    $colorVal = empty($rowColor) || $rowColor === 'default' ? null : $rowColor;
    $stmt = $pdo->prepare("UPDATE leads SET row_color = :col WHERE id = :id");
    $stmt->execute(['col' => $colorVal, 'id' => $leadId]);

    echo json_encode(['success' => true, 'message' => 'Row color updated successfully', 'row_color' => $colorVal]);
    exit;
}

// 4e. UPDATE DISPOSITION & AUTOMATIC STATUS (Workspace Fast Action)
if ($action === 'update_disposition') {
    $leadId = (int)($_POST['lead_id'] ?? ($rawInputData['lead_id'] ?? 0));
    $disposition = trim($_POST['disposition'] ?? ($rawInputData['disposition'] ?? ''));
    $remarks = trim($_POST['remarks'] ?? ($rawInputData['remarks'] ?? ''));
    $followupDate = trim($_POST['followup_date'] ?? ($rawInputData['followup_date'] ?? ''));
    $followupTime = trim($_POST['followup_time'] ?? ($rawInputData['followup_time'] ?? ''));
    $customRowColor = trim($_POST['row_color'] ?? ($rawInputData['row_color'] ?? ''));

    if (!$leadId || empty($disposition)) {
        echo json_encode(['success' => false, 'message' => 'Lead ID and Disposition action are required']);
        exit;
    }

    // Mapping dispositions to lead status names and colors
    // Supported: Calling, Call Connected, Not Interested, Ringing, Not Responding, Invalid Number, Follow-up Needed
    $statusMap = [
        'Calling'          => ['name' => 'Calling',          'color' => '#06B6D4'],
        'Call Connected'   => ['name' => 'Connected',        'color' => '#10B981'],
        'Connected'        => ['name' => 'Connected',        'color' => '#10B981'],
        'Not Interested'   => ['name' => 'Not Interested',   'color' => '#6B7280'],
        'Ringing'          => ['name' => 'Ringing',          'color' => '#EAB308'],
        'Not Responding'   => ['name' => 'Not Responding',   'color' => '#F97316'],
        'Invalid Number'   => ['name' => 'Invalid Number',   'color' => '#EF4444'],
        'Follow-up Needed' => ['name' => 'Follow-up Needed', 'color' => '#F59E0B'],
        'New'              => ['name' => 'New',              'color' => '#3B82F6']
    ];

    $matched = $statusMap[$disposition] ?? ['name' => 'Contacted', 'color' => '#10B981'];
    $statusName = $matched['name'];
    $autoColor = !empty($customRowColor) ? $customRowColor : $matched['color'];

    // Retrieve or create status_id
    $stStmt = $pdo->prepare("SELECT id FROM lead_statuses WHERE name = :nm LIMIT 1");
    $stStmt->execute(['nm' => $statusName]);
    $stRow = $stStmt->fetch();
    if ($stRow) {
        $newStatusId = (int)$stRow['id'];
    } else {
        $insertSt = $pdo->prepare("INSERT INTO lead_statuses (name, color_code, is_system) VALUES (:nm, :col, 1)");
        $insertSt->execute(['nm' => $statusName, 'col' => $matched['color']]);
        $newStatusId = (int)$pdo->lastInsertId();
    }

    // Retrieve or create call outcome
    $ocStmt = $pdo->prepare("SELECT id FROM call_outcomes WHERE name = :nm LIMIT 1");
    $ocStmt->execute(['nm' => $disposition]);
    $ocRow = $ocStmt->fetch();
    if ($ocRow) {
        $outcomeId = (int)$ocRow['id'];
    } else {
        $category = in_array($disposition, ['Call Connected', 'Connected']) ? 'connected' : (in_array($disposition, ['Ringing', 'Not Responding']) ? 'not_connected' : 'unreachable');
        $insertOc = $pdo->prepare("INSERT INTO call_outcomes (name, category, color_code) VALUES (:nm, :cat, :col)");
        $insertOc->execute(['nm' => $disposition, 'cat' => $category, 'col' => $matched['color']]);
        $outcomeId = (int)$pdo->lastInsertId();
    }

    // Record Call Log / Action History
    $callLogStmt = $pdo->prepare("
        INSERT INTO call_logs (lead_id, user_id, call_outcome_id, call_duration_seconds, remarks, called_at)
        VALUES (:lid, :uid, :oid, 0, :rem, NOW())
    ");
    $callLogStmt->execute([
        'lid' => $leadId,
        'uid' => $userId,
        'oid' => $outcomeId,
        'rem' => !empty($remarks) ? $remarks : "Disposition: $disposition"
    ]);

    // Handle Follow-up scheduling if Follow-up Needed
    $nextFollowupAt = null;
    if ($disposition === 'Follow-up Needed' && !empty($followupDate)) {
        $fTime = !empty($followupTime) ? $followupTime : '10:00:00';
        $nextFollowupAt = "$followupDate $fTime";

        $fuStmt = $pdo->prepare("
            INSERT INTO followups (lead_id, user_id, followup_date, followup_time, purpose, notes, status, created_at)
            VALUES (:lid, :uid, :fdate, :ftime, :purpose, :notes, 'Pending', NOW())
        ");
        $fuStmt->execute([
            'lid' => $leadId,
            'uid' => $userId,
            'fdate' => $followupDate,
            'ftime' => $fTime,
            'purpose' => 'Follow-up Needed',
            'notes' => $remarks
        ]);
    }

    // Update Lead Record
    if ($nextFollowupAt) {
        $updLead = $pdo->prepare("
            UPDATE leads 
            SET status_id = :st, row_color = :col, last_contacted_at = NOW(), next_followup_at = :nfu 
            WHERE id = :id
        ");
        $updLead->execute([
            'st'  => $newStatusId,
            'col' => $autoColor,
            'nfu' => $nextFollowupAt,
            'id'  => $leadId
        ]);
    } else {
        $updLead = $pdo->prepare("
            UPDATE leads 
            SET status_id = :st, row_color = :col, last_contacted_at = NOW() 
            WHERE id = :id
        ");
        $updLead->execute([
            'st'  => $newStatusId,
            'col' => $autoColor,
            'id'  => $leadId
        ]);
    }

    logActivity($pdo, 'leads', 'disposition_updated', $leadId, null, [
        'disposition' => $disposition,
        'status' => $statusName,
        'remarks' => $remarks,
        'row_color' => $autoColor
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Lead updated to $disposition successfully!",
        'data' => [
            'lead_id' => $leadId,
            'disposition' => $disposition,
            'status_name' => $statusName,
            'status_color' => $matched['color'],
            'row_color' => $autoColor,
            'next_followup_at' => $nextFollowupAt
        ]
    ]);
    exit;
}

// 4c. UPLOAD DOCUMENT
if ($action === 'upload_document') {
    $leadId = (int)($_POST['lead_id'] ?? 0);
    if (!$leadId || empty($_FILES['document'])) {
        echo json_encode(['success' => false, 'message' => 'Lead ID and File required']);
        exit;
    }

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS lead_documents (id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT NOT NULL, user_id INT NOT NULL, file_name VARCHAR(255) NOT NULL, file_path VARCHAR(255) NOT NULL, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    } catch(Exception $e) {}

    $uploadDir = __DIR__ . '/../uploads/lead_docs/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $fileName = basename($_FILES['document']['name']);
    $targetPath = $uploadDir . time() . '_' . $fileName;
    $relPath = 'uploads/lead_docs/' . time() . '_' . $fileName;

    if (move_uploaded_file($_FILES['document']['tmp_name'], $targetPath)) {
        $stmt = $pdo->prepare("INSERT INTO lead_documents (lead_id, user_id, file_name, file_path, uploaded_at) VALUES (:lid, :uid, :fname, :fpath, NOW())");
        $stmt->execute(['lid' => $leadId, 'uid' => $userId, 'fname' => $fileName, 'fpath' => $relPath]);

        echo json_encode(['success' => true, 'message' => 'Document uploaded successfully!', 'file_name' => $fileName]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save uploaded file']);
    }
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

    // Verify target executive exists
    $execCheck = $pdo->prepare("SELECT id, name FROM users WHERE id = :id AND status = 'active'");
    $execCheck->execute(['id' => $executiveId]);
    $targetExec = $execCheck->fetch();
    if (!$targetExec) {
        echo json_encode(['success' => false, 'message' => 'Target executive not found or inactive.']);
        exit;
    }

    $getPrev = $pdo->prepare("SELECT id, name, assigned_executive_id, status_id FROM leads WHERE id = :id");
    $stmt = $pdo->prepare("UPDATE leads SET assigned_executive_id = :exec_id, status_id = 3 WHERE id = :id");
    $histStmt = $pdo->prepare("
        INSERT INTO lead_assignments_history (lead_id, previous_executive_id, new_executive_id, assigned_by, assigned_at) 
        VALUES (:lid, :prev, :new, :by, NOW())
    ");

    $successCount = 0;
    $failedIds = [];

    foreach ($leadIds as $id) {
        $lid = (int)$id;
        $getPrev->execute(['id' => $lid]);
        $leadRow = $getPrev->fetch();
        if ($leadRow) {
            $prevExecId = $leadRow['assigned_executive_id'];
            $stmt->execute(['exec_id' => $executiveId, 'id' => $lid]);
            $histStmt->execute(['lid' => $lid, 'prev' => $prevExecId, 'new' => $executiveId, 'by' => $userId]);

            // Also record in activity_logs
            try {
                $pdo->prepare("
                    INSERT INTO activity_logs (user_id, module, action, record_id, old_value, new_value, ip_address)
                    VALUES (:uid, 'leads', 'reassigned', :rec, :old, :new, :ip)
                ")->execute([
                    'uid' => $userId,
                    'rec' => $lid,
                    'old' => json_encode(['assigned_executive_id' => $prevExecId]),
                    'new' => json_encode(['assigned_executive_id' => $executiveId, 'assigned_to_name' => $targetExec['name']]),
                    'ip'  => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
                ]);
            } catch(Exception $e) {}

            $successCount++;
        } else {
            $failedIds[] = $lid;
        }
    }

    logActivity($pdo, 'leads', 'assigned', 0, null, ['count' => $successCount, 'executive_id' => $executiveId]);

    echo json_encode([
        'success' => true,
        'message' => "$successCount lead(s) successfully assigned to {$targetExec['name']}!",
        'assigned_count' => $successCount,
        'failed_count' => count($failedIds),
        'failed_ids' => $failedIds,
        'target_executive' => $targetExec['name']
    ]);
    exit;
}

// 6. AUTO ASSIGN (ROUND ROBIN)
if ($action === 'auto_assign') {
    if ($roleName === 'operation_executive') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $leadIds = $_POST['lead_ids'] ?? [];
    if (!is_array($leadIds)) {
        $leadIds = [$leadIds];
    }

    if (empty($leadIds)) {
        echo json_encode(['success' => false, 'message' => 'Select leads to auto-assign.']);
        exit;
    }

    // Get active Operation Executives
    $execs = $pdo->query("SELECT id, name FROM users WHERE role_id = 3 AND status = 'active' ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    if (empty($execs)) {
        echo json_encode(['success' => false, 'message' => 'No active Operation Executives available for auto-assignment.']);
        exit;
    }

    $getPrev = $pdo->prepare("SELECT id, assigned_executive_id FROM leads WHERE id = :id");
    $stmt = $pdo->prepare("UPDATE leads SET assigned_executive_id = :exec_id, status_id = 3 WHERE id = :id");
    $histStmt = $pdo->prepare("
        INSERT INTO lead_assignments_history (lead_id, previous_executive_id, new_executive_id, assigned_by, assigned_at) 
        VALUES (:lid, :prev, :new, :by, NOW())
    ");

    $execCount = count($execs);
    $assignedCount = 0;

    foreach ($leadIds as $idx => $id) {
        $lid = (int)$id;
        $getPrev->execute(['id' => $lid]);
        $leadRow = $getPrev->fetch();
        $prevExecId = $leadRow ? $leadRow['assigned_executive_id'] : null;

        $targetObj = $execs[$idx % $execCount];
        $assignedExec = $targetObj['id'];

        $stmt->execute(['exec_id' => $assignedExec, 'id' => $lid]);
        $histStmt->execute(['lid' => $lid, 'prev' => $prevExecId, 'new' => $assignedExec, 'by' => $userId]);

        try {
            $pdo->prepare("
                INSERT INTO activity_logs (user_id, module, action, record_id, old_value, new_value, ip_address)
                VALUES (:uid, 'leads', 'auto_assigned', :rec, :old, :new, :ip)
            ")->execute([
                'uid' => $userId,
                'rec' => $lid,
                'old' => json_encode(['assigned_executive_id' => $prevExecId]),
                'new' => json_encode(['assigned_executive_id' => $assignedExec, 'assigned_to_name' => $targetObj['name']]),
                'ip'  => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch(Exception $e) {}

        $assignedCount++;
    }

    logActivity($pdo, 'leads', 'auto_assigned', 0, null, ['count' => $assignedCount]);
    echo json_encode([
        'success' => true,
        'message' => "$assignedCount leads distributed equally across " . count($execs) . " executives via Round Robin!",
        'assigned_count' => $assignedCount
    ]);
    exit;
}

// 7. EDIT LEAD
if ($action === 'edit') {
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Lead ID required']);
        exit;
    }

    $name = trim($_POST['name'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $company = trim($_POST['company_name'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $statusId = (int)($_POST['status_id'] ?? 1);
    $priority = $_POST['priority'] ?? 'Medium';
    $executiveId = !empty($_POST['assigned_executive_id']) ? (int)$_POST['assigned_executive_id'] : null;

    $stmt = $pdo->prepare("
        UPDATE leads SET name = :name, mobile = :mobile, email = :email, company_name = :company, city = :city, status_id = :st, priority = :priority, assigned_executive_id = :exec WHERE id = :id
    ");
    $stmt->execute([
        'name'     => $name,
        'mobile'   => $mobile,
        'email'    => $email,
        'company'  => $company,
        'city'     => $city,
        'st'       => $statusId,
        'priority' => $priority,
        'exec'     => $executiveId,
        'id'       => $id
    ]);

    logActivity($pdo, 'leads', 'updated', $id);
    echo json_encode(['success' => true, 'message' => 'Lead details updated successfully!']);
    exit;
}

// 8. DELETE / ARCHIVE LEAD
if ($action === 'delete') {
    if ($roleName === 'operation_executive') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $id = (int)($_POST['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Lead ID required']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE leads SET is_archived = 1 WHERE id = :id");
    $stmt->execute(['id' => $id]);

    logActivity($pdo, 'leads', 'archived', $id);
    echo json_encode(['success' => true, 'message' => 'Lead archived successfully!']);
    exit;
}

// 9. EXPORT LEADS TO CSV
if ($action === 'export') {
    if ($roleName === 'operation_executive') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized to export data']);
        exit;
    }

    $stmt = $pdo->query("
        SELECT l.lead_code, l.name, l.mobile, l.email, l.company_name, l.city, ls.name as status, srv.name as service, u_exec.name as executive, l.created_at
        FROM leads l
        LEFT JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN services srv ON l.service_id = srv.id
        LEFT JOIN users u_exec ON l.assigned_executive_id = u_exec.id
        WHERE l.is_archived = 0
        ORDER BY l.id DESC
    ");
    $rows = $stmt->fetchAll();

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="crm_leads_export_' . date('Y-m-d') . '.csv"');
    
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Lead Code', 'Name', 'Mobile', 'Email', 'Company', 'City', 'Status', 'Service', 'Executive', 'Created Date']);
    foreach ($rows as $r) {
        fputcsv($output, $r);
    }
    fclose($output);
    exit;
}

// 10. SAMPLE CSV TEMPLATE DOWNLOAD
if ($action === 'sample_csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="sample_lead_import_template.csv"');
    
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Full Name', 'Mobile Number', 'Email Address', 'Company Name', 'City', 'Priority', 'Service Requested', 'Lead Source', 'Initial Requirement']);
    fputcsv($output, ['Soumojit Saha', '8016222991', 'wbsoumo@gmail.com', 'Taskbazi', 'Kolkata', 'High Priority', 'Mobile App Development', 'Client Referral', 'Need CRM and Calling BPO Android app']);
    fputcsv($output, ['Amit Sharma', '9876543210', 'amit@example.com', 'Tech Corp', 'Mumbai', 'Medium Priority', 'Web Development', 'Google Ads', 'E-commerce website requirement']);
    fputcsv($output, ['Priya Patel', '9123456789', 'priya@example.com', 'Innovate India', 'Bangalore', 'High Priority', 'SEO & Marketing', 'LinkedIn', 'SEO and digital marketing package']);
    fclose($output);
    exit;
}

// 11. BULK CSV IMPORT WITH ASSIGNMENT
if ($action === 'import_csv') {
    if ($roleName === 'operation_executive') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized to bulk import leads']);
        exit;
    }

    // Clean any prior output buffer to ensure pure JSON
    if (ob_get_length()) ob_clean();

    $inputData = $rawInputData ?? json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $leads = $inputData['leads'] ?? [];
    if (is_string($leads)) {
        $leads = json_decode($leads, true) ?? [];
    }

    $assignedManagerId = !empty($inputData['assigned_manager_id']) ? (int)$inputData['assigned_manager_id'] : null;
    $assignedExecutiveId = !empty($inputData['assigned_executive_id']) ? (int)$inputData['assigned_executive_id'] : null;
    $priorityOverride = $inputData['priority_override'] ?? $inputData['priority'] ?? null;

    if (empty($leads) || !is_array($leads)) {
        echo json_encode(['success' => false, 'message' => 'No valid lead rows provided for import.']);
        exit;
    }

    $inserted = 0;
    $skipped = 0;

    $stmt = $pdo->prepare("
        INSERT INTO leads (lead_code, name, mobile, email, company_name, city, priority, initial_requirement, assigned_manager_id, assigned_executive_id, status_id, created_by, created_at)
        VALUES (:code, :name, :mobile, :email, :company, :city, :priority, :req, :mgr, :exec, 1, :cby, NOW())
    ");

    $checkStmt = $pdo->prepare("SELECT id FROM leads WHERE mobile = :mobile LIMIT 1");

    foreach ($leads as $l) {
        $name = trim($l['full_name'] ?? $l['name'] ?? '');
        $mobile = trim($l['mobile'] ?? '');
        $email = trim($l['email'] ?? '');
        $company = trim($l['company_name'] ?? '');
        $city = trim($l['city'] ?? '');
        $req = trim($l['requirement'] ?? $l['initial_requirement'] ?? $l['requirements'] ?? '');
        
        $prio = (!empty($priorityOverride) && $priorityOverride !== 'Keep CSV Value' && $priorityOverride !== 'keep_csv') 
            ? $priorityOverride 
            : (!empty($l['priority']) ? trim($l['priority']) : 'Medium');

        if (empty($name) || empty($mobile)) {
            $skipped++;
            continue;
        }

        // Check duplicates by mobile
        $checkStmt->execute(['mobile' => $mobile]);
        if ($checkStmt->fetch()) {
            $skipped++;
            continue;
        }

        $code = 'L-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));

        try {
            $stmt->execute([
                'code'     => $code,
                'name'     => $name,
                'mobile'   => $mobile,
                'email'    => $email,
                'company'  => $company,
                'city'     => $city,
                'priority' => $prio,
                'req'      => $req,
                'mgr'      => $assignedManagerId,
                'exec'     => $assignedExecutiveId,
                'cby'      => $userId
            ]);
            $inserted++;
        } catch (Exception $e) {
            error_log("Bulk CSV Insert Lead Exception: " . $e->getMessage());
            $skipped++;
        }
    }

    logActivity($pdo, 'leads', 'bulk_imported', 0, null, ['imported' => $inserted, 'skipped' => $skipped]);

    echo json_encode([
        'success' => true,
        'message' => "Successfully imported $inserted leads! ($skipped skipped or duplicate numbers)",
        'summary' => [
            'total_submitted' => count($leads),
            'imported' => $inserted,
            'duplicates_skipped'  => $skipped
        ]
    ]);
    exit;
}

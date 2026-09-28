<?php
// api/settings.php - System Options, Custom Statuses, Sources, Services & Audit Logs API

header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$action = $_GET['action'] ?? $_POST['action'] ?? 'get_dropdowns';

if ($action === 'get_dropdowns') {
    $statuses = $pdo->query("SELECT * FROM lead_statuses ORDER BY sort_order ASC")->fetchAll();
    $sources = $pdo->query("SELECT * FROM lead_sources WHERE is_active = 1 ORDER BY name ASC")->fetchAll();
    $services = $pdo->query("SELECT * FROM services WHERE is_active = 1 ORDER BY name ASC")->fetchAll();
    $outcomes = $pdo->query("SELECT * FROM call_outcomes ORDER BY id ASC")->fetchAll();
    $meetingTypes = $pdo->query("SELECT * FROM meeting_types ORDER BY name ASC")->fetchAll();
    $funnelStages = $pdo->query("SELECT * FROM funnel_stages ORDER BY stage_order ASC")->fetchAll();
    $projectStages = $pdo->query("SELECT * FROM project_stages ORDER BY stage_order ASC")->fetchAll();
    $executives = $pdo->query("SELECT id, name, email FROM users WHERE role_id = 3 AND status = 'active' ORDER BY name ASC")->fetchAll();
    $managers = $pdo->query("SELECT id, name, email FROM users WHERE role_id = 2 AND status = 'active' ORDER BY name ASC")->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'statuses' => $statuses,
            'sources' => $sources,
            'services' => $services,
            'outcomes' => $outcomes,
            'meeting_types' => $meetingTypes,
            'funnel_stages' => $funnelStages,
            'project_stages' => $projectStages,
            'executives' => $executives,
            'managers' => $managers
        ]
    ]);
    exit;
}

if ($action === 'list_activity_logs') {
    if ($_SESSION['role_name'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $stmt = $pdo->query("
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.id DESC
        LIMIT 100
    ");
    $logs = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $logs]);
    exit;
}

if ($action === 'add_status') {
    if ($_SESSION['role_name'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $name = trim($_POST['name'] ?? '');
    $color = trim($_POST['color_code'] ?? '#3b82f6');

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Status name required']);
        exit;
    }

    $maxOrder = (int)$pdo->query("SELECT MAX(sort_order) FROM lead_statuses")->fetchColumn();

    $stmt = $pdo->prepare("INSERT INTO lead_statuses (name, color_code, sort_order) VALUES (:name, :color, :ord)");
    $stmt->execute(['name' => $name, 'color' => $color, 'ord' => $maxOrder + 1]);

    echo json_encode(['success' => true, 'message' => 'New lead status added!']);
    exit;
}

if ($action === 'add_source') {
    if ($_SESSION['role_name'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $name = trim($_POST['name'] ?? '');
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Lead source name required']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO lead_sources (name, is_active) VALUES (:name, 1)");
    $stmt->execute(['name' => $name]);

    echo json_encode(['success' => true, 'message' => 'New lead source added!']);
    exit;
}

if ($action === 'add_service') {
    if ($_SESSION['role_name'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $name = trim($_POST['name'] ?? '');
    $amount = (float)($_POST['default_amount'] ?? 0);
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Service name required']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO services (name, default_amount, is_active) VALUES (:name, :amt, 1)");
    $stmt->execute(['name' => $name, 'amt' => $amount]);

    echo json_encode(['success' => true, 'message' => 'New service added!']);
    exit;
}

if ($action === 'system_health') {
    if ($_SESSION['role_name'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $tablesCount = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn();
    $totalLeads = $pdo->query("SELECT COUNT(*) FROM leads")->fetchColumn();
    $totalCalls = $pdo->query("SELECT COUNT(*) FROM call_logs")->fetchColumn();
    $totalProjects = $pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn();
    $dbSizeResult = $pdo->query("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema = DATABASE()")->fetch();
    $dbSize = $dbSizeResult['size_mb'] ?? '0.5';

    echo json_encode([
        'success' => true,
        'data' => [
            'php_version' => PHP_VERSION,
            'db_name' => DB_NAME,
            'tables_count' => (int)$tablesCount,
            'total_leads' => (int)$totalLeads,
            'total_calls' => (int)$totalCalls,
            'total_projects' => (int)$totalProjects,
            'db_size_mb' => $dbSize,
            'status' => 'Healthy'
        ]
    ]);
    exit;
}


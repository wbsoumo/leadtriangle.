<?php
// api/settings.php - System Options, Custom Statuses, Sources & Services API

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

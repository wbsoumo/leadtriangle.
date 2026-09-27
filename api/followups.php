<?php
// api/followups.php - Followup Management API

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

if ($action === 'list') {
    $filter = $_GET['filter'] ?? 'today'; // today, upcoming, overdue, all
    $where = [];
    $params = [];

    if ($roleName === 'operation_executive') {
        $where[] = "f.user_id = :uid";
        $params['uid'] = $userId;
    }

    if ($filter === 'today') {
        $where[] = "f.followup_date = CURDATE() AND f.status = 'Pending'";
    } elseif ($filter === 'upcoming') {
        $where[] = "f.followup_date > CURDATE() AND f.status = 'Pending'";
    } elseif ($filter === 'overdue') {
        $where[] = "f.followup_date < CURDATE() AND f.status = 'Pending'";
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT f.*, l.id as lead_id, l.name as lead_name, l.mobile as lead_mobile, l.company_name, l.lead_code, u.name as agent_name
        FROM followups f
        JOIN leads l ON f.lead_id = l.id
        JOIN users u ON f.user_id = u.id
        $whereClause
        ORDER BY f.followup_date ASC, f.followup_time ASC
    ");
    $stmt->execute($params);
    $followups = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $followups]);
    exit;
}

if ($action === 'update_status') {
    $id = (int)($_POST['id'] ?? 0);
    $status = $_POST['status'] ?? 'Completed';

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Followup ID required']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE followups SET status = :st, completed_at = NOW() WHERE id = :id");
    $stmt->execute(['st' => $status, 'id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Followup status updated to ' . $status]);
    exit;
}

<?php
// api/meetings.php - Meeting Management API

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
    $filter = $_GET['filter'] ?? 'today'; // today, upcoming, all
    $where = [];
    $params = [];

    if ($roleName === 'operation_executive') {
        $where[] = "m.assigned_user_id = :uid";
        $params['uid'] = $userId;
    }

    if ($filter === 'today') {
        $where[] = "m.meeting_date = CURDATE()";
    } elseif ($filter === 'upcoming') {
        $where[] = "m.meeting_date > CURDATE()";
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT m.*, l.name as lead_name, l.mobile as lead_mobile, l.company_name, mt.name as type_name, u.name as agent_name
        FROM meetings m
        JOIN leads l ON m.lead_id = l.id
        JOIN meeting_types mt ON m.meeting_type_id = mt.id
        JOIN users u ON m.assigned_user_id = u.id
        $whereClause
        ORDER BY m.meeting_date ASC, m.meeting_time ASC
    ");
    $stmt->execute($params);
    $meetings = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $meetings]);
    exit;
}

if ($action === 'update_status') {
    $id = (int)($_POST['id'] ?? 0);
    $status = $_POST['status'] ?? 'Completed';

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Meeting ID required']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE meetings SET status = :st WHERE id = :id");
    $stmt->execute(['st' => $status, 'id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Meeting status updated to ' . $status]);
    exit;
}

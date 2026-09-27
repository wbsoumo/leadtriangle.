<?php
// api/users.php - User & Team Management API (Admin & Manager Access)

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
    $roleFilter = $_GET['role'] ?? null;
    $where = [];
    $params = [];

    if ($roleFilter === 'manager') {
        $where[] = "r.name = 'manager'";
    } elseif ($roleFilter === 'executive' || $roleFilter === 'operation_executive') {
        $where[] = "r.name = 'operation_executive'";
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email, u.mobile, u.status, u.joining_date, r.name as role_name, r.display_name as role_display, t.team_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN teams t ON u.team_id = t.id
        $whereClause
        ORDER BY u.id DESC
    ");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $users]);
    exit;
}

if ($action === 'create') {
    if ($roleName !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Only Super Admin can create users.']);
        exit;
    }

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $password = $_POST['password'] ?? '';
    $roleId = (int)($_POST['role_id'] ?? 3);
    $teamId = !empty($_POST['team_id']) ? (int)$_POST['team_id'] : null;

    if (empty($name) || empty($email) || empty($mobile) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All user fields are required.']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("
        INSERT INTO users (role_id, team_id, name, email, mobile, password_hash, status, joining_date)
        VALUES (:role, :team, :name, :email, :mobile, :hash, 'active', CURDATE())
    ");

    try {
        $stmt->execute([
            'role'  => $roleId,
            'team'  => $teamId,
            'name'  => $name,
            'email' => $email,
            'mobile'=> $mobile,
            'hash'  => $hash
        ]);
        echo json_encode(['success' => true, 'message' => 'User created successfully!']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Email or Mobile already registered.']);
    }
    exit;
}

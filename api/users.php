<?php
// api/users.php - User, Role, Team & Page Permissions Management API
header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();

// Auto-migration: ensure allowed_pages column exists
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN allowed_pages TEXT NULL");
} catch (Exception $e) {}

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
        SELECT u.id, u.name, u.email, u.mobile, u.status, u.role_id, u.team_id, u.allowed_pages, u.joining_date, r.name as role_name, r.display_name as role_display, t.team_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN teams t ON u.team_id = t.id
        $whereClause
        ORDER BY u.id DESC
    ");
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch Roles & Teams for Dropdowns
    $roles = $pdo->query("SELECT id, name, display_name FROM roles ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
    $teams = $pdo->query("SELECT id, team_name FROM teams ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Available pages list
    $availablePages = [
        ['key' => 'dashboard', 'label' => 'Dashboard'],
        ['key' => 'leads', 'label' => 'All Leads'],
        ['key' => 'calling_queue', 'label' => 'Calling Queue'],
        ['key' => 'followups', 'label' => 'Follow-ups'],
        ['key' => 'meetings', 'label' => 'Meetings'],
        ['key' => 'funnel', 'label' => 'Sales Funnel'],
        ['key' => 'projects', 'label' => 'Projects Workspace'],
        ['key' => 'reports', 'label' => 'Analytics & Reports'],
        ['key' => 'users', 'label' => 'Members & User Management'],
        ['key' => 'import', 'label' => 'Bulk CSV Import'],
    ];

    echo json_encode([
        'success' => true,
        'data' => $users,
        'roles' => $roles,
        'teams' => $teams,
        'available_pages' => $availablePages
    ]);
    exit;
}

if ($action === 'create') {
    if ($roleName !== 'super_admin' && $roleName !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Only Admin can create users.']);
        exit;
    }

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $password = $_POST['password'] ?? '';
    $roleId = (int)($_POST['role_id'] ?? 3);
    $teamId = !empty($_POST['team_id']) ? (int)$_POST['team_id'] : null;

    $allowedPages = $_POST['allowed_pages'] ?? [];
    if (is_array($allowedPages)) {
        $allowedPagesStr = implode(',', $allowedPages);
    } else {
        $allowedPagesStr = trim($allowedPages);
    }

    if (empty($allowedPagesStr)) {
        // Default allowed pages based on role
        if ($roleId == 3) { // operation executive
            $allowedPagesStr = 'dashboard,leads,calling_queue,followups,meetings';
        } else if ($roleId == 2) { // manager
            $allowedPagesStr = 'dashboard,leads,calling_queue,followups,meetings,funnel,projects,reports';
        } else {
            $allowedPagesStr = 'dashboard,leads,calling_queue,followups,meetings,funnel,projects,reports,users,import';
        }
    }

    if (empty($name) || empty($email) || empty($mobile) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All user fields (name, email, mobile, password) are required.']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("
        INSERT INTO users (role_id, team_id, name, email, mobile, password_hash, status, allowed_pages, joining_date)
        VALUES (:role, :team, :name, :email, :mobile, :hash, 'active', :pages, CURDATE())
    ");

    try {
        $stmt->execute([
            'role'  => $roleId,
            'team'  => $teamId,
            'name'  => $name,
            'email' => $email,
            'mobile'=> $mobile,
            'hash'  => $hash,
            'pages' => $allowedPagesStr
        ]);
        echo json_encode(['success' => true, 'message' => 'User created successfully!']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Email or Mobile already registered: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'edit') {
    if ($roleName !== 'super_admin' && $roleName !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Only Admin can update users.']);
        exit;
    }

    $id = (int)($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $roleId = (int)($_POST['role_id'] ?? 3);
    $teamId = !empty($_POST['team_id']) ? (int)$_POST['team_id'] : null;
    $password = $_POST['password'] ?? '';

    $allowedPages = $_POST['allowed_pages'] ?? [];
    if (is_array($allowedPages)) {
        $allowedPagesStr = implode(',', $allowedPages);
    } else {
        $allowedPagesStr = trim($allowedPages);
    }

    if (!$id || empty($name) || empty($email)) {
        echo json_encode(['success' => false, 'message' => 'User ID, name, and email are required.']);
        exit;
    }

    try {
        if (!empty($password)) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("
                UPDATE users 
                SET role_id = :role, team_id = :team, name = :name, email = :email, mobile = :mobile, allowed_pages = :pages, password_hash = :hash
                WHERE id = :id
            ");
            $stmt->execute([
                'role'  => $roleId,
                'team'  => $teamId,
                'name'  => $name,
                'email' => $email,
                'mobile'=> $mobile,
                'pages' => $allowedPagesStr,
                'hash'  => $hash,
                'id'    => $id
            ]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE users 
                SET role_id = :role, team_id = :team, name = :name, email = :email, mobile = :mobile, allowed_pages = :pages
                WHERE id = :id
            ");
            $stmt->execute([
                'role'  => $roleId,
                'team'  => $teamId,
                'name'  => $name,
                'email' => $email,
                'mobile'=> $mobile,
                'pages' => $allowedPagesStr,
                'id'    => $id
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'User updated successfully!']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to update user: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'update_status') {
    if ($roleName !== 'super_admin' && $roleName !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Only Admin can update user status.']);
        exit;
    }

    $targetId = (int)($_POST['id'] ?? 0);
    $status = $_POST['status'] ?? 'active';

    if ($targetId === $userId) {
        echo json_encode(['success' => false, 'message' => 'Cannot suspend your own logged-in admin account.']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE users SET status = :st WHERE id = :id");
    $stmt->execute(['st' => $status, 'id' => $targetId]);

    echo json_encode(['success' => true, 'message' => 'User status updated to ' . $status]);
    exit;
}

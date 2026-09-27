<?php
// api/auth.php - Authentication API with Safe Exception Handling

header('Content-Type: application/json');
session_start();

function jsonResponse($success, $message, $data = [], $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    require_once __DIR__ . '/../config/database.php';
    $pdo = Database::getInstance();
} catch (Exception $e) {
    jsonResponse(false, 'Database connection error: ' . $e->getMessage(), ['need_install' => true], 200);
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'check';

if ($action === 'login') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        jsonResponse(false, 'Email and password are required.', [], 400);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = :email AND u.status = 'active'
        ");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonResponse(false, 'Invalid email or password.', [], 401);
        }

        // Fetch permissions
        $permStmt = $pdo->prepare("
            SELECT p.permission_key
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = :role_id
        ");
        $permStmt->execute(['role_id' => $user['role_id']]);
        $permissions = $permStmt->fetchAll(PDO::FETCH_COLUMN);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role_id'] = $user['role_id'];
        $_SESSION['role_name'] = $user['role_name'];
        $_SESSION['team_id'] = $user['team_id'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['permissions'] = $permissions;

        // Update last login
        $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
        $updateStmt->execute(['id' => $user['id']]);

        unset($user['password_hash']);
        $user['permissions'] = $permissions;

        jsonResponse(true, 'Login successful', ['user' => $user]);

    } catch (PDOException $e) {
        jsonResponse(false, 'Database table missing or uninitialized. Please run installer at /install.', ['need_install' => true], 200);
    }
}

if ($action === 'logout') {
    session_destroy();
    jsonResponse(true, 'Logged out successfully');
}

if ($action === 'register_admin') {
    $name = trim($_POST['name'] ?? 'Super Admin');
    $email = trim($_POST['email'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        jsonResponse(false, 'Email and password are required.', [], 400);
    }

    if (empty($mobile)) {
        $mobile = '+9199999' . rand(10005, 99999);
    }

    try {
        $hash = password_hash($password, PASSWORD_BCRYPT);

        // Check if user already exists
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
        $checkStmt->execute(['email' => $email]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            // Update password & grant Super Admin role
            $upStmt = $pdo->prepare("UPDATE users SET password_hash = :hash, role_id = 1, status = 'active' WHERE id = :id");
            $upStmt->execute(['hash' => $hash, 'id' => $existing['id']]);
            $userId = $existing['id'];
        } else {
            // Create new Super Admin user
            $insStmt = $pdo->prepare("
                INSERT INTO users (role_id, name, email, mobile, password_hash, status, joining_date)
                VALUES (1, :name, :email, :mobile, :hash, 'active', CURDATE())
            ");
            $insStmt->execute([
                'name'   => $name,
                'email'  => $email,
                'mobile' => $mobile,
                'hash'   => $hash
            ]);
            $userId = $pdo->lastInsertId();
        }

        // Auto login
        $userStmt = $pdo->prepare("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = :id
        ");
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch();

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role_id'] = $user['role_id'];
        $_SESSION['role_name'] = $user['role_name'];
        $_SESSION['team_id'] = $user['team_id'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['permissions'] = [
            'leads.view', 'leads.create', 'leads.edit', 'leads.delete', 'leads.assign', 'leads.import', 'leads.export',
            'calls.view', 'calls.create', 'calls.edit', 'meetings.view', 'meetings.manage', 'followups.view', 'followups.manage',
            'funnel.view', 'funnel.manage', 'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.finance',
            'users.manage', 'reports.view', 'settings.manage'
        ];

        unset($user['password_hash']);
        jsonResponse(true, 'Admin registered and logged in successfully!', ['user' => $user]);

    } catch (PDOException $e) {
        jsonResponse(false, 'Failed to register admin: ' . $e->getMessage(), [], 500);
    }
}

if ($action === 'check') {
    if (empty($_SESSION['user_id'])) {
        jsonResponse(false, 'Unauthenticated', ['is_logged_in' => false], 401);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.name, u.email, u.mobile, u.role_id, u.team_id, r.name as role_name, r.display_name as role_display
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = :id AND u.status = 'active'
        ");
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            session_destroy();
            jsonResponse(false, 'User session invalid', ['is_logged_in' => false], 401);
        }

        $user['permissions'] = $_SESSION['permissions'] ?? [];
        jsonResponse(true, 'Authenticated', ['user' => $user, 'is_logged_in' => true]);

    } catch (PDOException $e) {
        session_destroy();
        jsonResponse(false, 'Database tables missing. Please run installer at /install.', ['need_install' => true], 200);
    }
}

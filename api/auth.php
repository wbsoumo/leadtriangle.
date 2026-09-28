<?php
// api/auth.php - Authentication API with Safe Exception Handling

header('Content-Type: application/json');

function jsonResponse($success, $message, $data = [], $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    require_once __DIR__ . '/../config/database.php';
    $pdo = Database::getInstance();
    // Auto-migration: ensure allowed_pages column exists
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN allowed_pages TEXT NULL");
    } catch (Exception $e) {}
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

if ($action === 'check') {
    if (empty($_SESSION['user_id'])) {
        jsonResponse(false, 'Unauthenticated', ['is_logged_in' => false], 401);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.name, u.email, u.mobile, u.role_id, u.team_id, u.allowed_pages, r.name as role_name, r.display_name as role_display,
                   COALESCE(t.team_name, 'Sales Team') as team_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN teams t ON u.team_id = t.id
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
        // Check if users table actually exists
        $tableCheck = false;
        try {
            $res = $pdo->query("SHOW TABLES LIKE 'users'");
            if ($res && $res->rowCount() > 0) {
                $tableCheck = true;
            }
        } catch (Exception $ex) {}

        if (!$tableCheck) {
            session_destroy();
            jsonResponse(false, 'Database tables missing. Please run installer at /install.', ['need_install' => true], 200);
        } else {
            jsonResponse(false, 'Database query error: ' . $e->getMessage(), [], 500);
        }
    }
}

if ($action === 'update_profile') {
    if (empty($_SESSION['user_id'])) {
        jsonResponse(false, 'Unauthenticated', [], 401);
    }

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');

    if (empty($name) || empty($email)) {
        jsonResponse(false, 'Name and email are required.', [], 400);
    }

    try {
        // Check if email taken by another user
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
        $checkStmt->execute(['email' => $email, 'id' => $_SESSION['user_id']]);
        if ($checkStmt->fetch()) {
            jsonResponse(false, 'This email address is already in use.', [], 400);
        }

        $stmt = $pdo->prepare("UPDATE users SET name = :name, email = :email, mobile = :mobile WHERE id = :id");
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'mobile' => $mobile,
            'id' => $_SESSION['user_id']
        ]);

        $_SESSION['name'] = $name;
        $_SESSION['email'] = $email;

        jsonResponse(true, 'Profile updated successfully!', [
            'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $name,
                'email' => $email,
                'mobile' => $mobile,
            ]
        ]);
    } catch (PDOException $e) {
        jsonResponse(false, 'Failed to update profile: ' . $e->getMessage(), [], 500);
    }
}

if ($action === 'change_password') {
    if (empty($_SESSION['user_id'])) {
        jsonResponse(false, 'Unauthenticated', [], 401);
    }

    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        jsonResponse(false, 'Current password and new password are required.', [], 400);
    }

    if (strlen($newPassword) < 6) {
        jsonResponse(false, 'New password must be at least 6 characters.', [], 400);
    }

    try {
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = :id");
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            jsonResponse(false, 'Current password is incorrect.', [], 400);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $upStmt = $pdo->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
        $upStmt->execute(['hash' => $newHash, 'id' => $_SESSION['user_id']]);

        jsonResponse(true, 'Password changed successfully!');
    } catch (PDOException $e) {
        jsonResponse(false, 'Failed to change password: ' . $e->getMessage(), [], 500);
    }
}


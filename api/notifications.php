<?php
// api/notifications.php - Admin Push Notification Management & Dispatch Logs API

header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$userId = (int)$_SESSION['user_id'];
$roleName = $_SESSION['role_name'] ?? 'operation_executive';

// Ensure notifications table exists
$pdo->exec("
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        recipient_id INT DEFAULT NULL,
        target_type VARCHAR(20) DEFAULT 'all',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_target (recipient_id, target_type, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$action = $_GET['action'] ?? $_POST['action'] ?? 'my_notifications';

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

// 1. SEND PUSH NOTIFICATION (ADMIN ONLY)
if ($action === 'send') {
    if ($roleName !== 'super_admin' && $roleName !== 'manager') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access Denied: Only Admins and Managers can send notifications.']);
        exit;
    }

    $targetType = $_POST['target_type'] ?? 'all'; // 'all' or 'user'
    $recipientId = !empty($_POST['recipient_id']) ? (int)$_POST['recipient_id'] : null;
    $title = trim($_POST['title'] ?? '');
    $message = trim($_POST['message'] ?? '');

    if (empty($title) || empty($message)) {
        echo json_encode(['success' => false, 'message' => 'Notification Title and Message content are required.']);
        exit;
    }

    if ($targetType === 'user' && empty($recipientId)) {
        echo json_encode(['success' => false, 'message' => 'Please select a specific recipient user.']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO notifications (sender_id, recipient_id, target_type, title, message)
        VALUES (:sender_id, :recipient_id, :target_type, :title, :message)
    ");
    $stmt->execute([
        'sender_id'    => $userId,
        'recipient_id' => ($targetType === 'user' ? $recipientId : null),
        'target_type'  => $targetType,
        'title'        => $title,
        'message'      => $message
    ]);

    $notifId = $pdo->lastInsertId();
    logActivity($pdo, 'Notifications', 'Send Push Notification', $notifId, null, [
        'target_type'  => $targetType,
        'recipient_id' => $recipientId,
        'title'        => $title
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Push Notification dispatched successfully to ' . ($targetType === 'all' ? 'All Team Members' : 'Selected User') . '.'
    ]);
    exit;
}

// 2. DISPATCH LOGS (ADMIN ONLY)
if ($action === 'logs') {
    if ($roleName !== 'super_admin' && $roleName !== 'manager') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access Denied: Only Admins can view notification dispatch logs.']);
        exit;
    }

    $stmt = $pdo->query("
        SELECT 
            n.*, 
            u_sender.name as sender_name, u_sender.email as sender_email,
            u_rec.name as recipient_name, u_rec.email as recipient_email
        FROM notifications n
        LEFT JOIN users u_sender ON n.sender_id = u_sender.id
        LEFT JOIN users u_rec ON n.recipient_id = u_rec.id
        ORDER BY n.id DESC
        LIMIT 100
    ");
    $logs = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $logs]);
    exit;
}

// 3. GET USER UNREAD / ALL NOTIFICATIONS (FOR CURRENT LOGGED IN USER)
if ($action === 'my_notifications') {
    $stmt = $pdo->prepare("
        SELECT 
            n.*,
            u_sender.name as sender_name
        FROM notifications n
        LEFT JOIN users u_sender ON n.sender_id = u_sender.id
        WHERE n.recipient_id = :uid OR (n.recipient_id IS NULL AND n.target_type = 'all')
        ORDER BY n.id DESC
        LIMIT 20
    ");
    $stmt->execute(['uid' => $userId]);
    $notifications = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $notifications]);
    exit;
}

// 4. MARK READ
if ($action === 'mark_read') {
    $id = (int)($_POST['id'] ?? 0);
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id");
        $stmt->execute(['id' => $id]);
    }
    echo json_encode(['success' => true]);
    exit;
}

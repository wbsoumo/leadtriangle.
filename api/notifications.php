<?php
// api/notifications.php - Admin Push Notification Management & Dispatch Logs API

header('Content-Type: application/json');
require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$userId = (int)$_SESSION['user_id'];
$roleName = $_SESSION['role_name'] ?? 'operation_executive';

// Safely ensure notifications table & required columns exist
$hasSenderId = false;
$hasRecipientId = false;
$hasTargetType = false;
$hasUserId = false;

try {
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'notifications'")->fetchAll();
    if (empty($tableCheck)) {
        $pdo->exec("
            CREATE TABLE notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT DEFAULT NULL,
                recipient_id INT DEFAULT NULL,
                target_type VARCHAR(20) DEFAULT 'all',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $hasSenderId = true;
        $hasRecipientId = true;
        $hasTargetType = true;
    } else {
        // Table exists, check for missing columns and add them dynamically
        $cols = $pdo->query("SHOW COLUMNS FROM notifications")->fetchAll();
        $colNames = array_column($cols, 'Field');
        
        $hasUserId = in_array('user_id', $colNames);

        if ($hasUserId) {
            try { $pdo->exec("ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_1"); } catch (Throwable $t) {}
            try { $pdo->exec("ALTER TABLE notifications MODIFY user_id INT NULL DEFAULT NULL"); } catch (Throwable $t) {}
        }
        if (!in_array('sender_id', $colNames)) {
            try { $pdo->exec("ALTER TABLE notifications ADD COLUMN sender_id INT DEFAULT NULL"); } catch (Throwable $t) {}
        }
        if (!in_array('recipient_id', $colNames)) {
            try { $pdo->exec("ALTER TABLE notifications ADD COLUMN recipient_id INT DEFAULT NULL"); } catch (Throwable $t) {}
        }
        if (!in_array('target_type', $colNames)) {
            try { $pdo->exec("ALTER TABLE notifications ADD COLUMN target_type VARCHAR(20) DEFAULT 'all'"); } catch (Throwable $t) {}
        }

        // Re-verify actual column names after migration attempts
        $cols = $pdo->query("SHOW COLUMNS FROM notifications")->fetchAll();
        $colNames = array_column($cols, 'Field');
        $hasSenderId = in_array('sender_id', $colNames);
        $hasRecipientId = in_array('recipient_id', $colNames);
        $hasTargetType = in_array('target_type', $colNames);
        $hasUserId = in_array('user_id', $colNames);
    }

    // Ensure user_fcm_tokens table exists for storing device FCM tokens
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_fcm_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            fcm_token VARCHAR(255) NOT NULL UNIQUE,
            device_type VARCHAR(50) DEFAULT 'web',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_token (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Throwable $e) {
    error_log("Notifications table migration error: " . $e->getMessage());
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'my_notifications';

function logActivity($pdo, $module, $action, $recordId, $oldVal = null, $newVal = null) {
    try {
        $stmt = $pdo->prepare("INSERT INTO activity_logs (user_id, module, action, record_id, old_value, new_value, ip_address) VALUES (:uid, :mod, :act, :rec, :old, :new, :ip)");
        $stmt->execute([
            'uid' => $_SESSION['user_id'] ?? null,
            'mod' => $module,
            'act' => $action,
            'rec' => $recordId,
            'old' => is_array($oldVal) ? json_encode($oldVal) : $oldVal,
            'new' => is_array($newVal) ? json_encode($newVal) : $newVal,
            'ip'  => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    } catch (Throwable $e) {}
}

function sendFcmPushNotification($title, $message, $fcmTokenOrTopic = 'all_users') {
    $serviceAccountPath = __DIR__ . '/../config/firebase-service-account.json';
    if (!file_exists($serviceAccountPath)) {
        return ['success' => false, 'error' => 'Firebase Service Account JSON file missing in config/firebase-service-account.json'];
    }

    $sa = json_decode(file_get_contents($serviceAccountPath), true);
    if (empty($sa['private_key']) || empty($sa['client_email']) || empty($sa['project_id'])) {
        return ['success' => false, 'error' => 'Invalid Firebase Service Account JSON format.'];
    }

    $now = time();
    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));

    $claimSet = json_encode([
        'iss'   => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'exp'   => $now + 3600,
        'iat'   => $now
    ]);
    $base64UrlClaimSet = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($claimSet));

    $signatureInput = $base64UrlHeader . "." . $base64UrlClaimSet;
    $signature = '';
    if (!openssl_sign($signatureInput, $signature, $sa['private_key'], 'SHA256')) {
        return ['success' => false, 'error' => 'Failed to sign JWT with Private Key.'];
    }
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    $jwt = $signatureInput . "." . $base64UrlSignature;

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion'  => $jwt
    ]));
    $response = curl_exec($ch);
    @curl_close($ch);

    $tokenData = json_decode($response, true);
    if (empty($tokenData['access_token'])) {
        return ['success' => false, 'error' => 'OAuth token exchange failed: ' . ($tokenData['error_description'] ?? 'Unknown error')];
    }

    $accessToken = $tokenData['access_token'];
    $projectId = $sa['project_id'];
    $fcmUrl = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

    $messagePayload = [
        'notification' => [
            'title' => $title,
            'body'  => $message
        ],
        'data' => [
            'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            'title'        => $title,
            'message'      => $message
        ]
    ];

    if ($fcmTokenOrTopic === 'all_users' || $fcmTokenOrTopic === 'all') {
        $messagePayload['topic'] = 'all_users';
    } else {
        $messagePayload['token'] = $fcmTokenOrTopic;
    }

    $ch = curl_init($fcmUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['message' => $messagePayload]));
    $fcmResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    @curl_close($ch);

    return [
        'success'   => ($httpCode === 200),
        'http_code' => $httpCode,
        'raw'       => json_decode($fcmResponse, true) ?? $fcmResponse
    ];
}

try {
    // 0. REGISTER FCM DEVICE TOKEN (FROM WEB / MOBILE APP)
    if ($action === 'register_token') {
        $fcmToken = trim($_POST['fcm_token'] ?? '');
        $deviceType = trim($_POST['device_type'] ?? 'web');
        if (!empty($fcmToken)) {
            $stmt = $pdo->prepare("
                INSERT INTO user_fcm_tokens (user_id, fcm_token, device_type)
                VALUES (:uid, :token, :dev)
                ON DUPLICATE KEY UPDATE user_id = :uid, device_type = :dev, updated_at = NOW()
            ");
            $stmt->execute(['uid' => $userId, 'token' => $fcmToken, 'dev' => $deviceType]);
            echo json_encode(['success' => true, 'message' => 'FCM Device Token registered successfully.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'FCM token parameter is required.']);
        }
        exit;
    }

    // 0.1 GET ALL REGISTERED TOKENS (ADMIN ONLY)
    if ($action === 'get_tokens') {
        if ($roleName !== 'super_admin' && $roleName !== 'manager') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access Denied: Only Admins can view registered FCM tokens.']);
            exit;
        }

        $stmt = $pdo->query("
            SELECT t.*, u.name as user_name, u.email as user_email
            FROM user_fcm_tokens t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.updated_at DESC
        ");
        $tokens = $stmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $tokens]);
        exit;
    }

    // 1. SEND PUSH NOTIFICATION (ADMIN ONLY)
    if ($action === 'send') {
        if ($roleName !== 'super_admin' && $roleName !== 'manager') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access Denied: Only Admins and Managers can send notifications.']);
            exit;
        }

        $targetType = $_POST['target_type'] ?? 'all';
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

        // 1. Dispatch FCM Push Notification to Topic 'all_users'
        $fcmTopicResult = sendFcmPushNotification($title, $message, 'all_users');

        // 2. Dispatch FCM Push Notification to every individual registered token
        $deliveredCount = 0;
        if ($targetType === 'user' && !empty($recipientId)) {
            $stmtTokens = $pdo->prepare("SELECT fcm_token FROM user_fcm_tokens WHERE user_id = :uid");
            $stmtTokens->execute(['uid' => $recipientId]);
        } else {
            $stmtTokens = $pdo->query("SELECT fcm_token FROM user_fcm_tokens");
        }
        $registeredTokens = $stmtTokens->fetchAll(PDO::FETCH_COLUMN);

        foreach ($registeredTokens as $tok) {
            if (!empty($tok)) {
                $tokRes = sendFcmPushNotification($title, $message, $tok);
                if (!empty($tokRes['success'])) {
                    $deliveredCount++;
                }
            }
        }

        $userRefId = ($targetType === 'user' && !empty($recipientId)) ? $recipientId : $userId;

        if ($hasSenderId && $hasRecipientId && $hasTargetType && $hasUserId) {
            $stmt = $pdo->prepare("
                INSERT INTO notifications (user_id, sender_id, recipient_id, target_type, title, message)
                VALUES (:user_id, :sender_id, :recipient_id, :target_type, :title, :message)
            ");
            $stmt->execute([
                'user_id'      => $userRefId,
                'sender_id'    => $userId,
                'recipient_id' => ($targetType === 'user' ? $recipientId : null),
                'target_type'  => $targetType,
                'title'        => $title,
                'message'      => $message
            ]);
        } else if ($hasSenderId && $hasRecipientId && $hasTargetType) {
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
        } else if ($hasUserId) {
            $stmt = $pdo->prepare("
                INSERT INTO notifications (user_id, title, message)
                VALUES (:user_id, :title, :message)
            ");
            $stmt->execute([
                'user_id' => $userRefId,
                'title'   => $title,
                'message' => $message
            ]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO notifications (title, message)
                VALUES (:title, :message)
            ");
            $stmt->execute([
                'title'   => $title,
                'message' => $message
            ]);
        }

        $notifId = $pdo->lastInsertId();
        logActivity($pdo, 'Notifications', 'Send Push Notification', $notifId, null, [
            'target_type'        => $targetType,
            'recipient_id'       => $recipientId,
            'title'              => $title,
            'registered_tokens' => count($registeredTokens),
            'delivered_tokens'  => $deliveredCount
        ]);

        echo json_encode([
            'success'           => true,
            'message'           => 'Push Notification dispatched successfully to ' . ($targetType === 'all' ? 'All Team Members' : 'Selected User') . '.',
            'registered_tokens' => count($registeredTokens),
            'delivered_tokens'  => $deliveredCount,
            'fcm_topic_status'  => $fcmTopicResult
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

        if ($hasSenderId && $hasRecipientId) {
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
        } else if ($hasUserId) {
            $stmt = $pdo->query("
                SELECT 
                    n.*, 
                    u_rec.name as recipient_name, u_rec.email as recipient_email
                FROM notifications n
                LEFT JOIN users u_rec ON n.user_id = u_rec.id
                ORDER BY n.id DESC
                LIMIT 100
            ");
        } else {
            $stmt = $pdo->query("SELECT n.* FROM notifications n ORDER BY n.id DESC LIMIT 100");
        }
        $logs = $stmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $logs]);
        exit;
    }

    // 3. GET USER UNREAD / ALL NOTIFICATIONS (FOR CURRENT LOGGED IN USER)
    if ($action === 'my_notifications') {
        if ($hasRecipientId && $hasSenderId) {
            $stmt = $pdo->prepare("
                SELECT 
                    n.*,
                    u_sender.name as sender_name
                FROM notifications n
                LEFT JOIN users u_sender ON n.sender_id = u_sender.id
                WHERE n.recipient_id = :uid OR n.recipient_id IS NULL OR n.target_type = 'all'
                ORDER BY n.id DESC
                LIMIT 20
            ");
            $stmt->execute(['uid' => $userId]);
        } else if ($hasUserId) {
            $stmt = $pdo->prepare("
                SELECT n.* FROM notifications n
                WHERE n.user_id = :uid OR n.user_id IS NULL
                ORDER BY n.id DESC
                LIMIT 20
            ");
            $stmt->execute(['uid' => $userId]);
        } else {
            $stmt = $pdo->query("SELECT n.* FROM notifications n ORDER BY n.id DESC LIMIT 20");
        }
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
} catch (Throwable $err) {
    echo json_encode([
        'success' => false,
        'data'    => [],
        'message' => 'Notification API Notice: ' . $err->getMessage()
    ]);
    exit;
}


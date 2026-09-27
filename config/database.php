<?php
// config/database.php - Centralized Database Configuration with IST & Environment Support

// Set PHP default timezone to Indian Standard Time (IST - Asia/Kolkata)
date_default_timezone_set('Asia/Kolkata');

// Load production-specific local credentials if present (untracked database.local.php)
if (file_exists(__DIR__ . '/database.local.php')) {
    require_once __DIR__ . '/database.local.php';
}

// Define database configuration constants if not already defined by database.local.php or environment
if (!defined('DB_HOST')) {
    define('DB_HOST', getenv('DB_HOST') !== false ? getenv('DB_HOST') : 'localhost');
}
if (!defined('DB_NAME')) {
    define('DB_NAME', getenv('DB_NAME') !== false ? getenv('DB_NAME') : '');
}
if (!defined('DB_USER')) {
    define('DB_USER', getenv('DB_USER') !== false ? getenv('DB_USER') : '');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
}
if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', getenv('DB_CHARSET') !== false ? getenv('DB_CHARSET') : 'utf8mb4');
}

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            // Synchronize MySQL session timezone to IST (+05:30)
            $this->pdo->exec("SET time_zone = '+05:30'");
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            throw $e;
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->pdo;
    }
}

<?php
// config/database.php - Production cPanel MySQL Configuration

// Set PHP default timezone to Indian Standard Time (IST - Asia/Kolkata)
date_default_timezone_set('Asia/Kolkata');

define('DB_HOST', 'localhost');
define('DB_NAME', 'helnovexaa_leadtriangle');
define('DB_USER', 'helnovexaa_leadtriangle');
define('DB_PASS', 'Soumojit1234@');
define('DB_CHARSET', 'utf8mb4');

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

<?php
// install.php - One-Click Installer & Database Setup Tool for cPanel Hosting

session_start();

$message = '';
$status = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $db_host = trim($_POST['db_host'] ?? 'localhost');
    $db_name = trim($_POST['db_name'] ?? '');
    $db_user = trim($_POST['db_user'] ?? '');
    $db_pass = trim($_POST['db_pass'] ?? '');

    if (empty($db_name) || empty($db_user)) {
        $message = "Database name and username are required!";
        $status = "danger";
    } else {
        try {
            // Test connection
            $dsn = "mysql:host=$db_host;charset=utf8mb4";
            $pdo = new PDO($dsn, $db_user, $db_pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);

            // Create database if not exists
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `$db_name`");

            // Read schema and seed files
            $schemaFile = __DIR__ . '/database/schema.sql';
            $seedFile = __DIR__ . '/database/seed.sql';

            if (!file_exists($schemaFile) || !file_exists($seedFile)) {
                throw new Exception("Missing database/schema.sql or database/seed.sql file!");
            }

            $schemaSql = file_get_contents($schemaFile);
            $seedSql = file_get_contents($seedFile);

            // Execute Schema
            $pdo->exec($schemaSql);
            // Execute Seed Data
            $pdo->exec($seedSql);

            // Save configuration file
            $configContent = "<?php\n" .
                "// config/database.php\n\n" .
                "define('DB_HOST', " . var_export($db_host, true) . ");\n" .
                "define('DB_NAME', " . var_export($db_name, true) . ");\n" .
                "define('DB_USER', " . var_export($db_user, true) . ");\n" .
                "define('DB_PASS', " . var_export($db_pass, true) . ");\n" .
                "define('DB_CHARSET', 'utf8mb4');\n\n" .
                "class Database {\n" .
                "    private static \$instance = null;\n" .
                "    private \$pdo;\n\n" .
                "    private function __construct() {\n" .
                "        \$dsn = \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;\n" .
                "        \$options = [\n" .
                "            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,\n" .
                "            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n" .
                "            PDO::ATTR_EMULATE_PREPARES   => false,\n" .
                "        ];\n\n" .
                "        try {\n" .
                "            \$this->pdo = new PDO(\$dsn, DB_USER, DB_PASS, \$options);\n" .
                "        } catch (PDOException \$e) {\n" .
                "            error_log(\"Database Connection Error: \" . \$e->getMessage());\n" .
                "            die(json_encode([\n" .
                "                'success' => false,\n" .
                "                'message' => 'Database connection failed.'\n" .
                "            ]));\n" .
                "        }\n" .
                "    }\n\n" .
                "    public static function getInstance() {\n" .
                "        if (self::\$instance === null) {\n" .
                "            self::\$instance = new Database();\n" .
                "        }\n" .
                "        return self::\$instance->pdo;\n" .
                "    }\n" .
                "}\n";

            file_put_contents(__DIR__ . '/config/database.php', $configContent);

            $message = "Installation successful! Database tables & demo records have been populated.";
            $status = "success";

        } catch (Exception $e) {
            $message = "Error during setup: " . $e->getMessage();
            $status = "danger";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leadstriangle CRM - One-Click cPanel Installer</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #2563eb;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --muted: #94a3b8;
            --success: #10b981;
            --danger: #ef4444;
            --border: #334155;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; width: 100%; max-width: 520px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .logo-icon { width: 40px; height: 40px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; color: #fff; }
        .logo-text { font-size: 22px; font-weight: 700; color: #fff; }
        .subtitle { color: var(--muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
        .form-group { margin-bottom: 18px; }
        label { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
        input { width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 14px; outline: none; transition: border 0.2s; }
        input:focus { border-color: var(--primary); }
        .btn { width: 100%; padding: 14px; background: var(--primary); color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .btn:hover { background: #1d4ed8; }
        .alert { padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.4; }
        .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); color: #34d399; }
        .alert-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); color: #f87171; }
        .credentials-box { background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-top: 16px; }
        .credentials-title { font-size: 13px; font-weight: 600; color: var(--success); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cred-item { font-size: 13px; color: var(--muted); margin-bottom: 4px; }
        .cred-item span { color: #fff; font-weight: 600; font-family: monospace; }
        .login-btn { display: inline-block; width: 100%; text-align: center; text-decoration: none; margin-top: 16px; }
    </style>
</head>
<body>

<div class="card">
    <div class="logo">
        <div class="logo-icon">▲</div>
        <div class="logo-text">Leadstriangle CRM</div>
    </div>
    <div class="subtitle">One-Click cPanel & Shared Hosting Database Setup Installer.</div>

    <?php if (!empty($message)): ?>
        <div class="alert alert-<?= $status ?>">
            <?= htmlspecialchars($message) ?>
        </div>
    <?php endif; ?>

    <?php if ($status === 'success'): ?>
        <div class="credentials-box">
            <div class="credentials-title">Default Login Credentials Created</div>
            <div class="cred-item">Super Admin: <span>admin@leadstriangle.com</span></div>
            <div class="cred-item">Manager: <span>amit.manager@leadstriangle.com</span></div>
            <div class="cred-item">Executive: <span>rahul.op@leadstriangle.com</span></div>
            <div class="cred-item">Password for All: <span>Admin@123</span></div>
        </div>
        <a href="index.php" class="btn login-btn">Proceed to Login & Application →</a>
    <?php else: ?>
        <form method="POST" action="install.php">
            <div class="form-group">
                <label>MySQL Database Host</label>
                <input type="text" name="db_host" value="localhost" required>
            </div>

            <div class="form-group">
                <label>Database Name (cPanel prefix_dbname)</label>
                <input type="text" name="db_name" placeholder="e.g. leadstr_crm" required>
            </div>

            <div class="form-group">
                <label>Database Username</label>
                <input type="text" name="db_user" placeholder="e.g. leadstr_user" required>
            </div>

            <div class="form-group">
                <label>Database Password</label>
                <input type="password" name="db_pass" placeholder="Enter DB Password">
            </div>

            <button type="submit" class="btn">🚀 Run One-Click Database Setup</button>
        </form>
    <?php endif; ?>
</div>

</body>
</html>

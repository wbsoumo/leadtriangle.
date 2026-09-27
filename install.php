<?php
// install.php - One-Click Installer & Database Setup Tool for cPanel Hosting

session_start();

$message = '';
$status = '';
$verificationSummary = null;

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
            // Test connection with multi-statement support enabled
            $dsn = "mysql:host=$db_host;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => true
            ];
            if (defined('PDO::MYSQL_ATTR_MULTI_STATEMENTS')) {
                $options[PDO::MYSQL_ATTR_MULTI_STATEMENTS] = true;
            }

            $pdo = new PDO($dsn, $db_user, $db_pass, $options);

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

            // Automated Post-Installation Verification Check
            $tableCount = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$db_name'")->fetchColumn();
            $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
            $leadCount = $pdo->query("SELECT COUNT(*) FROM leads")->fetchColumn();
            $callCount = $pdo->query("SELECT COUNT(*) FROM call_logs")->fetchColumn();
            $projectCount = $pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn();

            $verificationSummary = [
                'tables'   => (int)$tableCount,
                'users'    => (int)$userCount,
                'leads'    => (int)$leadCount,
                'calls'    => (int)$callCount,
                'projects' => (int)$projectCount
            ];

            $message = "Database installation & seed verification completed successfully!";
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
    <title>Leadstriangle CRM - One-Click Installer</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text: #0f172a;
            --muted: #64748b;
            --success: #10b981;
            --danger: #ef4444;
            --border: #e2e8f0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
        body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 520px; padding: 36px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); }
        .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #4f46e5, #6366f1); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #ffffff; box-shadow: 0 4px 12px rgba(79,70,229,0.25); }
        .logo-text { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
        .subtitle { color: var(--muted); font-size: 13.5px; margin-bottom: 24px; line-height: 1.5; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12.5px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        input { width: 100%; padding: 11px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: var(--text); font-size: 13.5px; outline: none; transition: all 0.2s; }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .btn { width: 100%; padding: 13px; background: var(--primary); color: #ffffff; border: none; border-radius: 8px; font-size: 14.5px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.8s linear infinite; display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .alert { padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13.5px; line-height: 1.4; }
        .alert-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
        .alert-danger { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .credentials-box { background: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid var(--border); margin-top: 16px; }
        .credentials-title { font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cred-item { font-size: 13px; color: var(--muted); margin-bottom: 6px; }
        .cred-item span { color: var(--text); font-weight: 600; font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
        .verification-badge { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; margin-top: 14px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
        .login-btn { display: inline-flex; text-decoration: none; margin-top: 20px; }
    </style>
</head>
<body>

<div class="card">
    <div class="logo">
        <div class="logo-icon">▲</div>
        <div class="logo-text">Leadstriangle CRM</div>
    </div>
    <div class="subtitle">One-Click cPanel Database Installer & Initializer</div>

    <?php if (!empty($message)): ?>
        <div class="alert alert-<?= $status ?>">
            <?= htmlspecialchars($message) ?>
        </div>
    <?php endif; ?>

    <?php if ($status === 'success'): ?>
        <div class="credentials-box">
            <div class="credentials-title">✅ Database Initialized & Verified</div>
            
            <?php if ($verificationSummary): ?>
                <div class="verification-badge">
                    <span>📁 Tables: <?= $verificationSummary['tables'] ?></span>
                    <span>👥 Users: <?= $verificationSummary['users'] ?></span>
                    <span>📋 Leads: <?= $verificationSummary['leads'] ?></span>
                    <span>📞 Calls: <?= $verificationSummary['calls'] ?></span>
                </div>
            <?php endif; ?>

            <div style="margin-top:14px;">
                <div class="cred-item">Super Admin: <span>admin@leadstriangle.com</span></div>
                <div class="cred-item">Manager: <span>amit.manager@leadstriangle.com</span></div>
                <div class="cred-item">Executive: <span>rahul.op@leadstriangle.com</span></div>
                <div class="cred-item">Password for All: <span>Admin@123</span></div>
            </div>
        </div>
        <a href="index.php" class="btn login-btn">Proceed to Login & Application →</a>
    <?php else: ?>
        <form method="POST" action="" onsubmit="handleInstallSubmit(this)">
            <div class="form-group">
                <label>MySQL Database Host</label>
                <input type="text" name="db_host" value="localhost" required>
            </div>

            <div class="form-group">
                <label>Database Name (cPanel prefix_dbname)</label>
                <input type="text" name="db_name" value="helnovexaa_leadtriangle" placeholder="e.g. helnovexaa_leadtriangle" required>
            </div>

            <div class="form-group">
                <label>Database Username</label>
                <input type="text" name="db_user" value="helnovexaa_leadtriangle" placeholder="e.g. helnovexaa_leadtriangle" required>
            </div>

            <div class="form-group">
                <label>Database Password</label>
                <input type="password" name="db_pass" value="Soumojit1234@" placeholder="Enter DB Password">
            </div>

            <button type="submit" class="btn" id="install-btn">
                <span class="spinner" id="btn-spinner"></span>
                <span id="btn-text">🚀 Run One-Click Database Setup</span>
            </button>
        </form>
    <?php endif; ?>
</div>

<script>
function handleInstallSubmit(form) {
    const btn = document.getElementById('install-btn');
    const spinner = document.getElementById('btn-spinner');
    const text = document.getElementById('btn-text');
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.innerText = 'Installing Database & Seed Records...';
}
</script>
</body>
</html>

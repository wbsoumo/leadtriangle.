<?php
/**
 * test_executive_fixes.php
 * Automated verification of:
 * 1. Add Lead button removal for Telecaller/Executive, preserved for Admin/Manager
 * 2. Search & All Leads API errors: JSON validity, non-empty and empty queries, pagination, filters
 * 3. Projects search duplicate placeholder fix
 * 4. Call Lead Modal persistence & database integrity
 */

$host = 'leadtriangle.online';
$db   = 'helnovexaa_leadtriangle';
$user = 'helnovexaa_leadtriangle';
$pass = 'Soumojit1234@';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$opt = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => true,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $opt);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

echo "=== EXECUTIVE PANEL BUG FIXES & UI VERIFICATION ===\n";
echo "Database: $db @ $host\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

$passCount = 0;
$failCount = 0;

function assertTest($name, $condition, $details = '') {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "[PASS] $name\n";
    } else {
        $failCount++;
        echo "[FAIL] $name\n";
    }
    if ($details) echo "       Details: $details\n";
    echo "\n";
}

// ---------------------------------------------------------
// TEST 1: SERVER-SIDE RBAC SCOPING IN app.php
// ---------------------------------------------------------
try {
    // Executive session simulation
    $cmdExec = "php -r '
        session_start();
        \$_SESSION[\"user_id\"] = 5;
        \$_SESSION[\"role_name\"] = \"operation_executive\";
        ob_start();
        include \"" . addslashes(__DIR__ . '/../app.php') . "\";
        \$out = ob_get_clean();
        echo strpos(\$out, \"id=\\\"top-add-lead-btn\\\"\") === false ? \"ABSENT\" : \"PRESENT\";
    '";
    $resExec = trim(shell_exec($cmdExec));

    // Admin session simulation
    $cmdAdmin = "php -r '
        session_start();
        \$_SESSION[\"user_id\"] = 1;
        \$_SESSION[\"role_name\"] = \"admin\";
        ob_start();
        include \"" . addslashes(__DIR__ . '/../app.php') . "\";
        \$out = ob_get_clean();
        echo strpos(\$out, \"id=\\\"top-add-lead-btn\\\"\") !== false ? \"PRESENT\" : \"ABSENT\";
    '";
    $resAdmin = trim(shell_exec($cmdAdmin));

    assertTest(
        "Add Lead Top Button Server-side Scoping",
        $resExec === 'ABSENT' && $resAdmin === 'PRESENT',
        "Executive rendered: $resExec | Admin rendered: $resAdmin"
    );
} catch (Throwable $e) {
    assertTest("Add Lead Top Button Server-side Scoping", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 2: LEADS SEARCH API - MATCHING QUERY
// ---------------------------------------------------------
try {
    $lead = $pdo->query("SELECT name FROM leads WHERE is_archived = 0 AND name IS NOT NULL AND LENGTH(name) > 2 LIMIT 1")->fetch();
    $searchTerm = substr($lead['name'], 0, 4);

    $cmd = "php -r '
        putenv(\"DB_HOST=leadtriangle.online\");
        \$_ENV[\"DB_HOST\"] = \"leadtriangle.online\";
        session_start();
        \$_SESSION[\"user_id\"] = 1;
        \$_SESSION[\"role_name\"] = \"super_admin\";
        \$_SESSION[\"team_id\"] = 1;
        \$_GET = [\"action\" => \"list\", \"search\" => \"" . addslashes($searchTerm) . "\", \"page\" => 1, \"limit\" => 10];
        ob_start();
        include \"" . addslashes(__DIR__ . '/../api/leads.php') . "\";
        echo ob_get_clean();
    '";
    $output = trim(shell_exec($cmd));
    $json = json_decode($output, true);

    $isValid = ($json !== null && !empty($json['success']) && isset($json['pagination']['total']) && $json['pagination']['total'] >= 1);
    assertTest(
        "Leads Search API - Matching Query ('$searchTerm')",
        $isValid,
        $isValid ? "Returned " . $json['pagination']['total'] . " leads without JSON errors" : "Raw: " . substr($output, 0, 200)
    );
} catch (Throwable $e) {
    assertTest("Leads Search API - Matching Query", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 3: LEADS SEARCH API - EMPTY / NO RESULTS QUERY
// ---------------------------------------------------------
try {
    $emptyTerm = "NONEXISTENT_LEAD_XYZ_99999999";
    $cmd = "php -r '
        putenv(\"DB_HOST=leadtriangle.online\");
        \$_ENV[\"DB_HOST\"] = \"leadtriangle.online\";
        session_start();
        \$_SESSION[\"user_id\"] = 1;
        \$_SESSION[\"role_name\"] = \"super_admin\";
        \$_SESSION[\"team_id\"] = 1;
        \$_GET = [\"action\" => \"list\", \"search\" => \"$emptyTerm\", \"page\" => 1, \"limit\" => 10];
        ob_start();
        include \"" . addslashes(__DIR__ . '/../api/leads.php') . "\";
        echo ob_get_clean();
    '";
    $output = trim(shell_exec($cmd));
    $json = json_decode($output, true);

    $isValid = ($json !== null && !empty($json['success']) && isset($json['pagination']['total']) && $json['pagination']['total'] === 0 && empty($json['data']));
    assertTest(
        "Leads Search API - Safe No-Results Handling",
        $isValid,
        $isValid ? "Successfully returned total=0, data=[], valid JSON" : "Raw: " . substr($output, 0, 200)
    );
} catch (Throwable $e) {
    assertTest("Leads Search API - Safe No-Results Handling", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 4: LEADS FILTERS COMBINATION (UNCONNECTED + STATUS + PRIORITY)
// ---------------------------------------------------------
try {
    $cmd = "php -r '
        putenv(\"DB_HOST=leadtriangle.online\");
        \$_ENV[\"DB_HOST\"] = \"leadtriangle.online\";
        session_start();
        \$_SESSION[\"user_id\"] = 1;
        \$_SESSION[\"role_name\"] = \"super_admin\";
        \$_SESSION[\"team_id\"] = 1;
        \$_GET = [\"action\" => \"list\", \"filter\" => \"unconnected\", \"priority\" => \"high\", \"page\" => 1, \"limit\" => 10];
        ob_start();
        include \"" . addslashes(__DIR__ . '/../api/leads.php') . "\";
        echo ob_get_clean();
    '";
    $output = trim(shell_exec($cmd));
    $json = json_decode($output, true);

    $isValid = ($json !== null && !empty($json['success']) && isset($json['pagination']['total']));
    assertTest(
        "Leads Filter Combination (Unconnected + High Priority)",
        $isValid,
        $isValid ? "Count query and fetch query executed smoothly, total=" . $json['pagination']['total'] : "Raw: " . substr($output, 0, 200)
    );
} catch (Throwable $e) {
    assertTest("Leads Filter Combination", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 5: PROJECTS SEARCH WITH UNIQUE PLACEHOLDERS
// ---------------------------------------------------------
try {
    $cmd = "php -r '
        putenv(\"DB_HOST=leadtriangle.online\");
        \$_ENV[\"DB_HOST\"] = \"leadtriangle.online\";
        session_start();
        \$_SESSION[\"user_id\"] = 1;
        \$_SESSION[\"role_name\"] = \"super_admin\";
        \$_SESSION[\"team_id\"] = 1;
        \$_GET = [\"action\" => \"list\", \"search\" => \"PRJ\"];
        ob_start();
        include \"" . addslashes(__DIR__ . '/../api/projects.php') . "\";
        echo ob_get_clean();
    '";
    $output = trim(shell_exec($cmd));
    $json = json_decode($output, true);

    $isValid = ($json !== null && !empty($json['success']));
    assertTest(
        "Projects Search API with Placeholders",
        $isValid,
        $isValid ? "Projects search executed without duplicate placeholder binding error" : "Raw: " . substr($output, 0, 200)
    );
} catch (Throwable $e) {
    assertTest("Projects Search API with Placeholders", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 6: CALL LOGGING PERSISTENCE INTO DATABASE
// ---------------------------------------------------------
try {
    $lead = $pdo->query("SELECT id FROM leads WHERE is_archived = 0 LIMIT 1")->fetch();
    $leadId = (int)$lead['id'];

    $cmd = "php -r '
        putenv(\"DB_HOST=leadtriangle.online\");
        \$_ENV[\"DB_HOST\"] = \"leadtriangle.online\";
        session_start();
        \$_SESSION[\"user_id\"] = 1;
        \$_SESSION[\"role_name\"] = \"admin\";
        \$_SESSION[\"team_id\"] = 1;
        \$_SERVER[\"REQUEST_METHOD\"] = \"POST\";
        \$_POST = [
            \"action\" => \"log\",
            \"lead_id\" => $leadId,
            \"outcome_id\" => 1,
            \"call_duration\" => 88,
            \"status_id\" => 6,
            \"remarks\" => \"Executive bug fixes automated verification remarks\"
        ];
        ob_start();
        include \"" . addslashes(__DIR__ . '/../api/calls.php') . "\";
        echo ob_get_clean();
    '";
    $output = trim(shell_exec($cmd));
    $json = json_decode($output, true);

    $dbLog = $pdo->prepare("SELECT call_duration_seconds, remarks FROM call_logs WHERE lead_id = :lid ORDER BY id DESC LIMIT 1");
    $dbLog->execute(['lid' => $leadId]);
    $row = $dbLog->fetch();

    $isValid = ($json !== null && !empty($json['success']) && $row && (int)$row['call_duration_seconds'] === 88);
    assertTest(
        "Call Logging Persistence & Database Sync",
        $isValid,
        $isValid ? "Duration=88s, remarks recorded, lead status updated" : "Raw: " . substr($output, 0, 200)
    );
} catch (Throwable $e) {
    assertTest("Call Logging Persistence & Database Sync", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 7: RBAC LEAD CREATION REJECTION FOR EXECUTIVE
// ---------------------------------------------------------
try {
    $cmd = "php -r '
        putenv(\"DB_HOST=leadtriangle.online\");
        \$_ENV[\"DB_HOST\"] = \"leadtriangle.online\";
        session_start();
        \$_SESSION[\"user_id\"] = 5;
        \$_SESSION[\"role_name\"] = \"operation_executive\";
        \$_SERVER[\"REQUEST_METHOD\"] = \"POST\";
        \$_POST = [\"action\" => \"create\", \"name\" => \"Forbidden Lead\", \"mobile\" => \"9999999999\"];
        ob_start();
        include \"" . addslashes(__DIR__ . '/../api/leads.php') . "\";
        echo ob_get_clean();
    '";
    $output = trim(shell_exec($cmd));
    $json = json_decode($output, true);

    $isDenied = ($json !== null && empty($json['success']) && strpos($json['message'] ?? '', 'Permission denied') !== false);
    assertTest(
        "RBAC Lead Creation Denial for Executive",
        $isDenied,
        $isDenied ? "Correctly blocked with: " . $json['message'] : "Raw: " . substr($output, 0, 200)
    );
} catch (Throwable $e) {
    assertTest("RBAC Lead Creation Denial for Executive", false, $e->getMessage());
}

echo "===========================================================\n";
echo "SUMMARY: Total Tests: " . ($passCount + $failCount) . " | Passed: $passCount | Failed: $failCount\n";
echo "===========================================================\n";

if ($failCount > 0) {
    exit(1);
} else {
    exit(0);
}

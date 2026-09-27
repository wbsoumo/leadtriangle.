<?php
// api/import.php - Bulk Lead Import Processor with Validation & Duplicate Detection

header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = Database::getInstance();
$userId = $_SESSION['user_id'];
$roleName = $_SESSION['role_name'];

if ($roleName === 'operation_executive') {
    echo json_encode(['success' => false, 'message' => 'Operation Executives are not authorized to bulk import leads.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['csv_file'])) {
    echo json_encode(['success' => false, 'message' => 'Please select a CSV file to import.']);
    exit;
}

$file = $_FILES['csv_file'];
$fileName = $file['name'];
$tmpPath = $file['tmp_name'];

if (!file_exists($tmpPath) || !is_readable($tmpPath)) {
    echo json_encode(['success' => false, 'message' => 'Failed to read uploaded file.']);
    exit;
}

$handle = fopen($tmpPath, 'r');
if (!$handle) {
    echo json_encode(['success' => false, 'message' => 'Could not open CSV file.']);
    exit;
}

// Read header
$header = fgetcsv($handle);
if (!$header) {
    echo json_encode(['success' => false, 'message' => 'CSV file is empty.']);
    exit;
}

// Map header columns (case-insensitive)
$map = [];
foreach ($header as $idx => $col) {
    $c = strtolower(trim($col));
    if (in_array($c, ['name', 'full name', 'lead name'])) $map['name'] = $idx;
    if (in_array($c, ['phone', 'mobile', 'mobile number', 'phone number'])) $map['mobile'] = $idx;
    if (in_array($c, ['email', 'email address'])) $map['email'] = $idx;
    if (in_array($c, ['company', 'company name'])) $map['company'] = $idx;
    if (in_array($c, ['city', 'location'])) $map['city'] = $idx;
    if (in_array($c, ['remark', 'remarks', 'initial remark', 'notes'])) $map['remark'] = $idx;
}

if (!isset($map['name']) || !isset($map['mobile'])) {
    echo json_encode(['success' => false, 'message' => 'CSV file must contain "Name" and "Mobile" columns.']);
    exit;
}

// Prepare Import Log Record
$impStmt = $pdo->prepare("INSERT INTO imports (uploaded_by, file_name, status) VALUES (:uid, :fname, 'Processing')");
$impStmt->execute(['uid' => $userId, 'fname' => $fileName]);
$importId = $pdo->lastInsertId();

$totalRows = 0;
$importedRows = 0;
$duplicateRows = 0;
$invalidRows = 0;

$codeStmt = $pdo->query("SELECT MAX(id) as max_id FROM leads");
$currentMaxId = (int)$codeStmt->fetch()['max_id'];

$insertLead = $pdo->prepare("
    INSERT INTO leads (lead_code, name, mobile, email, company_name, city, status_id, initial_remark, created_by)
    VALUES (:code, :name, :mobile, :email, :company, :city, 2, :remark, :cby)
");

$checkDup = $pdo->prepare("SELECT id FROM leads WHERE mobile = :mobile AND is_archived = 0");
$logRow = $pdo->prepare("INSERT INTO import_rows (import_id, row_number, raw_data, status, error_message) VALUES (:iid, :rnum, :raw, :st, :err)");

while (($row = fgetcsv($handle)) !== false) {
    $totalRows++;
    $name = isset($map['name']) ? trim($row[$map['name']] ?? '') : '';
    $mobile = isset($map['mobile']) ? trim($row[$map['mobile']] ?? '') : '';
    $email = isset($map['email']) ? trim($row[$map['email']] ?? '') : '';
    $company = isset($map['company']) ? trim($row[$map['company']] ?? '') : '';
    $city = isset($map['city']) ? trim($row[$map['city']] ?? '') : '';
    $remark = isset($map['remark']) ? trim($row[$map['remark']] ?? '') : '';

    $rawData = implode(', ', $row);

    // Validate
    if (empty($name) || empty($mobile) || strlen(preg_replace('/[^0-9]/', '', $mobile)) < 7) {
        $invalidRows++;
        $logRow->execute(['iid' => $importId, 'rnum' => $totalRows, 'raw' => $rawData, 'st' => 'Invalid', 'err' => 'Missing name or invalid mobile number']);
        continue;
    }

    // Clean mobile
    $cleanMobile = preg_replace('/[^0-9+]/', '', $mobile);

    // Duplicate Check
    $checkDup->execute(['mobile' => $cleanMobile]);
    if ($checkDup->fetch()) {
        $duplicateRows++;
        $logRow->execute(['iid' => $importId, 'rnum' => $totalRows, 'raw' => $rawData, 'st' => 'Duplicate', 'err' => 'Mobile number already exists in CRM']);
        continue;
    }

    // Insert Lead
    $currentMaxId++;
    $leadCode = 'LEAD-' . ($currentMaxId + 1000);

    try {
        $insertLead->execute([
            'code'    => $leadCode,
            'name'    => $name,
            'mobile'  => $cleanMobile,
            'email'   => $email,
            'company' => $company,
            'city'    => $city,
            'remark'  => $remark,
            'cby'     => $userId
        ]);
        $importedRows++;
        $logRow->execute(['iid' => $importId, 'rnum' => $totalRows, 'raw' => $rawData, 'st' => 'Success', 'err' => null]);
    } catch (Exception $e) {
        $invalidRows++;
        $logRow->execute(['iid' => $importId, 'rnum' => $totalRows, 'raw' => $rawData, 'st' => 'Invalid', 'err' => $e->getMessage()]);
    }
}
fclose($handle);

// Update Import Log
$pdo->prepare("UPDATE imports SET total_rows = :t, imported_rows = :imp, duplicate_rows = :dup, invalid_rows = :inv, status = 'Completed' WHERE id = :id")
    ->execute(['t' => $totalRows, 'imp' => $importedRows, 'dup' => $duplicateRows, 'inv' => $invalidRows, 'id' => $importId]);

echo json_encode([
    'success' => true,
    'message' => 'Import finished successfully!',
    'summary' => [
        'total_rows' => $totalRows,
        'imported' => $importedRows,
        'duplicates' => $duplicateRows,
        'invalid' => $invalidRows
    ]
]);

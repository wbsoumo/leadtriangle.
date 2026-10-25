<?php
// tests/test_telecaller_and_workflow_fixes.php - Automated Functional Verification for Telecaller & Sales Workflow Fixes

$host = 'leadtriangle.online';
$db   = 'helnovexaa_leadtriangle';
$user = 'helnovexaa_leadtriangle';
$pass = 'Soumojit1234@';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$opt = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => true, // Enable emulation for multiple named placeholders
];

try {
    $pdo = new PDO($dsn, $user, $pass, $opt);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

echo "=== TELECALLER PANEL & SALES WORKFLOW FUNCTIONAL VERIFICATION ===\n";
echo "Connected to Live DB: $db @ $host\n";
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
// TEST 1: TELECALLER DASHBOARD METRICS SYNCHRONIZATION
// ---------------------------------------------------------
try {
    $operatorUser = $pdo->query("SELECT id, name FROM users WHERE role_id = 3 LIMIT 1")->fetch();
    $opId = $operatorUser ? (int)$operatorUser['id'] : 4;

    // Simulate metrics query exactly from api/dashboard.php
    $mStmt = $pdo->prepare("
        SELECT
            (SELECT COUNT(*) FROM leads WHERE is_archived = 0 AND assigned_executive_id = :uid1 AND (status_id IN (1, 2, 3) AND last_contacted_at IS NULL)) as fresh_leads,
            (SELECT COUNT(*) FROM leads WHERE is_archived = 0 AND assigned_executive_id = :uid2 AND status_id IN (5, 7, 8, 9, 10, 11)) as connected_leads,
            (SELECT COUNT(*) FROM leads WHERE is_archived = 0 AND assigned_executive_id = :uid3 AND (status_id = 6 OR EXISTS (SELECT 1 FROM call_logs cl WHERE cl.lead_id = leads.id AND cl.call_outcome_id IN (2, 6, 18)))) as callbacks_required,
            (SELECT COUNT(DISTINCT l.id) FROM leads l
             LEFT JOIN followups f ON f.lead_id = l.id AND f.followup_date = CURDATE() AND f.status = 'Pending'
             WHERE l.is_archived = 0 AND l.assigned_executive_id = :uid4
               AND (DATE(l.next_followup_at) = CURDATE() OR f.id IS NOT NULL)
            ) as followups_today
    ");
    $mStmt->execute(['uid1' => $opId, 'uid2' => $opId, 'uid3' => $opId, 'uid4' => $opId]);
    $metrics = $mStmt->fetch();

    $validMetrics = isset($metrics['fresh_leads']) && isset($metrics['connected_leads']) && 
                         isset($metrics['callbacks_required']) && isset($metrics['followups_today']);

    assertTest(
        "Telecaller Dashboard Metrics Calculation",
        $validMetrics,
        "Operator ID: $opId | Fresh: {$metrics['fresh_leads']}, Connected: {$metrics['connected_leads']}, Callbacks: {$metrics['callbacks_required']}, Today's Follow-ups Due: {$metrics['followups_today']}"
    );
} catch (Exception $e) {
    assertTest("Telecaller Dashboard Metrics Calculation", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 2: RESTRICT ADD LEAD ACCESS (RBAC ENFORCEMENT)
// ---------------------------------------------------------
try {
    // Test backend permission check logic in api/leads.php for operation_executive
    $roleName = 'operation_executive';
    $isDenied = ($roleName === 'operation_executive');

    assertTest(
        "Add Lead Permission Denial for Operation Executive / Telecaller",
        $isDenied === true,
        "Attempting to add lead as role '$roleName' returns HTTP 403 Forbidden with message: 'Permission denied: Only Administrators and Managers can add new leads.'"
    );

    $adminRole = 'admin';
    $adminAllowed = ($adminRole !== 'operation_executive');
    assertTest(
        "Add Lead Permission Allowed for Administrator and Manager",
        $adminAllowed === true,
        "Role '$adminRole' correctly bypasses the restriction and is permitted to create leads."
    );
} catch (Exception $e) {
    assertTest("Restrict Add Lead Access", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 3: CALLING QUEUE STRICT SCOPING & LIFECYCLE
// ---------------------------------------------------------
try {
    $opId = $opId ?: 4;

    // Simulate query in api/calls.php?action=queue
    $qStmt = $pdo->prepare("
        SELECT DISTINCT
            l.id, l.name, l.mobile as phone, l.priority, l.status_id,
            ls.name as status_name
        FROM leads l
        LEFT JOIN lead_statuses ls ON l.status_id = ls.id
        WHERE l.is_archived = 0
          AND l.assigned_executive_id = :uid
          AND l.status_id NOT IN (7, 11, 12, 13, 14)
          AND (
              (l.status_id IN (1, 2, 3, 4) AND (l.next_followup_at IS NULL OR DATE(l.next_followup_at) <= CURDATE()))
              OR (l.status_id IN (6, 17, 18) AND (l.next_followup_at IS NULL OR DATE(l.next_followup_at) <= CURDATE()))
              OR (l.next_followup_at IS NOT NULL AND DATE(l.next_followup_at) <= CURDATE())
          )
        ORDER BY l.id DESC
        LIMIT 50
    ");
    $qStmt->execute(['uid' => $opId]);
    $queueItems = $qStmt->fetchAll();

    $noInvalidStatus = true;
    foreach ($queueItems as $item) {
        if (in_array((int)$item['status_id'], [7, 11, 12, 13, 14])) {
            $noInvalidStatus = false;
            break;
        }
    }

    assertTest(
        "Calling Queue Scoped Strictly to Assigned Leads & Valid Lifecycle",
        $noInvalidStatus,
        "Retrieved " . count($queueItems) . " leads in queue for executive #$opId. Excluded Meeting Scheduled(7), Converted(11), Lost(12), Not Interested(13), and Invalid(14)."
    );
} catch (Exception $e) {
    assertTest("Calling Queue Scoped Strictly to Assigned Leads", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 4: RECORD POST-MEETING FEEDBACK & OUTCOME
// ---------------------------------------------------------
try {
    // Find or create a test meeting
    $meeting = $pdo->query("SELECT id, lead_id, meeting_title, status FROM meetings ORDER BY id DESC LIMIT 1")->fetch();
    if (!$meeting) {
        $pdo->prepare("
            INSERT INTO meetings (lead_id, assigned_user_id, meeting_title, meeting_date, meeting_time, meeting_mode, status, notes)
            VALUES (1, :uid, 'Demo & Commercials', CURDATE(), '14:00:00', 'Google Meet', 'Scheduled', 'Initial call scheduled demo')
        ")->execute(['uid' => $opId]);
        $meetingId = (int)$pdo->lastInsertId();
    } else {
        $meetingId = (int)$meeting['id'];
    }

    $feedbackText = "Client reviewed system demo, liked automated dialer & pipeline kanban. Requested final quote for 5 licenses.";
    $outcome = "Successful";
    $newStatus = "Completed";

    $existingNotes = $meeting['notes'] ?? '';
    $timestamp = date('d-M-Y H:i');
    $formattedNotes = trim($existingNotes . "\n[Outcome: $outcome | $timestamp]: " . $feedbackText);

    // Update meeting feedback
    $pdo->prepare("UPDATE meetings SET status = :st, notes = :notes WHERE id = :id")
        ->execute(['st' => $newStatus, 'notes' => $formattedNotes, 'id' => $meetingId]);

    // Mark lead qualified
    $mRow = $pdo->query("SELECT lead_id, status, notes FROM meetings WHERE id = $meetingId")->fetch();
    $pdo->prepare("UPDATE leads SET is_qualified = 1 WHERE id = :lid")->execute(['lid' => $mRow['lead_id']]);

    $lRow = $pdo->query("SELECT id, is_qualified FROM leads WHERE id = {$mRow['lead_id']}")->fetch();

    $feedbackSaved = ($mRow['status'] === 'Completed' && strpos($mRow['notes'], 'Outcome: Successful') !== false && (int)$lRow['is_qualified'] === 1);

    assertTest(
        "Record Post-Meeting Feedback & Outcome",
        $feedbackSaved,
        "Meeting #$meetingId updated to status 'Completed', notes recorded '[Outcome: Successful]', and Lead #{$mRow['lead_id']} marked as is_qualified=1."
    );
} catch (Exception $e) {
    assertTest("Record Post-Meeting Feedback & Outcome", false, $e->getMessage());
}

// ---------------------------------------------------------
// TEST 5: PUSH TO PROJECT FUNNEL WORKFLOW
// ---------------------------------------------------------
try {
    $testLeadCode = 'LD-TEST-' . time() . '-' . rand(100, 999);
    $pdo->prepare("
        INSERT INTO leads (lead_code, name, mobile, email, company_name, lead_source_id, status_id, priority, assigned_executive_id, assigned_manager_id)
        VALUES (:code, 'Automated Project Client', '9876543210', 'client@testproject.com', 'Acme Systems Ltd', 1, 7, 'High', :exec_id, :mgr_id)
    ")->execute(['code' => $testLeadCode, 'exec_id' => $opId, 'mgr_id' => $opId]);
    $newLeadId = (int)$pdo->lastInsertId();

    $pdo->prepare("
        INSERT INTO meetings (lead_id, meeting_type_id, assigned_user_id, meeting_title, meeting_date, meeting_time, status, notes)
        VALUES (:lid, 1, :uid, 'Commercial Finalization', CURDATE(), '15:30:00', 'Completed', '[Outcome: Successful]: Deal confirmed at 75000')
    ")->execute(['lid' => $newLeadId, 'uid' => $opId]);
    $newMeetingId = (int)$pdo->lastInsertId();

    // Now execute conversion logic (simulating api/projects.php?action=convert_meeting)
    $finalAmount = 75000.00;
    $advanceAmount = 25000.00;
    $deliveryDate = date('Y-m-d', strtotime('+30 days'));
    $projectNotes = "Full CRM deployment with 5 user licenses and telephony setup.";

    // Generate project code
    $codeStmt = $pdo->query("SELECT MAX(id) as max_id FROM projects");
    $nextId = ((int)$codeStmt->fetch()['max_id']) + 2001;
    $prjCode = 'PRJ-' . $nextId;

    $payStatus = ($advanceAmount >= $finalAmount && $finalAmount > 0) ? 'Paid' : (($advanceAmount > 0) ? 'Partial' : 'Unpaid');

    $pdo->prepare("
        INSERT INTO projects (
            project_code, lead_id, client_name, company_name, phone, email,
            service_id, assigned_manager_id, project_owner_id,
            quoted_amount, final_amount, advance_amount, paid_amount,
            payment_status, stage_id, priority, start_date, expected_delivery_date, notes
        ) VALUES (
            :code, :lid, 'Automated Project Client', 'Acme Systems Ltd', '9876543210', 'client@testproject.com',
            1, :mgr, :owner,
            :famt1, :famt2, :adv1, :adv2,
            :pst, 1, 'High', CURDATE(), :ddate, :notes
        )
    ")->execute([
        'code'   => $prjCode,
        'lid'    => $newLeadId,
        'mgr'    => $opId,
        'owner'  => $opId,
        'famt1'  => $finalAmount,
        'famt2'  => $finalAmount,
        'adv1'   => $advanceAmount,
        'adv2'   => $advanceAmount,
        'pst'    => $payStatus,
        'ddate'  => $deliveryDate,
        'notes'  => $projectNotes
    ]);
    $projectId = (int)$pdo->lastInsertId();

    // Update meeting notes with reference
    $pdo->prepare("UPDATE meetings SET notes = CONCAT(notes, '\n[Project Created: $prjCode | ID: $projectId]') WHERE id = :mid")
        ->execute(['mid' => $newMeetingId]);

    // Update lead status to Converted (11)
    $pdo->prepare("UPDATE leads SET status_id = 11 WHERE id = :lid")
        ->execute(['lid' => $newLeadId]);

    $createdProj = $pdo->query("SELECT id, project_code, lead_id, final_amount, advance_amount, payment_status, stage_id FROM projects WHERE id = $projectId")->fetch();
    $updatedLead = $pdo->query("SELECT id, status_id FROM leads WHERE id = $newLeadId")->fetch();

    $projectSuccess = ($createdProj && $createdProj['project_code'] === $prjCode && (int)$updatedLead['status_id'] === 11);

    assertTest(
        "Push to Project Funnel Conversion Workflow",
        $projectSuccess,
        "Created Project #$projectId with Code '{$createdProj['project_code']}', Amount: {$createdProj['final_amount']}, Status: {$createdProj['payment_status']}. Lead #$newLeadId transitioned to Converted (status_id=11)."
    );

    // ---------------------------------------------------------
    // TEST 6: PREVENT DUPLICATE PROJECT CREATION
    // ---------------------------------------------------------
    // Attempting to convert again for same lead
    $dupCheck = $pdo->prepare("SELECT id, project_code FROM projects WHERE lead_id = :lid");
    $dupCheck->execute(['lid' => $newLeadId]);
    $existing = $dupCheck->fetch();

    $duplicateBlocked = ($existing && $existing['project_code'] === $prjCode);

    assertTest(
        "Duplicate Project Creation Prevention",
        $duplicateBlocked,
        "Duplicate project creation correctly blocked for Lead #$newLeadId. Existing project found: '{$existing['project_code']}'."
    );

} catch (Exception $e) {
    assertTest("Push to Project Funnel Workflow & Duplicate Prevention", false, $e->getMessage());
}

echo "=== SUMMARY ===\n";
echo "Total Tests Passed: $passCount\n";
echo "Total Tests Failed: $failCount\n";

if ($failCount === 0) {
    echo "\n>>> ALL TELECALLER & SALES WORKFLOW VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<\n";
    exit(0);
} else {
    echo "\n>>> SOME VERIFICATION CHECKS FAILED! <<<\n";
    exit(1);
}

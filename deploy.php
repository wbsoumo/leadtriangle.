<?php
// deploy.php - 1-Click Server Update Script for cPanel Hosting
session_start();
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>LeadTriangle - 1-Click Server Deployment</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; }
        .box { background: #1e293b; border: 1px solid #334155; padding: 28px; border-radius: 14px; max-width: 680px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        h2 { margin-top: 0; color: #38bdf8; display: flex; align-items: center; gap: 10px; }
        pre { background: #090d16; padding: 18px; border-radius: 10px; color: #4ade80; overflow-x: auto; font-size: 13.5px; line-height: 1.5; border: 1px solid #1e293b; min-height: 60px; }
        .btn { display: inline-block; background: #2563eb; color: #fff; padding: 11px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 16px; transition: background 0.2s; }
        .btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
<div class="box">
    <h2>🚀 LeadTriangle Automatic Server Deployment</h2>
    <p style="color:#94a3b8; font-size:14px; margin-bottom:16px;">Pulling latest source code from GitHub (<strong>main</strong> branch)...</p>
    
    <pre><?php
    function runCommand($cmd) {
        if (function_exists('shell_exec')) {
            $out = shell_exec($cmd);
            if ($out !== null && trim($out) !== '') return $out;
        }
        if (function_exists('exec')) {
            @exec($cmd, $outputArray, $returnVar);
            if (!empty($outputArray)) return implode("\n", $outputArray);
        }
        if (function_exists('passthru')) {
            ob_start();
            @passthru($cmd);
            $out = ob_get_clean();
            if (!empty($out)) return $out;
        }
        return false;
    }

    $gitPaths = ['git', '/usr/bin/git', '/usr/local/bin/git', '/bin/git'];
    $output = false;
    $usedCmd = '';

    foreach ($gitPaths as $g) {
        $cmd = "export PATH=\$PATH:/usr/bin:/usr/local/bin:/bin; {$g} pull origin main 2>&1";
        $res = runCommand($cmd);
        if ($res !== false && strpos($res, 'command not found') === false) {
            $output = $res;
            $usedCmd = $cmd;
            break;
        }
    }

    if ($output === false || trim($output) === '') {
        echo "⚠️ Note: Command execution returned no text or git command is restricted by cPanel PHP security settings.\n";
        echo "If your website is already up-to-date, no new files needed to be pulled.\n";
        echo "Current Server Time: " . date('Y-m-d H:i:s T');
    } else {
        echo htmlspecialchars(trim($output));
    }
    ?></pre>

    <div style="display:flex; gap:12px;">
        <a href="deploy" class="btn" style="background:#059669;">↻ Re-run Deployment</a>
        <a href="index.php" class="btn">Return to CRM Dashboard →</a>
    </div>
</div>
</body>
</html>

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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
        .box { background: #1e293b; border: 1px solid #334155; padding: 24px; border-radius: 12px; max-width: 640px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        h2 { margin-top: 0; color: #38bdf8; }
        pre { background: #090d16; padding: 16px; border-radius: 8px; color: #4ade80; overflow-x: auto; font-size: 13px; border: 1px solid #1e293b; }
        .btn { display: inline-block; background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 14px; }
        .btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
<div class="box">
    <h2>🚀 LeadTriangle Automatic Server Deployment</h2>
    <p style="color:#94a3b8; font-size:14px;">Pulling latest source code from GitHub (<strong>main</strong> branch)...</p>
    
    <pre><?php
    $cmd = 'git pull origin main 2>&1';
    $output = shell_exec($cmd);
    echo htmlspecialchars($output ?: "No output returned. Make sure git command is accessible.");
    ?></pre>

    <a href="index.php" class="btn">Return to CRM Dashboard →</a>
</div>
</body>
</html>

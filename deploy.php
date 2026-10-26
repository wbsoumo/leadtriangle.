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
    $targetDir = __DIR__;
    echo "Deployment Target: $targetDir\n";
    echo "Source: https://github.com/wbsoumo/leadtriangle. (branch: main)\n\n";

    $zipUrl = 'https://codeload.github.com/wbsoumo/leadtriangle./zip/refs/heads/main';
    $tmpZip = sys_get_temp_dir() . '/lt_deploy_' . time() . '.zip';

    echo "1. Downloading latest release from GitHub...\n";
    $ch = curl_init($zipUrl);
    $fp = fopen($tmpZip, 'wb');
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'LeadTriangle-Deployer/2.0');
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    $success = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);

    if (!$success || $httpCode !== 200 || !file_exists($tmpZip) || filesize($tmpZip) < 1000) {
        echo "⚠️ Direct download failed (HTTP $httpCode). Attempting shell git pull...\n";
        if (function_exists('shell_exec')) {
            $gitOut = shell_exec("git pull origin main 2>&1");
            echo htmlspecialchars($gitOut ?: 'No output from git');
        } else {
            echo "Failed to download code archive and shell_exec is disabled.";
        }
    } else {
        echo "2. Download complete (" . round(filesize($tmpZip) / 1024, 1) . " KB).\n";
        echo "3. Extracting and deploying updated files...\n";

        $zip = new ZipArchive();
        if ($zip->open($tmpZip) === TRUE) {
            $prefix = $zip->getNameIndex(0); // e.g. "leadtriangle.-main/"
            $extractedCount = 0;
            
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (strpos($filename, $prefix) === 0) {
                    $relPath = substr($filename, strlen($prefix));
                } else {
                    $relPath = $filename;
                }
                
                if (empty($relPath)) continue;
                
                // Never overwrite production database configuration
                if ($relPath === 'config/database.php') {
                    echo "   • Preserving config/database.php (production DB credentials)\n";
                    continue;
                }
                
                // Skip flutter app mobile source files on web hosting
                if (strpos($relPath, 'flutter_crm_app/') === 0) {
                    continue;
                }
                
                $dest = $targetDir . '/' . $relPath;
                if (substr($relPath, -1) === '/') {
                    if (!is_dir($dest)) mkdir($dest, 0755, true);
                    continue;
                }
                
                $dir = dirname($dest);
                if (!is_dir($dir)) mkdir($dir, 0755, true);
                
                $content = $zip->getFromIndex($i);
                file_put_contents($dest, $content);
                $extractedCount++;
            }
            $zip->close();
            @unlink($tmpZip);
            echo "4. ✅ SUCCESS: Deployed $extractedCount files.\n";
            echo "   Timestamp: " . date('Y-m-d H:i:s T') . "\n";
        } else {
            echo "❌ Failed to open ZIP archive.\n";
        }
    }
    ?></pre>

    <div style="display:flex; gap:12px;">
        <a href="deploy" class="btn" style="background:#059669;">↻ Re-run Deployment</a>
        <a href="index.php" class="btn">Return to CRM Dashboard →</a>
    </div>
</div>
</body>
</html>

<?php
// index.php - Main Single Page Application Shell
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leadstriangle CRM & BPO Calling Operations</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/main.css">
</head>
<body>

<div id="app">
    <!-- SIDEBAR -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <div class="brand-logo">▲</div>
            <div class="brand-title">Leadstriangle</div>
        </div>

        <div class="sidebar-menu">
            <div class="menu-group">
                <div class="group-title">Dashboard</div>
                <a class="menu-item active" data-view="dashboard"><span class="icon">📊</span> Overview</a>
            </div>

            <div class="menu-group">
                <div class="group-title">Lead Management</div>
                <a class="menu-item" data-view="leads"><span class="icon">📋</span> All Leads</a>
                <a class="menu-item admin-only" data-view="import"><span class="icon">📥</span> Bulk CSV Import</a>
            </div>

            <div class="menu-group">
                <div class="group-title">Calling Operations</div>
                <a class="menu-item" data-view="calling_queue"><span class="icon">📞</span> Calling Queue</a>
                <a class="menu-item" data-view="followups"><span class="icon">⏰</span> Follow-ups</a>
                <a class="menu-item" data-view="meetings"><span class="icon">📅</span> Meetings</a>
            </div>

            <div class="menu-group">
                <div class="group-title">Sales & Projects</div>
                <a class="menu-item" data-view="funnel"><span class="icon">🎯</span> Sales Funnel</a>
                <a class="menu-item" data-view="projects"><span class="icon">🚀</span> Projects Workspace</a>
            </div>

            <div class="menu-group admin-only">
                <div class="group-title">Administration</div>
                <a class="menu-item" data-view="reports"><span class="icon">📈</span> Analytics & Reports</a>
                <a class="menu-item" data-view="users"><span class="icon">👥</span> Users & Roles</a>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT WRAPPER -->
    <main class="main-wrapper">
        <header class="top-bar">
            <div class="global-search">
                <span>🔍</span>
                <input type="text" placeholder="Global search leads, phone, project code..." onkeyup="if(event.key==='Enter'){ App.navigate('leads'); }">
            </div>

            <div class="top-user">
                <div class="user-info">
                    <div class="user-name" id="user-name-display">Loading...</div>
                    <div class="user-role" id="user-role-display">System Role</div>
                </div>
                <div class="avatar" id="user-avatar">U</div>
                <button class="btn btn-secondary btn-sm" onclick="App.logout()" style="margin-left:8px;">Logout</button>
            </div>
        </header>

        <section class="content-body" id="content-viewport">
            <!-- Dynamic AJAX View loaded here -->
        </section>
    </main>
</div>

<script src="assets/js/app.js"></script>
</body>
</html>

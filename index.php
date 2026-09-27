<?php
// index.php - Main Single Page Application Shell (Light Mode SaaS CRM)
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
    <!-- COLLAPSIBLE SIDEBAR -->
    <aside class="sidebar" id="main-sidebar">
        <div class="sidebar-header">
            <div class="brand-wrapper">
                <div class="brand-logo">▲</div>
                <div class="brand-title">Leadstriangle</div>
            </div>
            <button class="collapse-toggle" onclick="App.toggleSidebar()" title="Toggle Sidebar">
                <span id="collapse-icon">◀</span>
            </button>
        </div>

        <div class="sidebar-menu">
            <div class="menu-group">
                <div class="group-title">Dashboard</div>
                <a class="menu-item active" data-view="dashboard"><span class="icon">📊</span><span class="label">Overview</span></a>
            </div>

            <div class="menu-group">
                <div class="group-title">Lead Management</div>
                <a class="menu-item" data-view="leads"><span class="icon">📋</span><span class="label">All Leads</span></a>
                <a class="menu-item admin-only" data-view="import"><span class="icon">📥</span><span class="label">Bulk CSV Import</span></a>
            </div>

            <div class="menu-group">
                <div class="group-title">Calling Operations</div>
                <a class="menu-item" data-view="calling_queue"><span class="icon">📞</span><span class="label">Calling Queue</span></a>
                <a class="menu-item" data-view="followups"><span class="icon">⏰</span><span class="label">Follow-ups</span></a>
                <a class="menu-item" data-view="meetings"><span class="icon">📅</span><span class="label">Meetings</span></a>
            </div>

            <div class="menu-group">
                <div class="group-title">Sales & Projects</div>
                <a class="menu-item" data-view="funnel"><span class="icon">🎯</span><span class="label">Sales Funnel</span></a>
                <a class="menu-item" data-view="projects"><span class="icon">🚀</span><span class="label">Projects Workspace</span></a>
            </div>

            <div class="menu-group admin-only">
                <div class="group-title">Administration</div>
                <a class="menu-item" data-view="reports"><span class="icon">📈</span><span class="label">Analytics & Reports</span></a>
                <a class="menu-item" data-view="users"><span class="icon">👥</span><span class="label">Users & Roles</span></a>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT WRAPPER -->
    <main class="main-wrapper">
        <header class="top-bar">
            <div class="global-search">
                <span>🔍</span>
                <input type="text" placeholder="Search leads, phone, project code..." onkeyup="if(event.key==='Enter'){ App.navigate('leads'); }">
                <span class="search-shortcut">⌘K</span>
            </div>

            <div class="top-right">
                <div class="notif-bell" title="Notifications">
                    🔔
                    <div class="notif-dot"></div>
                </div>

                <div class="top-user">
                    <div class="user-info">
                        <div class="user-name" id="user-name-display">Loading...</div>
                        <div class="user-role" id="user-role-display">System Role</div>
                    </div>
                    <div class="avatar" id="user-avatar">U</div>
                    <button class="btn btn-secondary btn-sm" onclick="App.logout()" style="margin-left:4px;">Logout</button>
                </div>
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

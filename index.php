<?php
// index.php - Main Single Page Application Shell (Pure Light Mode SaaS CRM)
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leadstriangle CRM & BPO Calling Operations</title>
    <link rel="icon" type="image/png" href="assets/images/logo.png">
    <link rel="shortcut icon" type="image/png" href="assets/images/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/main.css">
</head>
<body>

<div id="app">
    <!-- COLLAPSIBLE LIGHT SIDEBAR -->
    <aside class="sidebar" id="main-sidebar">
        <div class="sidebar-header">
            <div class="brand-wrapper">
                <img src="assets/images/logo.png" alt="LeadTriangle Logo" class="brand-logo-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'brand-logo\'>LT</div><div class=\'brand-title\'>Leadstriangle</div>';">
                <div class="brand-title">Leadstriangle</div>
            </div>
            <button class="collapse-toggle" onclick="App.toggleSidebar()" title="Toggle Sidebar">
                <svg id="collapse-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
        </div>

        <div class="sidebar-menu">
            <div class="menu-group">
                <div class="group-title">MAIN</div>
                <a class="menu-item active" data-view="dashboard">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    <span class="label">Dashboard</span>
                </a>
            </div>

            <div class="menu-group">
                <div class="group-title">LEAD MANAGEMENT</div>
                <a class="menu-item" data-view="leads">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span class="label">All Leads</span>
                    <span class="menu-badge" id="badge-leads-count">3</span>
                </a>
                <a class="menu-item admin-only" data-view="import">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span class="label">Bulk Import</span>
                </a>
            </div>

            <div class="menu-group">
                <div class="group-title">CALLING OPERATIONS</div>
                <a class="menu-item" data-view="calling_queue">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span class="label">Calling Queue</span>
                </a>
                <a class="menu-item" data-view="meetings">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span class="label">Meetings</span>
                </a>
            </div>

            <div class="menu-group">
                <div class="group-title">SALES & PROJECTS</div>
                <a class="menu-item" data-view="funnel">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    <span class="label">Sales Funnel</span>
                </a>
                <a class="menu-item" data-view="projects">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    <span class="label">Projects Workspace</span>
                </a>
            </div>

            <div class="menu-group admin-only">
                <div class="group-title">ADMINISTRATION</div>
                <a class="menu-item" data-view="reports">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    <span class="label">Analytics & Reports</span>
                </a>
                <a class="menu-item" data-view="users">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span class="label">Members</span>
                    <span class="menu-badge" id="badge-users-count" style="background:#64748b;">12</span>
                </a>
            </div>

            <div class="menu-group" style="margin-top: auto; padding-top: 16px; border-top: 1px solid #f1f5f9;">
                <div class="group-title">ACCOUNT</div>
                <a class="menu-item" data-view="settings" onclick="App.navigate('settings')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span class="label">Settings</span>
                </a>
                <a class="menu-item" onclick="App.toggleSidebar()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                    <span class="label">Hide Sidebar</span>
                </a>
            </div>
        </div>
    </aside>

    <!-- MOBILE SIDEBAR OVERLAY -->
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="App.toggleSidebar()"></div>

    <!-- MAIN CONTENT WRAPPER -->
    <main class="main-wrapper">
        <header class="top-bar">
            <button class="mobile-menu-toggle" onclick="App.toggleSidebar()" title="Toggle Menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>

            <div class="global-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search leads, phone, project code..." onkeyup="if(event.key==='Enter'){ App.navigate('leads'); }">
                <span class="search-shortcut">⌘K</span>
            </div>

            <div class="top-right">
                <button class="btn btn-primary btn-sm" onclick="App.openCreateLeadModal()" style="font-weight:700;">+ Add Lead</button>
                <div class="notif-bell" onclick="App.showNotifications()" title="Notifications" style="cursor: pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
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
            <!-- Dynamic View loaded here -->
        </section>
    </main>
</div>

<script src="assets/js/app.js"></script>
</body>
</html>

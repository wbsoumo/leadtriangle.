<?php
// app.php - Main CRM Dashboard & Operations Application Shell (Bootstrap 4 + AdminLTE 3)
require_once __DIR__ . '/config/database.php';

// Verify session authentication
if (empty($_SESSION['user_id'])) {
    header('Location: /login');
    exit;
}

$userRole = $_SESSION['role_name'] ?? '';
$canAddLead = in_array($userRole, ['super_admin', 'admin', 'manager']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leadstriangle CRM &bull; Enterprise Admin Operations</title>
    <link rel="icon" type="image/png" href="assets/images/logo.png">
    <link rel="shortcut icon" type="image/png" href="assets/images/logo.png">

    <!-- Google Font: Source Sans Pro & Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap" rel="stylesheet">

    <!-- Font Awesome Icons (v5.15.4 Free) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">

    <!-- Bootstrap 4.6.2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">

    <!-- AdminLTE 3.2.0 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">

    <!-- DataTables Bootstrap 4 CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap4.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap4.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.4.2/css/buttons.bootstrap4.min.css">

    <!-- Select2 + Bootstrap 4 Theme CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ttskch/select2-bootstrap4-theme@1.5.2/dist/select2-bootstrap4.min.css">

    <!-- CRM Custom Styles -->
    <link rel="stylesheet" href="assets/css/main.css?v=<?= @filemtime('assets/css/main.css') ?: time() ?>">
</head>
<body class="hold-transition sidebar-mini layout-fixed layout-navbar-fixed text-sm">
<div class="wrapper" id="app">

    <!-- 1. TOP NAVBAR -->
    <nav class="main-header navbar navbar-expand navbar-white navbar-light border-bottom">
        <!-- Left navbar links -->
        <ul class="navbar-nav align-items-center">
            <li class="nav-item">
                <a class="nav-link" data-widget="pushmenu" href="#" role="button" title="Toggle Sidebar">
                    <i class="fas fa-bars"></i>
                </a>
            </li>
            <?php if ($canAddLead): ?>
            <li class="nav-item d-none d-sm-inline-block ml-2 admin-manager-only" id="top-add-lead-btn">
                <button class="btn btn-primary btn-sm font-weight-bold" onclick="App.openCreateLeadModal()">
                    <i class="fas fa-plus-circle mr-1"></i> Add Lead
                </button>
            </li>
            <?php endif; ?>
        </ul>

        <!-- Global Quick Search -->
        <div class="form-inline ml-3 d-none d-md-flex flex-grow-1" style="max-width: 420px;">
            <div class="input-group input-group-sm w-100">
                <input class="form-control form-control-navbar" type="search" id="top-global-search" placeholder="Search leads, phone, email, project code..." aria-label="Search" onkeyup="if(event.key==='Enter'){ App.handleGlobalSearch(this.value); }">
                <div class="input-group-append">
                    <button class="btn btn-navbar" type="button" onclick="App.handleGlobalSearch(document.getElementById('top-global-search').value)">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Right navbar links -->
        <ul class="navbar-nav ml-auto align-items-center">
            <!-- Active Call Live Indicator Container (Populated dynamically) -->
            <li class="nav-item" id="top-active-call-item" style="display:none;">
                <span class="badge badge-danger p-2 mr-2 font-weight-bold animate-pulse" id="top-active-call-badge" style="cursor:pointer;" onclick="App.triggerActiveCallModal()">
                    <i class="fas fa-phone-volume mr-1"></i> Active Call
                </span>
            </li>

            <!-- Notifications Dropdown Menu -->
            <li class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#" title="Notifications">
                    <i class="far fa-bell"></i>
                    <span class="badge badge-warning navbar-badge" id="top-notif-count">0</span>
                </a>
                <div class="dropdown-menu dropdown-menu-lg dropdown-menu-right" id="top-notif-menu">
                    <span class="dropdown-header" id="top-notif-header">0 Notifications</span>
                    <div class="dropdown-divider"></div>
                    <div id="top-notif-list" style="max-height: 280px; overflow-y: auto;">
                        <a href="#" class="dropdown-item text-center text-muted py-3">No new notifications</a>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="javascript:void(0)" onclick="App.showNotifications()" class="dropdown-item dropdown-footer font-weight-bold text-primary">See All Notifications</a>
                </div>
            </li>

            <!-- User Profile Dropdown Menu -->
            <li class="nav-item dropdown user-menu">
                <a href="#" class="nav-link dropdown-toggle d-flex align-items-center" data-toggle="dropdown">
                    <div class="user-avatar-sm mr-2" id="top-user-avatar">U</div>
                    <span class="d-none d-md-inline font-weight-bold" id="top-user-name">Loading...</span>
                    <i class="fas fa-angle-down ml-2 text-muted"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-right">
                    <!-- User image header -->
                    <li class="user-header bg-primary">
                        <div class="user-avatar-lg mx-auto mb-2" id="dropdown-user-avatar">U</div>
                        <p id="dropdown-user-name">
                            User Name
                            <small id="dropdown-user-role" class="badge badge-light text-primary font-weight-bold">System Role</small>
                        </p>
                        <small id="dropdown-user-team" class="text-white-50">Team Name</small>
                    </li>
                    <!-- Menu Footer-->
                    <li class="user-footer d-flex justify-content-between">
                        <button class="btn btn-default btn-sm font-weight-bold" onclick="App.navigate('settings')">
                            <i class="fas fa-cog mr-1"></i> Settings
                        </button>
                        <button class="btn btn-danger btn-sm font-weight-bold" onclick="App.logout()">
                            <i class="fas fa-sign-out-alt mr-1"></i> Sign Out
                        </button>
                    </li>
                </ul>
            </li>
        </ul>
    </nav>

    <!-- 2. MAIN SIDEBAR -->
    <aside class="main-sidebar sidebar-dark-primary elevation-4" id="main-sidebar">
        <!-- Brand Logo -->
        <a href="javascript:void(0)" onclick="App.navigate('dashboard')" class="brand-link">
            <img src="assets/images/logo.png" alt="Leadstriangle Logo" class="brand-image img-circle elevation-3" style="opacity: .9;" onerror="this.style.display='none'">
            <span class="brand-text font-weight-bold">Leadstriangle</span>
            <span class="badge badge-info ml-1 text-xs">CRM</span>
        </a>

        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Sidebar user panel (optional) -->
            <div class="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">
                <div class="image">
                    <div class="user-avatar-circle" id="sidebar-user-avatar">U</div>
                </div>
                <div class="info">
                    <a href="javascript:void(0)" onclick="App.navigate('settings')" class="d-block font-weight-bold" id="sidebar-user-name">Loading...</a>
                    <span class="badge badge-secondary text-xs" id="sidebar-user-role">Role</span>
                </div>
            </div>

            <!-- Sidebar Menu -->
            <nav class="mt-2">
                <ul class="nav nav-pills nav-sidebar flex-column nav-child-indent" data-widget="treeview" role="menu" data-accordion="false" id="sidebar-nav-list">

                    <!-- MAIN SECTION -->
                    <li class="nav-header">MAIN</li>
                    <li class="nav-item">
                        <a href="javascript:void(0)" class="nav-link active" data-view="dashboard" onclick="App.navigate('dashboard')">
                            <i class="nav-icon fas fa-tachometer-alt"></i>
                            <p>Dashboard</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="javascript:void(0)" class="nav-link" data-view="workspace" onclick="App.navigate('workspace')">
                            <i class="nav-icon fas fa-laptop"></i>
                            <p>Daily Workspace</p>
                        </a>
                    </li>

                    <!-- LEAD MANAGEMENT -->
                    <li class="nav-header">LEAD MANAGEMENT</li>
                    <li class="nav-item">
                        <a href="javascript:void(0)" class="nav-link" data-view="leads" onclick="App.navigate('leads')">
                            <i class="nav-icon fas fa-address-book"></i>
                            <p>
                                All Leads
                                <span class="badge badge-info right" id="badge-leads-count">0</span>
                            </p>
                        </a>
                    </li>
                    <li class="nav-item admin-only">
                        <a href="javascript:void(0)" class="nav-link" data-view="import" onclick="App.navigate('import')">
                            <i class="nav-icon fas fa-file-import"></i>
                            <p>Bulk CSV Import</p>
                        </a>
                    </li>

                    <!-- CALLING OPERATIONS -->
                    <li class="nav-header">CALLING OPERATIONS</li>
                    <li class="nav-item">
                        <a href="javascript:void(0)" class="nav-link" data-view="calling_queue" onclick="App.navigate('calling_queue')">
                            <i class="nav-icon fas fa-headset"></i>
                            <p>Calling Queue</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="javascript:void(0)" class="nav-link" data-view="followups" onclick="App.navigate('followups')">
                            <i class="nav-icon fas fa-clock"></i>
                            <p>Follow-ups</p>
                        </a>
                    </li>

                    <!-- MEETINGS & DEMONSTRATIONS -->
                    <li class="nav-header">MEETINGS & APPOINTMENTS</li>
                    <li class="nav-item">
                        <a href="javascript:void(0)" class="nav-link" data-view="meetings" onclick="App.navigate('meetings')">
                            <i class="nav-icon fas fa-calendar-alt"></i>
                            <p>Client Meetings</p>
                        </a>
                    </li>

                    <!-- SALES & PROJECTS (Admin & Managers Only) -->
                    <li class="nav-header admin-manager-only">SALES & PIPELINE</li>
                    <li class="nav-item admin-manager-only">
                        <a href="javascript:void(0)" class="nav-link" data-view="funnel" onclick="App.navigate('funnel')">
                            <i class="nav-icon fas fa-filter"></i>
                            <p>Sales Funnel</p>
                        </a>
                    </li>
                    <li class="nav-item admin-manager-only">
                        <a href="javascript:void(0)" class="nav-link" data-view="projects" onclick="App.navigate('projects')">
                            <i class="nav-icon fas fa-project-diagram"></i>
                            <p>Projects Workspace</p>
                        </a>
                    </li>

                    <!-- ADMINISTRATION -->
                    <li class="nav-header admin-only">ADMINISTRATION</li>
                    <li class="nav-item admin-only">
                        <a href="javascript:void(0)" class="nav-link" data-view="reports" onclick="App.navigate('reports')">
                            <i class="nav-icon fas fa-chart-line"></i>
                            <p>Analytics & Reports</p>
                        </a>
                    </li>
                    <li class="nav-item admin-only">
                        <a href="javascript:void(0)" class="nav-link" data-view="users" onclick="App.navigate('users')">
                            <i class="nav-icon fas fa-users-cog"></i>
                            <p>
                                User Management
                                <span class="badge badge-primary right" id="badge-users-count">0</span>
                            </p>
                        </a>
                    </li>
                    <li class="nav-item admin-only">
                        <a href="javascript:void(0)" class="nav-link" data-view="settings" onclick="App.navigate('settings')">
                            <i class="nav-icon fas fa-sliders-h"></i>
                            <p>System Settings</p>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    </aside>

    <!-- 3. CONTENT WRAPPER -->
    <div class="content-wrapper">
        <!-- Content Header (Page header) -->
        <section class="content-header">
            <div class="container-fluid">
                <div class="row mb-2 align-items-center">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark font-weight-bold" id="page-heading">Dashboard</h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right text-xs" id="page-breadcrumb">
                            <li class="breadcrumb-item"><a href="javascript:void(0)" onclick="App.navigate('dashboard')">Home</a></li>
                            <li class="breadcrumb-item active" id="breadcrumb-current">Dashboard</li>
                        </ol>
                    </div>
                </div>
            </div>
        </section>

        <!-- Main content viewport -->
        <section class="content">
            <div class="container-fluid" id="content-viewport">
                <!-- Views loaded dynamically here by assets/js/app.js -->
                <div class="text-center text-muted py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <div class="mt-2 font-weight-bold">Loading CRM Module...</div>
                </div>
            </div>
        </section>
    </div>

    <!-- 4. FOOTER -->
    <footer class="main-footer text-xs">
        <strong>Leadstriangle CRM &bull; Enterprise Sales & Telephony Operations.</strong>
        All rights reserved.
        <div class="float-right d-none d-sm-inline-block text-muted">
            Version 3.2.0 (AdminLTE 3)
        </div>
    </footer>

    <!-- Global Modal Anchor -->
    <div id="global-modal-container"></div>
</div>

<!-- REQUIRED SCRIPTS -->
<!-- jQuery 3.6.0 -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<!-- Bootstrap 4.6.2 Bundle (includes Popper.js) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
<!-- AdminLTE 3.2.0 App -->
<script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js"></script>

<!-- DataTables & Plugins -->
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap4.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap4.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.4.2/js/dataTables.buttons.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.bootstrap4.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.html5.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.print.min.js"></script>

<!-- Select2 -->
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.full.min.js"></script>

<!-- Core App Logic -->
<script src="assets/js/app.js?v=<?= @filemtime('assets/js/app.js') ?: time() ?>"></script>
</body>
</html>

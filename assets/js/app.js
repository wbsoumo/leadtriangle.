/* assets/js/app.js - Enterprise AdminLTE 3 SPA Controller for LeadTriangle CRM */

const App = {
    currentUser: null,
    currentView: 'dashboard',
    dropdowns: {},
    usersCache: [],
    leadsFilterState: { page: 1, limit: 25, search: '', status_id: '', priority: '', source_id: '', assigned_to: '', date_from: '', date_to: '' },
    workspaceFilterState: { page: 1, limit: 25, search: '', status_name: '', row_color: '', followup_date: '', filter: '', sort_by: 'id', sort_order: 'DESC' },

    // ==========================================
    // 1. INITIALIZATION & AUTHENTICATION
    // ==========================================
    init: async function() {
        console.log('LeadTriangle CRM &bull; AdminLTE 3 Enterprise Engine Initialized');
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadDropdowns();
            this.autoRegisterWebToken();
            this.bindEvents();
            this.navigate(this.currentView);
            this.startActiveCallPolling();
        }
    },

    checkAuth: async function() {
        try {
            const res = await fetch('api/auth?action=check');
            const data = await res.json();
            if (data.success && data.data && data.data.is_logged_in) {
                this.currentUser = data.data.user;
                this.renderUserUI();
            } else {
                window.location.href = '/login';
            }
        } catch (e) {
            window.location.href = '/login';
        }
    },

    loadDropdowns: async function() {
        try {
            const res = await fetch('api/settings?action=get_dropdowns');
            const data = await res.json();
            if (data.success) {
                this.dropdowns = data.data;
            }
        } catch(e) {}
    },

    autoRegisterWebToken: function() {
        try {
            let token = localStorage.getItem('fcm_device_token');
            if (!token) {
                token = 'web_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
                localStorage.setItem('fcm_device_token', token);
            }
            const formData = new FormData();
            formData.append('action', 'register_token');
            formData.append('fcm_token', token);
            formData.append('device_type', 'web');
            fetch('api/notifications', { method: 'POST', body: formData });
        } catch(e) {}
    },

    bindEvents: function() {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.navigate(e.state.view, false);
            }
        });

        // Initialize URL path from current location
        const path = window.location.pathname.replace(/^\//, '').trim();
        if (path && path !== 'app' && path !== 'index.php') {
            this.currentView = path;
        }
    },

    renderUserUI: function() {
        if (!this.currentUser) return;

        const name = this.currentUser.name || 'User';
        const roleDisplay = this.currentUser.role_display || this.currentUser.role_name || 'Member';
        const teamName = this.currentUser.team_name || 'Sales Operations';
        const initial = name.charAt(0).toUpperCase();

        // Top navbar elements
        const topName = document.getElementById('top-user-name');
        if (topName) topName.innerText = name;
        const topAvatar = document.getElementById('top-user-avatar');
        if (topAvatar) topAvatar.innerText = initial;

        const dropName = document.getElementById('dropdown-user-name');
        if (dropName) dropName.innerHTML = `${name} <br><small class="badge badge-light text-primary font-weight-bold">${roleDisplay}</small>`;
        const dropAvatar = document.getElementById('dropdown-user-avatar');
        if (dropAvatar) dropAvatar.innerText = initial;
        const dropTeam = document.getElementById('dropdown-user-team');
        if (dropTeam) dropTeam.innerText = teamName;

        // Sidebar elements
        const sideName = document.getElementById('sidebar-user-name');
        if (sideName) sideName.innerText = name;
        const sideRole = document.getElementById('sidebar-user-role');
        if (sideRole) sideRole.innerText = roleDisplay;
        const sideAvatar = document.getElementById('sidebar-user-avatar');
        if (sideAvatar) sideAvatar.innerText = initial;

        // Role-based visibility
        const isSuperAdmin = (this.currentUser.role_name === 'super_admin');
        const isManager = (this.currentUser.role_name === 'manager');

        // By default, hide admin-only elements for basic users
        if (!isSuperAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                // If manager, allow reports
                const view = el.querySelector('[data-view]')?.getAttribute('data-view') || el.getAttribute('data-view');
                if (isManager && view === 'reports') {
                    el.style.display = '';
                } else if (isManager && view === 'funnel') {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });
        }

        // Apply page-level permissions filtering for sidebar items
        if (this.currentUser.allowed_pages && !isSuperAdmin) {
            const allowed = this.currentUser.allowed_pages.split(',').map(s => s.trim());
            // Always ensure core views
            if (!allowed.includes('workspace')) allowed.push('workspace');
            if (!allowed.includes('dashboard')) allowed.push('dashboard');

            document.querySelectorAll('#sidebar-nav-list .nav-item').forEach(item => {
                const link = item.querySelector('.nav-link[data-view]');
                if (link) {
                    const view = link.getAttribute('data-view');
                    if (view && !allowed.includes(view)) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = '';
                    }
                }
            });

            // Clean up headers if all children are hidden
            document.querySelectorAll('#sidebar-nav-list .nav-header').forEach(header => {
                let next = header.nextElementSibling;
                let hasVisible = false;
                while (next && !next.classList.contains('nav-header')) {
                    if (next.style.display !== 'none') {
                        hasVisible = true;
                        break;
                    }
                    next = next.nextElementSibling;
                }
                header.style.display = hasVisible ? '' : 'none';
            });
        }
    },

    // ==========================================
    // 2. ACTIVE CALL & NOTIFICATIONS POLLING
    // ==========================================
    startActiveCallPolling: function() {
        this.requestNotificationPermission();
        this.checkActiveCall();
        this.checkNewNotifications();
        setInterval(() => {
            this.checkActiveCall();
            this.checkNewNotifications();
        }, 5000);
    },

    requestNotificationPermission: function() {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    },

    lastSeenNotifId: 0,
    checkNewNotifications: async function() {
        if (!this.currentUser) return;
        try {
            const res = await fetch('api/notifications?action=my_notifications');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const countBadge = document.getElementById('top-notif-count');
                const headerText = document.getElementById('top-notif-header');
                const listContainer = document.getElementById('top-notif-list');

                const unreadCount = data.data.filter(n => !n.is_read).length;
                if (countBadge) countBadge.innerText = unreadCount || data.data.length;
                if (headerText) headerText.innerText = `${unreadCount || data.data.length} Notifications`;

                if (listContainer) {
                    if (data.data.length === 0) {
                        listContainer.innerHTML = '<a href="#" class="dropdown-item text-center text-muted py-3 text-xs">No notifications</a>';
                    } else {
                        listContainer.innerHTML = data.data.slice(0, 5).map(n => `
                            <a href="javascript:void(0)" onclick="App.showNotifications()" class="dropdown-item">
                                <div class="media">
                                    <div class="media-body">
                                        <h3 class="dropdown-item-title text-sm font-weight-bold">
                                            ${n.title || 'System Notification'}
                                        </h3>
                                        <p class="text-xs text-muted mb-0">${n.message || ''}</p>
                                        <p class="text-xxs text-secondary mb-0"><i class="far fa-clock mr-1"></i> ${n.created_at || 'Just now'}</p>
                                    </div>
                                </div>
                            </a>
                            <div class="dropdown-divider"></div>
                        `).join('');
                    }
                }

                if (data.data.length > 0) {
                    const latest = data.data[0];
                    if (this.lastSeenNotifId > 0 && latest.id > this.lastSeenNotifId) {
                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification(latest.title, { body: latest.message });
                        }
                    }
                    this.lastSeenNotifId = latest.id;
                }
            }
        } catch(e) {}
    },

    activeCallData: null,
    checkActiveCall: async function() {
        if (!this.currentUser) return;
        try {
            const res = await fetch('api/calls?action=get_active_call');
            const data = await res.json();
            const topBadge = document.getElementById('top-active-call-item');
            const existingBanner = document.getElementById('active-call-banner');

            if (data.success && data.active_call && data.data) {
                this.activeCallData = data.data;
                const call = data.data;

                if (topBadge) topBadge.style.display = 'block';

                if (!existingBanner) {
                    const banner = document.createElement('div');
                    banner.id = 'active-call-banner';
                    banner.innerHTML = `
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #e8f4fd; color: #007bff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" class="animate-pulse">
                            <i class="fas fa-phone-alt"></i>
                        </div>
                        <div>
                            <div class="text-xs text-primary font-weight-bold text-uppercase">Live Telephony Active</div>
                            <div class="font-weight-bold text-dark text-sm" id="banner-lead-name">${call.lead_name}</div>
                            <div class="text-xs text-muted" id="banner-lead-phone">${call.phone} &bull; <span class="badge badge-info">${call.lead_status || 'In Call'}</span></div>
                        </div>
                        <div class="ml-2">
                            <button class="btn btn-primary btn-xs font-weight-bold" onclick="App.triggerActiveCallModal()">Update Remarks</button>
                        </div>
                    `;
                    document.body.appendChild(banner);
                } else {
                    document.getElementById('banner-lead-name').innerText = call.lead_name;
                    document.getElementById('banner-lead-phone').innerHTML = `${call.phone} &bull; <span class="badge badge-info">${call.lead_status || 'In Call'}</span>`;
                }
            } else {
                this.activeCallData = null;
                if (topBadge) topBadge.style.display = 'none';
                if (existingBanner) existingBanner.remove();
            }
        } catch(e) {}
    },

    triggerActiveCallModal: function() {
        if (this.activeCallData) {
            const c = this.activeCallData;
            this.openCallModal(c.lead_id, c.lead_name, c.phone, c.lead_status_id || 0, c.statuses, c.outcomes);
        }
    },

    // ==========================================
    // 3. NAVIGATION & ROUTING
    // ==========================================
    navigate: function(view, updateHistory = true) {
        // Enforce page-level permissions
        const isSuperAdmin = (this.currentUser && this.currentUser.role_name === 'super_admin');
        if (this.currentUser && this.currentUser.allowed_pages && !isSuperAdmin) {
            const allowed = this.currentUser.allowed_pages.split(',').map(s => s.trim());
            if (!allowed.includes('workspace')) allowed.push('workspace');
            if (!allowed.includes('dashboard')) allowed.push('dashboard');

            if (!allowed.includes(view)) {
                this.renderAccessDenied(view);
                return;
            }
        }

        this.currentView = view;

        // Update active class in sidebar
        document.querySelectorAll('#sidebar-nav-list .nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`#sidebar-nav-list .nav-link[data-view="${view}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Auto close mobile drawer if open
        if ($('body').hasClass('sidebar-open')) {
            $('body').removeClass('sidebar-open').addClass('sidebar-closed sidebar-collapse');
        }

        // Push URL state
        if (updateHistory && window.location.pathname !== '/' + view) {
            history.pushState({ view: view }, '', '/' + view);
        }

        // Update breadcrumb and header title
        const titles = {
            'dashboard': 'Dashboard Overview',
            'workspace': 'Daily Operations Workspace',
            'leads': 'Lead Management & Database',
            'calling_queue': 'Inbound & Outbound Calling Queue',
            'followups': 'Follow-ups & Reminders',
            'meetings': 'Scheduled Client Meetings',
            'funnel': 'Visual Sales Funnel (Kanban)',
            'projects': 'Client Projects Workspace',
            'reports': 'Analytics & Performance Reports',
            'users': 'Team Members & User Management',
            'settings': 'System Settings & Configurations',
            'import': 'Bulk CSV Lead Import'
        };

        const pageTitle = titles[view] || 'Dashboard';
        const pageHeading = document.getElementById('page-heading');
        const breadcrumbCurrent = document.getElementById('breadcrumb-current');
        if (pageHeading) pageHeading.innerText = pageTitle;
        if (breadcrumbCurrent) breadcrumbCurrent.innerText = view.charAt(0).toUpperCase() + view.slice(1).replace('_', ' ');

        // Loading spinner
        const container = document.getElementById('content-viewport');
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <div class="mt-2 font-weight-bold text-sm">Loading ${titles[view] || 'module'}...</div>
            </div>
        `;

        // Destroy any leftover DataTables
        $('.dataTable').each(function() {
            if ($.fn.DataTable.isDataTable(this)) {
                $(this).DataTable().destroy();
            }
        });

        // View dispatch
        if (view === 'dashboard') this.renderDashboard();
        else if (view === 'workspace') this.renderWorkspace();
        else if (view === 'leads') this.renderLeads();
        else if (view === 'calling_queue' || view === 'calling-queue') this.renderCallingQueue();
        else if (view === 'followups') this.renderFollowups();
        else if (view === 'meetings') this.renderMeetings();
        else if (view === 'funnel') this.renderFunnel();
        else if (view === 'projects') this.renderProjects();
        else if (view === 'reports') this.renderReports();
        else if (view === 'users') this.renderUsers();
        else if (view === 'settings') this.renderSettings();
        else if (view === 'import') this.renderImport();
        else this.renderDashboard();
    },

    renderAccessDenied: function(attemptedView) {
        const container = document.getElementById('content-viewport');
        container.innerHTML = `
            <div class="callout callout-danger my-4 shadow-sm">
                <h5 class="text-danger font-weight-bold"><i class="fas fa-ban mr-2"></i> Access Denied</h5>
                <p class="text-sm text-secondary">
                    You do not have administrative permission to access the <strong>${attemptedView}</strong> module.
                    If you require access, please contact your System Super Admin to update your account's menu access permissions.
                </p>
                <button class="btn btn-primary btn-sm font-weight-bold" onclick="App.navigate('dashboard')">
                    <i class="fas fa-arrow-left mr-1"></i> Return to Dashboard
                </button>
            </div>
        `;
    },

    // ==========================================
    // 4. MODULE: DASHBOARD
    // ==========================================
    filterDashboard: function(val) {
        this.renderDashboard(val);
    },

    renderDashboard: async function(filterPeriod = 'this_month') {
        const res = await fetch(`api/dashboard?date_filter=${filterPeriod}`);
        const data = await res.json();
        if (!data.success) return;

        const d = data.data || {};
        const isOperator = (this.currentUser && this.currentUser.role_name === 'operation_executive');
        const isManager = (this.currentUser && this.currentUser.role_name === 'manager');

        let html = `
            <!-- Top Period Filter Action Bar -->
            <div class="row mb-3 align-items-center">
                <div class="col-md-6 col-12">
                    <div class="text-muted text-sm">
                        Showing metrics for <strong>${filterPeriod.replace('_', ' ').toUpperCase()}</strong>
                    </div>
                </div>
                <div class="col-md-6 col-12 text-md-right mt-2 mt-md-0">
                    <div class="d-inline-flex align-items-center">
                        <label class="text-xs text-muted mr-2 font-weight-bold mb-0">Select Range:</label>
                        <select class="form-control form-control-sm" style="width: 160px;" onchange="App.filterDashboard(this.value)">
                            <option value="today" ${filterPeriod === 'today' ? 'selected' : ''}>Today</option>
                            <option value="this_week" ${filterPeriod === 'this_week' ? 'selected' : ''}>This Week</option>
                            <option value="this_month" ${filterPeriod === 'this_month' ? 'selected' : ''}>This Month</option>
                            <option value="last_month" ${filterPeriod === 'last_month' ? 'selected' : ''}>Last Month</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Top 4 AdminLTE Small-Box KPI Cards -->
            <div class="row">
                <!-- KPI 1: Revenue (Admin/Manager) or Today's Assigned (Operator) -->
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-info">
                        <div class="inner">
                            <h3>${!isOperator ? '₹' + parseFloat(d.total_project_value || 0).toLocaleString('en-IN') : (d.total_leads || 0)}</h3>
                            <p>${!isOperator ? 'Total Won Revenue' : 'Assigned Leads'}</p>
                        </div>
                        <div class="icon">
                            <i class="${!isOperator ? 'fas fa-rupee-sign' : 'fas fa-address-book'}"></i>
                        </div>
                        <a href="javascript:void(0)" onclick="App.navigate('${!isOperator ? 'projects' : 'leads'}')" class="small-box-footer">
                            View Details <i class="fas fa-arrow-circle-right ml-1"></i>
                        </a>
                    </div>
                </div>

                <!-- KPI 2: Total Leads In Funnel -->
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-success">
                        <div class="inner">
                            <h3>${d.total_leads || 0}</h3>
                            <p>Active Leads Pipeline</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-filter"></i>
                        </div>
                        <a href="javascript:void(0)" onclick="App.navigate('leads')" class="small-box-footer">
                            Manage Leads <i class="fas fa-arrow-circle-right ml-1"></i>
                        </a>
                    </div>
                </div>

                <!-- KPI 3: Total Calling Operations -->
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-warning">
                        <div class="inner text-dark">
                            <h3>${d.total_calls || 0}</h3>
                            <p>Total Calls Executed</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-headset"></i>
                        </div>
                        <a href="javascript:void(0)" onclick="App.navigate('calling_queue')" class="small-box-footer text-dark">
                            Open Queue <i class="fas fa-arrow-circle-right ml-1"></i>
                        </a>
                    </div>
                </div>

                <!-- KPI 4: Pending Follow-ups / Won Deals -->
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-danger">
                        <div class="inner">
                            <h3>${d.pending_followups || d.completed_projects || 0}</h3>
                            <p>${d.pending_followups ? 'Pending Follow-ups' : 'Converted Projects'}</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <a href="javascript:void(0)" onclick="App.navigate('followups')" class="small-box-footer">
                            Check Reminders <i class="fas fa-arrow-circle-right ml-1"></i>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Two-Column Operational Section -->
            <div class="row">
                <!-- Left Column: Lead Distribution & Quick Actions -->
                <div class="col-lg-7 col-12">
                    <div class="card card-primary card-outline">
                        <div class="card-header border-0">
                            <h3 class="card-title font-weight-bold">
                                <i class="fas fa-chart-pie mr-1 text-primary"></i> Pipeline & Lead Status Breakdown
                            </h3>
                            <div class="card-tools">
                                <button type="button" class="btn btn-tool" onclick="App.navigate('leads')" title="All Leads">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-striped table-valign-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>Status Stage</th>
                                            <th class="text-center">Leads Count</th>
                                            <th class="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><span class="badge badge-primary mr-2 font-weight-bold">New</span> Fresh Inbound / Uncalled</td>
                                            <td class="text-center font-weight-bold">${d.new_leads || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-primary" onclick="App.renderLeads(1, {filter:'pending'})">Open</button></td>
                                        </tr>
                                        <tr>
                                            <td><span class="badge badge-info mr-2 font-weight-bold">Contacted</span> Connected Leads</td>
                                            <td class="text-center font-weight-bold">${d.contacted_leads || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-info" onclick="App.renderLeads(1, {filter:'called'})">Open</button></td>
                                        </tr>
                                        <tr>
                                            <td><span class="badge badge-warning mr-2 font-weight-bold">Follow-up</span> Requires Callback</td>
                                            <td class="text-center font-weight-bold">${d.pending_followups || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-warning" onclick="App.navigate('followups')">Open</button></td>
                                        </tr>
                                        <tr>
                                            <td><span class="badge badge-success mr-2 font-weight-bold">Converted</span> Deals Won / Active</td>
                                            <td class="text-center font-weight-bold">${d.converted_leads || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-success" onclick="App.navigate('funnel')">Open</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Quick Telephony & Daily Activity -->
                <div class="col-lg-5 col-12">
                    <div class="card card-secondary card-outline">
                        <div class="card-header border-0">
                            <h3 class="card-title font-weight-bold">
                                <i class="fas fa-bolt mr-1 text-warning"></i> Operational Quick Launcher
                            </h3>
                        </div>
                        <div class="card-body">
                            <p class="text-sm text-muted">
                                Fast access to daily calling queues, appointment setting, and CRM data management.
                            </p>
                            <div class="d-flex flex-column" style="gap: 10px;">
                                <button class="btn btn-outline-primary btn-block text-left d-flex align-items-center justify-content-between p-3" onclick="App.navigate('calling_queue')">
                                    <div>
                                        <div class="font-weight-bold"><i class="fas fa-headset mr-2 text-primary"></i> Start Dialing Queue</div>
                                        <div class="text-xs text-muted">Auto-load pending leads and launch telephone actions</div>
                                    </div>
                                    <i class="fas fa-chevron-right text-muted"></i>
                                </button>

                                <button class="btn btn-outline-info btn-block text-left d-flex align-items-center justify-content-between p-3" onclick="App.navigate('workspace')">
                                    <div>
                                        <div class="font-weight-bold"><i class="fas fa-laptop mr-2 text-info"></i> Daily Operator Workspace</div>
                                        <div class="text-xs text-muted">Multi-filter lead table with quick remarks &amp; agenda</div>
                                    </div>
                                    <i class="fas fa-chevron-right text-muted"></i>
                                </button>

                                <button class="btn btn-outline-success btn-block text-left d-flex align-items-center justify-content-between p-3" onclick="App.openCreateLeadModal()">
                                    <div>
                                        <div class="font-weight-bold"><i class="fas fa-user-plus mr-2 text-success"></i> Add Single Lead</div>
                                        <div class="text-xs text-muted">Register a new client record into the database</div>
                                    </div>
                                    <i class="fas fa-chevron-right text-muted"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    // ==========================================
    // 5. MODULE: USER & PERMISSION MANAGEMENT (ADMIN)
    // ==========================================
    renderUsers: async function() {
        const res = await fetch('api/users?action=list');
        const data = await res.json();
        if (!data.success) {
            this.renderAccessDenied('User Management');
            return;
        }

        this.usersCache = data.data || [];

        // Count user roles
        const superAdmins = this.usersCache.filter(u => u.role_name === 'super_admin').length;
        const managers = this.usersCache.filter(u => u.role_name === 'manager').length;
        const executives = this.usersCache.filter(u => u.role_name === 'operation_executive').length;

        // Update badge count in sidebar
        const badgeCount = document.getElementById('badge-users-count');
        if (badgeCount) badgeCount.innerText = this.usersCache.length;

        let html = `
            <!-- Top Info Cards for User Stats -->
            <div class="row">
                <div class="col-md-3 col-6">
                    <div class="info-box bg-light shadow-sm">
                        <span class="info-box-icon bg-primary"><i class="fas fa-users"></i></span>
                        <div class="info-box-content">
                            <span class="info-box-text text-xs">Total Members</span>
                            <span class="info-box-number font-weight-bold">${this.usersCache.length}</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="info-box bg-light shadow-sm">
                        <span class="info-box-icon bg-info"><i class="fas fa-user-shield"></i></span>
                        <div class="info-box-content">
                            <span class="info-box-text text-xs">Super Admins</span>
                            <span class="info-box-number font-weight-bold">${superAdmins}</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="info-box bg-light shadow-sm">
                        <span class="info-box-icon bg-warning"><i class="fas fa-user-tie"></i></span>
                        <div class="info-box-content">
                            <span class="info-box-text text-xs text-dark">Managers</span>
                            <span class="info-box-number font-weight-bold text-dark">${managers}</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="info-box bg-light shadow-sm">
                        <span class="info-box-icon bg-success"><i class="fas fa-headset"></i></span>
                        <div class="info-box-content">
                            <span class="info-box-text text-xs">Calling Executives</span>
                            <span class="info-box-number font-weight-bold">${executives}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main User Management Table Card -->
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title font-weight-bold mb-0">
                        <i class="fas fa-users-cog mr-1 text-primary"></i> System Users &amp; Menu Permissions
                    </h3>
                    <div class="card-tools ml-auto">
                        <button class="btn btn-primary btn-sm font-weight-bold shadow-sm" onclick="App.openCreateUserModal()">
                            <i class="fas fa-plus-circle mr-1"></i> Add New User
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover text-sm" id="users-datatable" style="width:100%">
                            <thead class="thead-light">
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Mobile</th>
                                    <th>System Role</th>
                                    <th>Calling Team</th>
                                    <th>Allowed Menu Modules</th>
                                    <th>Status</th>
                                    <th class="text-center" style="width: 130px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.usersCache.map((u, idx) => {
                                    const pages = u.allowed_pages ? u.allowed_pages.split(',') : ['dashboard','leads','calling_queue','followups','meetings'];
                                    const roleBadgeClass = (u.role_name === 'super_admin') ? 'badge-primary' : ((u.role_name === 'manager') ? 'badge-warning text-dark' : 'badge-secondary');
                                    const statusBadgeClass = (u.status === 'active') ? 'badge-success' : 'badge-danger';

                                    return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${u.name}</strong></td>
                                        <td><a href="mailto:${u.email}">${u.email}</a></td>
                                        <td>${u.mobile}</td>
                                        <td><span class="badge ${roleBadgeClass} font-weight-bold text-uppercase">${u.role_display || u.role_name}</span></td>
                                        <td><span class="badge badge-light border text-secondary font-weight-bold">${u.team_name || 'General Operations'}</span></td>
                                        <td>
                                            <div style="display:flex; flex-wrap:wrap; gap:3px; max-width:280px;">
                                                ${pages.map(p => `<span class="badge badge-light border text-xs" style="font-size:10px;">${p.replace('_',' ')}</span>`).join('')}
                                            </div>
                                        </td>
                                        <td><span class="badge ${statusBadgeClass} text-uppercase font-weight-bold">${u.status}</span></td>
                                        <td class="text-center">
                                            <button class="btn btn-outline-primary btn-xs font-weight-bold mr-1" onclick="App.openCreateUserModal(App.usersCache.find(x => x.id == ${u.id}))" title="Edit User & Permissions">
                                                <i class="fas fa-edit mr-1"></i>Edit
                                            </button>
                                            <button class="btn btn-outline-secondary btn-xs font-weight-bold" onclick="App.toggleUserStatus(${u.id}, '${u.status === 'active' ? 'inactive' : 'active'}')" title="Toggle Status">
                                                <i class="fas fa-power-off"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;

        // Initialize DataTable with Export Buttons
        setTimeout(() => {
            if ($.fn.DataTable.isDataTable('#users-datatable')) {
                $('#users-datatable').DataTable().destroy();
            }
            $('#users-datatable').DataTable({
                responsive: true,
                lengthChange: true,
                autoWidth: false,
                pageLength: 10,
                dom: "<'row'<'col-sm-6'B><'col-sm-6'f>>" +
                     "<'row'<'col-sm-12'tr>>" +
                     "<'row'<'col-sm-5'i><'col-sm-7'p>>",
                buttons: [
                    { extend: 'copy', className: 'btn btn-default btn-xs' },
                    { extend: 'csv', className: 'btn btn-default btn-xs' },
                    { extend: 'excel', className: 'btn btn-default btn-xs' },
                    { extend: 'print', className: 'btn btn-default btn-xs' }
                ]
            });
        }, 100);
    },

    // User Creation / Edit Modal
    openCreateUserModal: async function(userData = null) {
        const isEdit = !!userData;
        const res = await fetch('api/users?action=list');
        const data = await res.json();

        const roles = data.roles || [
            { id: 1, name: 'super_admin', display_name: 'Super Admin' },
            { id: 2, name: 'manager', display_name: 'Manager' },
            { id: 3, name: 'operation_executive', display_name: 'Operation Executive' }
        ];

        const teams = data.teams || [
            { id: 1, team_name: 'Alpha Sales & Calling Team' },
            { id: 2, team_name: 'Enterprise Solutions Team' }
        ];

        const availablePages = data.available_pages || [
            { key: 'dashboard', label: 'Dashboard Overview', desc: 'Main sales and KPI reporting' },
            { key: 'workspace', label: 'Daily Workspace', desc: 'Operator working table & quick agenda' },
            { key: 'leads', label: 'All Leads Management', desc: 'Full database, filtering and status updates' },
            { key: 'calling_queue', label: 'Calling Queue', desc: 'Direct dialer & telephony queue' },
            { key: 'followups', label: 'Follow-ups', desc: 'Upcoming scheduled call reminders' },
            { key: 'meetings', label: 'Scheduled Meetings', desc: 'Client calendar & demo bookings' },
            { key: 'funnel', label: 'Sales Funnel (Kanban)', desc: 'Visual stage tracking and deal values' },
            { key: 'projects', label: 'Projects Workspace', desc: 'Conversion delivery stages & tracking' },
            { key: 'reports', label: 'Analytics & Reports', desc: 'Executive productivity & conversion ratios' },
            { key: 'users', label: 'User & Permissions', desc: 'Create and manage system user accounts' },
            { key: 'settings', label: 'System Settings', desc: 'Configure statuses, sources & drop-downs' },
            { key: 'import', label: 'Bulk CSV Import', desc: 'Upload CSV/Excel lead files' }
        ];

        const userAllowedPages = (userData && userData.allowed_pages) 
            ? userData.allowed_pages.split(',').map(s => s.trim()) 
            : ['dashboard', 'workspace', 'leads', 'calling_queue', 'followups', 'meetings'];

        const modalHtml = `
            <div class="modal fade" id="create-user-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-${isEdit ? 'user-edit' : 'user-plus'} mr-2"></i>
                                ${isEdit ? 'Edit Team Member & Menu Permissions' : 'Create New System User'}
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitCreateUser(event, ${isEdit ? userData.id : 'null'})">
                            <div class="modal-body p-4">
                                <h6 class="font-weight-bold text-primary mb-3">
                                    <i class="fas fa-id-card mr-1"></i> Account Credentials
                                </h6>
                                <div class="form-row">
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Full Name *</label>
                                        <input type="text" name="name" class="form-control" value="${isEdit ? userData.name : ''}" placeholder="e.g. Amit Sharma" required>
                                    </div>
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Email Address *</label>
                                        <input type="email" name="email" class="form-control" value="${isEdit ? userData.email : ''}" placeholder="name@leadstriangle.com" required>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Mobile Number *</label>
                                        <input type="text" name="mobile" class="form-control" value="${isEdit ? userData.mobile : ''}" placeholder="+91 9876543210" required>
                                    </div>
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Password ${isEdit ? '(Leave empty to keep unchanged)' : '*'}</label>
                                        <input type="password" name="password" class="form-control" placeholder="••••••••" ${isEdit ? '' : 'required'}>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">System Role *</label>
                                        <select name="role_id" id="modal-user-role-select" class="form-control" onchange="App.applyPermissionPresetByRole(this.value)">
                                            ${roles.map(r => `<option value="${r.id}" ${isEdit && userData.role_id == r.id ? 'selected' : (r.id == 3 ? 'selected' : '')}>${r.display_name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Assigned Calling Team</label>
                                        <select name="team_id" class="form-control">
                                            <option value="">General / No Specific Team</option>
                                            ${teams.map(t => `<option value="${t.id}" ${isEdit && userData.team_id == t.id ? 'selected' : ''}>${t.team_name}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>

                                <hr class="my-3">

                                <!-- Menu & Module Access Permissions -->
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <h6 class="font-weight-bold text-primary mb-0">
                                            <i class="fas fa-lock mr-1"></i> Sidebar Menu &amp; Module Access Control
                                        </h6>
                                        <span class="text-xs text-muted">Select modules permitted for this user's panel navigation:</span>
                                    </div>
                                    <!-- Permission Preset Buttons -->
                                    <div class="btn-group btn-group-sm">
                                        <button type="button" class="btn btn-outline-secondary font-weight-bold" onclick="App.setPermissionPreset('executive')">Executive Preset</button>
                                        <button type="button" class="btn btn-outline-secondary font-weight-bold" onclick="App.setPermissionPreset('manager')">Manager Preset</button>
                                        <button type="button" class="btn btn-outline-primary font-weight-bold" onclick="App.setPermissionPreset('all')">Super Admin (All)</button>
                                    </div>
                                </div>

                                <div class="permission-module-grid mt-3">
                                    ${availablePages.map(p => `
                                        <label class="permission-module-card mb-0">
                                            <input type="checkbox" name="allowed_pages[]" value="${p.key}" class="perm-checkbox" ${userAllowedPages.includes(p.key) ? 'checked' : ''}>
                                            <div>
                                                <div class="font-weight-bold text-sm text-dark">${p.label}</div>
                                                <div class="text-xs text-muted">${p.desc || ''}</div>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary font-weight-bold">
                                    <i class="fas fa-save mr-1"></i> ${isEdit ? 'Save User & Permissions' : 'Create User Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Render modal to container
        $('#global-modal-container').html(modalHtml);
        $('#create-user-modal').modal('show');
    },

    setPermissionPreset: function(preset) {
        const executivePages = ['dashboard', 'workspace', 'leads', 'calling_queue', 'followups', 'meetings'];
        const managerPages = ['dashboard', 'workspace', 'leads', 'calling_queue', 'followups', 'meetings', 'funnel', 'projects', 'reports'];

        document.querySelectorAll('.perm-checkbox').forEach(cb => {
            if (preset === 'all') {
                cb.checked = true;
            } else if (preset === 'manager') {
                cb.checked = managerPages.includes(cb.value);
            } else if (preset === 'executive') {
                cb.checked = executivePages.includes(cb.value);
            }
        });
    },

    applyPermissionPresetByRole: function(roleId) {
        if (roleId == 1) this.setPermissionPreset('all');
        else if (roleId == 2) this.setPermissionPreset('manager');
        else if (roleId == 3) this.setPermissionPreset('executive');
    },

    submitCreateUser: async function(e, editId = null) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        if (editId) {
            formData.append('action', 'edit');
            formData.append('id', editId);
        } else {
            formData.append('action', 'create');
        }

        const res = await fetch('api/users', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            $('#create-user-modal').modal('hide');
            this.renderUsers();
        } else {
            alert(data.message || 'Error saving user.');
        }
    },

    toggleUserStatus: async function(id, newStatus) {
        if (!confirm(`Are you sure you want to mark this user as ${newStatus.toUpperCase()}?`)) return;

        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('id', id);
        formData.append('status', newStatus);

        const res = await fetch('api/users', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (data.success) this.renderUsers();
    },

    // ==========================================
    // 6. MODULE: LEADS & WORKSPACE
    // ==========================================
    renderLeads: async function(page = 1, filters = {}) {
        this.leadsFilterState = { ...this.leadsFilterState, ...filters, page: page };
        const queryParams = new URLSearchParams(this.leadsFilterState).toString();
        const res = await fetch(`api/leads?${queryParams}`);
        const data = await res.json();
        if (!data.success) return;

        const p = data.pagination || { total: 0, page: 1, total_pages: 1 };
        const leads = data.data || [];

        // Update badge count
        const badgeLeads = document.getElementById('badge-leads-count');
        if (badgeLeads) badgeLeads.innerText = p.total;

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap: 10px;">
                        <h3 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-address-book mr-1 text-primary"></i> All Leads Database (${p.total})
                        </h3>
                        <div class="d-flex align-items-center flex-wrap" style="gap: 8px;">
                            <button class="btn btn-primary btn-sm font-weight-bold" onclick="App.openCreateLeadModal()">
                                <i class="fas fa-plus mr-1"></i> Add Lead
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="App.renderLeads(1, {})" title="Refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Filter Controls Toolbar -->
                <div class="card-body bg-light border-bottom py-3">
                    <div class="form-row align-items-center">
                        <div class="col-md-3 col-12 mb-2 mb-md-0">
                            <input type="text" id="lead-search-input" class="form-control form-control-sm" placeholder="Search name, phone, email, company..." value="${this.leadsFilterState.search || ''}" onkeyup="if(event.key==='Enter') App.renderLeads(1, {search: this.value})">
                        </div>
                        <div class="col-md-2 col-6 mb-2 mb-md-0">
                            <select class="form-control form-control-sm" onchange="App.renderLeads(1, {filter: this.value})">
                                <option value="">All Call States</option>
                                <option value="pending" ${this.leadsFilterState.filter === 'pending' ? 'selected' : ''}>Pending Calls</option>
                                <option value="called" ${this.leadsFilterState.filter === 'called' ? 'selected' : ''}>Already Contacted</option>
                            </select>
                        </div>
                        <div class="col-md-2 col-6 mb-2 mb-md-0">
                            <select class="form-control form-control-sm" onchange="App.renderLeads(1, {priority: this.value})">
                                <option value="">All Priorities</option>
                                <option value="high" ${this.leadsFilterState.priority === 'high' ? 'selected' : ''}>High Priority</option>
                                <option value="medium" ${this.leadsFilterState.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="low" ${this.leadsFilterState.priority === 'low' ? 'selected' : ''}>Low</option>
                            </select>
                        </div>
                        <div class="col-md-3 col-8 mb-2 mb-md-0">
                            <select class="form-control form-control-sm" onchange="App.renderLeads(1, {status_id: this.value})">
                                <option value="">All Lead Statuses</option>
                                ${(this.dropdowns.statuses || []).map(s => `<option value="${s.id}" ${this.leadsFilterState.status_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2 col-4 text-right">
                            <button class="btn btn-outline-danger btn-sm font-weight-bold" onclick="App.leadsFilterState = {page:1, limit:25}; App.renderLeads(1);">
                                <i class="fas fa-times mr-1"></i> Clear
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover table-striped text-sm mb-0" id="leads-table" style="width:100%">
                            <thead class="thead-light">
                                <tr>
                                    <th style="width: 40px;"><input type="checkbox" id="select-all-leads" onchange="App.toggleSelectAllLeads(this)"></th>
                                    <th>Lead Name</th>
                                    <th>Phone / Mobile</th>
                                    <th>Email</th>
                                    <th>Lead Source</th>
                                    <th>Status</th>
                                    <th>Assigned Agent</th>
                                    <th>Priority</th>
                                    <th>Created</th>
                                    <th class="text-center" style="width: 140px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leads.length === 0 ? '<tr><td colspan="10" class="text-center py-4 text-muted">No lead records found matching criteria.</td></tr>' : leads.map(l => {
                                    return `
                                    <tr>
                                        <td><input type="checkbox" class="lead-row-checkbox" value="${l.id}"></td>
                                        <td>
                                            <strong><a href="javascript:void(0)" onclick="App.openLeadDetailModal(${l.id})">${l.name}</a></strong>
                                            ${l.company_name ? `<div class="text-xs text-muted">${l.company_name}</div>` : ''}
                                        </td>
                                        <td><a href="tel:${l.phone}">${l.phone}</a></td>
                                        <td>${l.email ? `<a href="mailto:${l.email}">${l.email}</a>` : '<span class="text-muted">-</span>'}</td>
                                        <td><span class="badge badge-light border text-xs">${l.source_name || 'Direct'}</span></td>
                                        <td><span class="badge badge-info text-xs font-weight-bold" style="background-color:${l.status_color || '#17a2b8'}">${l.status_name}</span></td>
                                        <td><span class="badge badge-light border text-xs">${l.assigned_name || 'Unassigned'}</span></td>
                                        <td><span class="badge badge-${l.priority === 'high' ? 'danger' : (l.priority === 'medium' ? 'warning text-dark' : 'secondary')} text-xs">${l.priority || 'Normal'}</span></td>
                                        <td class="text-xs text-muted">${l.created_at ? l.created_at.substring(0, 10) : '-'}</td>
                                        <td class="text-center">
                                            <button class="btn btn-primary btn-xs font-weight-bold mr-1" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.phone}', ${l.status_id})" title="Dial & Update Call">
                                                <i class="fas fa-phone-alt mr-1"></i>Call
                                            </button>
                                            <button class="btn btn-default btn-xs" onclick="App.openLeadDetailModal(${l.id})" title="Details">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Footer Pagination -->
                <div class="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap">
                    <div class="text-xs text-muted">
                        Page <strong>${p.page}</strong> of <strong>${p.total_pages}</strong> &bull; Total <strong>${p.total}</strong> records
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-default" ${p.page <= 1 ? 'disabled' : ''} onclick="App.renderLeads(${p.page - 1})">
                            <i class="fas fa-chevron-left mr-1"></i> Previous
                        </button>
                        <button class="btn btn-default" ${p.page >= p.total_pages ? 'disabled' : ''} onclick="App.renderLeads(${p.page + 1})">
                            Next <i class="fas fa-chevron-right ml-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    toggleSelectAllLeads: function(masterCb) {
        document.querySelectorAll('.lead-row-checkbox').forEach(cb => cb.checked = masterCb.checked);
    },

    // Daily Operator Workspace
    renderWorkspace: async function(page = 1, filters = {}) {
        this.workspaceFilterState = { ...this.workspaceFilterState, ...filters, page: page };
        const queryParams = new URLSearchParams(this.workspaceFilterState).toString();
        const res = await fetch(`api/leads?${queryParams}&action=workspace`);
        const data = await res.json();
        if (!data.success) return;

        const p = data.pagination || { total: 0, page: 1, total_pages: 1 };
        const leads = data.data || [];

        let html = `
            <div class="card card-info card-outline shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-laptop mr-1 text-info"></i> Daily Operator Working Table
                    </h3>
                    <div class="card-tools ml-auto">
                        <button class="btn btn-outline-secondary btn-sm" onclick="App.renderWorkspace(1)" title="Refresh Workspace">
                            <i class="fas fa-sync-alt mr-1"></i> Refresh
                        </button>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover text-sm mb-0">
                            <thead class="thead-light">
                                <tr>
                                    <th>#</th>
                                    <th>Lead Contact</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Source</th>
                                    <th>Follow-up Date</th>
                                    <th>Last Remark</th>
                                    <th class="text-center" style="width: 140px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leads.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">No assigned active workspace leads.</td></tr>' : leads.map((l, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td><strong>${l.name}</strong></td>
                                        <td><a href="tel:${l.phone}"><i class="fas fa-phone mr-1 text-success"></i>${l.phone}</a></td>
                                        <td><span class="badge badge-info">${l.status_name}</span></td>
                                        <td>${l.source_name || 'Inbound'}</td>
                                        <td class="text-xs font-weight-bold text-danger">${l.next_followup_date || 'None'}</td>
                                        <td class="text-xs text-muted" style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l.last_remarks || '-'}</td>
                                        <td class="text-center">
                                            <button class="btn btn-primary btn-xs font-weight-bold" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.phone}', ${l.status_id})">
                                                <i class="fas fa-phone-alt mr-1"></i>Update
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    // ==========================================
    // 7. MODULE: CALLING QUEUE & MODAL
    // ==========================================
    renderCallingQueue: async function() {
        const res = await fetch('api/calls?action=queue');
        const data = await res.json();
        if (!data.success) return;

        const queue = data.data || [];

        let html = `
            <div class="card card-warning card-outline shadow-sm">
                <div class="card-header">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-headset mr-1 text-warning"></i> Telecalling Live Queue (${queue.length} Leads Waiting)
                    </h3>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover table-striped text-sm mb-0">
                            <thead class="thead-light">
                                <tr>
                                    <th>#</th>
                                    <th>Client Name</th>
                                    <th>Phone Number</th>
                                    <th>Service Needed</th>
                                    <th>Status</th>
                                    <th>Assigned Agent</th>
                                    <th class="text-center" style="width: 150px;">Dialer Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${queue.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">Calling queue is currently clear! Excellent work.</td></tr>' : queue.map((q, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td><strong>${q.name}</strong></td>
                                        <td><a href="tel:${q.phone}" class="font-weight-bold text-dark">${q.phone}</a></td>
                                        <td><span class="badge badge-light border">${q.service_name || 'General Inquiry'}</span></td>
                                        <td><span class="badge badge-info">${q.status_name}</span></td>
                                        <td>${q.assigned_name || 'Queue Pool'}</td>
                                        <td class="text-center">
                                            <button class="btn btn-success btn-xs font-weight-bold px-3" onclick="App.openCallModal(${q.id}, '${q.name.replace(/'/g, "\\'")}', '${q.phone}', ${q.status_id})">
                                                <i class="fas fa-phone mr-1"></i> Call Now
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    openCallModal: function(leadId, leadName, phone, currentStatusId = 0) {
        const statuses = this.dropdowns.statuses || [];
        const outcomes = this.dropdowns.outcomes || [];

        const modalHtml = `
            <div class="modal fade" id="call-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-md" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-phone-volume mr-2"></i> Log Phone Call &bull; ${leadName}
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitCallLog(event, ${leadId})">
                            <div class="modal-body p-4">
                                <div class="alert alert-light border d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <div class="font-weight-bold text-dark">${leadName}</div>
                                        <div class="text-xs text-muted"><a href="tel:${phone}"><i class="fas fa-phone-alt text-success mr-1"></i>${phone}</a></div>
                                    </div>
                                    <a href="tel:${phone}" class="btn btn-outline-success btn-sm font-weight-bold">
                                        <i class="fas fa-phone-alt mr-1"></i> Redial
                                    </a>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Call Outcome *</label>
                                    <select name="outcome_id" class="form-control" required>
                                        <option value="">Select Outcome...</option>
                                        ${outcomes.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Update Lead Status *</label>
                                    <select name="status_id" class="form-control" required>
                                        ${statuses.map(s => `<option value="${s.id}" ${s.id == currentStatusId ? 'selected' : ''}>${s.name}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Discussion Remarks *</label>
                                    <textarea name="remarks" class="form-control" rows="3" placeholder="Enter notes from the call..." required></textarea>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Schedule Next Follow-up (Optional)</label>
                                    <input type="datetime-local" name="next_followup_date" class="form-control">
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Close</button>
                                <button type="submit" class="btn btn-primary font-weight-bold">
                                    <i class="fas fa-save mr-1"></i> Save Call Remarks
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#call-modal').modal('show');
    },

    submitCallLog: async function(e, leadId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'log_call');
        formData.append('lead_id', leadId);

        const res = await fetch('api/calls', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Call logged successfully.');
        if (data.success) {
            $('#call-modal').modal('hide');
            if (this.currentView === 'calling_queue') this.renderCallingQueue();
            else if (this.currentView === 'workspace') this.renderWorkspace();
            else if (this.currentView === 'leads') this.renderLeads(this.leadsFilterState.page);
        }
    },

    // ==========================================
    // 8. MODULE: SALES FUNNEL (KANBAN)
    // ==========================================
    renderFunnel: async function() {
        const res = await fetch('api/funnel?action=get_board');
        const data = await res.json();
        if (!data.success) return;

        const stages = data.stages || [];
        const opportunities = data.opportunities || [];

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-filter mr-1 text-primary"></i> Deals &amp; Sales Pipeline Kanban
                    </h3>
                </div>
                <div class="card-body">
                    <div class="kanban-board-container">
                        ${stages.map(st => {
                            const stageOpps = opportunities.filter(o => o.stage_id == st.id);
                            const stageVal = stageOpps.reduce((sum, x) => sum + parseFloat(x.deal_value || 0), 0);

                            return `
                                <div class="kanban-stage-column" data-stage-id="${st.id}">
                                    <div class="kanban-stage-header">
                                        <div>
                                            <div class="font-weight-bold text-sm text-dark">${st.name}</div>
                                            <div class="text-xs text-muted">₹${stageVal.toLocaleString('en-IN')}</div>
                                        </div>
                                        <span class="badge badge-primary font-weight-bold">${stageOpps.length}</span>
                                    </div>
                                    <div class="kanban-stage-body" ondragover="event.preventDefault()" ondrop="App.handleDropKanban(event, ${st.id})">
                                        ${stageOpps.map(op => `
                                            <div class="kanban-opportunity-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${op.id}')">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <span class="badge badge-light border text-xs font-weight-bold">${op.lead_name || 'Prospect'}</span>
                                                    <span class="text-success font-weight-bold text-xs">₹${parseFloat(op.deal_value || 0).toLocaleString()}</span>
                                                </div>
                                                <div class="text-xs font-weight-bold text-dark">${op.title || 'Deal Item'}</div>
                                                <div class="text-xs text-muted mt-1"><i class="fas fa-user text-secondary mr-1"></i>${op.agent_name || 'Unassigned'}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    handleDropKanban: async function(e, targetStageId) {
        e.preventDefault();
        const oppId = e.dataTransfer.getData('text/plain');
        if (!oppId) return;

        const formData = new FormData();
        formData.append('action', 'move_stage');
        formData.append('opportunity_id', oppId);
        formData.append('target_stage_id', targetStageId);

        const res = await fetch('api/funnel', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.renderFunnel();
        } else {
            alert(data.message || 'Failed to move deal stage.');
        }
    },

    // ==========================================
    // 9. MODULE: PROJECTS WORKSPACE
    // ==========================================
    renderProjects: async function() {
        const res = await fetch('api/projects?action=list');
        const data = await res.json();
        if (!data.success) return;

        const projects = data.data || [];
        const isOperator = (this.currentUser && this.currentUser.role_name === 'operation_executive');

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-project-diagram mr-1 text-primary"></i> Client Delivery &amp; Projects Workspace
                    </h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover text-sm" id="projects-table" style="width:100%">
                            <thead class="thead-light">
                                <tr>
                                    <th>Code</th>
                                    <th>Project Name</th>
                                    <th>Client Contact</th>
                                    <th>Stage</th>
                                    ${!isOperator ? '<th>Total Value</th><th>Paid Amount</th>' : ''}
                                    <th>Delivery Date</th>
                                    <th>Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${projects.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">No projects currently registered.</td></tr>' : projects.map(p => `
                                    <tr>
                                        <td><span class="badge badge-light border font-weight-bold">${p.project_code || 'PRJ'}</span></td>
                                        <td><strong>${p.project_name}</strong></td>
                                        <td>${p.client_name || '-'}</td>
                                        <td><span class="badge badge-info">${p.stage_name || 'Active'}</span></td>
                                        ${!isOperator ? `
                                            <td><strong>₹${parseFloat(p.final_amount || 0).toLocaleString()}</strong></td>
                                            <td><span class="badge badge-success">₹${parseFloat(p.paid_amount || 0).toLocaleString()}</span></td>
                                        ` : ''}
                                        <td class="text-xs text-muted">${p.target_delivery_date || '-'}</td>
                                        <td>
                                            <div class="progress progress-xs" style="height: 6px;">
                                                <div class="progress-bar bg-primary" style="width: ${p.progress_percent || 30}%"></div>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    // ==========================================
    // 10. MODULE: FOLLOW-UPS & MEETINGS
    // ==========================================
    renderFollowups: async function() {
        const res = await fetch('api/followups?action=list');
        const data = await res.json();
        const items = data.data || [];

        let html = `
            <div class="card card-warning card-outline shadow-sm">
                <div class="card-header">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-clock mr-1 text-warning"></i> Scheduled Follow-ups &amp; Reminders
                    </h3>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover text-sm mb-0">
                            <thead class="thead-light">
                                <tr>
                                    <th>#</th>
                                    <th>Lead Name</th>
                                    <th>Phone</th>
                                    <th>Follow-up Date / Time</th>
                                    <th>Notes</th>
                                    <th>Assigned Agent</th>
                                    <th class="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">No pending follow-ups scheduled.</td></tr>' : items.map((f, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td><strong>${f.lead_name}</strong></td>
                                        <td><a href="tel:${f.phone}">${f.phone}</a></td>
                                        <td class="text-danger font-weight-bold">${f.scheduled_at || '-'}</td>
                                        <td class="text-xs text-muted">${f.notes || '-'}</td>
                                        <td>${f.assigned_name || 'Self'}</td>
                                        <td class="text-center">
                                            <button class="btn btn-primary btn-xs font-weight-bold" onclick="App.openCallModal(${f.lead_id}, '${f.lead_name.replace(/'/g, "\\'")}', '${f.phone}')">
                                                <i class="fas fa-phone mr-1"></i> Call & Complete
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    renderMeetings: async function() {
        const res = await fetch('api/meetings?action=list');
        const data = await res.json();
        const meetings = data.data || [];

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-calendar-alt mr-1 text-primary"></i> Client Meetings &amp; Demonstrations
                    </h3>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover text-sm mb-0">
                            <thead class="thead-light">
                                <tr>
                                    <th>#</th>
                                    <th>Client / Lead</th>
                                    <th>Meeting Type</th>
                                    <th>Date & Time</th>
                                    <th>Platform / Location</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${meetings.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">No scheduled client meetings.</td></tr>' : meetings.map((m, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td><strong>${m.lead_name}</strong></td>
                                        <td><span class="badge badge-light border">${m.type_name || 'Demo'}</span></td>
                                        <td>${m.meeting_time}</td>
                                        <td>${m.location || 'Google Meet / Zoom'}</td>
                                        <td><span class="badge badge-info">${m.status || 'Scheduled'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    // ==========================================
    // 11. MODULE: REPORTS (ADMIN & MANAGER)
    // ==========================================
    renderReports: async function() {
        const res = await fetch('api/reports?action=overview');
        const data = await res.json();
        const rep = data.data || {};

        let html = `
            <div class="card card-primary card-outline card-tabs shadow-sm">
                <div class="card-header p-0 pt-1 border-bottom-0">
                    <ul class="nav nav-tabs" id="reports-tab" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active font-weight-bold" id="call-analytics-tab" data-toggle="pill" href="#tab-calls" role="tab">
                                <i class="fas fa-headset mr-1"></i> Calling Productivity
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link font-weight-bold" id="conversion-tab" data-toggle="pill" href="#tab-conversion" role="tab">
                                <i class="fas fa-chart-line mr-1"></i> Conversion Ratios
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content" id="reports-tab-content">
                        <!-- Tab 1: Calling -->
                        <div class="tab-pane fade show active" id="tab-calls" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover text-sm" id="reports-calls-table">
                                    <thead class="thead-light">
                                        <tr>
                                            <th>Agent Name</th>
                                            <th>Total Dials</th>
                                            <th>Connected</th>
                                            <th>Follow-ups Set</th>
                                            <th>Converted</th>
                                            <th>Success Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(rep.agent_stats || []).map(a => `
                                            <tr>
                                                <td><strong>${a.name}</strong></td>
                                                <td>${a.total_calls || 0}</td>
                                                <td>${a.connected || 0}</td>
                                                <td>${a.followups || 0}</td>
                                                <td><span class="badge badge-success font-weight-bold">${a.converted || 0}</span></td>
                                                <td><strong>${a.success_rate || '12%'}</strong></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Tab 2: Conversions -->
                        <div class="tab-pane fade" id="tab-conversion" role="tabpanel">
                            <div class="alert alert-light border text-sm text-secondary">
                                Export complete performance telemetry reports to Excel / CSV via DataTables tools below.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    // ==========================================
    // 12. MODULE: SYSTEM SETTINGS (ADMIN)
    // ==========================================
    renderSettings: async function() {
        if (this.currentUser.role_name !== 'super_admin') {
            this.renderAccessDenied('System Settings');
            return;
        }

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-sliders-h mr-1 text-primary"></i> System Settings &amp; Dropdown Configurations
                    </h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="nav flex-column nav-pills" id="settings-pills" role="tablist">
                                <a class="nav-link active font-weight-bold" data-toggle="pill" href="#set-statuses"><i class="fas fa-tags mr-2"></i>Lead Statuses</a>
                                <a class="nav-link font-weight-bold" data-toggle="pill" href="#set-sources"><i class="fas fa-bullhorn mr-2"></i>Lead Sources</a>
                                <a class="nav-link font-weight-bold" data-toggle="pill" href="#set-outcomes"><i class="fas fa-phone-alt mr-2"></i>Call Outcomes</a>
                                <a class="nav-link font-weight-bold" data-toggle="pill" href="#set-teams"><i class="fas fa-users mr-2"></i>Calling Teams</a>
                            </div>
                        </div>
                        <div class="col-md-9 border-left">
                            <div class="tab-content" id="settings-pills-content">
                                <div class="tab-pane fade show active" id="set-statuses">
                                    <h6 class="font-weight-bold text-dark mb-3">Lead Status Stages</h6>
                                    <ul class="list-group list-group-flush">
                                        ${(this.dropdowns.statuses || []).map(s => `
                                            <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                                                <div><span class="badge badge-info mr-2" style="background-color:${s.color_code}">${s.name}</span></div>
                                                <span class="text-xs text-muted">Order: ${s.sort_order || 0}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div class="tab-pane fade" id="set-sources">
                                    <h6 class="font-weight-bold text-dark mb-3">Active Lead Sources</h6>
                                    <ul class="list-group list-group-flush">
                                        ${(this.dropdowns.sources || []).map(s => `
                                            <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                                                <span>${s.name}</span>
                                                <span class="badge badge-success text-xs">Active</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div class="tab-pane fade" id="set-outcomes">
                                    <h6 class="font-weight-bold text-dark mb-3">Call Outcomes</h6>
                                    <ul class="list-group list-group-flush">
                                        ${(this.dropdowns.outcomes || []).map(o => `
                                            <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                                                <span>${o.name}</span>
                                                <span class="badge badge-secondary text-xs">${o.category || 'Connected'}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div class="tab-pane fade" id="set-teams">
                                    <h6 class="font-weight-bold text-dark mb-3">Sales Calling Teams</h6>
                                    <ul class="list-group list-group-flush">
                                        ${(this.dropdowns.teams || []).map(t => `
                                            <li class="list-group-item py-2 px-0">
                                                <strong>${t.team_name}</strong>
                                                <div class="text-xs text-muted">${t.description || 'General sales team'}</div>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    // ==========================================
    // 13. MODULE: BULK CSV IMPORT (ADMIN)
    // ==========================================
    renderImport: async function() {
        if (this.currentUser.role_name !== 'super_admin') {
            this.renderAccessDenied('Bulk CSV Import');
            return;
        }

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <div class="card-header">
                    <h3 class="card-title font-weight-bold">
                        <i class="fas fa-file-import mr-1 text-primary"></i> Bulk CSV / Excel Lead Importer
                    </h3>
                </div>
                <div class="card-body">
                    <div class="alert alert-info text-sm">
                        <i class="fas fa-info-circle mr-1"></i> Upload a standard CSV file with headers: <code>name</code>, <code>phone</code>, <code>email</code>, <code>company</code>, <code>city</code>.
                    </div>
                    <form onsubmit="App.submitCsvImport(event)">
                        <div class="form-group">
                            <label class="text-xs font-weight-bold text-muted">Select CSV File *</label>
                            <div class="custom-file">
                                <input type="file" name="csv_file" class="custom-file-input" id="csvFile" accept=".csv" required onchange="$('#csvFileLabel').text(this.files[0].name)">
                                <label class="custom-file-label" id="csvFileLabel" for="csvFile">Choose CSV file...</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="text-xs font-weight-bold text-muted">Lead Source</label>
                            <select name="source_id" class="form-control">
                                ${(this.dropdowns.sources || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                        </div>

                        <button type="submit" class="btn btn-primary font-weight-bold">
                            <i class="fas fa-upload mr-1"></i> Process &amp; Import Leads
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    submitCsvImport: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'upload_csv');

        const res = await fetch('api/import', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'CSV Processed.');
        if (data.success) {
            this.navigate('leads');
        }
    },

    // ==========================================
    // 14. MODAL: CREATE SINGLE LEAD
    // ==========================================
    openCreateLeadModal: function() {
        const statuses = this.dropdowns.statuses || [];
        const sources = this.dropdowns.sources || [];
        const users = this.dropdowns.users || [];

        const modalHtml = `
            <div class="modal fade" id="create-lead-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-user-plus mr-2"></i> Register New Lead
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitCreateLead(event)">
                            <div class="modal-body p-4">
                                <div class="form-row">
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Contact Name *</label>
                                        <input type="text" name="name" class="form-control" placeholder="e.g. Rahul Sharma" required>
                                    </div>
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Phone Number *</label>
                                        <input type="text" name="phone" class="form-control" placeholder="+91 9876543210" required>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Email Address</label>
                                        <input type="email" name="email" class="form-control" placeholder="rahul@company.com">
                                    </div>
                                    <div class="form-group col-md-6">
                                        <label class="text-xs font-weight-bold text-muted">Company / Business</label>
                                        <input type="text" name="company_name" class="form-control" placeholder="e.g. Acme Corp">
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group col-md-4">
                                        <label class="text-xs font-weight-bold text-muted">Initial Status</label>
                                        <select name="status_id" class="form-control">
                                            ${statuses.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group col-md-4">
                                        <label class="text-xs font-weight-bold text-muted">Lead Source</label>
                                        <select name="source_id" class="form-control">
                                            ${sources.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group col-md-4">
                                        <label class="text-xs font-weight-bold text-muted">Priority</label>
                                        <select name="priority" class="form-control">
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Assign to Agent</label>
                                    <select name="assigned_to" class="form-control">
                                        <option value="">Unassigned (Queue Pool)</option>
                                        ${users.map(u => `<option value="${u.id}">${u.name} (${u.role_display || u.role_name})</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Initial Notes / Requirements</label>
                                    <textarea name="remarks" class="form-control" rows="2" placeholder="Brief requirement notes..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary font-weight-bold">
                                    <i class="fas fa-plus-circle mr-1"></i> Create Lead
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#create-lead-modal').modal('show');
    },

    submitCreateLead: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'create');

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Lead created.');
        if (data.success) {
            $('#create-lead-modal').modal('hide');
            this.navigate('leads');
        }
    },

    // Modal: Lead Details Viewer
    openLeadDetailModal: async function(leadId) {
        const res = await fetch(`api/leads?action=get&id=${leadId}`);
        const data = await res.json();
        if (!data.success) return;

        const l = data.data || {};
        const logs = data.logs || [];

        const modalHtml = `
            <div class="modal fade" id="lead-detail-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-user mr-2"></i> ${l.name} &bull; Details &amp; History
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="row">
                                <div class="col-md-6">
                                    <p class="mb-1 text-xs text-muted">Phone Number:</p>
                                    <h6 class="font-weight-bold"><a href="tel:${l.phone}"><i class="fas fa-phone mr-1 text-success"></i>${l.phone}</a></h6>
                                    
                                    <p class="mb-1 text-xs text-muted mt-3">Email Address:</p>
                                    <h6 class="font-weight-bold">${l.email || 'None'}</h6>
                                    
                                    <p class="mb-1 text-xs text-muted mt-3">Company / Business:</p>
                                    <h6>${l.company_name || 'Individual'}</h6>
                                </div>
                                <div class="col-md-6 border-left">
                                    <p class="mb-1 text-xs text-muted">Lead Status:</p>
                                    <span class="badge badge-info p-2 font-weight-bold">${l.status_name}</span>
                                    
                                    <p class="mb-1 text-xs text-muted mt-3">Assigned Operator:</p>
                                    <span class="badge badge-light border p-2 font-weight-bold">${l.assigned_name || 'Unassigned'}</span>
                                    
                                    <p class="mb-1 text-xs text-muted mt-3">Lead Source:</p>
                                    <span class="badge badge-light border p-2">${l.source_name || 'Direct'}</span>
                                </div>
                            </div>

                            <hr class="my-4">
                            <h6 class="font-weight-bold text-primary mb-3"><i class="fas fa-history mr-1"></i> Activity Timeline</h6>
                            <div style="max-height: 220px; overflow-y: auto;">
                                ${logs.length === 0 ? '<div class="text-muted text-xs">No recorded logs for this lead yet.</div>' : logs.map(g => `
                                    <div class="callout callout-info py-2 px-3 mb-2 text-xs">
                                        <strong>${g.action || 'Activity'}</strong> - <span class="text-muted">${g.created_at}</span>
                                        <div>${g.description || ''}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary font-weight-bold" onclick="$('#lead-detail-modal').modal('hide'); App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.phone}', ${l.status_id})">
                                <i class="fas fa-phone-alt mr-1"></i> Call Lead
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#lead-detail-modal').modal('show');
    },

    // ==========================================
    // 15. LOGOUT & UTILS
    // ==========================================
    logout: async function() {
        if (!confirm('Are you sure you want to sign out?')) return;
        try {
            await fetch('api/auth?action=logout');
        } catch(e) {}
        window.location.href = '/login';
    },

    showNotifications: function() {
        alert('All latest notifications are listed in your top notification drawer.');
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

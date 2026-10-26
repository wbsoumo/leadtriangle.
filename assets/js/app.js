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

        // Ensure any Bootstrap modal close removes leftover backdrops and unlocks body
        $(document).on('hidden.bs.modal', '.modal', function () {
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');
        });

        // Initialize URL path from current location
        const path = window.location.pathname.replace(/^\//, '').trim();
        if (path && path !== 'app' && path !== 'index.php') {
            this.currentView = path;
        }
    },

    escapeHtml: function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    handleGlobalSearch: function(query) {
        const q = (query || '').trim();
        this.leadsFilterState.search = q;
        this.leadsFilterState.page = 1;

        const topSearch = document.getElementById('top-global-search');
        if (topSearch && topSearch.value !== q) topSearch.value = q;

        if (this.currentView !== 'leads') {
            this.navigate('leads', true, { search: q });
        } else {
            this.renderLeads(1, { search: q });
        }
    },

    clearLeadsSearch: function() {
        this.leadsFilterState.search = '';
        this.leadsFilterState.page = 1;
        const topSearch = document.getElementById('top-global-search');
        if (topSearch) topSearch.value = '';
        const leadSearch = document.getElementById('lead-search-input');
        if (leadSearch) leadSearch.value = '';
        this.renderLeads(1, { search: '' });
    },

    clearAllLeadsFilters: function() {
        this.leadsFilterState = { page: 1, limit: 25, search: '' };
        const topSearch = document.getElementById('top-global-search');
        if (topSearch) topSearch.value = '';
        const leadSearch = document.getElementById('lead-search-input');
        if (leadSearch) leadSearch.value = '';
        this.renderLeads(1);
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
        const isOperator = (this.currentUser.role_name === 'operation_executive');

        // Admin & Manager only elements (hide from Telecallers / Operations Executives)
        if (isOperator) {
            document.querySelectorAll('.admin-manager-only').forEach(el => {
                el.style.display = 'none';
            });
            const topAddBtn = document.getElementById('top-add-lead-btn');
            if (topAddBtn) topAddBtn.style.display = 'none';
        } else {
            document.querySelectorAll('.admin-manager-only').forEach(el => {
                el.style.display = '';
            });
            const topAddBtn = document.getElementById('top-add-lead-btn');
            if (topAddBtn) topAddBtn.style.display = '';
        }

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
    navigate: function(view, updateHistory = true, viewParams = null) {
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

        // Role permission block for Funnel (Telecallers cannot access Sales Funnel)
        if (view === 'funnel' && this.currentUser && this.currentUser.role_name === 'operation_executive') {
            this.renderAccessDenied('Sales Funnel');
            return;
        }

        // View dispatch with async rejection safety net
        let renderPromise = null;
        try {
            if (view === 'dashboard') renderPromise = this.renderDashboard();
            else if (view === 'workspace') renderPromise = this.renderWorkspace();
            else if (view === 'leads') renderPromise = this.renderLeads(1, viewParams || {});
            else if (view === 'calling_queue' || view === 'calling-queue') renderPromise = this.renderCallingQueue();
            else if (view === 'followups') renderPromise = this.renderFollowups();
            else if (view === 'meetings') renderPromise = this.renderMeetings();
            else if (view === 'funnel') renderPromise = this.renderFunnel();
            else if (view === 'projects') renderPromise = this.renderProjects();
            else if (view === 'reports') renderPromise = this.renderReports();
            else if (view === 'users') renderPromise = this.renderUsers();
            else if (view === 'settings') renderPromise = this.renderSettings();
            else if (view === 'import') renderPromise = this.renderImport();
            else renderPromise = this.renderDashboard();
        } catch (syncErr) {
            console.error(`Synchronous error rendering view "${view}":`, syncErr);
            container.innerHTML = `
                <div class="alert alert-danger m-3 shadow-sm">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Failed to render ${titles[view] || view}: ${syncErr.message || syncErr}.
                    <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.navigate('${view}')">Retry</button>
                </div>`;
            return;
        }

        if (renderPromise && typeof renderPromise.catch === 'function') {
            renderPromise.catch(asyncErr => {
                console.error(`Asynchronous error rendering view "${view}":`, asyncErr);
                container.innerHTML = `
                    <div class="alert alert-danger m-3 shadow-sm">
                        <i class="fas fa-exclamation-triangle mr-1"></i> Failed to load ${titles[view] || view}: ${asyncErr.message || asyncErr}.
                        <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.navigate('${view}')">Retry</button>
                    </div>`;
            });
        }
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
                ${isOperator ? `
                    <!-- Operator KPI 1: Fresh Leads -->
                    <div class="col-lg-3 col-6">
                        <div class="small-box bg-info">
                            <div class="inner">
                                <h3>${d.fresh_leads || 0}</h3>
                                <p>Fresh Leads (Uncontacted)</p>
                            </div>
                            <div class="icon">
                                <i class="fas fa-user-clock"></i>
                            </div>
                            <a href="javascript:void(0)" onclick="App.renderLeads(1, {filter:'pending'})" class="small-box-footer">
                                View Fresh Leads <i class="fas fa-arrow-circle-right ml-1"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Operator KPI 2: Connected Leads -->
                    <div class="col-lg-3 col-6">
                        <div class="small-box bg-success">
                            <div class="inner">
                                <h3>${d.connected_leads || 0}</h3>
                                <p>Connected Leads</p>
                            </div>
                            <div class="icon">
                                <i class="fas fa-phone-volume"></i>
                            </div>
                            <a href="javascript:void(0)" onclick="App.renderLeads(1, {filter:'called'})" class="small-box-footer">
                                View Connected <i class="fas fa-arrow-circle-right ml-1"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Operator KPI 3: Required Callbacks -->
                    <div class="col-lg-3 col-6">
                        <div class="small-box bg-warning">
                            <div class="inner text-dark">
                                <h3>${d.callbacks_required || 0}</h3>
                                <p>Required Callbacks</p>
                            </div>
                            <div class="icon">
                                <i class="fas fa-reply-all"></i>
                            </div>
                            <a href="javascript:void(0)" onclick="App.navigate('calling_queue')" class="small-box-footer text-dark">
                                Open Calling Queue <i class="fas fa-arrow-circle-right ml-1"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Operator KPI 4: Today's Follow-ups Due -->
                    <div class="col-lg-3 col-6">
                        <div class="small-box bg-danger">
                            <div class="inner">
                                <h3>${d.followups_today || 0}</h3>
                                <p>Today's Follow-ups Due</p>
                            </div>
                            <div class="icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <a href="javascript:void(0)" onclick="App.navigate('followups')" class="small-box-footer">
                                View Today's Reminders <i class="fas fa-arrow-circle-right ml-1"></i>
                            </a>
                        </div>
                    </div>
                ` : `
                    <!-- Manager/Admin KPI 1: Revenue -->
                    <div class="col-lg-3 col-6">
                        <div class="small-box bg-info">
                            <div class="inner">
                                <h3>₹${parseFloat(d.total_project_value || 0).toLocaleString('en-IN')}</h3>
                                <p>Total Won Revenue</p>
                            </div>
                            <div class="icon">
                                <i class="fas fa-rupee-sign"></i>
                            </div>
                            <a href="javascript:void(0)" onclick="App.navigate('projects')" class="small-box-footer">
                                View Details <i class="fas fa-arrow-circle-right ml-1"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Manager/Admin KPI 2: Total Leads In Funnel -->
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

                    <!-- Manager/Admin KPI 3: Total Calling Operations -->
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

                    <!-- Manager/Admin KPI 4: Today's Follow-ups & Reminders -->
                    <div class="col-lg-3 col-6">
                        <div class="small-box bg-danger">
                            <div class="inner">
                                <h3>${d.followups_today || 0}</h3>
                                <p>Today's Follow-ups Due</p>
                            </div>
                            <div class="icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <a href="javascript:void(0)" onclick="App.navigate('followups')" class="small-box-footer">
                                Check Reminders <i class="fas fa-arrow-circle-right ml-1"></i>
                            </a>
                        </div>
                    </div>
                `}
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
                                            <td class="text-center font-weight-bold">${d.fresh_leads || d.new_leads || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-primary" onclick="App.renderLeads(1, {filter:'pending'})">Open</button></td>
                                        </tr>
                                        <tr>
                                            <td><span class="badge badge-info mr-2 font-weight-bold">Contacted</span> Connected Leads</td>
                                            <td class="text-center font-weight-bold">${d.connected_leads || d.contacted_leads || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-info" onclick="App.renderLeads(1, {filter:'called'})">Open</button></td>
                                        </tr>
                                        <tr>
                                            <td><span class="badge badge-warning mr-2 font-weight-bold">Follow-up</span> Requires Callback</td>
                                            <td class="text-center font-weight-bold">${d.callbacks_required || d.pending_followups || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-warning" onclick="App.navigate('followups')">Open</button></td>
                                        </tr>
                                        <tr>
                                            <td><span class="badge badge-success mr-2 font-weight-bold">Converted</span> Deals Won / Active</td>
                                            <td class="text-center font-weight-bold">${d.converted_leads || 0}</td>
                                            <td class="text-right"><button class="btn btn-xs btn-outline-success" onclick="${!isOperator ? "App.navigate('funnel')" : "App.navigate('workspace')"}">Open</button></td>
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

                                ${!isOperator ? `
                                <button class="btn btn-outline-success btn-block text-left d-flex align-items-center justify-content-between p-3" onclick="App.openCreateLeadModal()">
                                    <div>
                                        <div class="font-weight-bold"><i class="fas fa-user-plus mr-2 text-success"></i> Add Single Lead</div>
                                        <div class="text-xs text-muted">Register a new client record into the database</div>
                                    </div>
                                    <i class="fas fa-chevron-right text-muted"></i>
                                </button>
                                ` : ''}
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
        this.leadSearchSeq = (this.leadSearchSeq || 0) + 1;
        const currentSeq = this.leadSearchSeq;

        try {
            this.leadsFilterState = { ...this.leadsFilterState, ...filters, page: page };

            // Synchronize top global search input
            const topSearch = document.getElementById('top-global-search');
            if (topSearch && this.leadsFilterState.search !== undefined) {
                topSearch.value = this.leadsFilterState.search || '';
            }

            const queryParams = new URLSearchParams();
            for (const key in this.leadsFilterState) {
                const val = this.leadsFilterState[key];
                if (val !== null && val !== undefined && val !== '') {
                    queryParams.append(key, val);
                }
            }

            const res = await fetch(`api/leads?${queryParams.toString()}`);
            const rawText = await res.text();
            let data = null;

            try {
                data = JSON.parse(rawText);
            } catch (jsonErr) {
                console.error("Non-JSON API response from api/leads:", rawText);
                if (currentSeq !== this.leadSearchSeq) return;
                document.getElementById('content-viewport').innerHTML = `
                    <div class="alert alert-danger m-3 shadow-sm">
                        <h5 class="font-weight-bold mb-1"><i class="fas fa-exclamation-triangle mr-2"></i> Failed to Load Leads</h5>
                        <p class="mb-2 text-sm">The server returned an unexpected response format. Please retry or contact support if the issue persists.</p>
                        <div class="p-2 bg-white rounded border text-monospace text-xs text-muted mb-3" style="max-height: 100px; overflow-y: auto;">
                            ${App.escapeHtml(rawText.substring(0, 300))}
                        </div>
                        <button class="btn btn-outline-danger btn-sm font-weight-bold" onclick="App.renderLeads(${page})">
                            <i class="fas fa-redo mr-1"></i> Retry
                        </button>
                    </div>`;
                return;
            }

            // Discard stale response
            if (currentSeq !== this.leadSearchSeq) return;

            if (!res.ok || !data || !data.success) {
                const errMsg = (data && data.message) ? data.message : `Server returned HTTP ${res.status}`;
                document.getElementById('content-viewport').innerHTML = `
                    <div class="alert alert-danger m-3 shadow-sm">
                        <h5 class="font-weight-bold mb-1"><i class="fas fa-exclamation-triangle mr-2"></i> Error Loading Leads</h5>
                        <p class="mb-3 text-sm">${App.escapeHtml(errMsg)}</p>
                        <button class="btn btn-outline-danger btn-sm font-weight-bold" onclick="App.renderLeads(${page})">
                            <i class="fas fa-redo mr-1"></i> Retry
                        </button>
                    </div>`;
                return;
            }

            const leads = Array.isArray(data.data) ? data.data : (data.data && Array.isArray(data.data.leads) ? data.data.leads : (Array.isArray(data.leads) ? data.leads : []));
            const p = data.pagination || (data.data && data.data.pagination) || { total: leads.length, page: 1, total_pages: 1 };

            // Update badge count
            const badgeLeads = document.getElementById('badge-leads-count');
            if (badgeLeads) badgeLeads.innerText = p.total;

            const isOperator = !!(this.currentUser && this.currentUser.role_name === 'operation_executive');
            const canAddLead = !isOperator;

            let html = `
                <div class="card card-primary card-outline shadow-sm">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap: 10px;">
                            <h3 class="card-title font-weight-bold mb-0">
                                <i class="fas fa-address-book mr-1 text-primary"></i> All Leads Database (${p.total})
                            </h3>
                            <div class="d-flex align-items-center flex-wrap" style="gap: 8px;">
                                ${canAddLead ? `
                                <button class="btn btn-primary btn-sm font-weight-bold" onclick="App.openCreateLeadModal()">
                                    <i class="fas fa-plus mr-1"></i> Add Lead
                                </button>` : ''}
                                <button class="btn btn-outline-secondary btn-sm font-weight-bold" onclick="App.renderLeads(App.leadsFilterState.page || 1, {}); App.fetchNotifications();" title="Refresh Table & Badges">
                                    <i class="fas fa-sync-alt mr-1"></i> Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Controls Toolbar -->
                    <div class="card-body bg-light border-bottom py-3">
                        <div class="form-row align-items-center">
                            <div class="col-md-3 col-12 mb-2 mb-md-0">
                                <div class="input-group input-group-sm">
                                    <input type="text" id="lead-search-input" class="form-control" placeholder="Search name, phone, email, company..." value="${App.escapeHtml(this.leadsFilterState.search || '')}" onkeyup="if(event.key==='Enter') App.renderLeads(1, {search: this.value})">
                                    <div class="input-group-append">
                                        <button class="btn btn-default" type="button" onclick="App.renderLeads(1, {search: document.getElementById('lead-search-input').value})">
                                            <i class="fas fa-search"></i>
                                        </button>
                                        ${this.leadsFilterState.search ? `
                                            <button class="btn btn-default text-danger" type="button" title="Clear Search" onclick="App.clearLeadsSearch()">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
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
                                    ${(this.dropdowns.statuses || []).map(s => `<option value="${s.id}" ${this.leadsFilterState.status_id == s.id ? 'selected' : ''}>${App.escapeHtml(s.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-2 col-4 text-right">
                                <button class="btn btn-outline-danger btn-sm font-weight-bold" onclick="App.clearAllLeadsFilters()">
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
                                    <th class="text-center" style="width: 120px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leads.length === 0 ? `
                                    <tr>
                                        <td colspan="10" class="p-0 border-0">
                                            <div class="lead-empty-state">
                                                <div class="empty-icon"><i class="fas fa-search"></i></div>
                                                <div class="empty-title">No results found</div>
                                                <div class="empty-desc">
                                                    ${this.leadsFilterState.search 
                                                        ? `No leads matched your search query "<strong>${App.escapeHtml(this.leadsFilterState.search)}</strong>".`
                                                        : 'No lead records found matching the active filter criteria.'}
                                                </div>
                                                ${(this.leadsFilterState.search || this.leadsFilterState.filter || this.leadsFilterState.status_id || this.leadsFilterState.priority) ? `
                                                    <button class="btn btn-outline-primary btn-sm font-weight-bold shadow-sm" onclick="App.clearAllLeadsFilters()">
                                                        <i class="fas fa-times mr-1"></i> Clear Search &amp; Filters
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                ` : leads.map(l => {
                                    const phone = l.phone || l.mobile || '-';
                                    return `
                                    <tr>
                                        <td><input type="checkbox" class="lead-row-checkbox" value="${l.id}" onchange="App.updateBulkSelectionState()"></td>
                                        <td>
                                            <strong><a href="javascript:void(0)" onclick="App.openLeadDetailModal(${l.id})">${l.name}</a></strong>
                                            ${l.company_name ? `<div class="text-xs text-muted">${l.company_name}</div>` : ''}
                                        </td>
                                        <td>
                                            <div class="phone-cell-horizontal">
                                                <i class="fas fa-phone-alt text-success"></i>
                                                <a href="tel:${phone}">${phone}</a>
                                            </div>
                                        </td>
                                        <td>${l.email ? `<a href="mailto:${l.email}">${l.email}</a>` : '<span class="text-muted">-</span>'}</td>
                                        <td><span class="badge badge-light border text-xs">${l.source_name || 'Direct'}</span></td>
                                        <td><span class="badge badge-info text-xs font-weight-bold" style="background-color:${l.status_color || '#17a2b8'}">${l.status_name}</span></td>
                                        <td><span class="badge badge-light border text-xs">${l.assigned_name || 'Unassigned'}</span></td>
                                        <td><span class="badge badge-${l.priority === 'high' ? 'danger' : (l.priority === 'medium' ? 'warning text-dark' : 'secondary')} text-xs">${l.priority || 'Normal'}</span></td>
                                        <td class="text-xs text-muted">${l.created_at ? l.created_at.substring(0, 10) : '-'}</td>
                                        <td class="text-center">
                                            <div class="dropdown">
                                                <button class="btn btn-default btn-xs dropdown-toggle font-weight-bold shadow-none" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    Action
                                                </button>
                                                <div class="dropdown-menu dropdown-menu-right shadow-sm text-xs">
                                                    <a class="dropdown-item py-1" href="javascript:void(0)" onclick="App.openLeadDetailModal(${l.id})">
                                                        <i class="fas fa-eye mr-2 text-info"></i> View Lead
                                                    </a>
                                                    <a class="dropdown-item py-1" href="javascript:void(0)" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${phone}', ${l.status_id})">
                                                        <i class="fas fa-phone-alt mr-2 text-primary"></i> Update Lead / Call
                                                    </a>
                                                    <a class="dropdown-item py-1" href="javascript:void(0)" onclick="App.openScheduleMeetingModal(${l.id}, '${l.name.replace(/'/g, "\\'")}')">
                                                        <i class="fas fa-calendar-plus mr-2 text-success"></i> Schedule Meeting
                                                    </a>
                                                    ${canAddLead ? `
                                                    <div class="dropdown-divider my-1"></div>
                                                    <a class="dropdown-item py-1 text-danger" href="javascript:void(0)" onclick="App.deleteLead(${l.id})">
                                                        <i class="fas fa-trash-alt mr-2"></i> Delete Lead
                                                    </a>` : ''}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Bulk Selection Floating / Sticky Bar -->
                <div id="leads-bulk-actions-bar" class="bulk-actions-bar mx-3 my-2" style="display: none;">
                    <div class="d-flex align-items-center">
                        <span class="badge badge-light text-dark font-weight-bold mr-2 px-2 py-1" id="bulk-selected-count">0</span>
                        <span class="font-weight-bold text-white">leads selected</span>
                    </div>
                    <div class="d-flex align-items-center flex-wrap" style="gap: 8px;">
                        <select id="bulk-assign-user-id" class="form-control form-control-sm" style="width: 220px; display: inline-block;">
                            <option value="">Select Telecaller to Assign...</option>
                            ${(this.dropdowns.users || []).map(u => `<option value="${u.id}">${u.name} (${u.role_display || u.role_name || 'Staff'})</option>`).join('')}
                        </select>
                        <button type="button" class="btn btn-warning btn-sm font-weight-bold" onclick="App.applyBulkAssign()">
                            <i class="fas fa-user-check mr-1"></i> Assign Selected
                        </button>
                        <button type="button" class="btn btn-info btn-sm font-weight-bold" onclick="App.applyRoundRobinAssign()">
                            <i class="fas fa-random mr-1"></i> Auto Assign (Round Robin)
                        </button>
                        <button type="button" class="btn btn-outline-light btn-sm font-weight-bold" onclick="App.clearLeadSelections()">
                            <i class="fas fa-times mr-1"></i> Deselect
                        </button>
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
        } catch (err) {
            console.error('Error rendering leads:', err);
            document.getElementById('content-viewport').innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Error loading leads: ${err.message}.
                    <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderLeads(1)">Retry</button>
                </div>`;
        }
    },

    toggleSelectAllLeads: function(masterCb) {
        document.querySelectorAll('.lead-row-checkbox').forEach(cb => cb.checked = masterCb.checked);
        this.updateBulkSelectionState();
    },

    updateBulkSelectionState: function() {
        const checked = Array.from(document.querySelectorAll('.lead-row-checkbox:checked'));
        const bar = document.getElementById('leads-bulk-actions-bar');
        const countSpan = document.getElementById('bulk-selected-count');
        if (!bar) return;
        if (checked.length > 0) {
            bar.style.display = 'flex';
            if (countSpan) countSpan.innerText = checked.length;
        } else {
            bar.style.display = 'none';
            const master = document.getElementById('select-all-leads');
            if (master) master.checked = false;
        }
    },

    clearLeadSelections: function() {
        document.querySelectorAll('.lead-row-checkbox').forEach(cb => cb.checked = false);
        const master = document.getElementById('select-all-leads');
        if (master) master.checked = false;
        const bar = document.getElementById('leads-bulk-actions-bar');
        if (bar) bar.style.display = 'none';
    },

    applyBulkAssign: async function() {
        const checked = Array.from(document.querySelectorAll('.lead-row-checkbox:checked')).map(cb => parseInt(cb.value));
        if (checked.length === 0) {
            alert('Please select at least one lead.');
            return;
        }
        const select = document.getElementById('bulk-assign-user-id');
        const execId = select ? select.value : '';
        if (!execId) {
            alert('Please select a telecaller to assign the leads to.');
            return;
        }
        const formData = new FormData();
        formData.append('action', 'assign');
        formData.append('executive_id', execId);
        checked.forEach(id => formData.append('lead_ids[]', id));

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Leads assigned successfully!');
        if (data.success) {
            this.clearLeadSelections();
            this.renderLeads(this.leadsFilterState.page || 1);
        }
    },

    applyRoundRobinAssign: async function() {
        const checked = Array.from(document.querySelectorAll('.lead-row-checkbox:checked')).map(cb => parseInt(cb.value));
        if (checked.length === 0) {
            alert('Please select at least one lead to auto-assign.');
            return;
        }
        if (!confirm(`Are you sure you want to distribute ${checked.length} leads equally among active telecallers?`)) return;

        const formData = new FormData();
        formData.append('action', 'auto_assign');
        checked.forEach(id => formData.append('lead_ids[]', id));

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Leads auto-assigned successfully!');
        if (data.success) {
            this.clearLeadSelections();
            this.renderLeads(this.leadsFilterState.page || 1);
        }
    },

    // Daily Operator Workspace
    renderWorkspace: async function(page = 1, filters = {}) {
        try {
            this.workspaceFilterState = { ...this.workspaceFilterState, ...filters, page: page };
            const queryParams = new URLSearchParams(this.workspaceFilterState).toString();
            const res = await fetch(`api/leads?${queryParams}&action=workspace`);
            const data = await res.json();
            if (!data || !data.success) {
                document.getElementById('content-viewport').innerHTML = `
                    <div class="alert alert-danger m-3">
                        <i class="fas fa-exclamation-triangle mr-1"></i> Failed to load workspace: ${data && data.message ? data.message : 'Unknown server response'}.
                        <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderWorkspace(1)">Retry</button>
                    </div>`;
                return;
            }

            const leads = Array.isArray(data.data) ? data.data : (data.data && Array.isArray(data.data.leads) ? data.data.leads : (Array.isArray(data.leads) ? data.leads : []));
            const p = data.pagination || (data.data && data.data.pagination) || { total: leads.length, page: 1, total_pages: 1 };

            const isOperator = !!(this.currentUser && this.currentUser.role_name === 'operation_executive');
            const canAddLead = !isOperator;

            let html = `
                <div class="card card-info card-outline shadow-sm">
                    <div class="card-header d-flex justify-content-between align-items-center flex-wrap" style="gap: 10px;">
                        <h3 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-laptop mr-1 text-info"></i> Daily Operator Working Table (${p.total} Active)
                        </h3>
                        <div class="card-tools ml-auto d-flex align-items-center flex-wrap" style="gap: 8px;">
                            <input type="text" class="form-control form-control-sm" style="width: 220px;" placeholder="Search in workspace..." value="${this.workspaceFilterState.search || ''}" onkeyup="if(event.key==='Enter') App.renderWorkspace(1, {search: this.value})">
                            ${canAddLead ? `
                            <button class="btn btn-primary btn-sm font-weight-bold" onclick="App.openCreateLeadModal()">
                                <i class="fas fa-plus mr-1"></i> Add Lead
                            </button>` : ''}
                            <button class="btn btn-outline-secondary btn-sm font-weight-bold" onclick="App.renderWorkspace(App.workspaceFilterState.page || 1); App.fetchNotifications();" title="Refresh Workspace & Badges">
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
                                        <th class="text-center" style="width: 120px;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${leads.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">No assigned active workspace leads.</td></tr>' : leads.map((l, i) => {
                                        const phone = l.phone || l.mobile || '-';
                                        const followup = l.next_followup_at || l.next_followup_date || 'None';
                                        const remarks = l.last_remarks || l.latest_call_outcome || l.initial_remark || '-';
                                        return `
                                        <tr>
                                            <td>${i + 1}</td>
                                            <td>
                                                <strong><a href="javascript:void(0)" onclick="App.openLeadDetailModal(${l.id})">${l.name}</a></strong>
                                                ${l.company_name ? `<div class="text-xs text-muted">${l.company_name}</div>` : ''}
                                            </td>
                                            <td>
                                                <div class="phone-cell-horizontal">
                                                    <i class="fas fa-phone-alt text-success"></i>
                                                    <a href="tel:${phone}">${phone}</a>
                                                </div>
                                            </td>
                                            <td><span class="badge badge-info" style="background-color: ${l.status_color || '#17a2b8'}">${l.status_name}</span></td>
                                            <td><span class="badge badge-light border text-xs">${l.source_name || 'Inbound'}</span></td>
                                            <td class="text-xs font-weight-bold text-danger">${followup}</td>
                                            <td class="text-xs text-muted" style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${remarks}</td>
                                            <td class="text-center">
                                                <div class="dropdown">
                                                    <button class="btn btn-default btn-xs dropdown-toggle font-weight-bold shadow-none" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                        Action
                                                    </button>
                                                    <div class="dropdown-menu dropdown-menu-right shadow-sm text-xs">
                                                        <a class="dropdown-item py-1" href="javascript:void(0)" onclick="App.openLeadDetailModal(${l.id})">
                                                            <i class="fas fa-eye mr-2 text-info"></i> View Lead
                                                        </a>
                                                        <a class="dropdown-item py-1" href="javascript:void(0)" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${phone}', ${l.status_id})">
                                                            <i class="fas fa-phone-alt mr-2 text-primary"></i> Update Lead / Call
                                                        </a>
                                                        <a class="dropdown-item py-1" href="javascript:void(0)" onclick="App.openScheduleMeetingModal(${l.id}, '${l.name.replace(/'/g, "\\'")}')">
                                                            <i class="fas fa-calendar-plus mr-2 text-success"></i> Schedule Meeting
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <!-- Pagination Footer -->
                    <div class="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap">
                        <div class="text-xs text-muted">
                            Page <strong>${p.page}</strong> of <strong>${p.total_pages}</strong> &bull; Total <strong>${p.total}</strong> records
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-default" ${p.page <= 1 ? 'disabled' : ''} onclick="App.renderWorkspace(${p.page - 1})">
                                <i class="fas fa-chevron-left mr-1"></i> Previous
                            </button>
                            <button class="btn btn-default" ${p.page >= p.total_pages ? 'disabled' : ''} onclick="App.renderWorkspace(${p.page + 1})">
                                Next <i class="fas fa-chevron-right ml-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('content-viewport').innerHTML = html;
        } catch (err) {
            console.error('Error rendering workspace:', err);
            document.getElementById('content-viewport').innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Error loading workspace: ${err.message}.
                    <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderWorkspace(1)">Retry</button>
                </div>`;
        }
    },

    // ==========================================
    // 7. MODULE: CALLING QUEUE & MODAL
    // ==========================================
    renderCallingQueue: async function() {
        try {
            const res = await fetch('api/calls?action=queue');
            const data = await res.json();
            if (!data || !data.success) {
                document.getElementById('content-viewport').innerHTML = `
                    <div class="alert alert-danger m-3">
                        <i class="fas fa-exclamation-triangle mr-1"></i> Failed to load calling queue: ${data && data.message ? data.message : 'Unknown error'}.
                        <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderCallingQueue()">Retry</button>
                    </div>`;
                return;
            }

            const queue = Array.isArray(data.data) ? data.data : [];

            let html = `
                <div class="alert alert-light border border-warning shadow-sm mb-3 p-3 text-xs">
                    <i class="fas fa-info-circle text-warning mr-1"></i> <strong>Calling Queue Lifecycle:</strong> 
                    Leads enter your calling queue when assigned to you and awaiting initial contact, or when a scheduled callback/follow-up is due today. 
                    Leads exit the active queue once scheduled for a meeting, converted to a project, rescheduled to a future date, or marked not interested/lost.
                </div>
                <div class="card card-warning card-outline shadow-sm">
                    <div class="card-header d-flex justify-content-between align-items-center flex-wrap">
                        <h3 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-headset mr-1 text-warning"></i> Telecalling Live Queue (${queue.length} Leads Waiting)
                        </h3>
                        <div class="card-tools ml-auto">
                            <button class="btn btn-outline-secondary btn-sm font-weight-bold" onclick="App.renderCallingQueue(); App.fetchNotifications();" title="Refresh Queue & Badges">
                                <i class="fas fa-sync-alt mr-1"></i> Refresh
                            </button>
                        </div>
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
                                            <td>
                                                <div class="phone-cell-horizontal">
                                                    <i class="fas fa-phone-alt text-success"></i>
                                                    <a href="tel:${q.phone}" class="font-weight-bold text-dark">${q.phone}</a>
                                                </div>
                                            </td>
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
        } catch (err) {
            console.error('Error rendering calling queue:', err);
            document.getElementById('content-viewport').innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Error loading calling queue: ${err.message}.
                    <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderCallingQueue()">Retry</button>
                </div>`;
        }
    },

    openCallModal: function(leadId, leadName, phone, currentStatusId = 0) {
        const statuses = this.dropdowns.statuses || [];
        const outcomes = this.dropdowns.outcomes || [];
        const isActiveCall = !!(this.activeCallData && (this.activeCallData.lead_id == leadId || !this.activeCallData.lead_id));
        const autoDuration = isActiveCall ? (parseInt(this.activeCallData.duration_seconds) || 75) : 0;
        const autoDurationFormatted = autoDuration > 0 
            ? `${String(Math.floor(autoDuration / 60)).padStart(2, '0')}:${String(autoDuration % 60).padStart(2, '0')}` 
            : '01:15';

        const modalHtml = `
            <div class="modal fade" id="call-modal" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static">
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg" role="document">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-header bg-primary text-white py-2 px-3">
                            <h5 class="modal-title font-weight-bold d-flex align-items-center mb-0" style="font-size: 1.05rem;">
                                <i class="fas fa-phone-volume mr-2"></i> Log Phone Call &bull; ${App.escapeHtml(leadName)}
                            </h5>
                            <button type="button" class="close text-white shadow-none" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitCallLog(event, ${leadId})" class="d-flex flex-column m-0" style="overflow: hidden;">
                            <div class="modal-body p-3" style="overflow-y: auto; max-height: calc(85vh - 120px);">
                                <!-- Lead Header & Redial Card -->
                                <div class="card card-outline card-secondary mb-3 bg-light shadow-none">
                                    <div class="card-body p-2 d-flex justify-content-between align-items-center flex-wrap" style="gap: 8px;">
                                        <div class="d-flex align-items-center">
                                            <div class="user-avatar-sm mr-2 bg-primary text-white"><i class="fas fa-user"></i></div>
                                            <div>
                                                <div class="font-weight-bold text-dark text-sm">${App.escapeHtml(leadName)}</div>
                                                <div class="text-xs text-muted d-inline-flex align-items-center mt-1">
                                                    <i class="fas fa-phone-alt text-success mr-1"></i>
                                                    <a href="tel:${phone}" class="font-weight-bold text-dark">${phone}</a>
                                                </div>
                                            </div>
                                        </div>
                                        <a href="tel:${phone}" class="btn btn-outline-success btn-xs font-weight-bold ml-auto px-2 py-1">
                                            <i class="fas fa-phone-alt mr-1"></i> Redial
                                        </a>
                                    </div>
                                </div>

                                <!-- Duration Capture & Outcome (Clean 2-Column Row) -->
                                <div class="form-row">
                                    <div class="form-group col-md-6 col-12 mb-3">
                                        <label class="modal-label-contrast d-flex justify-content-between align-items-center">
                                            <span><i class="fas fa-stopwatch text-info mr-1"></i> Call Duration</span>
                                            ${isActiveCall ? `
                                                <span class="badge badge-success px-2 py-1"><i class="fas fa-satellite-dish mr-1"></i> Auto-Captured</span>
                                            ` : `
                                                <span class="badge badge-secondary px-2 py-1"><i class="fas fa-keyboard mr-1"></i> Manual</span>
                                            `}
                                        </label>
                                        ${isActiveCall ? `
                                            <div class="d-flex align-items-center justify-content-between p-2 bg-light border rounded">
                                                <div class="font-weight-bold text-success" style="font-size: 1.1rem;">
                                                    <i class="fas fa-stopwatch mr-1"></i> <span id="call-duration-label">${autoDurationFormatted}</span>
                                                </div>
                                                <input type="hidden" name="call_duration" id="call-duration-input" value="${autoDuration}">
                                                <span class="badge badge-light border text-muted">telephony sync</span>
                                            </div>
                                        ` : `
                                            <div class="input-group input-group-sm">
                                                <div class="input-group-prepend">
                                                    <span class="input-group-text"><i class="fas fa-stopwatch text-secondary"></i></span>
                                                </div>
                                                <input type="text" name="call_duration_display" id="call-duration-display" class="form-control" placeholder="e.g. 02:30 or 150 (sec)" oninput="App.onManualDurationInput(this)">
                                                <input type="hidden" name="call_duration" id="call-duration-input" value="60">
                                            </div>
                                            <div class="text-xs text-muted mt-1">Format: MM:SS or seconds (default 60s)</div>
                                        `}
                                    </div>

                                    <div class="form-group col-md-6 col-12 mb-3">
                                        <label class="modal-label-contrast"><i class="fas fa-headset text-primary mr-1"></i> Call Outcome *</label>
                                        <select name="outcome_id" id="call-outcome-select" class="form-control form-control-sm font-weight-bold" required onchange="App.onCallOutcomeChanged(this)">
                                            <option value="">Select Outcome...</option>
                                            ${outcomes.map(o => `<option value="${o.id}" data-cat="${o.category || ''}" data-name="${App.escapeHtml(o.name)}">${App.escapeHtml(o.name)}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>

                                <!-- Dynamic Branch: Interested -->
                                <div id="call-branch-interested" class="card card-outline card-success mb-3 bg-light shadow-none" style="display: none;">
                                    <div class="card-header py-2 px-3 border-bottom-0 bg-transparent">
                                        <h6 class="card-title text-success font-weight-bold text-sm mb-0">
                                            <i class="fas fa-star text-warning mr-1"></i> Interested Lead - Next Step Action
                                        </h6>
                                    </div>
                                    <div class="card-body p-3 pt-0">
                                        <div class="d-flex mb-3 flex-wrap" style="gap: 16px;">
                                            <div class="custom-control custom-radio">
                                                <input type="radio" id="action-followup" name="interested_action" class="custom-control-input" value="followup" checked onchange="App.onInterestedActionToggle(this.value)">
                                                <label class="custom-control-label font-weight-bold text-sm" for="action-followup">Schedule Follow-up</label>
                                            </div>
                                            <div class="custom-control custom-radio">
                                                <input type="radio" id="action-meeting" name="interested_action" class="custom-control-input" value="meeting" onchange="App.onInterestedActionToggle(this.value)">
                                                <label class="custom-control-label font-weight-bold text-sm" for="action-meeting">Schedule Client Meeting / Demo</label>
                                            </div>
                                        </div>

                                        <!-- Sub-branch: Follow-up -->
                                        <div id="subbranch-followup">
                                            <div class="form-group mb-2">
                                                <label class="modal-label-contrast"><i class="fas fa-calendar-alt text-warning mr-1"></i> Follow-up Date &amp; Time *</label>
                                                <input type="datetime-local" name="next_followup_date" id="call-followup-dt" class="form-control form-control-sm">
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="modal-label-contrast"><i class="fas fa-bullseye text-secondary mr-1"></i> Follow-up Purpose</label>
                                                <input type="text" name="followup_purpose" class="form-control form-control-sm" placeholder="e.g. Detailed price quote review, decision maker discussion">
                                            </div>
                                        </div>

                                        <!-- Sub-branch: Meeting -->
                                        <div id="subbranch-meeting" style="display: none;">
                                            <div class="form-group mb-2">
                                                <label class="modal-label-contrast"><i class="fas fa-heading text-primary mr-1"></i> Meeting Title *</label>
                                                <input type="text" name="meeting_title" class="form-control form-control-sm" value="Product Demo - ${App.escapeHtml(leadName)}">
                                            </div>
                                            <div class="form-row">
                                                <div class="col-md-7 col-12 mb-2">
                                                    <label class="modal-label-contrast"><i class="fas fa-calendar-check text-success mr-1"></i> Meeting Date &amp; Time *</label>
                                                    <input type="datetime-local" name="meeting_datetime" id="call-meeting-dt" class="form-control form-control-sm">
                                                </div>
                                                <div class="col-md-5 col-12 mb-2">
                                                    <label class="modal-label-contrast"><i class="fas fa-video text-info mr-1"></i> Meeting Mode</label>
                                                    <select name="meeting_mode" class="form-control form-control-sm">
                                                        <option value="Google Meet">Google Meet</option>
                                                        <option value="Zoom">Zoom</option>
                                                        <option value="In-Person">In-Person</option>
                                                        <option value="Phone Call">Phone Call</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="modal-label-contrast"><i class="fas fa-link text-secondary mr-1"></i> Meeting Link / Room (Optional)</label>
                                                <input type="url" name="meeting_link" class="form-control form-control-sm" placeholder="https://meet.google.com/xyz-abcd">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Dynamic Branch: Not Interested -->
                                <div id="call-branch-not-interested" class="card card-outline card-danger mb-3 bg-light shadow-none" style="display: none;">
                                    <div class="card-header py-2 px-3 border-bottom-0 bg-transparent">
                                        <h6 class="card-title text-danger font-weight-bold text-sm mb-0">
                                            <i class="fas fa-times-circle mr-1"></i> Disqualification Reason *
                                        </h6>
                                    </div>
                                    <div class="card-body p-3 pt-0">
                                        <select name="disqualification_reason" id="call-disqualify-reason" class="form-control form-control-sm">
                                            <option value="">Select Reason for Disqualification...</option>
                                            <option value="Budget Constraint / Too Expensive">Budget Constraint / Too Expensive</option>
                                            <option value="Not Required Currently / Bad Timing">Not Required Currently / Bad Timing</option>
                                            <option value="Already Using Competitor Product">Already Using Competitor Product</option>
                                            <option value="Not Decision Maker / Wrong Profile">Not Decision Maker / Wrong Profile</option>
                                            <option value="Missing Required Features">Missing Required Features</option>
                                            <option value="No Budget Allocated">No Budget Allocated</option>
                                            <option value="Other / Non-Responsive">Other / Non-Responsive</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Dynamic Branch: Standard Follow-up Option -->
                                <div id="call-branch-standard-followup" class="card card-outline card-warning mb-3 bg-light shadow-none" style="display: none;">
                                    <div class="card-header py-2 px-3 border-bottom-0 bg-transparent">
                                        <h6 class="card-title text-dark font-weight-bold text-sm mb-0">
                                            <i class="fas fa-clock mr-1 text-warning"></i> Schedule Next Follow-up (Optional)
                                        </h6>
                                    </div>
                                    <div class="card-body p-3 pt-0">
                                        <input type="datetime-local" name="simple_followup_date" class="form-control form-control-sm">
                                    </div>
                                </div>

                                <!-- Lead Status & Remarks -->
                                <div class="form-group mb-3">
                                    <label class="modal-label-contrast"><i class="fas fa-exchange-alt text-info mr-1"></i> Update Lead Status *</label>
                                    <select name="status_id" id="call-status-select" class="form-control form-control-sm font-weight-bold" required>
                                        ${statuses.map(s => `<option value="${s.id}" ${s.id == currentStatusId ? 'selected' : ''}>${App.escapeHtml(s.name)}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-group mb-0">
                                    <label class="modal-label-contrast"><i class="fas fa-comment-dots text-secondary mr-1"></i> Discussion Remarks *</label>
                                    <textarea name="remarks" id="call-remarks" class="form-control form-control-sm" rows="3" placeholder="Enter detailed notes and client feedback..." required></textarea>
                                </div>
                            </div>

                            <!-- Fixed Accessible Footer -->
                            <div class="modal-footer bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                                <button type="button" class="btn btn-default btn-sm font-weight-bold" data-dismiss="modal">
                                    <i class="fas fa-times mr-1"></i> Cancel
                                </button>
                                <button type="submit" class="btn btn-primary btn-sm font-weight-bold" id="btn-save-call-log">
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

    onManualDurationInput: function(input) {
        let val = input.value.trim();
        let seconds = 0;
        if (val.includes(':')) {
            const parts = val.split(':');
            seconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
        } else {
            seconds = parseInt(val) || 0;
        }
        const hidden = document.getElementById('call-duration-input');
        if (hidden) hidden.value = seconds;
    },

    onInterestedActionToggle: function(action) {
        const fu = document.getElementById('subbranch-followup');
        const mt = document.getElementById('subbranch-meeting');
        const stSelect = document.getElementById('call-status-select');
        if (action === 'meeting') {
            if (fu) fu.style.display = 'none';
            if (mt) mt.style.display = 'block';
            if (stSelect) stSelect.value = "7"; // Meeting Scheduled
        } else {
            if (fu) fu.style.display = 'block';
            if (mt) mt.style.display = 'none';
            if (stSelect) stSelect.value = "6"; // Follow-up Required
        }
    },

    onCallOutcomeChanged: function(select) {
        const val = parseInt(select.value);
        const opt = select.options[select.selectedIndex];
        const name = opt ? (opt.getAttribute('data-name') || opt.text) : '';
        const branchInterested = document.getElementById('call-branch-interested');
        const branchNotInterested = document.getElementById('call-branch-not-interested');
        const branchStdFollowup = document.getElementById('call-branch-standard-followup');
        const stSelect = document.getElementById('call-status-select');

        // Reset display
        if (branchInterested) branchInterested.style.display = 'none';
        if (branchNotInterested) branchNotInterested.style.display = 'none';
        if (branchStdFollowup) branchStdFollowup.style.display = 'none';

        if (val === 1 || (name.toLowerCase().includes('interested') && !name.toLowerCase().includes('not interested'))) {
            if (branchInterested) branchInterested.style.display = 'block';
            if (stSelect) stSelect.value = "6"; // Follow-up Required by default
        } else if (val === 4 || val === 14 || name.toLowerCase().includes('not interested')) {
            if (branchNotInterested) branchNotInterested.style.display = 'block';
            if (stSelect) stSelect.value = "13"; // Not Interested
        } else if (val === 2 || val === 12 || val === 18 || name.toLowerCase().includes('call back') || name.toLowerCase().includes('connected')) {
            if (branchStdFollowup) branchStdFollowup.style.display = 'block';
            if (stSelect) stSelect.value = "6"; // Follow-up Required
        } else if (val === 5 || val === 6 || val === 15 || val === 16) {
            if (stSelect) stSelect.value = "4"; // Contacting
        } else if (val === 7 || val === 8 || val === 17) {
            if (stSelect) stSelect.value = "14"; // Invalid / Unreachable
        }
    },

    submitCallLog: async function(e, leadId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'log');
        formData.append('lead_id', leadId);

        const outcomeSelect = document.getElementById('call-outcome-select');
        const outcomeVal = outcomeSelect ? parseInt(outcomeSelect.value) : 0;
        const outcomeOpt = outcomeSelect ? outcomeSelect.options[outcomeSelect.selectedIndex] : null;
        const outcomeName = outcomeOpt ? (outcomeOpt.getAttribute('data-name') || outcomeOpt.text) : '';

        // Handle duration
        const durInput = document.getElementById('call-duration-input');
        if (durInput && durInput.value) {
            formData.set('call_duration', durInput.value);
        }

        // Handle Interested Branch
        if (outcomeVal === 1 || (outcomeName.toLowerCase().includes('interested') && !outcomeName.toLowerCase().includes('not interested'))) {
            const actionRadio = form.querySelector('input[name="interested_action"]:checked');
            if (actionRadio && actionRadio.value === 'meeting') {
                formData.set('schedule_meeting', '1');
                const mDt = form.querySelector('input[name="meeting_datetime"]');
                if (mDt && !mDt.value) {
                    alert('Please specify the Meeting Date & Time.');
                    return;
                }
            } else {
                formData.set('schedule_followup', '1');
                const fDt = form.querySelector('input[name="next_followup_date"]');
                if (fDt && !fDt.value) {
                    alert('Please specify the Follow-up Date & Time.');
                    return;
                }
            }
        }

        // Handle Not Interested Branch
        if (outcomeVal === 4 || outcomeVal === 14 || outcomeName.toLowerCase().includes('not interested')) {
            const reasonSelect = document.getElementById('call-disqualify-reason');
            const reasonVal = reasonSelect ? reasonSelect.value : '';
            if (!reasonVal) {
                alert('Please select a disqualification reason.');
                return;
            }
            formData.set('disqualification_reason', reasonVal);
            formData.set('status_id', '13'); // Not Interested
        }

        // Handle standard followup if provided
        const simpleFu = form.querySelector('input[name="simple_followup_date"]');
        if (simpleFu && simpleFu.value) {
            formData.set('schedule_followup', '1');
            formData.set('next_followup_date', simpleFu.value);
        }

        const saveBtn = document.getElementById('btn-save-call-log');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
        }

        try {
            const res = await fetch('api/calls', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                $('#call-modal').modal('hide');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open').css('padding-right', '');
                if (this.currentView === 'calling_queue') this.renderCallingQueue();
                else if (this.currentView === 'workspace') this.renderWorkspace();
                else if (this.currentView === 'leads') this.renderLeads(this.leadsFilterState.page || 1);
                else if (this.currentView === 'dashboard') this.renderDashboard();
                this.fetchNotifications();
                setTimeout(() => {
                    alert(data.message || 'Call logged successfully.');
                }, 50);
            } else {
                alert(data.message || 'Failed to log call.');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save mr-1"></i> Save Call Remarks';
                }
            }
        } catch (fetchErr) {
            console.error('Call logging error:', fetchErr);
            alert('Failed to connect to server. Please try again.');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save mr-1"></i> Save Call Remarks';
            }
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
        try {
            const res = await fetch('api/followups?action=list');
            const data = await res.json();
            if (!data || !data.success) {
                document.getElementById('content-viewport').innerHTML = `
                    <div class="alert alert-danger m-3">
                        <i class="fas fa-exclamation-triangle mr-1"></i> Failed to load follow-ups: ${data && data.message ? data.message : 'Unknown error'}.
                        <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderFollowups()">Retry</button>
                    </div>`;
                return;
            }

            const items = Array.isArray(data.data) ? data.data : [];

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
                                    ${items.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">No pending follow-ups scheduled.</td></tr>' : items.map((f, i) => {
                                        const phone = f.phone || f.lead_mobile || '-';
                                        const scheduled = f.scheduled_at || (f.followup_date + ' ' + (f.followup_time || ''));
                                        return `
                                        <tr>
                                            <td>${i + 1}</td>
                                            <td><strong>${f.lead_name}</strong></td>
                                            <td><a href="tel:${phone}">${phone}</a></td>
                                            <td class="text-danger font-weight-bold">${scheduled}</td>
                                            <td class="text-xs text-muted">${f.notes || f.purpose || '-'}</td>
                                            <td>${f.assigned_name || f.agent_name || 'Self'}</td>
                                            <td class="text-center">
                                                <button class="btn btn-primary btn-xs font-weight-bold" onclick="App.openCallModal(${f.lead_id}, '${f.lead_name.replace(/'/g, "\\'")}', '${phone}')">
                                                    <i class="fas fa-phone mr-1"></i> Call & Complete
                                                </button>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('content-viewport').innerHTML = html;
        } catch (err) {
            console.error('Error rendering follow-ups:', err);
            document.getElementById('content-viewport').innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Error loading follow-ups: ${err.message}.
                    <button class="btn btn-outline-danger btn-sm ml-2" onclick="App.renderFollowups()">Retry</button>
                </div>`;
        }
    },

    meetingsState: {
        view: 'month',
        year: 2026,
        month: 10,
        filterStatus: ''
    },

    setMeetingsView: function(view) {
        this.meetingsState.view = view;
        this.renderMeetings();
    },

    changeMeetingMonth: function(delta) {
        let m = this.meetingsState.month + delta;
        let y = this.meetingsState.year;
        if (m > 12) { m = 1; y++; }
        else if (m < 1) { m = 12; y--; }
        this.meetingsState.month = m;
        this.meetingsState.year = y;
        this.renderMeetings();
    },

    filterMeetingsStatus: function(status) {
        this.meetingsState.filterStatus = status;
        this.renderMeetings();
    },

    renderMeetings: async function() {
        const monthStr = `${this.meetingsState.year}-${String(this.meetingsState.month).padStart(2, '0')}`;
        const queryParams = new URLSearchParams({
            action: 'list',
            month: monthStr,
            ...(this.meetingsState.filterStatus ? { status: this.meetingsState.filterStatus } : {})
        }).toString();

        const res = await fetch(`api/meetings?${queryParams}`);
        const data = await res.json();
        const meetings = data.data || [];
        const types = data.meeting_types || [];
        this.meetingTypesList = types;

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[this.meetingsState.month - 1];

        let html = `
            <div class="card card-primary card-outline shadow-sm">
                <!-- Header Toolbar with Calendar Controls -->
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap: 10px;">
                        <div class="d-flex align-items-center flex-wrap" style="gap: 8px;">
                            <h3 class="card-title font-weight-bold mb-0 mr-2">
                                <i class="fas fa-calendar-alt mr-1 text-primary"></i> Client Meetings &amp; Appointments
                            </h3>
                            <!-- Month Nav Controls -->
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-default" onclick="App.changeMeetingMonth(-1)" title="Previous Month">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span class="btn btn-default font-weight-bold px-3" style="cursor: default; pointer-events: none;">
                                    ${currentMonthName} ${this.meetingsState.year}
                                </span>
                                <button class="btn btn-default" onclick="App.changeMeetingMonth(1)" title="Next Month">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Right Controls: View Switcher, Filter & Schedule Button -->
                        <div class="d-flex align-items-center flex-wrap" style="gap: 8px;">
                            <div class="btn-group btn-group-sm">
                                <button class="btn ${this.meetingsState.view === 'month' ? 'btn-primary' : 'btn-default'}" onclick="App.setMeetingsView('month')">
                                    <i class="fas fa-calendar mr-1"></i> Month
                                </button>
                                <button class="btn ${this.meetingsState.view === 'week' ? 'btn-primary' : 'btn-default'}" onclick="App.setMeetingsView('week')">
                                    <i class="fas fa-calendar-week mr-1"></i> Week
                                </button>
                                <button class="btn ${this.meetingsState.view === 'day' ? 'btn-primary' : 'btn-default'}" onclick="App.setMeetingsView('day')">
                                    <i class="fas fa-calendar-day mr-1"></i> Day
                                </button>
                                <button class="btn ${this.meetingsState.view === 'list' ? 'btn-primary' : 'btn-default'}" onclick="App.setMeetingsView('list')">
                                    <i class="fas fa-list mr-1"></i> List
                                </button>
                            </div>

                            <select class="form-control form-control-sm" style="width: 140px;" onchange="App.filterMeetingsStatus(this.value)">
                                <option value="" ${this.meetingsState.filterStatus === '' ? 'selected' : ''}>All Statuses</option>
                                <option value="Scheduled" ${this.meetingsState.filterStatus === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="Rescheduled" ${this.meetingsState.filterStatus === 'Rescheduled' ? 'selected' : ''}>Rescheduled</option>
                                <option value="Completed" ${this.meetingsState.filterStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${this.meetingsState.filterStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>

                            <button class="btn btn-success btn-sm font-weight-bold" onclick="App.openScheduleMeetingModal()">
                                <i class="fas fa-plus mr-1"></i> Schedule Meeting
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Calendar Content Body -->
                <div class="card-body p-3">
                    ${this.renderCalendarViewContent(meetings)}
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    renderCalendarViewContent: function(meetings) {
        if (this.meetingsState.view === 'month') {
            return this.renderMonthCalendarGrid(meetings);
        } else if (this.meetingsState.view === 'week') {
            return this.renderWeekCalendar(meetings);
        } else if (this.meetingsState.view === 'day') {
            return this.renderDayCalendar(meetings);
        } else {
            return this.renderMeetingsListTable(meetings);
        }
    },

    renderMonthCalendarGrid: function(meetings) {
        const year = this.meetingsState.year;
        const month = this.meetingsState.month;
        const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sun
        const daysInMonth = new Date(year, month, 0).getDate();

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let gridHtml = `
            <div class="calendar-grid">
                ${days.map(d => `<div class="calendar-header-day text-center font-weight-bold py-2 bg-light border text-xs text-uppercase">${d}</div>`).join('')}
        `;

        // Blank cells before first day
        for (let i = 0; i < firstDayIndex; i++) {
            gridHtml += `<div class="calendar-cell bg-light opacity-50 border p-1" style="min-height: 100px;"></div>`;
        }

        // Days of month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayMeetings = meetings.filter(m => m.meeting_date === dateStr);
            const isToday = (new Date().toISOString().substring(0, 10) === dateStr);

            gridHtml += `
                <div class="calendar-cell border p-1 ${isToday ? 'bg-light border-primary' : ''}" style="min-height: 105px; overflow-y: auto;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge ${isToday ? 'badge-primary' : 'badge-light border'} text-xs font-weight-bold">${d}</span>
                        ${dayMeetings.length > 0 ? `<span class="badge badge-info text-xs">${dayMeetings.length}</span>` : ''}
                    </div>
                    <div class="calendar-events-list">
                        ${dayMeetings.map(m => `
                            <div class="calendar-meeting-pill ${m.status === 'Rescheduled' ? 'bg-warning text-dark' : (m.status === 'Completed' ? 'bg-success text-white' : 'bg-primary text-white')} p-1 rounded mb-1 text-xs" style="cursor: pointer; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" onclick="App.openRescheduleMeetingModal(${m.id}, '${m.meeting_title.replace(/'/g, "\\'")}', '${m.meeting_date}', '${m.meeting_time}')" title="${m.meeting_title} with ${m.lead_name} (${m.meeting_time})">
                                <i class="fas fa-video mr-1"></i> ${m.meeting_time ? m.meeting_time.substring(0, 5) : '11:00'} ${m.lead_name}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        gridHtml += `</div>`;
        return gridHtml;
    },

    renderWeekCalendar: function(meetings) {
        const year = this.meetingsState.year;
        const month = this.meetingsState.month;
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        let daysHtml = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const dStr = d.toISOString().substring(0, 10);
            const dMeetings = meetings.filter(m => m.meeting_date === dStr);

            daysHtml += `
                <div class="col border-right p-2" style="min-height: 250px;">
                    <div class="text-center font-weight-bold text-xs border-bottom pb-2 mb-2">
                        <div>${d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <span class="badge badge-secondary">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div>
                        ${dMeetings.length === 0 ? '<div class="text-muted text-xs text-center pt-3">No meetings</div>' : dMeetings.map(m => `
                            <div class="callout callout-info p-2 mb-2 shadow-sm text-xs" style="cursor: pointer;" onclick="App.openRescheduleMeetingModal(${m.id}, '${m.meeting_title.replace(/'/g, "\\'")}', '${m.meeting_date}', '${m.meeting_time}')">
                                <div class="font-weight-bold text-primary">${m.meeting_time ? m.meeting_time.substring(0, 5) : '11:00'}</div>
                                <div class="font-weight-bold">${m.lead_name}</div>
                                <div class="text-muted">${m.meeting_mode || 'Google Meet'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return `<div class="row no-gutters border">${daysHtml}</div>`;
    },

    renderDayCalendar: function(meetings) {
        const todayStr = new Date().toISOString().substring(0, 10);
        const dayMeetings = meetings.filter(m => m.meeting_date === todayStr);

        return `
            <div class="p-3">
                <h5 class="font-weight-bold text-dark mb-3">
                    <i class="fas fa-calendar-day text-primary mr-2"></i> Today's Meeting Agenda (${todayStr})
                </h5>
                ${dayMeetings.length === 0 ? '<div class="alert alert-light border text-muted">No appointments scheduled for today. Use the "Schedule Meeting" button above to book client demonstrations.</div>' : `
                    <div class="list-group">
                        ${dayMeetings.map(m => `
                            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap p-3">
                                <div>
                                    <div class="font-weight-bold text-primary" style="font-size: 1.1rem;">
                                        <i class="fas fa-clock mr-1 text-muted"></i> ${m.meeting_time ? m.meeting_time.substring(0, 5) : '11:00'} &bull; ${m.meeting_title}
                                    </div>
                                    <div class="text-sm mt-1">
                                        Client: <strong>${m.lead_name}</strong> &bull; Contact: <a href="tel:${m.lead_mobile}">${m.lead_mobile}</a>
                                    </div>
                                    <div class="text-xs text-muted mt-1">
                                        Mode: <span class="badge badge-light border">${m.meeting_mode || 'Google Meet'}</span> &bull; 
                                        Assigned Host: <strong>${m.agent_name}</strong>
                                        ${m.meeting_link ? `&bull; <a href="${m.meeting_link}" target="_blank" class="text-primary font-weight-bold"><i class="fas fa-external-link-alt ml-1"></i> Join Meeting</a>` : ''}
                                    </div>
                                </div>
                                <div class="mt-2 mt-md-0" style="gap: 5px;">
                                    <button class="btn btn-warning btn-xs font-weight-bold mr-1" onclick="App.openRescheduleMeetingModal(${m.id}, '${m.meeting_title.replace(/'/g, "\\'")}', '${m.meeting_date}', '${m.meeting_time}')">
                                        <i class="fas fa-calendar-day mr-1"></i> Reschedule
                                    </button>
                                    <button class="btn btn-success btn-xs font-weight-bold mr-1" onclick="App.updateMeetingStatus(${m.id}, 'Completed')">
                                        <i class="fas fa-check mr-1"></i> Completed
                                    </button>
                                    <button class="btn btn-outline-danger btn-xs" onclick="App.updateMeetingStatus(${m.id}, 'Cancelled')">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    },

    renderMeetingsListTable: function(meetings) {
        return `
            <div class="table-responsive">
                <table class="table table-bordered table-hover text-sm mb-0">
                    <thead class="thead-light">
                        <tr>
                            <th>#</th>
                            <th>Lead / Client</th>
                            <th>Meeting Title &amp; Type</th>
                            <th>Date &amp; Time</th>
                            <th>Platform / Link</th>
                            <th>Host Executive</th>
                            <th>Status &amp; Outcome</th>
                            <th class="text-center" style="width: 220px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${meetings.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">No scheduled meetings found matching criteria.</td></tr>' : meetings.map((m, i) => {
                            const isConverted = (m.notes && m.notes.includes('[Project Created:')) || m.status === 'Converted';
                            const canPushToProject = (m.status === 'Completed' || (m.notes && m.notes.includes('Outcome: Successful'))) && !isConverted;
                            return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>
                                    <strong><a href="javascript:void(0)" onclick="App.openLeadDetailModal(${m.lead_id})">${m.lead_name}</a></strong>
                                    <div class="phone-cell-horizontal mt-1">
                                        <i class="fas fa-phone-alt text-success"></i>
                                        <a href="tel:${m.lead_mobile}">${m.lead_mobile}</a>
                                    </div>
                                    ${m.company_name ? `<div class="text-xs text-muted">${m.company_name}</div>` : ''}
                                </td>
                                <td>
                                    <div class="font-weight-bold text-dark">${m.meeting_title}</div>
                                    <span class="badge badge-light border text-xs">${m.type_name || 'Demo'}</span>
                                    ${m.notes ? `<div class="text-xs text-muted mt-1" style="max-width: 240px; font-size: 0.75rem; white-space: pre-wrap;">${m.notes}</div>` : ''}
                                </td>
                                <td>
                                    <div class="font-weight-bold">${m.meeting_date}</div>
                                    <div class="text-xs text-muted">${m.meeting_time ? m.meeting_time.substring(0, 5) : '11:00'}</div>
                                </td>
                                <td>
                                    <div><span class="badge badge-light border">${m.meeting_mode || 'Google Meet'}</span></div>
                                    ${m.meeting_link ? `<div class="text-xs mt-1"><a href="${m.meeting_link}" target="_blank" class="text-primary text-truncate d-inline-block" style="max-width: 140px;">Open Link</a></div>` : ''}
                                </td>
                                <td><span class="badge badge-light border text-xs">${m.agent_name || 'Staff'}</span></td>
                                <td>
                                    <span class="badge badge-${m.status === 'Scheduled' ? 'primary' : (m.status === 'Completed' ? 'success' : (m.status === 'Rescheduled' ? 'warning text-dark' : 'secondary'))} text-xs font-weight-bold">${m.status || 'Scheduled'}</span>
                                    ${isConverted ? `<div class="mt-1"><span class="badge badge-success text-xs font-weight-bold"><i class="fas fa-check-circle mr-1"></i> In Projects</span></div>` : ''}
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-xs mb-1">
                                        <button class="btn btn-info btn-xs font-weight-bold mr-1" onclick="App.openMeetingFeedbackModal(${m.id}, '${m.meeting_title.replace(/'/g, "\\'")}', '${m.lead_name.replace(/'/g, "\\'")}', '${m.status}', '${(m.notes || '').replace(/'/g, "\\'").replace(/\n/g, ' ')}')" title="Record Feedback">
                                            <i class="fas fa-comment-dots mr-1"></i> Feedback
                                        </button>
                                        <button class="btn btn-warning btn-xs font-weight-bold" onclick="App.openRescheduleMeetingModal(${m.id}, '${m.meeting_title.replace(/'/g, "\\'")}', '${m.meeting_date}', '${m.meeting_time}')" title="Reschedule">
                                            <i class="fas fa-calendar-alt"></i>
                                        </button>
                                    </div>
                                    ${canPushToProject ? `
                                    <div>
                                        <button class="btn btn-success btn-xs font-weight-bold btn-block mt-1" onclick="App.openPushToProjectModal(${m.id}, '${m.lead_name.replace(/'/g, "\\'")}', '${m.lead_mobile}', '${m.lead_email || ''}')" title="Convert Meeting to Project">
                                            <i class="fas fa-rocket mr-1"></i> Push to Project Funnel
                                        </button>
                                    </div>` : ''}
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    openScheduleMeetingModal: function(preLeadId = null, preLeadName = '') {
        const types = this.meetingTypesList || [];

        const modalHtml = `
            <div class="modal fade" id="schedule-meeting-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-md" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-calendar-plus mr-2"></i> Schedule Client Demonstration / Meeting
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitScheduleMeeting(event)">
                            <div class="modal-body p-4">
                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Lead Record ID *</label>
                                    <input type="number" name="lead_id" class="form-control" value="${preLeadId || ''}" placeholder="Enter Lead ID (e.g. 1)" required>
                                    ${preLeadName ? `<small class="text-muted">Lead Name: <strong>${preLeadName}</strong></small>` : ''}
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Meeting Title *</label>
                                    <input type="text" name="meeting_title" class="form-control" placeholder="e.g. Product Demo & Commercials" required>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Meeting Type</label>
                                    <select name="meeting_type_id" class="form-control">
                                        ${types.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-row">
                                    <div class="col-md-7 mb-3">
                                        <label class="text-xs font-weight-bold text-muted">Date &amp; Time *</label>
                                        <input type="datetime-local" name="meeting_datetime" class="form-control" required>
                                    </div>
                                    <div class="col-md-5 mb-3">
                                        <label class="text-xs font-weight-bold text-muted">Platform</label>
                                        <select name="meeting_mode" class="form-control">
                                            <option value="Google Meet">Google Meet</option>
                                            <option value="Zoom">Zoom</option>
                                            <option value="In-Person">In-Person</option>
                                            <option value="Phone Call">Phone Call</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="text-xs font-weight-bold text-muted">Meeting Link (Optional)</label>
                                    <input type="url" name="meeting_link" class="form-control" placeholder="https://meet.google.com/xyz-1234">
                                </div>

                                <div class="form-group mb-0">
                                    <label class="text-xs font-weight-bold text-muted">Agenda / Discussion Notes</label>
                                    <textarea name="notes" class="form-control" rows="2" placeholder="Key topics to discuss..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-success font-weight-bold">
                                    <i class="fas fa-check-circle mr-1"></i> Book Meeting
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#schedule-meeting-modal').modal('show');
    },

    submitScheduleMeeting: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'schedule');

        const res = await fetch('api/meetings', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Meeting scheduled successfully!');
        if (data.success) {
            $('#schedule-meeting-modal').modal('hide');
            this.renderMeetings();
        }
    },

    openRescheduleMeetingModal: function(meetingId, currentTitle, currentDate, currentTime) {
        const modalHtml = `
            <div class="modal fade" id="reschedule-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-md" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-calendar-day mr-2"></i> Reschedule Meeting &bull; #${meetingId}
                            </h5>
                            <button type="button" class="close text-dark" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitRescheduleMeeting(event, ${meetingId})">
                            <div class="modal-body p-4">
                                <div class="alert alert-light border mb-3">
                                    <div class="font-weight-bold">${currentTitle}</div>
                                    <div class="text-xs text-muted">Currently scheduled for: <strong>${currentDate} ${currentTime ? currentTime.substring(0, 5) : ''}</strong></div>
                                </div>

                                <div class="form-row">
                                    <div class="col-md-7 mb-3">
                                        <label class="text-xs font-weight-bold text-muted">New Date *</label>
                                        <input type="date" name="meeting_date" class="form-control" required value="${currentDate}">
                                    </div>
                                    <div class="col-md-5 mb-3">
                                        <label class="text-xs font-weight-bold text-muted">New Time *</label>
                                        <input type="time" name="meeting_time" class="form-control" required value="${currentTime ? currentTime.substring(0, 5) : '11:00'}">
                                    </div>
                                </div>

                                <div class="form-group mb-0">
                                    <label class="text-xs font-weight-bold text-muted">Reason for Rescheduling *</label>
                                    <textarea name="notes" class="form-control" rows="2" placeholder="e.g. Client requested postponement to next week" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Close</button>
                                <button type="submit" class="btn btn-warning font-weight-bold text-dark">
                                    <i class="fas fa-save mr-1"></i> Confirm Reschedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#reschedule-modal').modal('show');
    },

    submitRescheduleMeeting: async function(e, meetingId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'reschedule');
        formData.append('id', meetingId);

        const res = await fetch('api/meetings', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Meeting rescheduled.');
        if (data.success) {
            $('#reschedule-modal').modal('hide');
            this.renderMeetings();
        }
    },

    updateMeetingStatus: async function(meetingId, status) {
        if (!confirm(`Are you sure you want to mark this meeting as ${status}?`)) return;

        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('id', meetingId);
        formData.append('status', status);

        const res = await fetch('api/meetings', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Status updated.');
        if (data.success) {
            this.renderMeetings();
        }
    },

    openMeetingFeedbackModal: function(meetingId, currentTitle, clientName, currentStatus = 'Completed', currentNotes = '') {
        const modalHtml = `
            <div class="modal fade" id="meeting-feedback-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-md" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-comment-dots mr-2"></i> Post-Meeting Feedback &bull; #${meetingId}
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitMeetingFeedback(event, ${meetingId})">
                            <div class="modal-body p-4">
                                <div class="alert alert-light border mb-3">
                                    <div class="font-weight-bold text-dark">${currentTitle}</div>
                                    <div class="text-xs text-muted">Client: <strong>${clientName}</strong></div>
                                </div>

                                <div class="form-group">
                                    <label class="modal-label-contrast">Meeting Status *</label>
                                    <select name="status" class="form-control" required>
                                        <option value="Completed" ${currentStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                        <option value="Rescheduled" ${currentStatus === 'Rescheduled' ? 'selected' : ''}>Rescheduled</option>
                                        <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                        <option value="No Show" ${currentStatus === 'No Show' ? 'selected' : ''}>No Show / Client Absent</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="modal-label-contrast">Meeting Outcome *</label>
                                    <select name="outcome" class="form-control font-weight-bold" required>
                                        <option value="Successful">Successful - High Buying Intent / Ready for Project</option>
                                        <option value="Needs Followup">Needs Follow-up / Evaluating Commercials</option>
                                        <option value="Not Interested">Not Interested / Unqualified</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div class="form-group mb-0">
                                    <label class="modal-label-contrast">Discussion Feedback &amp; Next Steps *</label>
                                    <textarea name="feedback" class="form-control" rows="3" placeholder="Enter key discussion highlights, client budget expectations, technical scope, or objections..." required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Close</button>
                                <button type="submit" class="btn btn-info font-weight-bold">
                                    <i class="fas fa-save mr-1"></i> Save Meeting Outcome
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#meeting-feedback-modal').modal('show');
    },

    submitMeetingFeedback: async function(e, meetingId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'record_feedback');
        formData.append('id', meetingId);

        const res = await fetch('api/meetings', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            $('#meeting-feedback-modal').modal('hide');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');
            this.renderMeetings();
            this.fetchNotifications();
            setTimeout(() => {
                alert(data.message || 'Meeting feedback recorded successfully!');
            }, 50);
        } else {
            alert(data.message || 'Failed to record meeting feedback.');
        }
    },

    openPushToProjectModal: function(meetingId, clientName, phone = '', email = '') {
        const modalHtml = `
            <div class="modal fade" id="push-project-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-md" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-rocket mr-2"></i> Push to Project Funnel
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onsubmit="App.submitPushToProject(event, ${meetingId})">
                            <div class="modal-body p-4">
                                <div class="alert alert-success border mb-3">
                                    <div class="font-weight-bold"><i class="fas fa-check-circle mr-1"></i> Converting Meeting #${meetingId} to Live Project</div>
                                    <div class="text-xs">Client: <strong>${clientName}</strong> &bull; Contact: <strong>${phone}</strong></div>
                                </div>

                                <div class="form-row">
                                    <div class="col-md-6 mb-3">
                                        <label class="modal-label-contrast">Project / Deal Amount (₹) *</label>
                                        <input type="number" step="0.01" min="1" name="final_amount" class="form-control" placeholder="e.g. 50000" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="modal-label-contrast">Advance Amount Received (₹)</label>
                                        <input type="number" step="0.01" min="0" name="advance_amount" class="form-control" placeholder="e.g. 15000" value="0">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="modal-label-contrast">Expected Delivery Date</label>
                                    <input type="date" name="expected_delivery_date" class="form-control">
                                </div>

                                <div class="form-group mb-0">
                                    <label class="modal-label-contrast">Project Scope &amp; Deliverables Notes</label>
                                    <textarea name="notes" class="form-control" rows="3" placeholder="Enter agreed deliverables, milestones, tech requirements..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-success font-weight-bold">
                                    <i class="fas fa-arrow-right mr-1"></i> Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#push-project-modal').modal('show');
    },

    submitPushToProject: async function(e, meetingId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'convert_meeting');
        formData.append('meeting_id', meetingId);

        const res = await fetch('api/projects', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            $('#push-project-modal').modal('hide');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');
            this.renderMeetings();
            this.fetchNotifications();
            setTimeout(() => {
                alert(data.message || `Project ${data.project_code || ''} generated successfully!`);
                if (App.currentUser && (App.currentUser.role_name === 'admin' || App.currentUser.role_name === 'manager' || App.currentUser.role_name === 'super_admin' || App.currentUser.role_id === 1 || App.currentUser.role_id === 2)) {
                    App.navigate('projects');
                }
            }, 50);
        } else {
            alert(data.message || 'Failed to convert meeting to project.');
        }
    },

    deleteLead: async function(id) {
        if (!confirm('Are you sure you want to archive/delete this lead?')) return;
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Lead action completed.');
        if (data.success) {
            this.renderLeads(this.leadsFilterState.page || 1);
        }
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
        if (this.currentUser && (this.currentUser.role_name === 'operation_executive' || this.currentUser.role_name === 'telecaller')) {
            alert('Permission denied: Only Administrators and Managers can add new leads.');
            return;
        }

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

    // Modal: Comprehensive Lead Details & Multi-Agent Audit Timeline Viewer
    openLeadDetailModal: async function(leadId) {
        const res = await fetch(`api/leads?action=detail&id=${leadId}`);
        const data = await res.json();
        if (!data.success) {
            alert(data.message || 'Unable to load lead details.');
            return;
        }

        const d = data.data || {};
        const l = d.lead || {};
        const calls = d.calls || [];
        const followups = d.followups || [];
        const meetings = d.meetings || [];
        const assignmentsHistory = d.assignments_history || [];

        // Build Unified Chronological Multi-Agent Timeline
        const timelineEvents = [];

        // 1. Add Call Logs
        calls.forEach(c => {
            const durMin = Math.floor(c.call_duration_seconds / 60);
            const durSec = c.call_duration_seconds % 60;
            const durText = `${durMin}m ${durSec}s`;
            timelineEvents.push({
                timestamp: c.called_at,
                agent: c.agent_name || 'Telecaller',
                type: 'call',
                icon: 'fas fa-phone-alt bg-primary text-white',
                header: `Call Logged by <strong>${c.agent_name || 'Telecaller'}</strong> &bull; <span class="badge badge-info">${c.outcome_name}</span> &bull; <span class="badge badge-light border"><i class="fas fa-stopwatch mr-1"></i>${durText}</span>`,
                body: `<div class="p-2 bg-light rounded border text-sm mt-1">"${c.remarks || 'No discussion remarks recorded'}"</div>`
            });
        });

        // 2. Add Ownership Reassignments
        assignmentsHistory.forEach(a => {
            timelineEvents.push({
                timestamp: a.assigned_at,
                agent: a.assigned_by_name || 'Admin',
                type: 'assignment',
                icon: 'fas fa-user-tag bg-warning text-dark',
                header: `<span class="badge badge-warning text-dark font-weight-bold">Lead Reassigned</span> by <strong>${a.assigned_by_name || 'Admin'}</strong>`,
                body: `<div class="p-2 border rounded bg-white text-sm mt-1">Transferred from <strong>${a.previous_agent || 'General Queue'}</strong> &rarr; <strong>${a.new_agent}</strong></div>`
            });
        });

        // 3. Add Follow-ups
        followups.forEach(f => {
            timelineEvents.push({
                timestamp: `${f.followup_date} ${f.followup_time || '10:00:00'}`,
                agent: f.agent_name || 'Telecaller',
                type: 'followup',
                icon: 'fas fa-clock bg-info text-white',
                header: `Follow-up Scheduled by <strong>${f.agent_name}</strong> &bull; <span class="badge badge-secondary">${f.status}</span>`,
                body: `<div class="text-sm mt-1"><strong>Purpose:</strong> ${f.purpose} ${f.notes ? `<div class="text-muted mt-1">${f.notes}</div>` : ''}</div>`
            });
        });

        // 4. Add Meetings
        meetings.forEach(m => {
            timelineEvents.push({
                timestamp: `${m.meeting_date} ${m.meeting_time || '11:00:00'}`,
                agent: m.agent_name || 'Telecaller',
                type: 'meeting',
                icon: 'fas fa-calendar-check bg-success text-white',
                header: `Demo / Meeting Booked by <strong>${m.agent_name}</strong> &bull; <span class="badge badge-success">${m.status}</span>`,
                body: `<div class="text-sm mt-1"><strong>${m.meeting_title}</strong> (${m.type_name || 'Demo'}) &bull; Platform: <span class="badge badge-light border">${m.meeting_mode || 'Google Meet'}</span>${m.notes ? `<div class="text-muted mt-1">${m.notes}</div>` : ''}</div>`
            });
        });

        // Sort descending by timestamp
        timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const modalHtml = `
            <div class="modal fade" id="lead-detail-modal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-xl" role="document">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title font-weight-bold">
                                <i class="fas fa-address-card mr-2"></i> ${l.name} &bull; Lead Audit &amp; Activity Center
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body p-0">
                            <!-- Nav tabs -->
                            <ul class="nav nav-tabs px-3 pt-2 bg-light" id="leadDetailTab" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active font-weight-bold" id="lead-overview-tab" data-toggle="tab" href="#tab-lead-overview" role="tab">
                                        <i class="fas fa-info-circle mr-1"></i> Lead Overview
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link font-weight-bold text-dark" id="lead-timeline-tab" data-toggle="tab" href="#tab-lead-timeline" role="tab">
                                        <i class="fas fa-history mr-1 text-primary"></i> Multi-Agent Audit Timeline (${timelineEvents.length})
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link font-weight-bold text-dark" id="lead-calls-tab" data-toggle="tab" href="#tab-lead-calls" role="tab">
                                        <i class="fas fa-phone-alt mr-1 text-success"></i> Call Logs (${calls.length})
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link font-weight-bold text-dark" id="lead-appointments-tab" data-toggle="tab" href="#tab-lead-appointments" role="tab">
                                        <i class="fas fa-calendar-alt mr-1 text-info"></i> Meetings &amp; Follow-ups (${meetings.length + followups.length})
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link font-weight-bold text-dark" id="lead-history-tab" data-toggle="tab" href="#tab-lead-history" role="tab">
                                        <i class="fas fa-user-tag mr-1 text-warning"></i> Ownership History (${assignmentsHistory.length})
                                    </a>
                                </li>
                            </ul>

                            <!-- Tab panes -->
                            <div class="tab-content p-4">
                                <!-- TAB 1: OVERVIEW -->
                                <div class="tab-pane fade show active" id="tab-lead-overview" role="tabpanel">
                                    <div class="row">
                                        <div class="col-md-6 border-right">
                                            <h6 class="text-uppercase text-xs font-weight-bold text-primary mb-3">Contact &amp; Personal Info</h6>
                                            <table class="table table-sm table-borderless">
                                                <tr>
                                                    <td class="text-muted text-xs" style="width: 140px;">Full Name:</td>
                                                    <td class="font-weight-bold">${l.name}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Primary Phone:</td>
                                                    <td class="font-weight-bold"><a href="tel:${l.mobile}"><i class="fas fa-phone mr-1 text-success"></i>${l.mobile}</a></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Alternate Mobile:</td>
                                                    <td>${l.alternate_mobile || '<span class="text-muted">-</span>'}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Email Address:</td>
                                                    <td>${l.email ? `<a href="mailto:${l.email}">${l.email}</a>` : '<span class="text-muted">-</span>'}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Company / Business:</td>
                                                    <td><strong>${l.company_name || 'Individual Client'}</strong></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Location / City:</td>
                                                    <td>${l.location || l.city || 'India'}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        <div class="col-md-6">
                                            <h6 class="text-uppercase text-xs font-weight-bold text-primary mb-3">CRM Status &amp; Assignments</h6>
                                            <table class="table table-sm table-borderless">
                                                <tr>
                                                    <td class="text-muted text-xs" style="width: 150px;">Current Status:</td>
                                                    <td><span class="badge badge-info p-2 font-weight-bold">${l.status_name}</span></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Assigned Telecaller:</td>
                                                    <td>
                                                        <span class="badge badge-light border p-2 font-weight-bold">${l.assigned_executive_name || l.assigned_name || 'Queue Pool (Unassigned)'}</span>
                                                        ${(this.currentUser && (this.currentUser.role_name === 'admin' || this.currentUser.role_name === 'super_admin' || this.currentUser.role_name === 'manager')) ? `
                                                            <button class="btn btn-outline-primary btn-xs ml-2 font-weight-bold" onclick="App.openQuickReassignModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', ${l.assigned_executive_id || 0})">
                                                                <i class="fas fa-user-edit mr-1"></i> Reassign
                                                            </button>
                                                        ` : ''}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Assigned Manager:</td>
                                                    <td><span class="badge badge-light border p-2">${l.assigned_manager_name || 'Not assigned'}</span></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Lead Source:</td>
                                                    <td><span class="badge badge-light border p-2">${l.source_name || 'Direct Inbound'}</span></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Priority:</td>
                                                    <td><span class="badge badge-${l.priority === 'high' ? 'danger' : 'secondary'} text-xs">${l.priority || 'Medium'}</span></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Created Date:</td>
                                                    <td class="text-xs text-muted">${l.created_at}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted text-xs">Last Contacted:</td>
                                                    <td class="text-xs font-weight-bold text-dark">${l.last_contacted_at || 'Never contacted'}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <!-- TAB 2: MULTI-AGENT AUDIT TIMELINE -->
                                <div class="tab-pane fade" id="tab-lead-timeline" role="tabpanel">
                                    <div class="alert alert-light border mb-3 text-xs text-muted">
                                        <i class="fas fa-info-circle mr-1 text-primary"></i> 
                                        <strong>Multi-Agent Audit Trail:</strong> Review remarks and calls logged by previous vs. currently assigned telecallers across lead reassignments.
                                    </div>
                                    <div style="max-height: 450px; overflow-y: auto;" class="pr-2">
                                        ${timelineEvents.length === 0 ? '<div class="text-center py-4 text-muted text-sm">No recorded call activities or reassignment events yet.</div>' : `
                                            <div class="timeline">
                                                ${timelineEvents.map(ev => `
                                                    <div>
                                                        <i class="${ev.icon}"></i>
                                                        <div class="timeline-item shadow-sm mb-3">
                                                            <span class="time text-xs"><i class="fas fa-clock mr-1"></i>${ev.timestamp}</span>
                                                            <h3 class="timeline-header font-weight-bold text-sm" style="border-bottom: 1px solid #f0f0f0;">
                                                                ${ev.header}
                                                            </h3>
                                                            <div class="timeline-body py-2">
                                                                ${ev.body}
                                                            </div>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                                <div>
                                                    <i class="fas fa-clock bg-gray"></i>
                                                </div>
                                            </div>
                                        `}
                                    </div>
                                </div>

                                <!-- TAB 3: CALL LOGS -->
                                <div class="tab-pane fade" id="tab-lead-calls" role="tabpanel">
                                    <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
                                        <table class="table table-bordered table-hover text-sm mb-0">
                                            <thead class="thead-light">
                                                <tr>
                                                    <th>Date &amp; Time</th>
                                                    <th>Telecaller Agent</th>
                                                    <th>Call Outcome</th>
                                                    <th>Duration</th>
                                                    <th>Discussion Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${calls.length === 0 ? '<tr><td colspan="5" class="text-center py-4 text-muted">No calls recorded.</td></tr>' : calls.map(c => `
                                                    <tr>
                                                        <td class="text-xs text-nowrap">${c.called_at}</td>
                                                        <td class="font-weight-bold">${c.agent_name}</td>
                                                        <td><span class="badge badge-info">${c.outcome_name}</span></td>
                                                        <td><span class="badge badge-light border"><i class="fas fa-stopwatch mr-1"></i>${Math.floor(c.call_duration_seconds / 60)}m ${c.call_duration_seconds % 60}s</span></td>
                                                        <td class="text-xs">${c.remarks || '-'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- TAB 4: MEETINGS & FOLLOWUPS -->
                                <div class="tab-pane fade" id="tab-lead-appointments" role="tabpanel">
                                    <h6 class="font-weight-bold text-primary mb-2"><i class="fas fa-calendar-alt mr-1"></i> Scheduled Demonstrations &amp; Meetings</h6>
                                    <div class="table-responsive mb-4">
                                        <table class="table table-bordered table-hover text-sm mb-0">
                                            <thead class="thead-light">
                                                <tr>
                                                    <th>Title</th>
                                                    <th>Date &amp; Time</th>
                                                    <th>Platform</th>
                                                    <th>Agent</th>
                                                    <th>Status</th>
                                                    <th class="text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${meetings.length === 0 ? '<tr><td colspan="6" class="text-center py-3 text-muted text-xs">No meetings scheduled for this lead.</td></tr>' : meetings.map(m => `
                                                    <tr>
                                                        <td><strong>${m.meeting_title}</strong></td>
                                                        <td>${m.meeting_date} ${m.meeting_time ? m.meeting_time.substring(0, 5) : ''}</td>
                                                        <td><span class="badge badge-light border">${m.meeting_mode || 'Google Meet'}</span></td>
                                                        <td>${m.agent_name}</td>
                                                        <td><span class="badge badge-primary">${m.status}</span></td>
                                                        <td class="text-center">
                                                            <button class="btn btn-warning btn-xs font-weight-bold" onclick="$('#lead-detail-modal').modal('hide'); App.openRescheduleMeetingModal(${m.id}, '${m.meeting_title.replace(/'/g, "\\'")}', '${m.meeting_date}', '${m.meeting_time}')">
                                                                Reschedule
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>

                                    <h6 class="font-weight-bold text-info mb-2"><i class="fas fa-clock mr-1"></i> Call Follow-ups</h6>
                                    <div class="table-responsive">
                                        <table class="table table-bordered table-hover text-sm mb-0">
                                            <thead class="thead-light">
                                                <tr>
                                                    <th>Date &amp; Time</th>
                                                    <th>Purpose</th>
                                                    <th>Agent</th>
                                                    <th>Status</th>
                                                    <th>Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${followups.length === 0 ? '<tr><td colspan="5" class="text-center py-3 text-muted text-xs">No pending follow-ups.</td></tr>' : followups.map(f => `
                                                    <tr>
                                                        <td>${f.followup_date} ${f.followup_time ? f.followup_time.substring(0, 5) : ''}</td>
                                                        <td><strong>${f.purpose}</strong></td>
                                                        <td>${f.agent_name}</td>
                                                        <td><span class="badge badge-secondary">${f.status}</span></td>
                                                        <td class="text-xs text-muted">${f.notes || '-'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- TAB 5: OWNERSHIP HISTORY -->
                                <div class="tab-pane fade" id="tab-lead-history" role="tabpanel">
                                    <div class="table-responsive">
                                        <table class="table table-bordered table-hover text-sm mb-0">
                                            <thead class="thead-light">
                                                <tr>
                                                    <th>#</th>
                                                    <th>Previous Telecaller</th>
                                                    <th>New Assigned Telecaller</th>
                                                    <th>Reassigned By</th>
                                                    <th>Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${assignmentsHistory.length === 0 ? '<tr><td colspan="5" class="text-center py-4 text-muted">No ownership transfer history. Assigned directly to current telecaller.</td></tr>' : assignmentsHistory.map((a, i) => `
                                                    <tr>
                                                        <td>${i + 1}</td>
                                                        <td><span class="badge badge-secondary">${a.previous_agent || 'Unassigned Queue'}</span></td>
                                                        <td><span class="badge badge-success font-weight-bold">${a.new_agent}</span></td>
                                                        <td><strong>${a.assigned_by_name || 'System Admin'}</strong></td>
                                                        <td class="text-xs text-muted">${a.assigned_at}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-default font-weight-bold" data-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary font-weight-bold" onclick="$('#lead-detail-modal').modal('hide'); App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.phone || l.mobile}', ${l.status_id})">
                                <i class="fas fa-phone-alt mr-1"></i> Call Lead Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#global-modal-container').html(modalHtml);
        $('#lead-detail-modal').modal('show');
    },

    openQuickReassignModal: function(leadId, leadName, currentExecId) {
        const users = (this.dropdowns.users || []).filter(u => u.status === 'active' || !u.status);
        const modalHtml = `
            <div class="modal fade" id="quick-reassign-modal" tabindex="-1" role="dialog" style="z-index: 1060;">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-header bg-warning text-dark py-2 px-3">
                            <h6 class="modal-title font-weight-bold mb-0">
                                <i class="fas fa-user-edit mr-1"></i> Reassign Lead: ${leadName}
                            </h6>
                            <button type="button" class="close" data-dismiss="modal">&times;</button>
                        </div>
                        <div class="modal-body p-3">
                            <p class="text-xs text-muted mb-3">
                                Transfer lead ownership to another telecaller. All previous call logs and notes will remain intact in the audit timeline.
                            </p>
                            <div class="form-group mb-2">
                                <label class="text-xs font-weight-bold">Select New Telecaller / Agent *</label>
                                <select id="reassign-target-exec-id" class="form-control form-control-sm font-weight-bold">
                                    <option value="">-- Choose Telecaller --</option>
                                    ${users.map(u => `
                                        <option value="${u.id}" ${u.id == currentExecId ? 'disabled' : ''}>
                                            ${u.name} (${u.role_display || u.role_name || 'Staff'}) ${u.id == currentExecId ? '• [Currently Assigned]' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer bg-light py-2 px-3 d-flex justify-content-between">
                            <button type="button" class="btn btn-default btn-sm font-weight-bold" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-warning btn-sm font-weight-bold" onclick="App.submitQuickReassign(${leadId})">
                                <i class="fas fa-check-circle mr-1"></i> Confirm Transfer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#quick-reassign-modal').remove();
        $('body').append(modalHtml);
        $('#quick-reassign-modal').modal('show');
    },

    submitQuickReassign: async function(leadId) {
        const select = document.getElementById('reassign-target-exec-id');
        const execId = select ? select.value : '';
        if (!execId) {
            alert('Please select a telecaller to transfer the lead to.');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'assign');
        formData.append('executive_id', execId);
        formData.append('lead_ids[]', leadId);

        try {
            const res = await fetch('api/leads', { method: 'POST', body: formData });
            const data = await res.json();
            alert(data.message || 'Lead reassigned successfully!');
            if (data.success) {
                $('#quick-reassign-modal').modal('hide');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open').css('padding-right', '');
                $('#lead-detail-modal').modal('hide');
                if (this.currentView === 'leads') this.renderLeads(this.leadsFilterState.page || 1);
                else if (this.currentView === 'workspace') this.renderWorkspace();
                this.openLeadDetailModal(leadId);
            }
        } catch (err) {
            alert('Failed to reassign lead: ' + err.message);
        }
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

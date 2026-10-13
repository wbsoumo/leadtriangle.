/* assets/js/app.js - SPA AJAX Application Controller for LeadTriangle CRM */

const App = {
    currentUser: null,
    currentView: 'dashboard',
    dropdowns: {},

    init: async function() {
        console.log('LeadTriangle System v1.0.2 Live - Git Pipeline Test Passed');
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadDropdowns();
            this.autoRegisterWebToken();
            this.bindEvents();
            this.navigate(this.currentView);
            this.startActiveCallPolling();
        }
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
            if (data.success && data.data && data.data.length > 0) {
                const latest = data.data[0];
                if (this.lastSeenNotifId > 0 && latest.id > this.lastSeenNotifId) {
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification(latest.title, {
                            body: latest.message
                        });
                    }
                }
                this.lastSeenNotifId = latest.id;
            }
        } catch(e) {}
    },

    checkActiveCall: async function() {
        if (!this.currentUser) return;
        try {
            const res = await fetch('api/calls?action=get_active_call');
            const data = await res.json();
            const existingBanner = document.getElementById('active-call-banner');

            if (data.success && data.active_call && data.data) {
                const call = data.data;

                // Create or update floating banner
                if (!existingBanner) {
                    const banner = document.createElement('div');
                    banner.id = 'active-call-banner';
                    banner.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: #ffffff; border: 2px solid #2563eb; border-radius: 16px; padding: 16px 20px; box-shadow: 0 10px 30px rgba(37,99,235,0.25); z-index: 9999; display: flex; align-items: center; gap: 14px; animation: slideUp 0.3s ease-out;';
                    banner.innerHTML = `
                        <div style="width: 42px; height: 42px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; animation: pulse 1.5s infinite;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">Live Phone Call Active</div>
                            <div style="font-size: 14.5px; font-weight: 800; color: #0f172a;" id="banner-lead-name">${call.lead_name}</div>
                            <div style="font-size: 12px; color: #64748b;" id="banner-lead-phone">${call.phone} • Status: <span style="font-weight:700; color:#2563eb;">${call.lead_status || 'In Progress'}</span></div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-left: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${call.lead_id}, '${call.lead_name.replace(/'/g, "\\'")}', '${call.phone}', ${call.lead_status_id || 0})">Update Lead Status</button>
                        </div>
                    `;
                    document.body.appendChild(banner);
                } else {
                    document.getElementById('banner-lead-name').innerText = call.lead_name;
                    document.getElementById('banner-lead-phone').innerHTML = `${call.phone} • Status: <span style="font-weight:700; color:#2563eb;">${call.lead_status || 'In Progress'}</span>`;
                }

                // Automatically trigger popup modal if not already open on dashboard screen
                if (!document.getElementById('call-modal')) {
                    this.openCallModal(call.lead_id, call.lead_name, call.phone, call.lead_status_id, call.statuses, call.outcomes);
                }
            } else if (existingBanner) {
                existingBanner.remove();
            }
        } catch(e) {}
    },

    checkAuth: async function() {
        try {
            const res = await fetch('api/auth?action=check');
            const data = await res.json();
            if (data.success && data.data && data.data.is_logged_in) {
                this.currentUser = data.data.user;
                this.renderUserUI();
            } else {
                if (data.data?.need_install) {
                    this.renderLogin(data.message);
                } else {
                    window.location.href = '/login';
                }
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

    renderUserUI: function() {
        document.getElementById('user-name-display').innerText = this.currentUser.name;
        document.getElementById('user-role-display').innerText = this.currentUser.role_display;
        document.getElementById('user-avatar').innerText = this.currentUser.name.charAt(0).toUpperCase();
        
        if (this.currentUser.role_name === 'operation_executive') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }

        // Apply page-level permissions filtering for sidebar items
        if (this.currentUser.allowed_pages && this.currentUser.role_name !== 'super_admin') {
            const allowed = this.currentUser.allowed_pages.split(',').map(s => s.trim());
            // Always ensure core workspace and dashboard views are available to all active operators
            if (!allowed.includes('workspace')) allowed.push('workspace');
            if (!allowed.includes('dashboard')) allowed.push('dashboard');

            document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
                const view = item.getAttribute('data-view');
                if (view && !allowed.includes(view)) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'flex';
                }
            });
        }
    },

    toggleSidebar: function() {
        const sidebar = document.getElementById('main-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const icon = document.getElementById('collapse-icon');

        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        } else {
            sidebar.classList.toggle('collapsed');
            if (icon) {
                icon.innerText = sidebar.classList.contains('collapsed') ? '▶' : '◀';
            }
        }
    },

    renderLogin: function(warningMsg = null) {
        let warningBanner = '';
        if (warningMsg) {
            warningBanner = `
                <div style="background: #fffbe8; border: 1px solid #ffe58f; padding: 12px 14px; border-radius: 8px; font-size: 12.5px; color: #b45309; margin-bottom: 20px; line-height: 1.4;">
                    ${warningMsg}
                    <div style="margin-top: 6px;"><a href="install.php" style="color: #4f46e5; font-weight: 700; text-decoration: underline;">Click here to run One-Click Setup Installer</a></div>
                </div>
            `;
        }

        document.getElementById('app').innerHTML = `
            <div style="width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc;">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 36px; width: 100%; max-width: 440px; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.08);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <img src="assets/images/logo.png" alt="LeadTriangle Logo" style="width: 44px; height: 44px; object-fit: contain; border-radius: 10px;">
                        <div>
                            <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">Leadstriangle CRM</div>
                            <div style="font-size: 12px; color: #64748b;">Internal Operations Portal</div>
                        </div>
                    </div>

                    ${warningBanner}

                    <form id="login-form" onsubmit="App.handleLogin(event)">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Email Address</label>
                            <input type="email" id="login-email" required placeholder="name@company.com" style="width: 100%; padding: 11px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13.5px; outline: none;">
                        </div>
                        <div style="margin-bottom: 24px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Password</label>
                            <input type="password" id="login-pass" required placeholder="••••••••" style="width: 100%; padding: 11px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13.5px; outline: none;">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; justify-content: center; font-size: 14.5px;">Sign In to Dashboard →</button>
                    </form>
                </div>
            </div>
        `;
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;

        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('email', email);
        formData.append('password', password);

        const res = await fetch('api/auth', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            window.location.reload();
        } else {
            alert(data.message);
        }
    },

    logout: async function() {
        await fetch('api/auth?action=logout');
        window.location.href = '/login';
    },

    bindEvents: function() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                if (view) this.navigate(view);
            });
        });

        window.addEventListener('popstate', () => {
            const path = window.location.pathname.replace(/^\/+/, '');
            const view = path || 'dashboard';
            this.navigate(view, false);
        });

        const initialPath = window.location.pathname.replace(/^\/+/, '');
        if (initialPath && initialPath !== 'index.php') {
            this.currentView = initialPath;
        }
    },

    navigate: function(view, updateHistory = true) {
        this.currentView = view;

        // Auto close mobile sidebar when navigating
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('main-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.menu-item[data-view="${view}"]`);
        if (activeItem) activeItem.classList.add('active');

        if (updateHistory && window.location.pathname !== '/' + view) {
            history.pushState({ view: view }, '', '/' + view);
        }

        const container = document.getElementById('content-viewport');
        container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Loading module...</div>';

        if (view === 'dashboard') this.renderDashboard();
        else if (view === 'workspace') this.renderWorkspace();
        else if (view === 'leads') this.renderLeads();
        else if (view === 'calling_queue' || view === 'calling-queue') this.renderCallingQueue({ quick_filter: 'new' });
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

    // 1. DASHBOARD MODULE
    renderDashboard: async function() {
        const res = await fetch('api/dashboard?date_filter=this_month');
        const data = await res.json();
        if (!data.success) return;

        const d = data.data;
        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title" style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Dashboard</div>
                    <div class="page-subtitle" style="font-size: 14px; color: #64748b; margin-top: 3px;">Welcome back to your operations and sales portal</div>
                </div>
                <div class="header-actions">
                    <select class="filter-select" onchange="App.filterDashboard(this.value)" style="border-radius: 10px; padding: 8px 14px; font-weight: 600; border-color: #cbd5e1;">
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month" selected>This Month</option>
                        <option value="last_month">Last Month</option>
                    </select>
                </div>
            </div>

            <!-- TOP 4 KPI CARDS MATCHING REFERENCE DESIGN -->
            <div class="kpi-grid">
                
                <!-- CARD 1: TOTAL SALES -->
                <div onclick="App.navigate('projects')" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: #16a34a; font-weight: 700; font-size: 13px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Total Sales / Revenue</div>
                        <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; margin-bottom: 6px;">₹${parseFloat(d.total_project_value || 0).toLocaleString('en-IN')}</div>
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">${d.completed_projects || 0} completed projects →</div>
                    </div>
                </div>

                <!-- CARD 2: TOTAL LEADS / ACTIVE USERS -->
                <div onclick="App.navigate('workspace')" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: #16a34a; font-weight: 700; font-size: 13px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Active Prospects / Leads</div>
                        <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; margin-bottom: 6px;">${d.total_leads.toLocaleString()}</div>
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">+${d.new_leads_today} new today &bull; Open Workspace →</div>
                    </div>
                </div>

                <!-- CARD 3: CALLS MADE TODAY -->
                <div onclick="App.renderLeads(1, { filter: 'called' })" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #faf5ff; color: #9333ea; display: flex; align-items: center; justify-content: center;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: #16a34a; font-weight: 700; font-size: 13px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Calls Made Today</div>
                        <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; margin-bottom: 6px;">${d.calls_today}</div>
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">${d.connected_calls} connected calls →</div>
                    </div>
                </div>

                <!-- CARD 4: QUALIFIED LEADS / ACTIVE PROJECTS -->
                <div onclick="App.navigate('projects')" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: #16a34a; font-weight: 700; font-size: 13px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Qualified / Ongoing Projects</div>
                        <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; margin-bottom: 6px;">${d.qualified_leads || d.ongoing_projects}</div>
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">${d.rates.qualification_rate}% conversion rate →</div>
                    </div>
                </div>

            </div>

            <!-- MAIN DUAL COLUMN DASHBOARD GRID -->
            <div class="dashboard-grid">
                
                <!-- LEFT COLUMN: RECENT ACTIVITY & LEADERBOARD -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    
                    <!-- RECENT ACTIVITY CARD -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">Recent Activity</div>
                            <a onclick="App.navigate('calling_queue')" style="color: #2563eb; font-size: 13.5px; font-weight: 700; text-decoration: none; cursor: pointer;">View log</a>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            ${d.recent_activities && d.recent_activities.length > 0 ? d.recent_activities.map(act => `
                                <div onclick="App.navigate('calling_queue')" style="display: flex; align-items: center; gap: 14px; cursor: pointer; padding: 8px; border-radius: 10px; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                                    <div style="width: 40px; height: 40px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                        <svg style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${act.title}</div>
                                        <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">${act.description}</div>
                                    </div>
                                    <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">${act.mins_ago < 60 ? (act.mins_ago <= 1 ? 'Just now' : act.mins_ago + ' min ago') : Math.floor(act.mins_ago / 60) + ' hrs ago'}</div>
                                </div>
                            `).join('') : '<div style="color:#64748b; font-size:13px; text-align:center; padding:16px;">No recent call activity logged today yet.</div>'}
                        </div>
                    </div>

                    <!-- TELECALLING LEADERBOARD -->
                    ${d.employee_performance && d.employee_performance.length > 0 ? `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">Telecalling Team Leaderboard</div>
                            <div class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Executive</th>
                                            <th>Assigned</th>
                                            <th>Calls</th>
                                            <th>Connected</th>
                                            <th>Followups</th>
                                            <th>Qualified</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${d.employee_performance.map(emp => `
                                            <tr onclick="App.navigate('calling_queue')" style="cursor: pointer;">
                                                <td>
                                                    <div style="display:flex; align-items:center; gap:10px;">
                                                        <div style="width:32px; height:32px; border-radius:50%; background:#2563eb; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${emp.name.charAt(0)}</div>
                                                        <div>
                                                            <div style="font-weight:700; color:#0f172a;">${emp.name}</div>
                                                            <small style="color:#64748b;">${emp.email}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>${emp.total_leads}</td>
                                                <td><span class="badge badge-blue">${emp.calls_today}</span></td>
                                                <td>${emp.connected_calls}</td>
                                                <td>${emp.followups_today}</td>
                                                <td><span class="badge badge-green">${emp.qualified_leads}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}

                </div>

                <!-- RIGHT COLUMN: QUICK STATS PROGRESS BARS -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    
                    <!-- QUICK STATS CARD MATCHING SCREENSHOT -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
                        <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 20px;">Quick Stats</div>
                        
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            
                            <div onclick="App.navigate('funnel')" style="cursor: pointer;">
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                    <span>Conversion Rate</span>
                                    <span style="font-weight: 800; color: #0f172a;">${d.rates.qualification_rate}%</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                                    <div style="width: ${Math.min(d.rates.qualification_rate * 5, 100)}%; height: 100%; background: #2563eb; border-radius: 9999px;"></div>
                                </div>
                            </div>

                            <div onclick="App.navigate('calling_queue')" style="cursor: pointer;">
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                    <span>Connected Call Ratio</span>
                                    <span style="font-weight: 800; color: #0f172a;">${d.calls_today > 0 ? Math.round((d.connected_calls/d.calls_today)*100) : 45}%</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                                    <div style="width: ${d.calls_today > 0 ? Math.round((d.connected_calls/d.calls_today)*100) : 45}%; height: 100%; background: #f97316; border-radius: 9999px;"></div>
                                </div>
                            </div>

                            <div onclick="App.navigate('followups')" style="cursor: pointer;">
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                    <span>Follow-up Completion</span>
                                    <span style="font-weight: 800; color: #0f172a;">87%</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                                    <div style="width: 87%; height: 100%; background: #16a34a; border-radius: 9999px;"></div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- TOP SERVICES / CONVERSIONS CARD -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
                        <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">Top Services</div>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div onclick="App.navigate('leads')" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 12px; cursor: pointer;">
                                <span style="font-size: 13.5px; font-weight: 600; color: #0f172a;">BPO Telecalling Service</span>
                                <span class="badge badge-blue">42 Leads</span>
                            </div>
                            <div onclick="App.navigate('leads')" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 12px; cursor: pointer;">
                                <span style="font-size: 13.5px; font-weight: 600; color: #0f172a;">Lead Generation Campaign</span>
                                <span class="badge badge-green">28 Leads</span>
                            </div>
                            <div onclick="App.navigate('leads')" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 12px; cursor: pointer;">
                                <span style="font-size: 13.5px; font-weight: 600; color: #0f172a;">Customer Support Process</span>
                                <span class="badge badge-amber">19 Leads</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    filterDashboard: async function(val) {
        const res = await fetch(`api/dashboard?date_filter=${val}`);
        const data = await res.json();
        if (data.success) {
            this.renderDashboard();
        }
    },

    openCreateLeadModal: async function() {
        if (document.getElementById('create-lead-modal')) return;

        if (!this.dropdowns || !this.dropdowns.sources || !this.dropdowns.services) {
            await this.loadDropdowns();
        }

        const sources = this.dropdowns?.sources || [];
        const services = this.dropdowns?.services || [];
        const executives = this.dropdowns?.executives || [];
        const managers = this.dropdowns?.managers || [];
        const modalHtml = `
            <div class="modal-backdrop show" id="create-lead-modal">
                <div class="modal-box" style="max-width: 620px; border-radius: 18px; border-top: 4px solid var(--primary); padding: 24px;">
                    <div class="modal-header" style="border-bottom:1px solid #f1f5f9; padding-bottom:14px;">
                        <div class="modal-title" style="font-size:18px; font-weight:800; color:#0f172a;">Create New Lead</div>
                        <button class="close-modal" onclick="App.closeModal('create-lead-modal')">✕</button>
                    </div>
                    <form onsubmit="App.submitCreateLead(event)" style="margin-top:16px;">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">Lead Full Name *</label>
                                <input type="text" id="new-lead-name" required class="filter-input" style="width:100%;" placeholder="e.g. Rajesh Kumar">
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">Mobile Number *</label>
                                <input type="tel" id="new-lead-mobile" required class="filter-input" style="width:100%;" placeholder="10-digit mobile number">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Email Address</label>
                                <input type="email" id="new-lead-email" class="filter-input" style="width:100%;" placeholder="client@example.com">
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Company Name</label>
                                <input type="text" id="new-lead-company" class="filter-input" style="width:100%;" placeholder="e.g. Apex Enterprises">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">City / Location</label>
                                <input type="text" id="new-lead-city" class="filter-input" style="width:100%;" placeholder="e.g. Mumbai">
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Priority</label>
                                <select id="new-lead-priority" class="filter-select" style="width:100%;">
                                    <option value="High">High Priority</option>
                                    <option value="Medium" selected>Medium Priority</option>
                                    <option value="Low">Low Priority</option>
                                </select>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Service Requested</label>
                                <select id="new-lead-service" class="filter-select" style="width:100%;">
                                    <option value="">Select Service...</option>
                                    ${services.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Lead Source</label>
                                <select id="new-lead-source" class="filter-select" style="width:100%;">
                                    <option value="">Select Source...</option>
                                    ${sources.map(src => `<option value="${src.id}">${src.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Assign Manager</label>
                                <select id="new-lead-manager" class="filter-select" style="width:100%;">
                                    <option value="">Unassigned</option>
                                    ${managers.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Assign Calling Executive</label>
                                <select id="new-lead-executive" class="filter-select" style="width:100%;">
                                    <option value="">Unassigned</option>
                                    ${executives.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom:18px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Initial Remark / Requirements</label>
                            <textarea id="new-lead-remark" class="filter-input" style="width:100%; height:60px; padding:10px;" placeholder="Brief details about client needs..."></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:12px; font-weight:800; border-radius:10px;">Create Lead Record</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    submitCreateLead: async function(e) {
        e.preventDefault();
        const name = document.getElementById('new-lead-name').value;
        const mobile = document.getElementById('new-lead-mobile').value;
        const email = document.getElementById('new-lead-email').value;
        const company = document.getElementById('new-lead-company').value;
        const city = document.getElementById('new-lead-city').value;
        const priority = document.getElementById('new-lead-priority').value;
        const serviceId = document.getElementById('new-lead-service').value;
        const sourceId = document.getElementById('new-lead-source').value;
        const managerId = document.getElementById('new-lead-manager').value;
        const executiveId = document.getElementById('new-lead-executive').value;
        const remark = document.getElementById('new-lead-remark').value;

        const formData = new FormData();
        formData.append('action', 'create');
        formData.append('name', name);
        formData.append('mobile', mobile);
        formData.append('email', email);
        formData.append('company_name', company);
        formData.append('city', city);
        formData.append('priority', priority);
        formData.append('service_id', serviceId);
        formData.append('lead_source_id', sourceId);
        formData.append('assigned_manager_id', managerId);
        formData.append('assigned_executive_id', executiveId);
        formData.append('initial_remark', remark);

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);

        if (data.success) {
            this.closeModal('create-lead-modal');
            this.navigate(this.currentView || 'leads');
        }
    },

    // 1b. GOOGLE SHEETS-STYLE SPREADSHEET WORKSPACE MODULE
    workspaceFilterState: {
        page: 1,
        limit: 25,
        search: '',
        status_name: '',
        row_color: '',
        followup_date: '',
        filter: '',
        sort_by: 'id',
        sort_order: 'DESC'
    },

    renderWorkspace: async function(page = null, newFilters = null) {
        if (!this.dropdowns || !this.dropdowns.statuses) {
            await this.loadDropdowns();
        }

        if (page !== null) {
            this.workspaceFilterState.page = page;
        }
        if (newFilters !== null) {
            this.workspaceFilterState = { ...this.workspaceFilterState, ...newFilters };
        }

        const state = this.workspaceFilterState;
        let query = `action=list&page=${state.page}&limit=${state.limit}&sort_by=${state.sort_by}&sort_order=${state.sort_order}`;
        if (state.search) query += `&search=${encodeURIComponent(state.search)}`;
        if (state.status_name) query += `&status_name=${encodeURIComponent(state.status_name)}`;
        if (state.row_color) query += `&row_color=${encodeURIComponent(state.row_color)}`;
        if (state.followup_date) query += `&followup_date=${encodeURIComponent(state.followup_date)}`;
        if (state.filter) query += `&filter=${encodeURIComponent(state.filter)}`;

        // Fetch leads for workspace
        const res = await fetch(`api/leads?${query}`);
        const data = await res.json();
        if (!data.success) return;

        const leads = data.data.leads || [];
        const p = data.data.pagination || { page: 1, limit: 25, total: 0, total_pages: 1 };

        // Fetch followups for dedicated section below workspace
        const fuRes = await fetch('api/followups?action=list&filter=all');
        const fuData = await fuRes.json();
        const allFollowups = fuData.success && fuData.data ? fuData.data : [];

        // Categorize follow-ups
        const todayStr = new Date().toISOString().split('T')[0];
        const todayFu = allFollowups.filter(f => f.followup_date === todayStr && f.status === 'Pending');
        const upcomingFu = allFollowups.filter(f => f.followup_date > todayStr && f.status === 'Pending');
        const overdueFu = allFollowups.filter(f => f.followup_date < todayStr && f.status === 'Pending');
        const completedFu = allFollowups.filter(f => f.status === 'Completed');

        // Color helper
        const getRowColorClass = (color) => {
            if (!color) return '';
            const c = color.toLowerCase();
            if (c.includes('blue') || c === '#3b82f6' || c === '#2563eb' || c === '#eff6ff') return 'workspace-row-color-blue';
            if (c.includes('green') || c === '#10b981' || c === '#16a34a' || c === '#f0fdf4') return 'workspace-row-color-green';
            if (c.includes('amber') || c === '#f59e0b' || c === '#fefce8') return 'workspace-row-color-amber';
            if (c.includes('yellow') || c === '#eab308' || c === '#fef9c3') return 'workspace-row-color-yellow';
            if (c.includes('orange') || c === '#f97316' || c === '#fff7ed') return 'workspace-row-color-orange';
            if (c.includes('red') || c === '#ef4444' || c === '#dc2626' || c === '#fef2f2') return 'workspace-row-color-red';
            if (c.includes('purple') || c === '#8b5cf6' || c === '#9333ea' || c === '#faf5ff') return 'workspace-row-color-purple';
            if (c.includes('gray') || c === '#6b7280' || c === '#f8fafc') return 'workspace-row-color-gray';
            return '';
        };

        const getStatusPillClass = (statusName) => {
            if (!statusName) return 'status-New';
            return 'status-' + statusName.replace(/\s+/g, '-');
        };

        let html = `
            <div class="workspace-wrapper">
                <!-- TOP HEADER -->
                <div class="page-header" style="margin-bottom:0;">
                    <div>
                        <div class="page-title" style="display:flex; align-items:center; gap:10px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                            User Workspace
                            <span class="badge badge-blue" style="font-size:12px; font-weight:800; padding:4px 10px;">Google Sheets View</span>
                        </div>
                        <div class="page-subtitle">Admin-uploaded lead roster &bull; Quick dispositions, color tagging, fast dialing &amp; scheduled follow-ups</div>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary btn-sm" onclick="App.renderWorkspace(1, {})" title="Refresh Workspace">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Refresh
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="App.exportLeadsCsv()">Export CSV</button>
                    </div>
                </div>

                <!-- ADVANCED SPREADSHEET TOOLBAR & FILTERS -->
                <div class="workspace-toolbar">
                    <div class="workspace-filters-bar">
                        <!-- Search Box -->
                        <div style="position:relative; width:220px;">
                            <input type="text" id="ws-search-input" class="filter-input" style="width:100%; padding-left:32px; font-size:13px;" placeholder="Search name, phone..." value="${state.search}" onkeyup="if(event.key==='Enter') App.renderWorkspace(1, {search: this.value})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute; left:10px; top:10px; color:#94a3b8;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="App.renderWorkspace(1, {search: document.getElementById('ws-search-input').value})">Filter</button>

                        <!-- Lead Type / State Filter -->
                        <select class="filter-select" style="font-size:12.5px; font-weight:600;" onchange="App.renderWorkspace(1, {filter: this.value})">
                            <option value="" ${!state.filter ? 'selected' : ''}>All Types</option>
                            <option value="unconnected" ${state.filter === 'unconnected' ? 'selected' : ''}>Unconnected Leads</option>
                            <option value="to_call" ${state.filter === 'to_call' ? 'selected' : ''}>Pending To Call</option>
                            <option value="called" ${state.filter === 'called' ? 'selected' : ''}>Already Contacted</option>
                            <option value="followups" ${state.filter === 'followups' ? 'selected' : ''}>Has Follow-up</option>
                        </select>

                        <!-- Lead Status / Disposition Filter -->
                        <select class="filter-select" style="font-size:12.5px; font-weight:600;" onchange="App.renderWorkspace(1, {status_name: this.value})">
                            <option value="" ${!state.status_name ? 'selected' : ''}>All Statuses</option>
                            <option value="New" ${state.status_name === 'New' ? 'selected' : ''}>New</option>
                            <option value="Calling" ${state.status_name === 'Calling' ? 'selected' : ''}>Calling</option>
                            <option value="Connected" ${state.status_name === 'Connected' ? 'selected' : ''}>Connected</option>
                            <option value="Not Interested" ${state.status_name === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
                            <option value="Follow-up Needed" ${state.status_name === 'Follow-up Needed' ? 'selected' : ''}>Follow-up Needed</option>
                            <option value="Ringing" ${state.status_name === 'Ringing' ? 'selected' : ''}>Ringing</option>
                            <option value="Not Responding" ${state.status_name === 'Not Responding' ? 'selected' : ''}>Not Responding</option>
                            <option value="Invalid Number" ${state.status_name === 'Invalid Number' ? 'selected' : ''}>Invalid Number</option>
                        </select>

                        <!-- Row Color Filter -->
                        <select class="filter-select" style="font-size:12.5px; font-weight:600;" onchange="App.renderWorkspace(1, {row_color: this.value})">
                            <option value="" ${!state.row_color ? 'selected' : ''}>All Row Colors</option>
                            <option value="none" ${state.row_color === 'none' ? 'selected' : ''}>No Color</option>
                            <option value="blue" ${state.row_color === 'blue' ? 'selected' : ''}>Blue</option>
                            <option value="green" ${state.row_color === 'green' ? 'selected' : ''}>Green</option>
                            <option value="amber" ${state.row_color === 'amber' ? 'selected' : ''}>Amber / Yellow</option>
                            <option value="orange" ${state.row_color === 'orange' ? 'selected' : ''}>Orange</option>
                            <option value="red" ${state.row_color === 'red' ? 'selected' : ''}>Red</option>
                            <option value="purple" ${state.row_color === 'purple' ? 'selected' : ''}>Purple</option>
                            <option value="gray" ${state.row_color === 'gray' ? 'selected' : ''}>Gray</option>
                        </select>

                        <!-- Follow-up Date Filter -->
                        <select class="filter-select" style="font-size:12.5px; font-weight:600;" onchange="App.renderWorkspace(1, {followup_date: this.value})">
                            <option value="" ${!state.followup_date ? 'selected' : ''}>All Follow-up Dates</option>
                            <option value="today" ${state.followup_date === 'today' ? 'selected' : ''}>Today</option>
                            <option value="upcoming" ${state.followup_date === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                            <option value="overdue" ${state.followup_date === 'overdue' ? 'selected' : ''}>Overdue</option>
                            <option value="has_followup" ${state.followup_date === 'has_followup' ? 'selected' : ''}>Any Scheduled</option>
                        </select>

                        <!-- Sort Field -->
                        <select class="filter-select" style="font-size:12.5px;" onchange="App.renderWorkspace(1, {sort_by: this.value})">
                            <option value="id" ${state.sort_by === 'id' ? 'selected' : ''}>Sort: Latest ID</option>
                            <option value="name" ${state.sort_by === 'name' ? 'selected' : ''}>Sort: Name</option>
                            <option value="status" ${state.sort_by === 'status' ? 'selected' : ''}>Sort: Status</option>
                            <option value="next_followup" ${state.sort_by === 'next_followup' ? 'selected' : ''}>Sort: Follow-up Date</option>
                            <option value="last_contacted" ${state.sort_by === 'last_contacted' ? 'selected' : ''}>Sort: Last Called</option>
                        </select>

                        <!-- Reset Button -->
                        ${(state.search || state.status_name || state.row_color || state.followup_date || state.filter) ? `
                            <button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="App.workspaceFilterState = {page:1, limit:25, search:'', status_name:'', row_color:'', followup_date:'', filter:'', sort_by:'id', sort_order:'DESC'}; App.renderWorkspace(1);">✕ Clear</button>
                        ` : ''}
                    </div>

                    <div style="font-size:12.5px; color:#64748b; font-weight:600; white-space:nowrap;">
                        Total: <strong style="color:#0f172a;">${p.total}</strong> Leads &bull; Page ${p.page} of ${Math.max(1, p.total_pages)}
                    </div>
                </div>

                <!-- 1. WORKSPACE SPREADSHEET TABLE (Google Sheets Style with fixed admin columns) -->
                <div class="workspace-table-container">
                    <table class="workspace-grid" id="workspace-table">
                        <thead>
                            <tr>
                                <th style="width: 44px; text-align:center;">#</th>
                                <th style="min-width: 180px;">Client Name</th>
                                <th style="min-width: 150px;">Phone Number</th>
                                <th style="min-width: 160px;">Company / City</th>
                                <th style="min-width: 140px;">Status</th>
                                <th style="min-width: 200px;">Remarks / Follow-up</th>
                                <th style="min-width: 140px;">Last Contacted</th>
                                <th style="min-width: 150px; text-align:center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leads.length === 0 ? `
                                <tr>
                                    <td colspan="8" style="text-align:center; padding:50px; color:#64748b; font-size:14px;">
                                        No lead rows match your workspace filter criteria.
                                    </td>
                                </tr>
                            ` : ''}
                            ${leads.map((l, index) => {
                                const rowColorClass = getRowColorClass(l.row_color || l.status_color);
                                const statusPill = getStatusPillClass(l.status_name);
                                const customStyle = l.row_color && !rowColorClass ? `background-color: ${l.row_color}18;` : '';

                                return `
                                    <tr id="ws-row-${l.id}" class="${rowColorClass}" style="cursor:pointer; ${customStyle}" onclick="App.openWorkspaceLeadModal(${l.id})">
                                        <!-- Row number -->
                                        <td style="text-align:center; font-weight:700; color:#64748b; font-size:11px;">
                                            ${(p.page - 1) * p.limit + index + 1}
                                        </td>

                                        <!-- Client Name -->
                                        <td>
                                            <div style="font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
                                                <span>${l.name}</span>
                                            </div>
                                        </td>

                                        <!-- Mobile Number (Prominent clickable) -->
                                        <td onclick="event.stopPropagation()">
                                            <a href="tel:${l.mobile}" style="font-weight:700; color:#16a34a; text-decoration:none; font-family:'Space Grotesk', monospace; font-size:13.5px;" title="Call Direct">
                                                📞 ${l.mobile}
                                            </a>
                                        </td>

                                        <!-- Company / City -->
                                        <td>
                                            <div style="font-weight:600; color:#334155;">${l.company_name || '—'}</div>
                                            <div style="font-size:11px; color:#64748b;">${l.city || l.location || ''}</div>
                                        </td>

                                        <!-- Status Badge -->
                                        <td id="ws-status-cell-${l.id}">
                                            <span class="status-pill ${statusPill}" style="${l.status_color ? `border-color:${l.status_color}55; color:${l.status_color}; background:${l.status_color}18;` : ''}">
                                                <span class="status-indicator-dot" style="background:${l.status_color || '#3b82f6'};"></span>
                                                ${l.status_name || 'New'}
                                            </span>
                                        </td>

                                        <!-- Remarks & Scheduled Followup Column -->
                                        <td id="ws-remarks-cell-${l.id}" style="max-width:220px; overflow:hidden; text-overflow:ellipsis;">
                                            ${l.next_followup_at ? `
                                                <div style="font-size:11px; font-weight:800; color:#b45309; background:#fffbeb; padding:2px 6px; border-radius:6px; display:inline-block; border:1px solid #fde68a;">
                                                    📅 ${l.next_followup_at.split(' ')[0]}
                                                </div>
                                            ` : ''}
                                            <div style="font-size:11.5px; color:#475569; margin-top:2px;" title="${l.latest_call_outcome || l.initial_remark || ''}">
                                                ${l.latest_call_outcome ? `Latest: ${l.latest_call_outcome}` : (l.initial_remark || '<span style="color:#94a3b8">—</span>')}
                                            </div>
                                        </td>

                                        <!-- Last Contacted -->
                                        <td>
                                            <small style="color:#64748b; font-weight:600;">
                                                ${l.last_contacted_at ? l.last_contacted_at.replace(/:\d\d$/, '') : '<span style="color:#94a3b8">Never</span>'}
                                            </small>
                                        </td>

                                        <!-- Actions (View Lead & Call) -->
                                        <td style="text-align:center;" onclick="event.stopPropagation()">
                                            <div style="display:flex; gap:6px; justify-content:center;">
                                                <button type="button" class="btn btn-primary btn-sm" style="padding:5px 12px; font-size:12px; font-weight:700;" onclick="App.openWorkspaceLeadModal(${l.id})" title="View Full Lead Profile & Actions">
                                                    View Lead
                                                </button>
                                                <button type="button" class="btn btn-success btn-sm" style="padding:5px 10px; font-size:12px; font-weight:700; background:#16a34a;" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')" title="Call Now">
                                                    Call
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- PAGINATION BAR -->
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:12px 16px; background:#ffffff; border:1px solid var(--card-border); border-radius:12px;">
                    <div style="font-size:13px; color:#64748b;">
                        Showing ${(p.page - 1) * p.limit + 1} - ${Math.min(p.page * p.limit, p.total)} of ${p.total} leads
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" ${p.page <= 1 ? 'disabled' : ''} onclick="App.renderWorkspace(${p.page - 1})">&larr; Previous</button>
                        ${Array.from({ length: Math.min(5, p.total_pages) }, (_, i) => {
                            const pageNum = i + 1;
                            return `<button class="btn btn-sm ${p.page === pageNum ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderWorkspace(${pageNum})">${pageNum}</button>`;
                        }).join('')}
                        ${p.total_pages > 5 ? `<span style="padding:6px; color:#94a3b8;">...</span><button class="btn btn-sm ${p.page === p.total_pages ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderWorkspace(${p.total_pages})">${p.total_pages}</button>` : ''}
                        <button class="btn btn-secondary btn-sm" ${p.page >= p.total_pages ? 'disabled' : ''} onclick="App.renderWorkspace(${p.page + 1})">Next &rarr;</button>
                    </div>
                </div>

                <!-- 6. DEDICATED FOLLOW-UPS SECTION BELOW WORKSPACE -->
                <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:18px; padding:24px; box-shadow:0 2px 8px rgba(15,23,42,0.04); margin-top:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                        <div>
                            <div style="font-size:18px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                                📅 Scheduled Follow-ups Center
                                <span class="badge badge-amber">${todayFu.length} Today</span>
                                ${overdueFu.length > 0 ? `<span class="badge badge-red">${overdueFu.length} Overdue</span>` : ''}
                            </div>
                            <div style="font-size:12.5px; color:#64748b; margin-top:2px;">All callback tasks linked to your workspace leads</div>
                        </div>

                        <!-- Follow-up tabs -->
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn btn-sm btn-primary" id="fu-subtab-today" onclick="App.switchWorkspaceFollowupTab('today')">Today (${todayFu.length})</button>
                            <button class="btn btn-sm btn-secondary" id="fu-subtab-overdue" onclick="App.switchWorkspaceFollowupTab('overdue')">Overdue (${overdueFu.length})</button>
                            <button class="btn btn-sm btn-secondary" id="fu-subtab-upcoming" onclick="App.switchWorkspaceFollowupTab('upcoming')">Upcoming (${upcomingFu.length})</button>
                            <button class="btn btn-sm btn-secondary" id="fu-subtab-completed" onclick="App.switchWorkspaceFollowupTab('completed')">Completed (${completedFu.length})</button>
                        </div>
                    </div>

                    <!-- Followup items list container -->
                    <div id="ws-followups-container">
                        ${this.renderFollowupsSnippet(todayFu, 'today')}
                    </div>
                </div>
            </div>

            <!-- MODAL: FAST DISPOSITION & REMARKS MODAL -->
            <div class="modal-backdrop" id="ws-disposition-modal" style="display:none;">
                <div class="modal-box" style="max-width:480px; border-radius:18px; border-top:4px solid var(--primary);">
                    <div class="modal-header" style="border-bottom:1px solid #f1f5f9; padding-bottom:12px;">
                        <div>
                            <div class="modal-title" id="ws-disp-modal-title">Lead Action &amp; Disposition</div>
                            <div style="font-size:12.5px; color:#64748b;" id="ws-disp-modal-subtitle">Update status and schedule callbacks</div>
                        </div>
                        <button type="button" class="close-modal" onclick="App.closeModal('ws-disposition-modal')">✕</button>
                    </div>

                    <form onsubmit="App.submitWorkspaceDisposition(event)" style="margin-top:16px;">
                        <input type="hidden" id="ws-disp-lead-id">
                        
                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">Action / Disposition *</label>
                            <select id="ws-disp-action-val" required class="filter-select" style="width:100%; font-weight:700; padding:10px;" onchange="App.onDispositionActionChange(this.value)">
                                <option value="Calling">Calling</option>
                                <option value="Call Connected">Call Connected</option>
                                <option value="Not Interested">Not Interested</option>
                                <option value="Follow-up Needed">Follow-up Needed</option>
                                <option value="Ringing">Ringing</option>
                                <option value="Not Responding">Not Responding</option>
                                <option value="Invalid Number">Invalid Number</option>
                            </select>
                        </div>

                        <!-- Date + Time selection for Follow-up Needed -->
                        <div id="ws-followup-fields-group" style="display:none; background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:14px; margin-bottom:16px;">
                            <div style="font-size:12px; font-weight:800; color:#b45309; margin-bottom:10px;">📅 Schedule Follow-up Date &amp; Time</div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#78350f; margin-bottom:4px;">Date *</label>
                                    <input type="date" id="ws-disp-date" class="filter-input" style="width:100%;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#78350f; margin-bottom:4px;">Time *</label>
                                    <input type="time" id="ws-disp-time" class="filter-input" style="width:100%;" value="11:00">
                                </div>
                            </div>
                        </div>

                        <!-- Remarks field -->
                        <div style="margin-bottom:20px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">Remarks (Optional)</label>
                            <textarea id="ws-disp-remarks" class="filter-input" style="width:100%; height:75px; padding:10px; font-size:13px;" placeholder="Add remarks, customer response, or next steps..."></textarea>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:10px;">
                            <button type="button" class="btn btn-secondary" onclick="App.closeModal('ws-disposition-modal')">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="font-weight:700;">Save Action &amp; Update Status &rarr;</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL: PREMIUM VIEW LEAD DETAIL PANEL -->
            <div class="modal-backdrop" id="ws-view-lead-modal" style="display:none;">
                <div class="lead-modal-panel" id="ws-view-lead-content">
                    <!-- Dynamic populated lead content -->
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
        this.allWorkspaceFollowups = allFollowups;
    },

    // Snippet renderer for follow-up lists
    renderFollowupsSnippet: function(items, type) {
        if (!items || items.length === 0) {
            return `
                <div style="text-align:center; padding:30px; color:#64748b; font-size:13px;">
                    No ${type} follow-ups scheduled.
                </div>
            `;
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Client / Lead</th>
                            <th>Phone Number</th>
                            <th>Follow-up Date &amp; Time</th>
                            <th>Notes / Purpose</th>
                            <th>Status</th>
                            <th style="text-align:center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(f => `
                            <tr>
                                <td>
                                    <strong style="color:#0f172a; cursor:pointer;" onclick="App.openWorkspaceLeadModal(${f.lead_id})">${f.lead_name}</strong>
                                    ${f.company_name ? `<br><small style="color:#64748b;">${f.company_name}</small>` : ''}
                                </td>
                                <td>
                                    <a href="tel:${f.lead_mobile}" style="font-weight:700; color:#16a34a; text-decoration:none; font-family:'Space Grotesk', monospace;">📞 ${f.lead_mobile}</a>
                                </td>
                                <td>
                                    <span style="font-weight:700; color:#0f172a;">${f.followup_date}</span>
                                    <span style="color:#64748b; font-size:12px;">at ${f.followup_time || '10:00'}</span>
                                </td>
                                <td>${f.notes || f.purpose || 'Follow-up'}</td>
                                <td>
                                    <span class="badge ${f.status === 'Completed' ? 'badge-green' : (f.status === 'Overdue' ? 'badge-red' : 'badge-amber')}">${f.status}</span>
                                </td>
                                <td style="text-align:center;">
                                    <div style="display:flex; gap:6px; justify-content:center;">
                                        <button class="btn btn-primary btn-sm" onclick="App.openWorkspaceLeadModal(${f.lead_id})">Open Lead</button>
                                        ${f.status !== 'Completed' ? `<button class="btn btn-success btn-sm" onclick="App.completeWorkspaceFollowup(${f.id})">Mark Done</button>` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    switchWorkspaceFollowupTab: function(tab) {
        document.querySelectorAll('#fu-subtab-today, #fu-subtab-overdue, #fu-subtab-upcoming, #fu-subtab-completed').forEach(b => {
            b.className = 'btn btn-sm btn-secondary';
        });
        const activeBtn = document.getElementById(`fu-subtab-${tab}`);
        if (activeBtn) activeBtn.className = 'btn btn-sm btn-primary';

        const all = this.allWorkspaceFollowups || [];
        const todayStr = new Date().toISOString().split('T')[0];
        let filtered = [];
        if (tab === 'today') filtered = all.filter(f => f.followup_date === todayStr && f.status === 'Pending');
        else if (tab === 'upcoming') filtered = all.filter(f => f.followup_date > todayStr && f.status === 'Pending');
        else if (tab === 'overdue') filtered = all.filter(f => f.followup_date < todayStr && f.status === 'Pending');
        else if (tab === 'completed') filtered = all.filter(f => f.status === 'Completed');

        document.getElementById('ws-followups-container').innerHTML = this.renderFollowupsSnippet(filtered, tab);
    },

    completeWorkspaceFollowup: async function(id) {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('id', id);
        formData.append('status', 'Completed');

        const res = await fetch('api/followups', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.renderWorkspace();
        }
    },

    toggleRowColorMenu: function(leadId) {
        const menu = document.getElementById(`row-color-menu-${leadId}`);
        if (!menu) return;
        const isHidden = menu.style.display === 'none';
        document.querySelectorAll('[id^="row-color-menu-"]').forEach(el => el.style.display = 'none');
        menu.style.display = isHidden ? 'block' : 'none';
    },

    changeLeadRowColor: async function(leadId, colorName) {
        const row = document.getElementById(`ws-row-${leadId}`);
        const menu = document.getElementById(`row-color-menu-${leadId}`);
        if (menu) menu.style.display = 'none';

        // Clear existing color classes
        if (row) {
            row.classList.remove(
                'workspace-row-color-blue', 'workspace-row-color-green', 'workspace-row-color-amber',
                'workspace-row-color-yellow', 'workspace-row-color-orange', 'workspace-row-color-red',
                'workspace-row-color-purple', 'workspace-row-color-gray'
            );
            if (colorName !== 'default') {
                row.classList.add(`workspace-row-color-${colorName}`);
            }
        }

        const formData = new FormData();
        formData.append('action', 'update_row_color');
        formData.append('lead_id', leadId);
        formData.append('row_color', colorName);

        await fetch('api/leads', { method: 'POST', body: formData });
    },

    handleInlineDispositionSelect: function(leadId, disposition) {
        if (!disposition) return;
        this.openDispositionModal(leadId, disposition);
    },

    openDispositionModal: function(leadId, preselectedAction = 'Calling') {
        document.getElementById('ws-disp-lead-id').value = leadId;
        const sel = document.getElementById('ws-disp-action-val');
        if (sel) sel.value = preselectedAction;

        document.getElementById('ws-disp-remarks').value = '';
        const today = new Date();
        today.setDate(today.getDate() + 1);
        const tomorrowStr = today.toISOString().split('T')[0];
        document.getElementById('ws-disp-date').value = tomorrowStr;

        this.onDispositionActionChange(preselectedAction);
        this.openModal('ws-disposition-modal');
    },

    onDispositionActionChange: function(val, prefix = 'ws-disp-') {
        const fuGroup = document.getElementById(prefix === 'popup-disp-' ? 'popup-fu-fields-group' : 'ws-followup-fields-group');
        if (fuGroup) {
            fuGroup.style.display = val === 'Follow-up Needed' ? 'block' : 'none';
        }
    },

    submitWorkspaceDisposition: async function(e, customLeadId = null) {
        if (e && e.preventDefault) e.preventDefault();
        
        const isFromPopup = !!document.getElementById('popup-disp-action-val');
        const leadId = customLeadId || (isFromPopup ? document.getElementById('popup-disp-lead-id')?.value : document.getElementById('ws-disp-lead-id')?.value);
        const disposition = isFromPopup ? document.getElementById('popup-disp-action-val')?.value : document.getElementById('ws-disp-action-val')?.value;
        const remarks = (isFromPopup ? document.getElementById('popup-disp-remarks')?.value : document.getElementById('ws-disp-remarks')?.value || '').trim();
        const fDate = isFromPopup ? document.getElementById('popup-disp-date')?.value : document.getElementById('ws-disp-date')?.value;
        const fTime = isFromPopup ? document.getElementById('popup-disp-time')?.value : document.getElementById('ws-disp-time')?.value;

        if (!leadId || !disposition) return;

        const formData = new FormData();
        formData.append('action', 'update_disposition');
        formData.append('lead_id', leadId);
        formData.append('disposition', disposition);
        formData.append('remarks', remarks);
        formData.append('followup_date', fDate || '');
        formData.append('followup_time', fTime || '');

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            this.closeModal('ws-disposition-modal');
            this.closeModal('ws-view-lead-modal');
            // Refresh workspace table
            this.renderWorkspace();
        } else {
            alert(data.message || 'Error updating disposition');
        }
    },

    // Tab switcher inside the lead popup
    switchLeadModalTab: function(tabName) {
        document.querySelectorAll('.lead-modal-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.lead-modal-tab-content').forEach(pane => pane.style.display = 'none');

        const activeBtn = document.getElementById(`tab-btn-${tabName}`);
        const activePane = document.getElementById(`tab-content-${tabName}`);
        if (activeBtn) activeBtn.classList.add('active');
        if (activePane) activePane.style.display = 'block';
    },

    // Submit a persistent note/remark on the lead
    submitLeadNote: async function(e, leadId) {
        if (e && e.preventDefault) e.preventDefault();
        const noteInput = document.getElementById('new-lead-note-text');
        const text = noteInput ? noteInput.value.trim() : '';
        if (!text) return;

        const formData = new FormData();
        formData.append('action', 'add_note');
        formData.append('lead_id', leadId);
        formData.append('note_text', text);

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.openWorkspaceLeadModal(leadId, 'remarks');
        } else {
            alert(data.message || 'Error saving note');
        }
    },

    // Reassign lead to another executive/manager
    submitReassignLead: async function(e, leadId) {
        if (e && e.preventDefault) e.preventDefault();
        const execId = document.getElementById('popup-reassign-exec')?.value || '';
        const notes = document.getElementById('popup-reassign-reason')?.value || '';

        if (!execId) {
            alert('Please select an executive to assign this lead to.');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'assign');
        formData.append('lead_ids[]', leadId);
        formData.append('executive_id', execId);
        if (notes) formData.append('assignment_note', notes);

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            alert('Lead assigned successfully!');
            this.openWorkspaceLeadModal(leadId, 'reassign');
            if (this.currentView === 'workspace' || !this.currentView) {
                this.renderWorkspace();
            }
        } else {
            alert(data.message || 'Error assigning lead');
        }
    },

    // 3. PREMIUM VIEW LEAD DETAIL MODAL (With 4 Organized Tabs: Details, Activity, Remarks, Assign)
    openWorkspaceLeadModal: async function(leadId, defaultTab = 'details') {
        const modal = document.getElementById('ws-view-lead-modal');
        const contentBox = document.getElementById('ws-view-lead-content');
        if (!modal || !contentBox) return;

        contentBox.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b; font-size:15px; font-weight:600;">Loading lead profile...</div>';
        this.openModal('ws-view-lead-modal');

        if (!this.dropdowns || !this.dropdowns.executives) {
            await this.loadDropdowns();
        }

        const res = await fetch(`api/leads?action=detail&id=${leadId}`);
        const data = await res.json();
        if (!data.success || !data.data || !data.data.lead) {
            contentBox.innerHTML = '<div style="padding:40px; text-align:center; color:#ef4444;">Could not load lead information.</div>';
            return;
        }

        const l = data.data.lead;
        const calls = data.data.calls || [];
        const followups = data.data.followups || [];
        const notes = data.data.notes || [];
        const cleanPhone = (l.mobile || '').replace(/[^0-9]/g, '');

        const executives = this.dropdowns?.executives || [];

        const today = new Date();
        today.setDate(today.getDate() + 1);
        const tomorrowStr = today.toISOString().split('T')[0];

        // Array of optional fields: if empty, hide field and label completely
        const candidateFields = [
            { label: 'Status', value: l.status_name },
            { label: 'Lead Code', value: l.lead_code },
            { label: 'Alternate Mobile', value: l.alternate_mobile },
            { label: 'Email Address', value: l.email },
            { label: 'Company Name', value: l.company_name },
            { label: 'City / Location', value: [l.city, l.state, l.location].filter(Boolean).join(', ') },
            { label: 'Industry', value: l.industry },
            { label: 'Lead Source', value: l.source_name },
            { label: 'Service Interested', value: l.service_name },
            { label: 'Priority', value: l.priority },
            { label: 'Lead Type', value: l.lead_type },
            { label: 'Assigned Executive', value: l.executive_name },
            { label: 'Assigned Manager', value: l.manager_name },
            { label: 'Scheduled Follow-up', value: l.next_followup_at },
            { label: 'Last Contacted', value: l.last_contacted_at },
            { label: 'Initial Requirement', value: l.initial_remark || l.initial_requirement }
        ];

        // Filter out empty / null / blank fields
        const validFields = candidateFields.filter(f => f.value && String(f.value).trim() !== '' && String(f.value).trim() !== 'null');

        contentBox.innerHTML = `
            <!-- MODAL HEADER -->
            <div class="lead-modal-header">
                <button type="button" class="close-modal" style="position:absolute; top:18px; right:20px; color:#ffffff; font-size:22px; background:transparent; border:none; cursor:pointer;" onclick="App.closeModal('ws-view-lead-modal')">✕</button>
                
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11px; font-weight:800; background:rgba(255,255,255,0.15); color:#60a5fa; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.8px;">
                            ${l.lead_code || 'LEAD'}
                        </span>
                        <span style="font-size:12px; font-weight:700; color:#cbd5e1; background:rgba(255,255,255,0.1); padding:3px 8px; border-radius:12px;">
                            ${l.status_name || 'New'}
                        </span>
                    </div>

                    <!-- Row Color Picker inside popup -->
                    <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px;">
                        <span style="font-size:11px; color:#cbd5e1; font-weight:700;">Row Color:</span>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <div class="color-swatch-btn" style="background:#eff6ff;" onclick="App.changeLeadRowColor(${l.id}, 'blue')" title="Blue"></div>
                            <div class="color-swatch-btn" style="background:#f0fdf4;" onclick="App.changeLeadRowColor(${l.id}, 'green')" title="Green"></div>
                            <div class="color-swatch-btn" style="background:#fefce8;" onclick="App.changeLeadRowColor(${l.id}, 'amber')" title="Amber"></div>
                            <div class="color-swatch-btn" style="background:#fff7ed;" onclick="App.changeLeadRowColor(${l.id}, 'orange')" title="Orange"></div>
                            <div class="color-swatch-btn" style="background:#fef2f2;" onclick="App.changeLeadRowColor(${l.id}, 'red')" title="Red"></div>
                            <div class="color-swatch-btn" style="background:#faf5ff;" onclick="App.changeLeadRowColor(${l.id}, 'purple')" title="Purple"></div>
                            <div class="color-swatch-btn" style="background:#f8fafc;" onclick="App.changeLeadRowColor(${l.id}, 'gray')" title="Gray"></div>
                            <div class="color-swatch-btn" style="background:rgba(255,255,255,0.3); border:1px dashed #ffffff; color:#fff; display:flex; align-items:center; justify-content:center; font-size:9px;" onclick="App.changeLeadRowColor(${l.id}, 'default')" title="Clear Color">✕</div>
                        </div>
                    </div>
                </div>

                <div class="lead-modal-title">${l.name}</div>
                
                <!-- Large Phone Number -->
                <div class="lead-modal-phone-display">
                    <span>📞 ${l.mobile}</span>
                </div>

                <!-- Quick Action Buttons -->
                <div class="lead-modal-actions">
                    <button type="button" class="btn-call-lg" onclick="App.closeModal('ws-view-lead-modal'); App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        Call Now
                    </button>
                    <a href="https://wa.me/91${cleanPhone}" target="_blank" class="btn-whatsapp-lg">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        WhatsApp
                    </a>
                </div>
            </div>

            <!-- TAB NAVIGATION BAR -->
            <div class="lead-modal-tabs-bar">
                <button type="button" class="lead-modal-tab-btn ${defaultTab === 'details' ? 'active' : ''}" id="tab-btn-details" onclick="App.switchLeadModalTab('details')">
                    📋 Lead Details
                </button>
                <button type="button" class="lead-modal-tab-btn ${defaultTab === 'activity' ? 'active' : ''}" id="tab-btn-activity" onclick="App.switchLeadModalTab('activity')">
                    ⚡ Activity &amp; Calls (${calls.length})
                </button>
                <button type="button" class="lead-modal-tab-btn ${defaultTab === 'remarks' ? 'active' : ''}" id="tab-btn-remarks" onclick="App.switchLeadModalTab('remarks')">
                    💬 Remarks &amp; Notes (${notes.length})
                </button>
                <button type="button" class="lead-modal-tab-btn ${defaultTab === 'reassign' ? 'active' : ''}" id="tab-btn-reassign" onclick="App.switchLeadModalTab('reassign')">
                    👥 Assign &amp; Team
                </button>
            </div>

            <!-- TAB CONTENT CONTAINER (SCROLLABLE) -->
            <div class="lead-modal-body-scroll">
                
                <!-- TAB 1: LEAD DETAILS -->
                <div class="lead-modal-tab-content" id="tab-content-details" style="${defaultTab === 'details' ? 'display:block;' : 'display:none;'}">
                    <!-- Quick Action & Disposition Banner inside Details -->
                    <div class="lead-disposition-banner">
                        <div style="font-size:11px; font-weight:800; color:#1e293b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                            ⚡ Update Disposition &amp; Next Action
                        </div>
                        <form id="popup-disp-form" onsubmit="App.submitWorkspaceDisposition(event, ${l.id})">
                            <input type="hidden" id="popup-disp-lead-id" value="${l.id}">
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:10px;">
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Action / Call Outcome *</label>
                                    <select id="popup-disp-action-val" required class="filter-select" style="width:100%; font-weight:700; padding:8px 10px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px;" onchange="App.onDispositionActionChange(this.value, 'popup-disp-')">
                                        <option value="Calling">Calling</option>
                                        <option value="Call Connected">Call Connected</option>
                                        <option value="Not Interested">Not Interested</option>
                                        <option value="Follow-up Needed">Follow-up Needed</option>
                                        <option value="Ringing">Ringing</option>
                                        <option value="Not Responding">Not Responding</option>
                                        <option value="Invalid Number">Invalid Number</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Remarks / Quick Outcome Note</label>
                                    <input type="text" id="popup-disp-remarks" class="filter-input" style="width:100%; padding:8px 10px; border-radius:8px;" placeholder="Outcome notes, customer reply...">
                                </div>
                            </div>

                            <!-- Follow-up fields container -->
                            <div id="popup-fu-fields-group" style="display:none; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px; margin-bottom:12px;">
                                <div style="font-size:11px; font-weight:800; color:#b45309; margin-bottom:6px;">📅 Schedule Follow-up Callback</div>
                                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
                                    <div>
                                        <label style="display:block; font-size:11px; font-weight:700; color:#78350f; margin-bottom:2px;">Date *</label>
                                        <input type="date" id="popup-disp-date" class="filter-input" style="width:100%;" value="${tomorrowStr}">
                                    </div>
                                    <div>
                                        <label style="display:block; font-size:11px; font-weight:700; color:#78350f; margin-bottom:2px;">Time *</label>
                                        <input type="time" id="popup-disp-time" class="filter-input" style="width:100%;" value="${11}:00">
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; justify-content:flex-end;">
                                <button type="submit" class="btn btn-primary btn-sm" style="padding:8px 20px; font-weight:700; border-radius:8px;">Save Action &amp; Update Status &rarr;</button>
                            </div>
                        </form>
                    </div>

                    <!-- Structured Lead Fields Grid -->
                    <div class="lead-detail-grid">
                        ${validFields.map(f => `
                            <div class="lead-field-item ${f.label === 'Initial Requirement' ? 'lead-field-full' : ''}">
                                <div class="lead-field-label">${f.label}</div>
                                <div class="lead-field-val">${f.value}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- TAB 2: ACTIVITY & CALLS -->
                <div class="lead-modal-tab-content" id="tab-content-activity" style="${defaultTab === 'activity' ? 'display:block;' : 'display:none;'}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <div>
                            <div style="font-size:14px; font-weight:800; color:#0f172a;">Call Logs &amp; Activity Trail</div>
                            <div style="font-size:12px; color:#64748b;">Complete history of every dial and status update</div>
                        </div>
                        <button type="button" class="btn btn-primary btn-sm" onclick="App.closeModal('ws-view-lead-modal'); App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">+ Log New Call</button>
                    </div>

                    ${calls.length === 0 ? `
                        <div style="text-align:center; padding:40px 20px; color:#94a3b8; font-size:13px; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
                            No calls logged yet for this lead. Click "Call Now" or "+ Log New Call" to record the first interaction.
                        </div>
                    ` : `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${calls.map(c => `
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <span style="font-weight:800; font-size:13px; color:#0f172a;">${c.outcome_name || 'Call Logged'}</span>
                                            <span style="font-size:11px; background:#eff6ff; color:#2563eb; font-weight:700; padding:2px 8px; border-radius:12px;">By ${c.agent_name || 'Agent'}</span>
                                        </div>
                                        <div style="font-size:11px; color:#64748b; font-weight:600;">
                                            📅 ${(c.called_at || '').replace(/:\d\d$/, '')}
                                        </div>
                                    </div>
                                    ${c.remarks ? `<div style="margin-top:6px; font-size:12.5px; color:#475569; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #f1f5f9;">${c.remarks}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}

                    <!-- Follow-ups scheduled under activity -->
                    <div style="margin-top:24px; border-top:1px solid #f1f5f9; padding-top:18px;">
                        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:10px;">Scheduled Callback Tasks (${followups.length})</div>
                        ${followups.length === 0 ? `
                            <div style="font-size:12.5px; color:#94a3b8;">No pending follow-ups scheduled.</div>
                        ` : `
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                ${followups.map(f => `
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:8px 14px; font-size:12px;">
                                        <div>
                                            <strong style="color:#b45309;">📅 ${f.followup_date} at ${f.followup_time || '10:00'}</strong> &bull; <span style="color:#78350f;">${f.notes || f.purpose || 'Follow-up'}</span>
                                        </div>
                                        <span class="badge ${f.status === 'Completed' ? 'badge-green' : 'badge-amber'}">${f.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <!-- TAB 3: REMARKS & PERSISTENT NOTES -->
                <div class="lead-modal-tab-content" id="tab-content-remarks" style="${defaultTab === 'remarks' ? 'display:block;' : 'display:none;'}">
                    <div style="margin-bottom:16px;">
                        <div style="font-size:14px; font-weight:800; color:#0f172a;">Lead Remarks &amp; Internal Notes</div>
                        <div style="font-size:12px; color:#64748b;">Add detailed remarks, deal context, or handover instructions that will be permanently stored for this lead</div>
                    </div>

                    <!-- Add Note Input Form -->
                    <form onsubmit="App.submitLeadNote(event, ${l.id})" style="margin-bottom:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px;">
                        <label style="display:block; font-size:11px; font-weight:800; color:#334155; margin-bottom:6px; text-transform:uppercase;">Add New Remark / Note</label>
                        <textarea id="new-lead-note-text" required class="filter-input" style="width:100%; height:75px; padding:10px; font-size:13px; background:#ffffff; margin-bottom:8px;" placeholder="Write specific client requirements, budget details, next steps..."></textarea>
                        <div style="display:flex; justify-content:flex-end;">
                            <button type="submit" class="btn btn-primary btn-sm" style="font-weight:700;">+ Save Remark</button>
                        </div>
                    </form>

                    <!-- Stored Notes List -->
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${(l.initial_remark || l.initial_requirement) ? `
                            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 14px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                    <span style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase;">Initial Intake Requirement</span>
                                    <span style="font-size:11px; color:#60a5fa;">Creation Time</span>
                                </div>
                                <div style="font-size:13px; color:#1e3a8a;">${l.initial_remark || l.initial_requirement}</div>
                            </div>
                        ` : ''}

                        ${notes.map(n => `
                            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                    <span style="font-size:12px; font-weight:800; color:#0f172a;">${n.author_name || 'Agent'}</span>
                                    <span style="font-size:11px; color:#94a3b8;">📅 ${(n.created_at || '').replace(/:\d\d$/, '')}</span>
                                </div>
                                <div style="font-size:13px; color:#334155; white-space:pre-wrap;">${n.note_text}</div>
                            </div>
                        `).join('')}

                        ${notes.length === 0 && !l.initial_remark && !l.initial_requirement ? `
                            <div style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">
                                No remarks saved yet. Enter a note above to store permanent context.
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- TAB 4: ASSIGN & TEAM HANDOVER -->
                <div class="lead-modal-tab-content" id="tab-content-reassign" style="${defaultTab === 'reassign' ? 'display:block;' : 'display:none;'}">
                    <div style="margin-bottom:16px;">
                        <div style="font-size:14px; font-weight:800; color:#0f172a;">Lead Assignment &amp; Team Handover</div>
                        <div style="font-size:12px; color:#64748b;">All activities, call logs, and remarks remain intact when assigning this lead to another executive</div>
                    </div>

                    <!-- Current Assigned Details -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px;">
                        <div>
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Current Executive</div>
                            <div style="font-size:14px; font-weight:800; color:#0f172a; margin-top:2px;">${l.executive_name || '<span style="color:#ef4444;">Unassigned</span>'}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Assigned Manager</div>
                            <div style="font-size:14px; font-weight:800; color:#0f172a; margin-top:2px;">${l.manager_name || 'General Pool'}</div>
                        </div>
                    </div>

                    <!-- Reassign Form -->
                    <form onsubmit="App.submitReassignLead(event, ${l.id})" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:14px; padding:18px;">
                        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:12px;">Transfer Lead Ownership</div>
                        
                        <div style="margin-bottom:14px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">Select Calling Executive *</label>
                            <select id="popup-reassign-exec" required class="filter-select" style="width:100%; font-size:13px; font-weight:700; padding:10px;">
                                <option value="">-- Choose Executive --</option>
                                ${executives.map(e => `
                                    <option value="${e.id}" ${e.id == l.assigned_executive_id ? 'selected' : ''}>${e.name} (${e.email || 'Executive'})</option>
                                `).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">Handover Reason / Instructions (Optional)</label>
                            <textarea id="popup-reassign-reason" class="filter-input" style="width:100%; height:65px; padding:10px; font-size:13px;" placeholder="Reason for transfer or special instructions for the new executive..."></textarea>
                        </div>

                        <div style="display:flex; justify-content:flex-end;">
                            <button type="submit" class="btn btn-primary" style="font-weight:700; padding:9px 20px;">Confirm &amp; Transfer Lead &rarr;</button>
                        </div>
                    </form>
                </div>

            </div>
        `;
    },

    // 2. LEADS MODULE
    leadsFilterState: {},

    renderLeads: async function(page = 1, filters = null) {
        if (!this.dropdowns || !this.dropdowns.statuses) {
            await this.loadDropdowns();
        }

        if (filters !== null) {
            this.leadsFilterState = { ...(this.leadsFilterState || {}), ...filters };
        }
        const currentFilters = this.leadsFilterState || {};
        const search = document.getElementById('lead-search-input')?.value || currentFilters.search || '';
        currentFilters.search = search;

        let queryParams = `action=list&page=${page}&search=${encodeURIComponent(search)}`;
        if (currentFilters.filter) queryParams += `&filter=${encodeURIComponent(currentFilters.filter)}`;
        if (currentFilters.status_id) queryParams += `&status_id=${encodeURIComponent(currentFilters.status_id)}`;
        if (currentFilters.priority) queryParams += `&priority=${encodeURIComponent(currentFilters.priority)}`;
        if (currentFilters.executive_id) queryParams += `&executive_id=${encodeURIComponent(currentFilters.executive_id)}`;
        if (currentFilters.is_qualified !== undefined) queryParams += `&is_qualified=${encodeURIComponent(currentFilters.is_qualified)}`;

        const res = await fetch(`api/leads?${queryParams}`);
        const data = await res.json();
        if (!data.success) return;

        const leads = data.data.leads;
        const p = data.data.pagination;

        let filterBadgeHtml = '';
        if (currentFilters.filter === 'called') {
            filterBadgeHtml = `<span class="badge badge-blue" style="font-size:12px; padding:6px 12px; margin-left:8px;">Filter: Already Called (${p.total} Leads) <a href="#" onclick="App.leadsFilterState = {}; App.renderLeads(1, {}); return false;" style="color:#fff; margin-left:8px; text-decoration:none;">✕ Clear</a></span>`;
        } else if (currentFilters.filter === 'to_call') {
            filterBadgeHtml = `<span class="badge badge-amber" style="font-size:12px; padding:6px 12px; margin-left:8px;">Filter: Pending To Call <a href="#" onclick="App.leadsFilterState = {}; App.renderLeads(1, {}); return false;" style="color:#fff; margin-left:8px; text-decoration:none;">✕ Clear</a></span>`;
        } else if (currentFilters.filter === 'followups') {
            filterBadgeHtml = `<span class="badge badge-purple" style="font-size:12px; padding:6px 12px; margin-left:8px;">Filter: Scheduled Follow-ups <a href="#" onclick="App.leadsFilterState = {}; App.renderLeads(1, {}); return false;" style="color:#fff; margin-left:8px; text-decoration:none;">✕ Clear</a></span>`;
        }

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title" style="display:flex; align-items:center;">Lead Management Database ${filterBadgeHtml}</div>
                    <div class="page-subtitle">Track, filter, call, assign and qualify prospect leads</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="App.exportLeadsCsv()">Export CSV</button>
                    <button class="btn btn-secondary" onclick="App.navigate('import')">Bulk CSV Import</button>
                    <button class="btn btn-primary" onclick="App.openCreateLeadModal()">+ Add New Lead</button>
                </div>
            </div>

            <div class="table-card">
                <div class="table-filters" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <input type="text" id="lead-search-input" placeholder="Search by name, phone, email, company..." class="filter-input" style="width: 240px;" value="${search}" onkeyup="if(event.key==='Enter') App.renderLeads(1, {search: this.value})">
                    <button class="btn btn-secondary btn-sm" onclick="App.renderLeads(1, {search: document.getElementById('lead-search-input').value})">Search</button>

                    <!-- QUICK FILTER DROPDOWN -->
                    <select class="filter-select" style="min-width:160px;" onchange="App.renderLeads(1, {filter: this.value})">
                        <option value="" ${!currentFilters.filter ? 'selected' : ''}>All Lead Types</option>
                        <option value="called" ${currentFilters.filter === 'called' ? 'selected' : ''}>Called Leads</option>
                        <option value="to_call" ${currentFilters.filter === 'to_call' ? 'selected' : ''}>Pending To Call</option>
                        <option value="followups" ${currentFilters.filter === 'followups' ? 'selected' : ''}>Scheduled Follow-ups</option>
                    </select>

                    <!-- STATUS FILTER -->
                    <select class="filter-select" style="min-width:160px;" onchange="App.renderLeads(1, {status_id: this.value})">
                        <option value="">All Lead Statuses</option>
                        ${(this.dropdowns?.statuses || []).map(s => `<option value="${s.id}" ${currentFilters.status_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>

                    <!-- PRIORITY FILTER -->
                    <select class="filter-select" style="min-width:140px;" onchange="App.renderLeads(1, {priority: this.value})">
                        <option value="">All Priorities</option>
                        <option value="High" ${currentFilters.priority === 'High' ? 'selected' : ''}>High Priority</option>
                        <option value="Medium" ${currentFilters.priority === 'Medium' ? 'selected' : ''}>Medium Priority</option>
                        <option value="Low" ${currentFilters.priority === 'Low' ? 'selected' : ''}>Low Priority</option>
                    </select>

                    <button class="btn btn-secondary btn-sm" onclick="App.autoAssignSelectedLeads()">Equal Auto Assign</button>
                    ${(currentFilters.filter || currentFilters.status_id || currentFilters.priority || currentFilters.search) ? `<button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="App.leadsFilterState = {}; App.renderLeads(1, {});">✕ Reset Filters</button>` : ''}
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" onclick="document.querySelectorAll('.chk-lead').forEach(c=>c.checked=this.checked)"></th>
                                <th>Lead Code</th>
                                <th>Client / Company</th>
                                <th>Mobile Number</th>
                                <th>Service Interested</th>
                                <th>Executive</th>
                                <th>Status</th>
                                <th>Last Call Outcome</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leads.length === 0 ? `<tr><td colspan="9" style="text-align:center; padding:30px; color:#64748b;">No lead records found matching filter.</td></tr>` : ''}
                            ${leads.map(l => `
                                <tr>
                                    <td><input type="checkbox" class="chk-lead" value="${l.id}"></td>
                                    <td><strong style="color:var(--primary);">${l.lead_code}</strong></td>
                                    <td><strong>${l.name}</strong><br><small style="color:var(--text-muted)">${l.company_name || l.city || 'Individual'}</small></td>
                                    <td><a href="tel:${l.mobile}" style="color:var(--success-text); text-decoration:none; font-weight:600;">${l.mobile}</a></td>
                                    <td>${l.service_name || 'General Query'}</td>
                                    <td>${l.executive_name || '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
                                    <td><span class="badge" style="background:${l.status_color || '#3b82f6'}22; color:${l.status_color || '#3b82f6'}; border:1px solid ${l.status_color || '#3b82f6'}55;">${l.status_name}</span></td>
                                    <td><small style="color:#475569; font-weight:600;">${l.latest_call_outcome || '<span style="color:#94a3b8">Not Called Yet</span>'}</small></td>
                                    <td>
                                        <div style="display:flex; gap:6px;">
                                            <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">Call Now</button>
                                            <button class="btn btn-secondary btn-sm" onclick="App.viewLeadDetail(${l.id})">Details</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content-viewport').innerHTML = html;
    },

    viewLeadDetail: async function(leadId) {
        const res = await fetch(`api/leads?action=detail&id=${leadId}`);
        const data = await res.json();
        if (!data.success || !data.data) {
            alert('Failed to load lead details');
            return;
        }

        const l = data.data.lead;
        const calls = data.data.calls || [];
        const followups = data.data.followups || [];
        const notes = data.data.notes || [];
        const documents = data.data.documents || [];

        const html = `
            <div class="page-header" style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="App.navigate('${this.currentView}')">← Back to List</button>
                    <div>
                        <div style="font-size:12px; font-weight:800; color:var(--primary);">${l.lead_code}</div>
                        <div class="page-title" style="font-size:22px;">${l.name}</div>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">Call Now</button>
                    <button class="btn btn-success" style="background:#16a34a; color:#fff;" onclick="window.open('https://wa.me/91${l.mobile.replace(/[^0-9]/g,'')}', '_blank')">WhatsApp</button>
                </div>
            </div>

            <!-- TAB HEADER BAR -->
            <div class="lead-tab-container" style="background:#ffffff; border:1px solid var(--card-border); border-radius:14px; padding:8px 10px; display:flex; gap:8px; margin-bottom:20px; overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch;">
                <button class="btn lead-tab-btn active" id="tab-btn-about" onclick="App.switchLeadTab('about')">About</button>
                <button class="btn lead-tab-btn" id="tab-btn-activity" onclick="App.switchLeadTab('activity')">Activity History (${calls.length})</button>
                <button class="btn lead-tab-btn" id="tab-btn-tasks" onclick="App.switchLeadTab('tasks')">Tasks (${followups.length})</button>
                <button class="btn lead-tab-btn" id="tab-btn-notes" onclick="App.switchLeadTab('notes')">Notes (${notes.length})</button>
                <button class="btn lead-tab-btn" id="tab-btn-documents" onclick="App.switchLeadTab('documents')">Documents (${documents.length})</button>
            </div>

            <!-- TAB CONTENTS -->
            <!-- 1. ABOUT TAB -->
            <div id="lead-tab-about" class="lead-tab-content">
                <div style="background:#283593; color:#ffffff; padding:16px 20px; border-radius:14px; font-weight:800; font-size:15px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">
                    STATUS: ${l.status_name ? l.status_name.toUpperCase() : 'NEW'}
                </div>

                <div class="kpi-grid" style="margin-bottom:20px;">
                    <div class="kpi-card">
                        <div class="kpi-header">Lead Score</div>
                        <div class="kpi-val">85</div>
                        <div class="kpi-sub">High Intent</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-header">Engagement Score</div>
                        <div class="kpi-val">12</div>
                        <div class="kpi-sub">Active Interactions</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-header">Lead Quality</div>
                        <div class="kpi-val" style="color:var(--success-text);">Hot</div>
                        <div class="kpi-sub">Verified Mobile</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-header">Created</div>
                        <div class="kpi-val" style="font-size:18px;">${l.created_at ? l.created_at.substring(0,10) : 'Recent'}</div>
                        <div class="kpi-sub">Lead Age</div>
                    </div>
                </div>

                <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:16px; padding:22px;">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:16px;">Key Details</h3>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:18px;">
                        <div>
                            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Phone Number</div>
                            <div style="font-size:15px; font-weight:700; color:var(--primary); margin-top:4px;">+91-${l.mobile}</div>
                        </div>
                        <div>
                            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Email Address</div>
                            <div style="font-size:15px; font-weight:700; color:${l.email ? 'var(--primary)' : 'var(--text-muted)'}; margin-top:4px;">${l.email || 'Not Provided'}</div>
                        </div>
                        <div>
                            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Service Requested</div>
                            <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-top:4px;">${l.service_name || 'BPO Telecalling'}</div>
                        </div>
                        <div>
                            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Company / Location</div>
                            <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-top:4px;">${l.company_name || l.city || 'Individual'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. ACTIVITY HISTORY TAB -->
            <div id="lead-tab-activity" class="lead-tab-content" style="display:none;">
                <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:16px; padding:22px;">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:16px;">Call History & Activity Timeline</h3>
                    ${calls.length === 0 ? '<p style="color:var(--text-muted)">No prior call activities recorded.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${calls.map(c => `
                                <div style="padding:14px; background:#f8fafc; border:1px solid var(--card-border); border-radius:12px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">Call Logged by ${c.agent_name}</div>
                                        <span class="badge" style="background:${c.outcome_color || '#2563eb'}22; color:${c.outcome_color || '#2563eb'};">${c.outcome_name}</span>
                                    </div>
                                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Date: ${c.called_at} • Duration: ${c.call_duration_seconds} sec</div>
                                    ${c.remarks ? `<div style="font-size:13px; color:var(--text-secondary); margin-top:6px;">Remark: ${c.remarks}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <!-- 3. TASKS TAB -->
            <div id="lead-tab-tasks" class="lead-tab-content" style="display:none;">
                <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:16px; padding:22px;">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:16px;">Tasks & Scheduled Follow-ups</h3>
                    ${followups.length === 0 ? '<p style="color:var(--text-muted)">No scheduled tasks found.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${followups.map(f => `
                                <div style="padding:14px; background:#f8fafc; border:1px solid var(--card-border); border-radius:12px;">
                                    <div style="font-size:14px; font-weight:700; color:var(--text-primary);">${f.purpose || 'Follow-up Call'}</div>
                                    <div style="font-size:12.5px; color:var(--primary); font-weight:600; margin-top:2px;">Due: ${f.followup_date} at ${f.followup_time}</div>
                                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Assigned to: ${f.agent_name} • Status: ${f.status}</div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <!-- 4. NOTES TAB -->
            <div id="lead-tab-notes" class="lead-tab-content" style="display:none;">
                <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:16px; padding:22px;">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:16px;">Internal Notes</h3>
                    <form onsubmit="App.saveLeadNote(event, ${l.id})" style="margin-bottom:20px;">
                        <textarea id="note-input-text" required style="width:100%; height:80px; padding:12px; border:1px solid var(--card-border); border-radius:10px; font-size:13px; outline:none;" placeholder="Write a note about this lead..."></textarea>
                        <button type="submit" class="btn btn-primary" style="margin-top:8px;">Save Note</button>
                    </form>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${notes.length === 0 ? '<p style="color:var(--text-muted)">No notes added yet.</p>' : notes.map(n => `
                            <div style="padding:14px; background:#f8fafc; border:1px solid var(--card-border); border-radius:12px;">
                                <div style="font-size:13.5px; color:var(--text-primary); font-weight:600;">${n.note_text}</div>
                                <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">By ${n.author_name} on ${n.created_at}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- 5. DOCUMENTS TAB -->
            <div id="lead-tab-documents" class="lead-tab-content" style="display:none;">
                <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:16px; padding:22px;">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:16px;">Attached Documents & Files</h3>
                    <form onsubmit="App.uploadLeadDocument(event, ${l.id})" style="margin-bottom:20px; display:flex; gap:10px; align-items:center;">
                        <input type="file" id="doc-file-input" required style="font-size:13px;">
                        <button type="submit" class="btn btn-primary">Upload Document</button>
                    </form>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${documents.length === 0 ? '<p style="color:var(--text-muted)">No documents uploaded yet.</p>' : documents.map(d => `
                            <div style="padding:14px; background:#f8fafc; border:1px solid var(--card-border); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:13.5px; font-weight:700; color:var(--primary);">${d.file_name}</div>
                                    <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Uploaded by ${d.author_name} on ${d.uploaded_at}</div>
                                </div>
                                <a href="${d.file_path}" target="_blank" class="btn btn-secondary btn-sm">Download</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    switchLeadTab: function(tabName) {
        document.querySelectorAll('.lead-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.lead-tab-btn').forEach(el => el.classList.remove('active', 'btn-primary'));
        
        const targetTab = document.getElementById(`lead-tab-${tabName}`);
        const targetBtn = document.getElementById(`tab-btn-${tabName}`);
        if (targetTab) targetTab.style.display = 'block';
        if (targetBtn) targetBtn.classList.add('active');
    },

    saveLeadNote: async function(e, leadId) {
        e.preventDefault();
        const text = document.getElementById('note-input-text').value;
        const formData = new FormData();
        formData.append('action', 'add_note');
        formData.append('lead_id', leadId);
        formData.append('note_text', text);

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (data.success) this.viewLeadDetail(leadId);
    },

    uploadLeadDocument: async function(e, leadId) {
        e.preventDefault();
        const fileInput = document.getElementById('doc-file-input');
        if (!fileInput.files || fileInput.files.length === 0) return;

        const formData = new FormData();
        formData.append('action', 'upload_doc');
        formData.append('lead_id', leadId);
        formData.append('document', fileInput.files[0]);

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (data.success) this.viewLeadDetail(leadId);
    },

    autoAssignSelectedLeads: async function() {
        const selected = Array.from(document.querySelectorAll('.chk-lead:checked')).map(c => c.value);
        if (selected.length === 0) {
            alert('Please select at least 1 lead to auto assign.');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'auto_assign');
        selected.forEach(id => formData.append('lead_ids[]', id));

        const res = await fetch('api/leads', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (data.success) this.renderLeads(1);
    },

    exportLeadsCsv: function() {
        window.location.href = 'api/leads?action=export';
    },

    // 3. CALLING QUEUE MODULE
    callingQueueFilterState: {
        quick_filter: 'new',
        executive_id: '',
        search: ''
    },

    renderCallingQueue: async function(filters = {}) {
        if (!this.dropdowns || !this.dropdowns.executives) {
            await this.loadDropdowns();
        }

        Object.assign(this.callingQueueFilterState, filters);
        const state = this.callingQueueFilterState;

        let queryParams = 'action=list&calling_queue=1&limit=100';
        if (state.quick_filter === 'new') {
            queryParams += '&status_id=1';
        } else if (state.quick_filter === 'followups') {
            queryParams += '&filter=followups';
        } else if (state.quick_filter === 'called') {
            queryParams += '&filter=called';
        }
        if (state.executive_id) {
            queryParams += '&executive_id=' + encodeURIComponent(state.executive_id);
        }
        if (state.priority) {
            queryParams += '&priority=' + encodeURIComponent(state.priority);
        }
        if (state.search) {
            queryParams += '&search=' + encodeURIComponent(state.search);
        }

        const res = await fetch(`api/leads?${queryParams}`);
        const data = await res.json();
        if (!data.success) return;

        const queue = data.data.leads || [];
        const execs = this.dropdowns?.executives || [];

        let execOptionsHtml = `<option value="">All Operations Executives</option>` + execs.map(e => 
            `<option value="${e.id}" ${state.executive_id == e.id ? 'selected' : ''}>${e.name}</option>`
        ).join('');

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Action Calling Queue</div>
                    <div class="page-subtitle">List view of pending telecalling tasks & operations executive queue</div>
                </div>
            </div>

            <div class="table-card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:16px; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-radius:18px 18px 0 0;">
                    <!-- QUICK FILTER TABS -->
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;">Queue Filter:</span>
                        <button class="btn btn-sm ${state.quick_filter === 'new' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderCallingQueue({quick_filter:'new'})">
                            New Leads ${state.quick_filter === 'new' ? '✓' : ''}
                        </button>
                        <button class="btn btn-sm ${state.quick_filter === 'followups' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderCallingQueue({quick_filter:'followups'})">
                            Pending Follow-ups ${state.quick_filter === 'followups' ? '✓' : ''}
                        </button>
                        <button class="btn btn-sm ${state.quick_filter === 'called' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderCallingQueue({quick_filter:'called'})">
                            Already Called ${state.quick_filter === 'called' ? '✓' : ''}
                        </button>
                        <button class="btn btn-sm ${state.quick_filter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderCallingQueue({quick_filter:'all'})">
                            All Queue Calls ${state.quick_filter === 'all' ? '✓' : ''}
                        </button>
                    </div>

                    <!-- EXECUTIVE DROPDOWN FILTER & SEARCH -->
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <select class="filter-select" style="min-width:180px;" onchange="App.renderCallingQueue({executive_id: this.value})">
                            ${execOptionsHtml}
                        </select>
                        <select class="filter-select" style="min-width:140px;" onchange="App.renderCallingQueue({priority: this.value})">
                            <option value="" ${!state.priority ? 'selected' : ''}>All Priorities</option>
                            <option value="High" ${state.priority === 'High' ? 'selected' : ''}>High Priority</option>
                            <option value="Medium" ${state.priority === 'Medium' ? 'selected' : ''}>Medium Priority</option>
                            <option value="Low" ${state.priority === 'Low' ? 'selected' : ''}>Low Priority</option>
                        </select>
                        <input type="text" id="calling-queue-search" class="filter-input" placeholder="Search name/phone..." value="${state.search || ''}" onkeyup="if(event.key==='Enter') App.renderCallingQueue({search: this.value})">
                        <button class="btn btn-secondary btn-sm" onclick="App.renderCallingQueue({search: document.getElementById('calling-queue-search').value})">Search</button>
                    </div>
                </div>

                <!-- TABLE LIST VIEW -->
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Lead Code</th>
                                <th>Client / Company</th>
                                <th>Mobile Number</th>
                                <th>Service Interested</th>
                                <th>Executive</th>
                                <th>Priority</th>
                                <th>Lead Status</th>
                                <th>Last Outcome</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${queue.length === 0 ? `<tr><td colspan="9" style="text-align:center; padding:30px; color:#64748b;">No calling queue records found matching selected filter.</td></tr>` : ''}
                            ${queue.map(l => `
                                <tr>
                                    <td><strong style="color:var(--primary);">${l.lead_code}</strong></td>
                                    <td><strong>${l.name}</strong><br><small style="color:var(--text-muted)">${l.company_name || l.city || 'Individual'}</small></td>
                                    <td><a href="tel:${l.mobile}" style="color:var(--success-text); text-decoration:none; font-weight:700;">${l.mobile}</a></td>
                                    <td>${l.service_name || 'General Query'}</td>
                                    <td>${l.executive_name || '<span style="color:#94a3b8">Unassigned</span>'}</td>
                                    <td><span class="badge badge-amber">${l.priority}</span></td>
                                    <td><span class="badge" style="background:${l.status_color || '#3b82f6'}22; color:${l.status_color || '#3b82f6'}; border:1px solid ${l.status_color || '#3b82f6'}55;">${l.status_name || 'New'}</span></td>
                                    <td><small style="color:#475569; font-weight:600;">${l.latest_call_outcome || 'No call yet'}</small></td>
                                    <td>
                                        <div style="display:flex; gap:6px;">
                                            <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">Call Now</button>
                                            <button class="btn btn-secondary btn-sm" onclick="App.viewLeadDetail(${l.id})">Details</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    // 4. CALL LOG MODAL
    openCallModal: async function(leadId, name, mobile, currentStatusId = null, customStatuses = null, customOutcomes = null) {
        if (document.getElementById('call-modal')) return;

        // Register active call session immediately on backend
        try {
            const formData = new FormData();
            formData.append('action', 'start_call');
            formData.append('lead_id', leadId);
            formData.append('phone', mobile);
            fetch('api/calls', { method: 'POST', body: formData });
        } catch(e) {}

        // Ensure dropdown options are loaded
        if (!this.dropdowns || !this.dropdowns.statuses || !this.dropdowns.outcomes) {
            await this.loadDropdowns();
        }

        const statusesList = (customStatuses && customStatuses.length > 0) ? customStatuses : (this.dropdowns.statuses || []);
        const outcomesList = (customOutcomes && customOutcomes.length > 0) ? customOutcomes : (this.dropdowns.outcomes || []);

        let statusesHtml = statusesList.map(s => 
            `<option value="${s.id}" ${currentStatusId && s.id == currentStatusId ? 'selected' : ''}>${s.name}</option>`
        ).join('');

        let outcomesHtml = outcomesList.map(o => 
            `<option value="${o.id}">${o.name}</option>`
        ).join('');

        const modalHtml = `
            <div class="modal-backdrop show" id="call-modal">
                <div class="modal-box" style="border-top: 4px solid #2563eb; border-radius: 18px; max-width: 500px;">
                    <div class="modal-header" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px;">
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase;">Active Call Status Manager</div>
                            <div class="modal-title" style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top:2px;">${name}</div>
                            <div style="font-size: 12.5px; color: #64748b; font-weight: 500;">Phone: ${mobile}</div>
                        </div>
                        <button class="close-modal" onclick="App.closeModal('call-modal')" style="background: #f1f5f9; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>
                    <form onsubmit="App.submitCallLog(event, ${leadId})" style="margin-top: 16px;">
                        
                        <!-- Lead Status Selector -->
                        <div style="margin-bottom: 16px; background: #eff6ff; padding: 14px; border-radius: 12px; border: 1px solid #bfdbfe;">
                            <label style="display:block; font-size:12px; font-weight:800; color:#1e40af; margin-bottom:6px;">UPDATE LEAD STATUS</label>
                            <select id="modal-lead-status" class="filter-select" style="width:100%; font-size:14px; font-weight:700; color:#1e3a8a; background:#ffffff; border:1px solid #93c5fd;">
                                ${statusesHtml}
                            </select>
                        </div>

                        <!-- Call Outcome Selector -->
                        <div style="margin-bottom: 16px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">CALL OUTCOME</label>
                            <select id="modal-outcome" class="filter-select" style="width:100%; font-size:13.5px;" required>
                                ${outcomesHtml}
                            </select>
                        </div>

                        <!-- Remarks Input -->
                        <div style="margin-bottom: 16px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">CALL REMARKS & NOTES</label>
                            <textarea id="modal-remarks" required style="width:100%; height:80px; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; color:#0f172a; padding:12px; font-size:13px; outline:none;" placeholder="Write brief notes on the client discussion..."></textarea>
                        </div>

                        <!-- Followup Checkbox -->
                        <div style="background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:20px;">
                            <label style="font-size:13px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="checkbox" id="chk-followup" onchange="document.getElementById('followup-sec').style.display = this.checked ? 'block' : 'none'"> Schedule Next Follow-up Call
                            </label>
                            <div id="followup-sec" style="display:none; margin-top:12px;">
                                <div style="display:flex; gap:10px;">
                                    <input type="date" id="modal-fdate" class="filter-input" style="flex:1;">
                                    <input type="time" id="modal-ftime" class="filter-input" value="11:00" style="flex:1;">
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:13px; font-size:14px; font-weight:800; border-radius:12px;">Save & Update Lead Status</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    submitCallLog: async function(e, leadId) {
        e.preventDefault();
        const leadStatusId = document.getElementById('modal-lead-status')?.value || 0;
        const outcomeId = document.getElementById('modal-outcome').value;
        const remarks = document.getElementById('modal-remarks').value;
        const scheduleFollowup = document.getElementById('chk-followup').checked ? '1' : '0';
        const fdate = document.getElementById('modal-fdate').value;
        const ftime = document.getElementById('modal-ftime').value;

        const formData = new FormData();
        formData.append('action', 'log');
        formData.append('lead_id', leadId);
        formData.append('lead_status_id', leadStatusId);
        formData.append('call_outcome_id', outcomeId);
        formData.append('remarks', remarks);
        formData.append('schedule_followup', scheduleFollowup);
        formData.append('followup_date', fdate);
        formData.append('followup_time', ftime);

        const res = await fetch('api/calls', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.closeModal('call-modal');
            const banner = document.getElementById('active-call-banner');
            if (banner) banner.remove();
            this.navigate(this.currentView);
        }
    },

    // 5. FOLLOWUPS MODULE
    activeFollowupsFilter: 'today',

    renderFollowups: async function(filter = null) {
        if (filter) this.activeFollowupsFilter = filter;
        const currentFilter = this.activeFollowupsFilter || 'today';

        const res = await fetch(`api/followups?action=list&filter=${currentFilter}`);
        const data = await res.json();
        if (!data.success) return;

        const followups = data.data || [];

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Follow-up Management</div>
                    <div class="page-subtitle">Track scheduled callback tasks & upcoming customer follow-ups</div>
                </div>
            </div>

            <div class="table-card">
                <div style="display:flex; gap:10px; padding:16px; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-radius:18px 18px 0 0; flex-wrap:wrap; overflow-x:auto;">
                    <button class="btn btn-sm ${currentFilter === 'today' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderFollowups('today')">Today's Callbacks</button>
                    <button class="btn btn-sm ${currentFilter === 'overdue' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderFollowups('overdue')">Overdue Callbacks</button>
                    <button class="btn btn-sm ${currentFilter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderFollowups('upcoming')">Upcoming Callbacks</button>
                    <button class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderFollowups('all')">All Scheduled Callbacks</button>
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Client / Company</th>
                                <th>Phone</th>
                                <th>Followup Date & Time</th>
                                <th>Purpose / Notes</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${followups.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No follow-up records found matching filter.</td></tr>` : ''}
                            ${followups.map(f => `
                                <tr>
                                    <td><strong>${f.lead_name}</strong><br><small style="color:var(--text-muted)">${f.company_name || 'Lead'}</small></td>
                                    <td><a href="tel:${f.lead_mobile}" style="color:var(--success-text); font-weight:600;">${f.lead_mobile}</a></td>
                                    <td>${f.followup_date} at ${f.followup_time}</td>
                                    <td>${f.purpose || f.notes || 'Routine follow up'}</td>
                                    <td><span class="badge ${f.status === 'Completed' ? 'badge-green' : 'badge-amber'}">${f.status}</span></td>
                                    <td>${f.status !== 'Completed' ? `<button class="btn btn-success btn-sm" onclick="App.completeFollowup(${f.id})">Mark Done</button>` : `<span class="badge badge-green">✓ Completed</span>`}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    completeFollowup: async function(id) {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('id', id);
        formData.append('status', 'Completed');

        const res = await fetch('api/followups', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) this.renderFollowups();
    },

    // 6. MEETINGS MODULE
    renderMeetings: async function() {
        const res = await fetch('api/meetings?action=list&filter=all');
        const data = await res.json();
        if (!data.success) return;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Meetings Management</div>
                    <div class="page-subtitle">Client discovery calls & scheduled demos</div>
                </div>
            </div>

            <div class="table-card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Client</th>
                                <th>Type</th>
                                <th>Date & Time</th>
                                <th>Mode & Link</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(m => `
                                <tr>
                                    <td><strong>${m.meeting_title}</strong></td>
                                    <td>${m.lead_name}<br><small style="color:var(--text-muted)">${m.company_name || ''}</small></td>
                                    <td>${m.type_name}</td>
                                    <td>${m.meeting_date} ${m.meeting_time}</td>
                                    <td>${m.meeting_mode} ${m.meeting_link ? `<br><a href="${m.meeting_link}" target="_blank" style="color:var(--primary);">Join Link</a>` : ''}</td>
                                    <td><span class="badge badge-blue">${m.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    // 7. SALES FUNNEL KANBAN MODULE
    renderFunnel: async function() {
        const res = await fetch('api/funnel?action=kanban');
        const data = await res.json();
        if (!data.success) return;

        const k = data.data.kanban;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Sales Funnel & Opportunities</div>
                    <div class="page-subtitle">Kanban pipeline tracking for high-value leads</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="App.openPushLeadModal()">+ Push Lead to Funnel</button>
                </div>
            </div>

            <div class="kanban-board">
                ${k.map(col => `
                    <div class="kanban-column">
                        <div class="column-header">
                            <span>${col.stage.name}</span>
                            <span class="badge badge-blue">${col.items.length}</span>
                        </div>
                        <div class="column-body">
                            ${col.items.map(item => `
                                <div class="kanban-card">
                                    <div style="font-size:12px; font-weight:700; color:var(--primary);">${item.opportunity_code}</div>
                                    <div style="font-size:14px; font-weight:700; color:var(--text-primary);">${item.client_name}</div>
                                    <div style="font-size:12.5px; color:var(--text-muted);">${item.company_name || 'Enterprise'}</div>
                                    <div style="font-size:14px; font-weight:800; color:var(--success-text); margin-top:4px;">₹${parseFloat(item.expected_value).toLocaleString()}</div>
                                    <div style="display:flex; gap:6px; margin-top:6px;">
                                        ${item.stage_id == 8 ? `<button class="btn btn-success btn-sm" onclick="App.openConvertProjectModal(${item.id}, ${item.expected_value})">Convert to Project</button>` : `<button class="btn btn-secondary btn-sm" onclick="App.moveOppStage(${item.id}, ${item.stage_id + 1})">Advance Stage →</button>`}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    moveOppStage: async function(oppId, nextStageId) {
        const formData = new FormData();
        formData.append('action', 'move_stage');
        formData.append('opportunity_id', oppId);
        formData.append('stage_id', nextStageId);

        const res = await fetch('api/funnel', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) this.renderFunnel();
    },

    // 8. PROJECTS WORKSPACE MODULE
    projectsCache: [],
    projectsFilterState: {},

    renderProjects: async function(filters = null) {
        if (!this.dropdowns || !this.dropdowns.project_stages) {
            await this.loadDropdowns();
        }
        if (filters !== null) {
            this.projectsFilterState = { ...(this.projectsFilterState || {}), ...filters };
        }
        const state = this.projectsFilterState || {};

        let queryParams = 'action=list';
        if (state.stage_id) queryParams += '&stage_id=' + encodeURIComponent(state.stage_id);
        if (state.search) queryParams += '&search=' + encodeURIComponent(state.search);

        const res = await fetch(`api/projects?${queryParams}`);
        const data = await res.json();
        if (!data.success) return;
        this.projectsCache = data.data || [];
        const stages = this.dropdowns?.project_stages || [];

        let stageOptionsHtml = `<option value="">All Project Stages</option>` + stages.map(s => 
            `<option value="${s.id}" ${state.stage_id == s.id ? 'selected' : ''}>${s.name}</option>`
        ).join('');

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Active Projects Workspace</div>
                    <div class="page-subtitle">Track project delivery, progress percentages, stage updates & client details</div>
                </div>
            </div>

            <div class="table-card">
                <div style="display:flex; gap:10px; padding:16px; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-radius:18px 18px 0 0; flex-wrap:wrap; align-items:center;">
                    <select class="filter-select" style="min-width:200px;" onchange="App.renderProjects({stage_id: this.value})">
                        ${stageOptionsHtml}
                    </select>
                    <input type="text" id="project-search-input" placeholder="Search project code, client, company..." class="filter-input" style="width:240px;" value="${state.search || ''}" onkeyup="if(event.key==='Enter') App.renderProjects({search: this.value})">
                    <button class="btn btn-secondary btn-sm" onclick="App.renderProjects({search: document.getElementById('project-search-input').value})">Search</button>
                    ${(state.stage_id || state.search) ? `<button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="App.projectsFilterState = {}; App.renderProjects({});">✕ Clear Filters</button>` : ''}
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Project Code</th>
                                <th>Client / Company</th>
                                <th>Service</th>
                                <th>Progress %</th>
                                <th>Stage</th>
                                ${this.currentUser.role_name !== 'operation_executive' ? '<th>Final Value</th><th>Paid Amount</th>' : ''}
                                <th>Delivery Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.projectsCache.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No project records found matching filter.</td></tr>` : ''}
                            ${this.projectsCache.map(p => `
                                <tr>
                                    <td><strong style="color:var(--primary);">${p.project_code}</strong></td>
                                    <td><strong>${p.client_name}</strong><br><small style="color:var(--text-muted)">${p.company_name || ''}</small></td>
                                    <td>${p.service_name || 'Development'}</td>
                                    <td>
                                        <div style="font-weight:700;">${p.progress_percent}%</div>
                                        <div style="width:100px; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                                            <div style="width:${p.progress_percent}%; height:100%; background:var(--primary);"></div>
                                        </div>
                                    </td>
                                    <td><span class="badge" style="background:${p.stage_color || '#3b82f6'}22; color:${p.stage_color || '#3b82f6'}; border:1px solid ${p.stage_color || '#3b82f6'}55;">${p.stage_name}</span></td>
                                    ${this.currentUser.role_name !== 'operation_executive' ? `<td>₹${parseFloat(p.final_amount || 0).toLocaleString()}</td><td><span class="badge badge-green">₹${parseFloat(p.paid_amount || 0).toLocaleString()}</span></td>` : ''}
                                    <td>${p.expected_delivery_date || 'TBD'}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="App.openEditProjectModal(App.projectsCache.find(x => x.id == ${p.id}))">Edit</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    openEditProjectModal: async function(project) {
        if (!project) return;
        if (document.getElementById('edit-project-modal')) return;

        if (!this.dropdowns || !this.dropdowns.project_stages) {
            await this.loadDropdowns();
        }

        const stages = this.dropdowns.project_stages || [
            { id: 1, name: 'Project Kickoff & Requirements', color_code: '#3b82f6' },
            { id: 2, name: 'UI/UX Design & Wireframing', color_code: '#8b5cf6' },
            { id: 3, name: 'Core Development & Integration', color_code: '#ec4899' },
            { id: 4, name: 'QA Testing & UAT Review', color_code: '#f59e0b' },
            { id: 5, name: 'Deployment & Final Handover', color_code: '#10b981' }
        ];

        let stagesHtml = stages.map(s => 
            `<option value="${s.id}" ${project.stage_id == s.id ? 'selected' : ''}>${s.name}</option>`
        ).join('');

        const modalHtml = `
            <div class="modal-backdrop show" id="edit-project-modal">
                <div class="modal-box" style="max-width: 520px; border-radius: 18px; border-top: 4px solid var(--primary); padding:24px;">
                    <div class="modal-header" style="border-bottom:1px solid #f1f5f9; padding-bottom:14px;">
                        <div>
                            <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase;">EDIT PROJECT DETAILS</div>
                            <div class="modal-title" style="font-size:18px; font-weight:800; color:#0f172a; margin-top:2px;">${project.project_code} - ${project.client_name}</div>
                        </div>
                        <button class="close-modal" onclick="App.closeModal('edit-project-modal')">✕</button>
                    </div>
                    <form onsubmit="App.submitEditProject(event, ${project.id})" style="margin-top:16px;">
                        <div style="margin-bottom:16px;">
                            <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Project Stage</label>
                            <select id="edit-prj-stage" class="filter-select" style="width:100%; font-size:14px; font-weight:600;" required>
                                ${stagesHtml}
                            </select>
                        </div>

                        <div style="margin-bottom:16px;">
                            <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Progress Percentage</label>
                            <input type="range" id="edit-prj-progress" min="0" max="100" value="${project.progress_percent}" style="width:100%; cursor:pointer;" oninput="document.getElementById('edit-prj-progress-val').innerText = this.value + '%'">
                            <div style="text-align:right; font-weight:800; color:var(--primary); font-size:13px;" id="edit-prj-progress-val">${project.progress_percent}%</div>
                        </div>

                        <div style="margin-bottom:16px;">
                            <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Expected Delivery Date</label>
                            <input type="date" id="edit-prj-date" class="filter-input" style="width:100%;" value="${project.expected_delivery_date || ''}">
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Log Progress Notes / Remark</label>
                            <textarea id="edit-prj-notes" class="filter-input" style="width:100%; height:80px;" placeholder="Brief details about current project progress..."></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:14px; font-weight:800; border-radius:12px;">Save Project Updates</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    submitEditProject: async function(e, projectId) {
        e.preventDefault();
        const stageId = document.getElementById('edit-prj-stage').value;
        const progress = document.getElementById('edit-prj-progress').value;
        const deliveryDate = document.getElementById('edit-prj-date').value;
        const notes = document.getElementById('edit-prj-notes').value;

        const formData = new FormData();
        formData.append('action', 'update');
        formData.append('id', projectId);
        formData.append('stage_id', stageId);
        formData.append('progress_percent', progress);
        formData.append('expected_delivery_date', deliveryDate);
        formData.append('notes', notes);

        const res = await fetch('api/projects', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.closeModal('edit-project-modal');
            this.renderProjects();
        } else {
            alert(data.message || 'Failed to update project');
        }
    },

    // 9. ADVANCED ANALYTICS & OPERATIONS REPORTS MODULE
    activeReportTab: 'status',

    renderReports: async function(tab = null) {
        if (tab) this.activeReportTab = tab;
        const currentTab = this.activeReportTab || 'status';

        const res = await fetch(`api/reports?type=${currentTab}`);
        const data = await res.json();
        if (!data.success) return;

        const reportData = data.data || [];

        let tableHeaders = '';
        let tableRows = '';

        if (currentTab === 'status') {
            tableHeaders = `
                <th>Lead Status</th>
                <th>Total Leads Count</th>
                <th>Qualified Prospects</th>
                <th>Qualification Rate</th>
                <th>Pipeline Value</th>
            `;
            tableRows = reportData.map(r => `
                <tr>
                    <td><strong>${r.status_name}</strong></td>
                    <td><span class="badge badge-blue" style="font-size:13px; padding:6px 12px;">${r.lead_count}</span></td>
                    <td><strong>${r.qualified_count || 0}</strong></td>
                    <td><span class="badge badge-green">${r.lead_count > 0 ? Math.round(((r.qualified_count || 0)/r.lead_count)*100) : 0}%</span></td>
                    <td>₹${(r.pipeline_value ? parseFloat(r.pipeline_value).toLocaleString('en-IN') : '0')}</td>
                </tr>
            `).join('');
        } else if (currentTab === 'executives') {
            tableHeaders = `
                <th>Executive Name</th>
                <th>Total Calls Logged</th>
                <th>Connected Calls</th>
                <th>Connection Rate</th>
                <th>Leads Qualified</th>
            `;
            tableRows = reportData.map(r => `
                <tr>
                    <td><strong>${r.executive_name}</strong></td>
                    <td><span class="badge badge-blue" style="font-size:13px; padding:6px 12px;">${r.total_calls}</span></td>
                    <td><strong>${r.connected_calls || 0}</strong></td>
                    <td><span class="badge badge-green">${r.total_calls > 0 ? Math.round(((r.connected_calls || 0)/r.total_calls)*100) : 0}%</span></td>
                    <td><span class="badge badge-amber">${r.qualified_leads || 0}</span></td>
                </tr>
            `).join('');
        } else if (currentTab === 'services') {
            tableHeaders = `
                <th>Service Name</th>
                <th>Total Lead Inquiries</th>
                <th>Active Projects</th>
                <th>Total Revenue Earned</th>
            `;
            tableRows = reportData.map(r => `
                <tr>
                    <td><strong>${r.service_name}</strong></td>
                    <td><span class="badge badge-blue" style="font-size:13px; padding:6px 12px;">${r.lead_count}</span></td>
                    <td><strong>${r.project_count || 0}</strong></td>
                    <td><strong style="color:var(--success-text);">₹${parseFloat(r.total_revenue || 0).toLocaleString('en-IN')}</strong></td>
                </tr>
            `).join('');
        } else if (currentTab === 'source') {
            tableHeaders = `
                <th>Lead Source</th>
                <th>Total Leads Acquired</th>
                <th>Qualified Leads</th>
                <th>Conversion Rate</th>
            `;
            tableRows = reportData.map(r => `
                <tr>
                    <td><strong>${r.source_name}</strong></td>
                    <td><span class="badge badge-blue" style="font-size:13px; padding:6px 12px;">${r.total_leads}</span></td>
                    <td><strong>${r.qualified_leads || 0}</strong></td>
                    <td><span class="badge badge-green">${r.total_leads > 0 ? Math.round(((r.qualified_leads || 0)/r.total_leads)*100) : 0}%</span></td>
                </tr>
            `).join('');
        }

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Advanced Operations & Analytics Reports</div>
                    <div class="page-subtitle">Comprehensive data tables, pipeline performance & executive metrics</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="window.location.href='api/reports?action=export&type=${currentTab}'">Download CSV Report</button>
                </div>
            </div>

            <div class="table-card">
                <!-- REPORT TAB NAVIGATION -->
                <div style="display:flex; gap:10px; padding:16px; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-radius:18px 18px 0 0; flex-wrap:wrap;">
                    <button class="btn btn-sm ${currentTab === 'status' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderReports('status')">Lead Pipeline Conversion</button>
                    <button class="btn btn-sm ${currentTab === 'executives' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderReports('executives')">Telecalling Executive Metrics</button>
                    <button class="btn btn-sm ${currentTab === 'services' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderReports('services')">Service Portfolio Revenue</button>
                    <button class="btn btn-sm ${currentTab === 'source' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderReports('source')">Lead Source Acquisition</button>
                </div>

                <!-- DATA TABLE -->
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${tableHeaders}
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No report data available for this view.</td></tr>` : ''}
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    // 10. SYSTEM SETTINGS MODULE
    activeSettingsTab: 'statuses',

    renderSettings: async function(tab = null) {
        if (tab) this.activeSettingsTab = tab;
        const currentTab = this.activeSettingsTab || 'statuses';

        const dropdownRes = await fetch('api/settings?action=get_dropdowns');
        const dropdownData = await dropdownRes.json();
        if (!dropdownData.success) return;
        const d = dropdownData.data;

        let tabContentHtml = '';

        if (currentTab === 'statuses') {
            tabContentHtml = `
                <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px;">
                    <div class="table-card">
                        <div style="padding:16px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:15px; color:#0f172a;">Active Lead Statuses</div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Sort Order</th><th>Status Name</th><th>Color Badge Preview</th></tr>
                                </thead>
                                <tbody>
                                    ${d.statuses.map(s => `
                                        <tr>
                                            <td>#${s.sort_order}</td>
                                            <td><strong>${s.name}</strong></td>
                                            <td><span class="badge" style="background:${s.color_code}22; color:${s.color_code}; border:1px solid ${s.color_code}55;">${s.name}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:20px;">
                        <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:14px;">+ Add Lead Status</div>
                        <form onsubmit="App.submitAddStatus(event)">
                            <div style="margin-bottom:14px;">
                                <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Status Name *</label>
                                <input type="text" id="new-status-name" class="filter-input" style="width:100%;" placeholder="e.g. Negotiation" required>
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Badge Color *</label>
                                <input type="color" id="new-status-color" value="#3b82f6" style="width:100%; height:40px; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer;">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Save Status</button>
                        </form>
                    </div>
                </div>
            `;
        } else if (currentTab === 'sources') {
            tabContentHtml = `
                <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px;">
                    <div class="table-card">
                        <div style="padding:16px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:15px; color:#0f172a;">Active Lead Sources</div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Source ID</th><th>Source Name</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    ${d.sources.map(src => `
                                        <tr>
                                            <td>#${src.id}</td>
                                            <td><strong>${src.name}</strong></td>
                                            <td><span class="badge badge-green">Active</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:20px;">
                        <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:14px;">+ Add Lead Source</div>
                        <form onsubmit="App.submitAddSource(event)">
                            <div style="margin-bottom:16px;">
                                <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Source Channel Name *</label>
                                <input type="text" id="new-source-name" class="filter-input" style="width:100%;" placeholder="e.g. LinkedIn Ads" required>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Save Source</button>
                        </form>
                    </div>
                </div>
            `;
        } else if (currentTab === 'services') {
            tabContentHtml = `
                <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px;">
                    <div class="table-card">
                        <div style="padding:16px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:15px; color:#0f172a;">Service Portfolio & Pricing</div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Service Name</th><th>Base Price</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    ${d.services.map(srv => `
                                        <tr>
                                            <td><strong>${srv.name}</strong></td>
                                            <td>₹${parseFloat(srv.default_amount || 0).toLocaleString('en-IN')}</td>
                                            <td><span class="badge badge-green">Active</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:20px;">
                        <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:14px;">+ Add New Service</div>
                        <form onsubmit="App.submitAddService(event)">
                            <div style="margin-bottom:14px;">
                                <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Service Title *</label>
                                <input type="text" id="new-service-name" class="filter-input" style="width:100%;" placeholder="e.g. App Development" required>
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Default Amount (₹)</label>
                                <input type="number" id="new-service-amount" class="filter-input" style="width:100%;" placeholder="50000">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Save Service</button>
                        </form>
                    </div>
                </div>
            `;
        } else if (currentTab === 'health') {
            const healthRes = await fetch('api/settings?action=system_health');
            const healthData = await healthRes.json();
            const sh = healthData.data || {};

            const logRes = await fetch('api/settings?action=list_activity_logs');
            const logData = await logRes.json();
            const logs = logData.data || [];

            tabContentHtml = `
                <div>
                    <div class="kpi-grid" style="margin-bottom:20px;">
                        <div class="kpi-card" style="background:#ffffff; border:1px solid #e2e8f0;">
                            <div class="kpi-header"><span>PHP Engine</span></div>
                            <div class="kpi-val" style="font-size:22px;">v${sh.php_version || '8.x'}</div>
                            <div class="kpi-sub">Database: ${sh.db_name || 'MySQL'}</div>
                        </div>
                        <div class="kpi-card" style="background:#ffffff; border:1px solid #e2e8f0;">
                            <div class="kpi-header"><span>Database Tables</span></div>
                            <div class="kpi-val" style="font-size:22px;">${sh.tables_count || 0} Tables</div>
                            <div class="kpi-sub">DB Size: ${sh.db_size_mb || '0'} MB</div>
                        </div>
                        <div class="kpi-card" style="background:#ffffff; border:1px solid #e2e8f0;">
                            <div class="kpi-header"><span>System Records</span></div>
                            <div class="kpi-val" style="font-size:22px;">${sh.total_leads || 0} Leads</div>
                            <div class="kpi-sub">${sh.total_calls || 0} Call Logs | ${sh.total_projects || 0} Projects</div>
                        </div>
                        <div class="kpi-card" style="background:#ffffff; border:1px solid #e2e8f0;">
                            <div class="kpi-header"><span>System Health</span></div>
                            <div class="kpi-val" style="font-size:22px; color:var(--success-text);">Operational</div>
                            <div class="kpi-sub">All database connections active</div>
                        </div>
                    </div>

                    <div class="table-card">
                        <div style="padding:16px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:15px; color:#0f172a;">Recent Audit & System Logs</div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Timestamp</th><th>User</th><th>Module</th><th>Action</th><th>IP Address</th></tr>
                                </thead>
                                <tbody>
                                    ${logs.slice(0, 15).map(l => `
                                        <tr>
                                            <td><small style="color:#64748b;">${l.created_at}</small></td>
                                            <td><strong>${l.user_name || 'System'}</strong></td>
                                            <td><span class="badge badge-blue">${l.module}</span></td>
                                            <td>${l.action}</td>
                                            <td><code>${l.ip_address || '127.0.0.1'}</code></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentTab === 'notifications') {
            let notifLogs = [];
            let allUsers = [];
            let fcmTokens = [];
            try {
                const logsRes = await fetch('api/notifications?action=logs');
                const logsData = await logsRes.json();
                if (logsData.success) notifLogs = logsData.data || [];

                const usersRes = await fetch('api/users?action=list');
                const usersData = await usersRes.json();
                if (usersData.success) allUsers = usersData.data || [];

                const tokensRes = await fetch('api/notifications?action=get_tokens');
                const tokensData = await tokensRes.json();
                if (tokensData.success) fcmTokens = tokensData.data || [];
            } catch(e) {}

            const isAdmin = (this.currentUser.role_name === 'super_admin' || this.currentUser.role_name === 'manager');

            tabContentHtml = `
                <div style="display:grid; grid-template-columns: ${isAdmin ? '1fr 1.6fr' : '1fr'}; gap:20px;">
                    ${isAdmin ? `
                        <div style="background:#ffffff; border:1px solid #cbd5e1; border-top:4px solid #2563eb; border-radius:18px; padding:22px; box-shadow:var(--shadow-xs);">
                            <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:4px;">Dispatch Push Notification</div>
                            <div style="font-size:12.5px; color:#64748b; margin-bottom:16px;">Send instant push alerts to all active team members or a specific user.</div>
                            
                            <form onsubmit="App.submitSendNotification(event)">
                                <div style="margin-bottom:14px;">
                                    <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Target Recipient *</label>
                                    <select name="target_type" class="filter-select" style="width:100%; font-size:13.5px;" onchange="document.getElementById('notif-user-select-container').style.display = this.value === 'user' ? 'block' : 'none';" required>
                                        <option value="all">Broadcast to All Team Members</option>
                                        <option value="user">Specific Team Member Only</option>
                                    </select>
                                </div>

                                <div id="notif-user-select-container" style="display:none; margin-bottom:14px;">
                                    <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Select Recipient User *</label>
                                    <select name="recipient_id" class="filter-select" style="width:100%; font-size:13.5px;">
                                        <option value="">Choose Team Member...</option>
                                        ${allUsers.map(u => `<option value="${u.id}">${u.name} (${u.email}) — ${u.role_display}</option>`).join('')}
                                    </select>
                                </div>

                                <div style="margin-bottom:14px;">
                                    <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Notification Title *</label>
                                    <input type="text" name="title" class="filter-input" style="width:100%;" placeholder="e.g. Urgent Lead Follow-up" required>
                                </div>

                                <div style="margin-bottom:18px;">
                                    <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Message Content *</label>
                                    <textarea name="message" class="filter-input" style="width:100%; height:90px; padding:10px; font-size:13px;" placeholder="Write clear notification message..." required></textarea>
                                </div>

                                <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:12px; font-weight:800;">Dispatch Notification Now</button>
                            </form>
                        </div>
                    ` : ''}

                    <div style="display:flex; flex-direction:column; gap:20px;">
                        <!-- Registered Devices Table Card -->
                        <div class="table-card">
                            <div style="padding:16px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:15px; color:#0f172a; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <span>Registered FCM Devices & Tokens</span>
                                    <small style="display:block; font-size:11px; color:#64748b; font-weight:500;">Active mobile apps & web browsers registered for push alerts</small>
                                </div>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="App.registerCurrentWebDeviceToken()">+ Register Current Web Browser</button>
                                    <span class="badge badge-green">${fcmTokens.length} Active Devices</span>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>User Name</th>
                                            <th>Email</th>
                                            <th>Device Type</th>
                                            <th>FCM Token snippet</th>
                                            <th>Registered At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${fcmTokens.length === 0 ? `
                                            <tr>
                                                <td colspan="6" style="text-align:center; padding:25px; color:#64748b;">
                                                    No registered device tokens found yet.<br>
                                                    <small style="color:#94a3b8;">Click <strong>"+ Register Current Web Browser"</strong> above or login to the Flutter CRM app to register this device.</small>
                                                </td>
                                            </tr>
                                        ` : ''}
                                        ${fcmTokens.map((t, idx) => `
                                            <tr>
                                                <td>${idx + 1}</td>
                                                <td><strong>${t.user_name || 'User #' + t.user_id}</strong></td>
                                                <td><small style="color:#64748b;">${t.user_email || '-'}</small></td>
                                                <td>
                                                    <span class="badge ${t.device_type === 'android_app' ? 'badge-blue' : 'badge-purple'}">
                                                        ${t.device_type === 'android_app' ? '📱 Android App' : '🌐 Web Browser'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <code style="background:#f1f5f9; padding:3px 6px; border-radius:4px; font-size:11px; color:#334155;">
                                                        ${t.fcm_token ? (t.fcm_token.substring(0, 18) + '...') : '-'}
                                                    </code>
                                                </td>
                                                <td><small style="color:#64748b;">${t.updated_at || t.created_at}</small></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Notification Logs Table Card -->
                        <div class="table-card">
                            <div style="padding:16px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:15px; color:#0f172a; display:flex; justify-content:space-between; align-items:center;">
                                <span>Notification Dispatch History & Audit Logs</span>
                                <span class="badge badge-blue">${notifLogs.length} Sent</span>
                            </div>
                            <div class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Date & Time</th>
                                            <th>Dispatched By</th>
                                            <th>Target Recipient</th>
                                            <th>Title</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${notifLogs.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No notification dispatch logs found.</td></tr>` : ''}
                                        ${notifLogs.map((n, idx) => `
                                            <tr>
                                                <td>${idx + 1}</td>
                                                <td><small style="color:#64748b;">${n.created_at}</small></td>
                                                <td><strong>${n.sender_name || 'Admin'}</strong></td>
                                                <td><span class="badge ${n.target_type === 'all' ? 'badge-blue' : 'badge-green'}">${n.target_type === 'all' ? 'All Members' : (n.recipient_name || 'User')}</span></td>
                                                <td><strong>${n.title}</strong></td>
                                                <td><small style="color:#475569;">${n.message}</small></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">CRM System Settings & Control Panel</div>
                    <div class="page-subtitle">Configure lead statuses, acquisition sources, services portfolio, notifications & system health</div>
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button class="btn ${currentTab === 'statuses' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderSettings('statuses')">Lead Statuses</button>
                <button class="btn ${currentTab === 'sources' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderSettings('sources')">Lead Sources</button>
                <button class="btn ${currentTab === 'services' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderSettings('services')">Services Portfolio</button>
                <button class="btn ${currentTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderSettings('notifications')">Push Notifications & Logs</button>
                <button class="btn ${currentTab === 'health' ? 'btn-primary' : 'btn-secondary'}" onclick="App.renderSettings('health')">System Health & Audit Logs</button>
            </div>

            ${tabContentHtml}
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    submitAddStatus: async function(e) {
        e.preventDefault();
        const name = document.getElementById('new-status-name').value;
        const color = document.getElementById('new-status-color').value;

        const formData = new FormData();
        formData.append('action', 'add_status');
        formData.append('name', name);
        formData.append('color_code', color);

        const res = await fetch('api/settings', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.renderSettings('statuses');
        } else {
            alert(data.message || 'Error adding status');
        }
    },

    submitAddSource: async function(e) {
        e.preventDefault();
        const name = document.getElementById('new-source-name').value;

        const formData = new FormData();
        formData.append('action', 'add_source');
        formData.append('name', name);

        const res = await fetch('api/settings', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.renderSettings('sources');
        } else {
            alert(data.message || 'Error adding source');
        }
    },

    submitAddService: async function(e) {
        e.preventDefault();
        const name = document.getElementById('new-service-name').value;
        const amount = document.getElementById('new-service-amount').value;

        const formData = new FormData();
        formData.append('action', 'add_service');
        formData.append('name', name);
        formData.append('default_amount', amount);

        const res = await fetch('api/settings', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.renderSettings('services');
        } else {
            alert(data.message || 'Error adding service');
        }
    },

    submitSendNotification: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'send');

        const res = await fetch('api/notifications', { method: 'POST', body: formData });
        const data = await res.json();
        let msg = data.message || 'Notification dispatched.';
        if (typeof data.registered_tokens !== 'undefined') {
            msg += `\n\n• Total Registered Devices: ${data.registered_tokens}\n• Successfully Delivered: ${data.delivered_tokens}`;
        }
        alert(msg);
        if (data.success) {
            form.reset();
            this.renderSettings('notifications');
        }
    },

    registerCurrentWebDeviceToken: async function() {
        let token = localStorage.getItem('fcm_device_token');
        if (!token) {
            token = 'web_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
            localStorage.setItem('fcm_device_token', token);
        }

        if ('Notification' in window && Notification.permission !== 'granted') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                alert('Notification permission denied by browser. Please enable permissions in browser address bar.');
                return;
            }
        }

        const formData = new FormData();
        formData.append('action', 'register_token');
        formData.append('fcm_token', token);
        formData.append('device_type', 'web');

        const res = await fetch('api/notifications', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message || 'Web browser token registered successfully.');
        this.renderSettings('notifications');
    },

    // 10. USER MANAGEMENT MODULE
    usersCache: [],

    renderUsers: async function() {
        const res = await fetch('api/users?action=list');
        const data = await res.json();
        if (!data.success) return;
        this.usersCache = data.data;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">User & Role Management</div>
                    <div class="page-subtitle">Manage system users, managers, operation executives, and page access permissions</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="App.openCreateUserModal()">+ Add New User</button>
                </div>
            </div>

            <div class="table-card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Role</th>
                                <th>Team</th>
                                <th>Allowed Page Access</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(u => {
                                const pages = u.allowed_pages ? u.allowed_pages.split(',') : ['dashboard','leads','calling_queue','followups','meetings'];
                                return `
                                <tr>
                                    <td><strong>${u.name}</strong></td>
                                    <td>${u.email}</td>
                                    <td>${u.mobile}</td>
                                    <td><span class="badge badge-blue">${u.role_display}</span></td>
                                    <td>${u.team_name || 'General'}</td>
                                    <td>
                                        <div style="display:flex; flex-wrap:wrap; gap:4px; max-width:240px;">
                                            ${pages.map(p => `<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; text-transform:capitalize;">${p.replace('_',' ')}</span>`).join('')}
                                        </div>
                                    </td>
                                    <td><span class="badge ${u.status==='active'?'badge-green':'badge-red'}">${u.status}</span></td>
                                    <td>
                                        <div style="display:flex; gap:6px;">
                                            <button class="btn btn-secondary btn-sm" onclick="App.openCreateUserModal(App.usersCache.find(x => x.id == ${u.id}))">Edit</button>
                                            <button class="btn btn-secondary btn-sm" onclick="App.toggleUserStatus(${u.id}, '${u.status==='active'?'inactive':'active'}')">Status</button>
                                        </div>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    openCreateUserModal: async function(userData = null) {
        if (document.getElementById('create-user-modal')) return;

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
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'leads', label: 'All Leads' },
            { key: 'calling_queue', label: 'Calling Queue' },
            { key: 'followups', label: 'Follow-ups' },
            { key: 'meetings', label: 'Meetings' },
            { key: 'funnel', label: 'Sales Funnel' },
            { key: 'projects', label: 'Projects Workspace' },
            { key: 'reports', label: 'Analytics & Reports' },
            { key: 'users', label: 'Members & User Management' },
            { key: 'import', label: 'Bulk CSV Import' }
        ];

        const isEdit = !!userData;
        const userAllowedPages = (userData && userData.allowed_pages) 
            ? userData.allowed_pages.split(',') 
            : ['dashboard', 'leads', 'calling_queue', 'followups', 'meetings'];

        const modalHtml = `
            <div class="modal-backdrop show" id="create-user-modal">
                <div class="modal-box" style="max-width: 640px; border-radius: 18px; border-top: 4px solid var(--primary); padding: 24px;">
                    <div class="modal-header" style="border-bottom:1px solid #f1f5f9; padding-bottom:14px;">
                        <div class="modal-title" style="font-size:18px; font-weight:800; color:#0f172a;">
                            ${isEdit ? 'Edit Member & Selected Page Access' : 'Add New Team Member'}
                        </div>
                        <button class="close-modal" onclick="App.closeModal('create-user-modal')">✕</button>
                    </div>

                    <form onsubmit="App.submitCreateUser(event, ${isEdit ? userData.id : 'null'})" style="margin-top:16px;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                            <div>
                                <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Full Name *</label>
                                <input type="text" name="name" class="form-control" value="${isEdit ? userData.name : ''}" placeholder="e.g. Amit Sharma" required style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px;">
                            </div>
                            <div>
                                <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Email Address *</label>
                                <input type="email" name="email" class="form-control" value="${isEdit ? userData.email : ''}" placeholder="amit@company.com" required style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px;">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:14px;">
                            <div>
                                <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Mobile Number *</label>
                                <input type="text" name="mobile" class="form-control" value="${isEdit ? userData.mobile : ''}" placeholder="+91 9876543210" required style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px;">
                            </div>
                            <div>
                                <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Password ${isEdit ? '(Leave blank to keep unchanged)' : '*'}</label>
                                <input type="password" name="password" class="form-control" placeholder="••••••••" ${isEdit ? '' : 'required'} style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px;">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:14px;">
                            <div>
                                <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Select System Role *</label>
                                <select name="role_id" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px;">
                                    ${roles.map(r => `<option value="${r.id}" ${isEdit && userData.role_id == r.id ? 'selected' : (r.id == 3 ? 'selected' : '')}>${r.display_name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size:12.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Select Calling Team</label>
                                <select name="team_id" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px;">
                                    <option value="">No Specific Team</option>
                                    ${teams.map(t => `<option value="${t.id}" ${isEdit && userData.team_id == t.id ? 'selected' : ''}>${t.team_name}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- SELECT ALLOWED PAGES DROPDOWN / CHECKBOXES -->
                        <div style="margin-top:18px;">
                            <label style="font-size:13px; font-weight:800; color:#0f172a; display:block; margin-bottom:4px;">
                                Select Allowed Pages & Modules for this User
                            </label>
                            <div style="font-size:12px; color:#64748b; margin-bottom:10px;">Check which pages will be visible to this user on their menu and dashboard:</div>
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; background:#f8fafc; border:1px solid #e2e8f0; padding:14px; border-radius:12px; max-height:180px; overflow-y:auto;">
                                ${availablePages.map(p => `
                                    <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#334155; cursor:pointer;">
                                        <input type="checkbox" name="allowed_pages[]" value="${p.key}" ${userAllowedPages.includes(p.key) ? 'checked' : ''} style="width:16px; height:16px; accent-color:#2563eb;">
                                        <span>${p.label}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px; border-top:1px solid #f1f5f9; padding-top:16px;">
                            <button type="button" class="btn btn-secondary" onclick="App.closeModal('create-user-modal')">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="font-weight:700;">${isEdit ? 'Save User & Permissions' : 'Create User Account'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
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
        alert(data.message);
        if (data.success) {
            this.closeModal('create-user-modal');
            this.renderUsers();
        }
    },

    toggleUserStatus: async function(id, newStatus) {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('id', id);
        formData.append('status', newStatus);

        const res = await fetch('api/users', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (data.success) this.renderUsers();
    },

    // 11. BULK CSV IMPORT UI
    parsedCsvLeads: [],

    renderImport: async function() {
        // Fetch all system users for assignment dropdowns
        let allUsers = [];
        try {
            const res = await fetch('api/users?action=list');
            const data = await res.json();
            if (data.success && data.data) {
                allUsers = data.data;
            }
        } catch(err) {
            console.error(err);
        }

        const icons = {
            download: `<svg style="width:16px;height:16px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
            file: `<svg style="width:18px;height:18px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
            analytics: `<svg style="width:16px;height:16px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
        };

        let html = `
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div>
                    <div class="page-title">Bulk CSV Lead Importer & Assignment</div>
                    <div class="page-subtitle">Analyze full CSV table, inspect data rows, and assign leads to team members before final insertion</div>
                </div>
                <div class="header-actions">
                    <a href="api/leads?action=sample_csv" class="btn btn-secondary" style="background:#ffffff; border:1px solid #cbd5e1; font-weight:700; color:#0f172a; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        ${icons.download} Download Sample CSV Template
                    </a>
                </div>
            </div>

            <!-- STEP 1: UPLOAD & ANALYZE CARD -->
            <div class="card" style="background:var(--card-bg); border:1px solid var(--card-border); padding:24px; border-radius:14px; margin-bottom:24px; box-shadow:var(--shadow-xs);">
                <div style="font-size:15px; font-weight:800; color:#0f172a; margin-bottom:12px; display:flex; align-items:center; gap:10px;">
                    <span style="background:#eff6ff; color:#2563eb; font-size:12px; padding:4px 10px; border-radius:20px; font-weight:800; border:1px solid #bfdbfe;">STEP 1</span>
                    <span style="font-weight:800; color:#0f172a;">Select CSV File to Analyze</span>
                    <span style="font-size:12px; color:#64748b; font-weight:500;">(Columns: Full Name, Mobile Number, Email Address, Company Name, City, Priority, Service Requested, Lead Source, Initial Requirement)</span>
                </div>
                <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                    <input type="file" id="csv-file-input" accept=".csv" onchange="App.handleCsvAnalysis(event)" style="flex:1; min-width:280px; padding:12px; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; color:#0f172a; font-size:14px;">
                    <button type="button" onclick="document.getElementById('csv-file-input').click()" class="btn btn-primary" style="font-weight:700; padding:12px 20px; display:inline-flex; align-items:center; gap:8px;">
                        ${icons.analytics} Analyze & Preview File
                    </button>
                </div>
            </div>

            <!-- CONTAINER FOR PARSED CSV PREVIEW & ASSIGNMENT -->
            <div id="csv-preview-container">
                <div style="text-align:center; padding:48px 20px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:14px; color:#64748b;">
                    <div style="width:48px; height:48px; margin:0 auto 12px auto; background:#eff6ff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#2563eb;">
                        ${icons.file}
                    </div>
                    <div style="font-size:16px; font-weight:700; color:#334155;">No CSV File Analyzed Yet</div>
                    <div style="font-size:13px; color:#94a3b8; margin-top:4px;">Upload a CSV file above or download the sample template to inspect rows before importing.</div>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
        this.allUsersListCache = allUsers;
    },

    allUsersListCache: [],

    handleCsvAnalysis: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                alert('CSV file appears empty or missing header row.');
                return;
            }

            // Parse header line
            const parseCsvLine = (line) => {
                const result = [];
                let cell = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(cell.trim().replace(/^"|"$/g, ''));
                        cell = '';
                    } else {
                        cell += char;
                    }
                }
                result.push(cell.trim().replace(/^"|"$/g, ''));
                return result;
            };

            const headers = parseCsvLine(lines[0]).map(h => h.trim());
            const rows = [];
            const mobileSeen = new Set();
            let validCount = 0;
            let duplicateCount = 0;
            let invalidCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i]);
                if (cols.length === 0 || cols.every(c => c === '')) continue;

                // Create lead object mapped by header or index fallback
                const rowObj = {
                    full_name: cols[0] || '',
                    mobile: cols[1] || '',
                    email: cols[2] || '',
                    company_name: cols[3] || '',
                    city: cols[4] || '',
                    priority: cols[5] || 'Medium',
                    service_requested: cols[6] || '',
                    lead_source: cols[7] || '',
                    requirement: cols[8] || ''
                };

                let status = 'Valid';
                let reason = '';
                const cleanMobile = rowObj.mobile.replace(/\D/g, '');

                if (!rowObj.full_name || !rowObj.mobile) {
                    status = 'Invalid';
                    reason = 'Missing Name or Mobile';
                    invalidCount++;
                } else if (mobileSeen.has(cleanMobile)) {
                    status = 'Duplicate';
                    reason = 'Duplicate in file';
                    duplicateCount++;
                } else {
                    mobileSeen.add(cleanMobile);
                    validCount++;
                }

                rows.push({ ...rowObj, status, reason });
            }

            this.parsedCsvLeads = rows;
            this.renderCsvPreviewTable(rows, headers, validCount, duplicateCount, invalidCount);
        };
        reader.readAsText(file);
    },

    renderCsvPreviewTable: function(rows, headers, validCount, duplicateCount, invalidCount) {
        // Show ALL system users in both manager and executive dropdowns
        const userOptions = this.allUsersListCache.map(u => {
            const roleLabel = u.display_name || u.role_name || 'Member';
            return `<option value="${u.id}">${u.name} — ${roleLabel} (${u.email})</option>`;
        }).join('');

        const icons = {
            check: `<svg style="width:16px;height:16px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2.5;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
            user: `<svg style="width:15px;height:15px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
            phone: `<svg style="width:15px;height:15px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
            flame: `<svg style="width:15px;height:15px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>`,
            send: `<svg style="width:16px;height:16px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
        };

        const previewHtml = `
            <!-- ANALYSIS SUMMARY BAR -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:14px; margin-bottom:20px;">
                <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:14px; border-radius:12px;">
                    <div style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase;">Total Parsed Rows</div>
                    <div style="font-size:22px; font-weight:800; color:#1e3a8a; margin-top:2px;">${rows.length}</div>
                </div>
                <div style="background:#f0fdf4; border:1px solid #a7f3d0; padding:14px; border-radius:12px;">
                    <div style="font-size:11px; font-weight:800; color:#166534; text-transform:uppercase;">Ready to Import</div>
                    <div style="font-size:22px; font-weight:800; color:#14532d; margin-top:2px;">${validCount}</div>
                </div>
                <div style="background:#fff7ed; border:1px solid #fed7aa; padding:14px; border-radius:12px;">
                    <div style="font-size:11px; font-weight:800; color:#9a3412; text-transform:uppercase;">File Duplicates</div>
                    <div style="font-size:22px; font-weight:800; color:#7c2d12; margin-top:2px;">${duplicateCount}</div>
                </div>
                <div style="background:#fef2f2; border:1px solid #fecaca; padding:14px; border-radius:12px;">
                    <div style="font-size:11px; font-weight:800; color:#991b1b; text-transform:uppercase;">Invalid Rows</div>
                    <div style="font-size:22px; font-weight:800; color:#7f1d1d; margin-top:2px;">${invalidCount}</div>
                </div>
            </div>

            <!-- 2. FULL PREVIEW TABLE -->
            <div class="table-card" style="margin-bottom:24px; border-radius:14px;">
                <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:15px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                        <span style="background:#eff6ff; color:#2563eb; font-size:12px; padding:4px 10px; border-radius:20px; font-weight:800; border:1px solid #bfdbfe;">STEP 2</span>
                        <span>Full Analyzed Data Table Preview</span>
                    </div>
                    <span class="badge badge-blue">${rows.length} Rows</span>
                </div>
                <div class="table-responsive" style="max-height:420px; overflow-y:auto;">
                    <table class="data-table" style="font-size:13px;">
                        <thead>
                            <tr style="position:sticky; top:0; background:#f8fafc; z-index:2;">
                                <th>#</th>
                                <th>Status</th>
                                <th>Full Name</th>
                                <th>Mobile Number</th>
                                <th>Email</th>
                                <th>Company</th>
                                <th>City</th>
                                <th>Priority</th>
                                <th>Service Requested</th>
                                <th>Lead Source</th>
                                <th>Initial Requirement</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((r, idx) => {
                                let badgeClass = r.status === 'Valid' ? 'badge-green' : (r.status === 'Duplicate' ? 'badge-orange' : 'badge-red');
                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td>
                                            <span class="badge ${badgeClass}">${r.status}</span>
                                            ${r.reason ? `<br><small style="color:#ef4444; font-size:10.5px;">${r.reason}</small>` : ''}
                                        </td>
                                        <td><strong>${r.full_name || '—'}</strong></td>
                                        <td><code>${r.mobile || '—'}</code></td>
                                        <td>${r.email || '—'}</td>
                                        <td>${r.company_name || '—'}</td>
                                        <td>${r.city || '—'}</td>
                                        <td><span class="badge ${r.priority === 'High' ? 'badge-red' : (r.priority === 'Low' ? 'badge-blue' : 'badge-orange')}">${r.priority}</span></td>
                                        <td>${r.service_requested || '—'}</td>
                                        <td>${r.lead_source || '—'}</td>
                                        <td><small style="color:#64748b;">${r.requirement || '—'}</small></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- STEP 3: ASSIGNMENT & FINAL IMPORT CONTROL PANEL -->
            <div class="card" style="background:#ffffff; border:1px solid #cbd5e1; border-top:4px solid #2563eb; border-radius:14px; padding:24px; box-shadow:0 10px 25px -5px rgba(37, 99, 235, 0.1);">
                <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:16px; display:flex; align-items:center; gap:10px;">
                    <span style="background:#eff6ff; color:#2563eb; font-size:12px; padding:4px 10px; border-radius:20px; font-weight:800; border:1px solid #bfdbfe;">STEP 3</span>
                    <span>Assign Team Members & Trigger Final Import</span>
                </div>
                
                <form onsubmit="App.submitParsedCsvImport(event)">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:18px; margin-bottom:20px;">
                        <div>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; color:#334155; margin-bottom:6px;">
                                ${icons.user} Assign Sales Manager / Owner
                            </label>
                            <select id="import-assign-manager" class="form-control" style="width:100%; padding:11px; border:1px solid #cbd5e1; border-radius:10px; font-size:13.5px; font-weight:600; background:#ffffff;">
                                <option value="">Auto-Assign / No Manager Selected</option>
                                ${userOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; color:#334155; margin-bottom:6px;">
                                ${icons.phone} Assign Telecalling / Executive Member
                            </label>
                            <select id="import-assign-executive" class="form-control" style="width:100%; padding:11px; border:1px solid #cbd5e1; border-radius:10px; font-size:13.5px; font-weight:600; background:#ffffff;">
                                <option value="">Auto-Assign / Unassigned Queue</option>
                                ${userOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; color:#334155; margin-bottom:6px;">
                                ${icons.flame} Priority Batch Override
                            </label>
                            <select id="import-priority" class="form-control" style="width:100%; padding:11px; border:1px solid #cbd5e1; border-radius:10px; font-size:13.5px; font-weight:600; background:#ffffff;">
                                <option value="Keep CSV Value">Keep CSV Row Priority</option>
                                <option value="High">Force High Priority</option>
                                <option value="Medium">Force Medium Priority</option>
                                <option value="Low">Force Low Priority</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; border-top:1px solid #e2e8f0; padding-top:18px;">
                        <div style="font-size:13px; color:#475569; font-weight:600;">
                            Target Leads: <strong style="color:#2563eb;">${validCount} Valid Leads</strong> will be created in Database
                        </div>
                        <button type="submit" class="btn btn-primary" style="padding:13px 28px; font-size:15px; font-weight:800; border-radius:10px; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                            ${icons.send} Import & Assign ${validCount} Verified Leads Now
                        </button>
                    </div>
                </form>
                <div id="import-execution-output" style="margin-top:16px;"></div>
            </div>
        `;

        document.getElementById('csv-preview-container').innerHTML = previewHtml;
    },

    submitParsedCsvImport: async function(e) {
        e.preventDefault();
        const validLeads = (this.parsedCsvLeads || []).filter(l => l.status === 'Valid');
        if (validLeads.length === 0) {
            alert('No valid leads available to import!');
            return;
        }

        const managerId = document.getElementById('import-assign-manager').value || null;
        const executiveId = document.getElementById('import-assign-executive').value || null;
        const priorityOverride = document.getElementById('import-priority').value;

        const outputDiv = document.getElementById('import-execution-output');
        
        // Render Progress Bar UI
        outputDiv.innerHTML = `
            <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:20px; border-radius:12px; margin-top:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:14px; font-weight:800; color:#1e293b;" id="import-progress-status">Initializing Batch Import...</span>
                    <span style="font-size:13px; font-weight:700; color:#2563eb;" id="import-progress-percent">0%</span>
                </div>
                <div style="width:100%; height:10px; background:#e2e8f0; border-radius:5px; overflow:hidden; margin-bottom:8px;">
                    <div id="import-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #2563eb, #3b82f6); transition:width 0.2s ease;"></div>
                </div>
                <div style="font-size:12px; color:#64748b; display:flex; justify-content:space-between;" id="import-progress-counts">
                    <span>Processed: 0 / ${validLeads.length} leads</span>
                    <span>Imported: 0 | Duplicates: 0</span>
                </div>
            </div>
        `;

        const statusEl = document.getElementById('import-progress-status');
        const percentEl = document.getElementById('import-progress-percent');
        const barEl = document.getElementById('import-progress-bar');
        const countsEl = document.getElementById('import-progress-counts');

        // Chunk size of 20 leads per request for smooth execution and progress updates
        const CHUNK_SIZE = 20;
        let totalImported = 0;
        let totalDuplicates = 0;
        let processedCount = 0;

        for (let i = 0; i < validLeads.length; i += CHUNK_SIZE) {
            const chunk = validLeads.slice(i, i + CHUNK_SIZE);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(validLeads.length / CHUNK_SIZE);

            statusEl.innerText = `Importing Batch ${chunkNumber} of ${totalChunks}...`;

            const payload = {
                action: 'import_csv',
                assigned_manager_id: managerId,
                assigned_executive_id: executiveId,
                priority_override: priorityOverride,
                leads: chunk
            };

            let data;
            try {
                const res = await fetch('api/leads.php?action=import_csv', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const responseText = await res.text();
                try {
                    data = JSON.parse(responseText);
                } catch (jsonErr) {
                    console.error('Non-JSON response from server:', responseText);
                    outputDiv.innerHTML = `<div style="background:#fef2f2; border:1px solid #fecaca; padding:14px; border-radius:10px; color:#991b1b; margin-top:12px; font-weight:700;">Server Error on Batch ${chunkNumber}: ${responseText.substring(0, 300)}</div>`;
                    return;
                }

                if (data.success && data.summary) {
                    totalImported += data.summary.imported || 0;
                    totalDuplicates += data.summary.duplicates_skipped || 0;
                } else if (!data.success) {
                    outputDiv.innerHTML = `<div style="background:#fef2f2; border:1px solid #fecaca; padding:14px; border-radius:10px; color:#991b1b; margin-top:12px; font-weight:700;">Error on Batch ${chunkNumber}: ${data.message}</div>`;
                    return;
                }
            } catch(err) {
                outputDiv.innerHTML = `<div style="color:#dc2626; font-weight:700; margin-top:12px;">Network Error on Batch ${chunkNumber}: ${err.message}</div>`;
                return;
            }

            processedCount += chunk.length;
            const pct = Math.min(100, Math.round((processedCount / validLeads.length) * 100));
            barEl.style.width = pct + '%';
            percentEl.innerText = pct + '%';
            countsEl.innerHTML = `<span>Processed: ${processedCount} / ${validLeads.length} leads</span><span>Imported: ${totalImported} | Duplicates: ${totalDuplicates}</span>`;
            
            // Short 50ms pause to ensure browser repaints progress bar smoothly
            await new Promise(r => setTimeout(r, 50));
        }

        // Final Success Box
        outputDiv.innerHTML = `
            <div style="background:#f0fdf4; border:1px solid #86efac; padding:20px; border-radius:12px; color:#166534; margin-top:12px;">
                <div style="font-size:16px; font-weight:800; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
                    <svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.5;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Bulk Lead Import & Team Assignment Complete!</span>
                </div>
                <div style="font-size:13.5px; font-weight:600; margin-bottom:12px;">All ${validLeads.length} leads processed successfully.</div>
                
                <div style="width:100%; height:8px; background:#bbf7d0; border-radius:4px; overflow:hidden; margin-bottom:14px;">
                    <div style="width:100%; height:100%; background:#16a34a;"></div>
                </div>

                <div style="font-size:13px; display:flex; gap:20px; flex-wrap:wrap;">
                    <span>Total Submitted: <strong>${validLeads.length}</strong></span>
                    <span>Successfully Created: <strong style="color:#15803d;">${totalImported}</strong></span>
                    <span>Database Duplicates Skipped: <strong style="color:#c2410c;">${totalDuplicates}</strong></span>
                </div>
            </div>
        `;
    },

    showNotifications: async function() {
        if (document.getElementById('notif-modal')) return;

        let notifs = [];
        try {
            const res = await fetch('api/notifications?action=my_notifications');
            const data = await res.json();
            if (data.success && data.data) {
                notifs = data.data;
            }
        } catch(e) {}

        const modal = document.createElement('div');
        modal.id = 'notif-modal';
        modal.className = 'modal-backdrop show';
        modal.innerHTML = `
            <div class="modal-box" style="max-width: 480px; border-radius: 18px; border-top: 4px solid var(--primary); padding: 24px;">
                <div class="modal-header" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px;">
                    <div class="modal-title" style="display:flex; align-items:center; gap:8px; font-weight:800; color:#0f172a;">
                        <span>Operations Center Alerts & Push Notifications</span>
                    </div>
                    <button class="close-modal" onclick="App.closeModal('notif-modal')">✕</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px; max-height:360px; overflow-y:auto;">
                    ${notifs.length === 0 ? `
                        <div style="text-align:center; padding:32px 20px; background:#f8fafc; border-radius:12px; color:#64748b; font-size:13.5px;">
                            No push notifications received yet.
                        </div>
                    ` : ''}
                    ${notifs.map(n => `
                        <div style="padding:14px; background:${n.target_type === 'all' ? '#eff6ff' : '#f0fdf4'}; border-radius:12px; border:1px solid ${n.target_type === 'all' ? '#bfdbfe' : '#a7f3d0'};">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div style="font-weight:800; font-size:13.5px; color:${n.target_type === 'all' ? '#1e40af' : '#166534'};">${n.title}</div>
                                <span class="badge ${n.target_type === 'all' ? 'badge-blue' : 'badge-green'}" style="font-size:10px;">${n.target_type === 'all' ? 'Broadcast' : 'Direct Message'}</span>
                            </div>
                            <div style="font-size:12.5px; color:#334155; margin-top:4px; line-height:1.4;">${n.message}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:6px; display:flex; justify-content:space-between;">
                                <span>From: <strong>${n.sender_name || 'System Admin'}</strong></span>
                                <span>${n.created_at}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top:18px; text-align:right; border-top:1px solid #f1f5f9; padding-top:14px;">
                    <button class="btn btn-secondary btn-sm" onclick="App.closeModal('notif-modal')">Close Alerts</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    openModal: function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('show');
            el.style.display = 'flex';
        }
    },

    closeModal: function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('show');
            // If it's a dynamic modal that was appended to body directly, remove it after transition, or if it has static backdrop just hide
            if (['create-lead-modal', 'call-modal', 'edit-project-modal', 'create-user-modal', 'notif-modal'].includes(id)) {
                el.remove();
            } else {
                el.style.display = 'none';
            }
        }
    }
};

window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.global-search input');
        if (searchInput) searchInput.focus();
    }
});

window.addEventListener('DOMContentLoaded', () => App.init());


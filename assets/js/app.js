/* assets/js/app.js - SPA AJAX Application Controller for LeadTriangle CRM */

const App = {
    currentUser: null,
    currentView: 'dashboard',
    dropdowns: {},

    init: async function() {
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadDropdowns();
            this.bindEvents();
            this.navigate(this.currentView);
            this.startActiveCallPolling();
        }
    },

    startActiveCallPolling: function() {
        this.checkActiveCall();
        setInterval(() => this.checkActiveCall(), 4000);
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
                        <div style="width: 42px; height: 42px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; animation: pulse 1.5s infinite;">📞</div>
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">Live Phone Call Active</div>
                            <div style="font-size: 14.5px; font-weight: 800; color: #0f172a;" id="banner-lead-name">${call.lead_name}</div>
                            <div style="font-size: 12px; color: #64748b;" id="banner-lead-phone">${call.phone} • Status: <span style="font-weight:700; color:#2563eb;">${call.lead_status || 'In Progress'}</span></div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-left: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${call.lead_id}, '${call.lead_name.replace(/'/g, "\\'")}', '${call.phone}', ${call.lead_status_id || 0})">✏️ Update Lead Status</button>
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
                this.renderLogin(data.message && data.data?.need_install ? data.message : null);
            }
        } catch (e) {
            this.renderLogin();
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
        const icon = document.getElementById('collapse-icon');
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            icon.innerText = '▶';
        } else {
            icon.innerText = '◀';
        }
    },

    renderLogin: function(warningMsg = null) {
        let warningBanner = '';
        if (warningMsg) {
            warningBanner = `
                <div style="background: #fffbe8; border: 1px solid #ffe58f; padding: 12px 14px; border-radius: 8px; font-size: 12.5px; color: #b45309; margin-bottom: 20px; line-height: 1.4;">
                    ⚠️ ${warningMsg}
                    <div style="margin-top: 6px;"><a href="install.php" style="color: #4f46e5; font-weight: 700; text-decoration: underline;">👉 Click here to run One-Click Setup Installer</a></div>
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

                    <div style="display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; margin-bottom: 20px;">
                        <button id="tab-login" onclick="App.toggleAuthTab('login')" style="flex: 1; padding: 8px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; background: #ffffff; color: #0f172a; box-shadow: var(--shadow-xs);">Sign In</button>
                        <button id="tab-register" onclick="App.toggleAuthTab('register')" style="flex: 1; padding: 8px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; background: transparent; color: #64748b;">+ Register Admin</button>
                    </div>

                    <form id="login-form" onsubmit="App.handleLogin(event)">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Email Address</label>
                            <input type="email" id="login-email" required value="admin@leadstriangle.com" placeholder="admin@leadstriangle.com" style="width: 100%; padding: 11px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13.5px; outline: none;">
                        </div>
                        <div style="margin-bottom: 24px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Password</label>
                            <input type="password" id="login-pass" required value="Admin@123" placeholder="••••••••" style="width: 100%; padding: 11px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13.5px; outline: none;">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; justify-content: center; font-size: 14.5px;">Sign In to Dashboard →</button>
                    </form>

                    <form id="register-admin-form" style="display: none;" onsubmit="App.handleAdminRegister(event)">
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Full Name</label>
                            <input type="text" id="reg-name" required value="System Super Admin" placeholder="Super Admin" style="width: 100%; padding: 10px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13px; outline: none;">
                        </div>
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Admin Email Address</label>
                            <input type="email" id="reg-email" required value="admin@leadstriangle.com" placeholder="admin@leadstriangle.com" style="width: 100%; padding: 10px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13px; outline: none;">
                        </div>
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Mobile Number</label>
                            <input type="text" id="reg-mobile" value="+919876543210" placeholder="+919876543210" style="width: 100%; padding: 10px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13px; outline: none;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">New Admin Password</label>
                            <input type="password" id="reg-pass" required value="Admin@123" placeholder="Set Password" style="width: 100%; padding: 10px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; font-size: 13px; outline: none;">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; justify-content: center; font-size: 14.5px;">👑 Create / Reset Super Admin →</button>
                    </form>

                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">Default demo password: <strong style="color: #4f46e5;">Admin@123</strong></div>
                </div>
            </div>
        `;
    },

    toggleAuthTab: function(tab) {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-admin-form');
        const tabLogin = document.getElementById('tab-login');
        const tabReg = document.getElementById('tab-register');

        if (tab === 'register') {
            loginForm.style.display = 'none';
            regForm.style.display = 'block';
            tabLogin.style.background = 'transparent';
            tabLogin.style.color = '#64748b';
            tabLogin.style.boxShadow = 'none';
            tabReg.style.background = '#ffffff';
            tabReg.style.color = '#0f172a';
            tabReg.style.boxShadow = 'var(--shadow-xs)';
        } else {
            regForm.style.display = 'none';
            loginForm.style.display = 'block';
            tabReg.style.background = 'transparent';
            tabReg.style.color = '#64748b';
            tabReg.style.boxShadow = 'none';
            tabLogin.style.background = '#ffffff';
            tabLogin.style.color = '#0f172a';
            tabLogin.style.boxShadow = 'var(--shadow-xs)';
        }
    },

    handleAdminRegister: async function(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const mobile = document.getElementById('reg-mobile').value;
        const password = document.getElementById('reg-pass').value;

        const formData = new FormData();
        formData.append('action', 'register_admin');
        formData.append('name', name);
        formData.append('email', email);
        formData.append('mobile', mobile);
        formData.append('password', password);

        const res = await fetch('api/auth', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            alert(data.message);
            window.location.reload();
        } else {
            alert(data.message);
        }
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
        window.location.reload();
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
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.menu-item[data-view="${view}"]`);
        if (activeItem) activeItem.classList.add('active');

        if (updateHistory && window.location.pathname !== '/' + view) {
            history.pushState({ view: view }, '', '/' + view);
        }

        const container = document.getElementById('content-viewport');
        container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Loading module...</div>';

        if (view === 'dashboard') this.renderDashboard();
        else if (view === 'leads') this.renderLeads();
        else if (view === 'calling_queue' || view === 'calling-queue') this.renderCallingQueue();
        else if (view === 'followups') this.renderFollowups();
        else if (view === 'meetings') this.renderMeetings();
        else if (view === 'funnel') this.renderFunnel();
        else if (view === 'projects') this.renderProjects();
        else if (view === 'reports') this.renderReports();
        else if (view === 'users') this.renderUsers();
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
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px;">
                
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
                        <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; margin-bottom: 6px;">₹${d.total_project_value ? d.total_project_value.toLocaleString() : '2,45,670'}</div>
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">+12% from last month →</div>
                    </div>
                </div>

                <!-- CARD 2: TOTAL LEADS / ACTIVE USERS -->
                <div onclick="App.navigate('leads')" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
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
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">+${d.new_leads_today} new today →</div>
                    </div>
                </div>

                <!-- CARD 3: CALLS MADE TODAY -->
                <div onclick="App.navigate('calling_queue')" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
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
                <div onclick="App.navigate('funnel')" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03); cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
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
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 24px;">
                
                <!-- LEFT COLUMN: RECENT ACTIVITY & LEADERBOARD -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    
                    <!-- RECENT ACTIVITY CARD -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">Recent Activity</div>
                            <a onclick="App.navigate('leads')" style="color: #2563eb; font-size: 13.5px; font-weight: 700; text-decoration: none; cursor: pointer;">View all</a>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 18px;">
                            
                            <div onclick="App.navigate('projects')" style="display: flex; align-items: center; gap: 14px; cursor: pointer; padding: 6px; border-radius: 10px; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    $
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">New deal closed & project converted</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Lead #L-1094 converted to Project Workspace</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">2 min ago</div>
                            </div>

                            <div onclick="App.navigate('leads')" style="display: flex; align-items: center; gap: 14px; cursor: pointer; padding: 6px; border-radius: 10px; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">New prospect assigned</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Rahul Sharma (+91 98765 43210) auto-assigned</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">5 min ago</div>
                            </div>

                            <div onclick="App.navigate('calling_queue')" style="display: flex; align-items: center; gap: 14px; cursor: pointer; padding: 6px; border-radius: 10px; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #faf5ff; color: #9333ea; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Call outcome logged</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Interested in Enterprise BPO Package</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">10 min ago</div>
                            </div>

                            <div onclick="App.navigate('followups')" style="display: flex; align-items: center; gap: 14px; cursor: pointer; padding: 6px; border-radius: 10px; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Follow-up reminder set</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Scheduled product demo call for tomorrow</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">1 hour ago</div>
                            </div>

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
                        <div class="modal-title" style="font-size:18px; font-weight:800; color:#0f172a;">✨ Create New Lead</div>
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

    // 2. LEADS MODULE
    renderLeads: async function(page = 1) {
        const search = document.getElementById('lead-search-input')?.value || '';
        const res = await fetch(`api/leads?action=list&page=${page}&search=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (!data.success) return;

        const leads = data.data.leads;
        const p = data.data.pagination;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Lead Management Database</div>
                    <div class="page-subtitle">Track, filter, call, assign and qualify prospect leads</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="App.exportLeadsCsv()">📤 Export CSV</button>
                    <button class="btn btn-secondary" onclick="App.navigate('import')">📥 Bulk CSV Import</button>
                    <button class="btn btn-primary" onclick="App.openCreateLeadModal()">+ Add New Lead</button>
                </div>
            </div>

            <div class="table-card">
                <div class="table-filters">
                    <input type="text" id="lead-search-input" placeholder="Search by name, phone, email, company..." class="filter-input" style="width: 280px;" value="${search}" onkeyup="if(event.key==='Enter') App.renderLeads(1)">
                    <button class="btn btn-secondary btn-sm" onclick="App.renderLeads(1)">Search</button>
                    <button class="btn btn-secondary btn-sm" onclick="App.autoAssignSelectedLeads()">🔄 Equal Auto Assign</button>
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
                                <th>Priority</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leads.map(l => `
                                <tr>
                                    <td><input type="checkbox" class="chk-lead" value="${l.id}"></td>
                                    <td><strong style="color:var(--primary);">${l.lead_code}</strong></td>
                                    <td><strong>${l.name}</strong><br><small style="color:var(--text-muted)">${l.company_name || l.city || 'Individual'}</small></td>
                                    <td><a href="tel:${l.mobile}" style="color:var(--success-text); text-decoration:none; font-weight:600;">📞 ${l.mobile}</a></td>
                                    <td>${l.service_name || 'General Query'}</td>
                                    <td>${l.executive_name || '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
                                    <td><span class="badge" style="background:${l.status_color}22; color:${l.status_color}; border:1px solid ${l.status_color}55;">${l.status_name}</span></td>
                                    <td><span class="badge badge-amber">${l.priority}</span></td>
                                    <td>
                                        <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">Call Now</button>
                                        <button class="btn btn-secondary btn-sm" onclick="App.viewLeadDetail(${l.id})">Details</button>
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
            <div class="page-header" style="margin-bottom: 16px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="btn btn-secondary btn-sm" onclick="App.navigate('${this.currentView}')">← Back to List</button>
                    <div>
                        <div style="font-size:12px; font-weight:800; color:var(--primary);">${l.lead_code}</div>
                        <div class="page-title" style="font-size:22px;">${l.name}</div>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="App.openCallModal(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.mobile}')">📞 Call Now</button>
                    <button class="btn btn-success" style="background:#16a34a; color:#fff;" onclick="window.open('https://wa.me/91${l.mobile.replace(/[^0-9]/g,'')}', '_blank')">💬 WhatsApp</button>
                </div>
            </div>

            <!-- TAB HEADER BAR -->
            <div style="background:#ffffff; border:1px solid var(--card-border); border-radius:14px; padding:6px; display:flex; gap:6px; margin-bottom:20px; overflow-x:auto;">
                <button class="btn lead-tab-btn active" id="tab-btn-about" style="font-weight:700;" onclick="App.switchLeadTab('about')">About</button>
                <button class="btn lead-tab-btn" id="tab-btn-activity" style="font-weight:700;" onclick="App.switchLeadTab('activity')">Activity History (${calls.length})</button>
                <button class="btn lead-tab-btn" id="tab-btn-tasks" style="font-weight:700;" onclick="App.switchLeadTab('tasks')">Tasks (${followups.length})</button>
                <button class="btn lead-tab-btn" id="tab-btn-notes" style="font-weight:700;" onclick="App.switchLeadTab('notes')">Notes (${notes.length})</button>
                <button class="btn lead-tab-btn" id="tab-btn-documents" style="font-weight:700;" onclick="App.switchLeadTab('documents')">Documents (${documents.length})</button>
            </div>

            <!-- TAB CONTENTS -->
            <!-- 1. ABOUT TAB -->
            <div id="lead-tab-about" class="lead-tab-content">
                <div style="background:#283593; color:#ffffff; padding:16px 20px; border-radius:14px; font-weight:800; font-size:15px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">
                    <span>📍</span> STATUS: ${l.status_name ? l.status_name.toUpperCase() : 'NEW'}
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
                            <div style="font-size:15px; font-weight:700; color:var(--primary); margin-top:4px;">🇮🇳 +91-${l.mobile}</div>
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
                                        <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">📞 Call Logged by ${c.agent_name}</div>
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
                                    <div style="font-size:14px; font-weight:700; color:var(--text-primary);">📅 ${f.purpose || 'Follow-up Call'}</div>
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
                                    <div style="font-size:13.5px; font-weight:700; color:var(--primary);">📄 ${d.file_name}</div>
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
        formData.append('action', 'upload_document');
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
    renderCallingQueue: async function() {
        const res = await fetch('api/leads?action=list&calling_queue=1&limit=50');
        const data = await res.json();
        if (!data.success) return;

        const queue = data.data.leads;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Action Calling Queue</div>
                    <div class="page-subtitle">Your prioritized daily task queue for telecalling</div>
                </div>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px;">
                ${queue.map(l => `
                    <div class="kpi-card" style="background:#ffffff; border:1px solid var(--card-border);">
                        <div class="kpi-header">
                            <span>${l.lead_code}</span>
                            <span class="badge badge-blue">${l.priority}</span>
                        </div>
                        <div style="font-size:16px; font-weight:700; color:var(--text-primary); margin-top:4px;">${l.name}</div>
                        <div style="font-size:13px; color:var(--text-muted);">${l.company_name || l.city || 'Client Query'}</div>
                        <div style="font-size:13.5px; font-weight:600; color:var(--success-text); margin-top:4px;">📞 ${l.mobile}</div>
                        <div style="display:flex; gap:8px; margin-top:12px;">
                            <button class="btn btn-primary btn-sm" style="flex:1; justify-center;" onclick="App.openCallModal(${l.id}, '${l.name}', '${l.mobile}')">Call Now</button>
                            <button class="btn btn-secondary btn-sm" onclick="App.viewLeadDetail(${l.id})">Details</button>
                        </div>
                    </div>
                `).join('')}
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
                            <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase;">📞 Active Call Status Manager</div>
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
                                <input type="checkbox" id="chk-followup" onchange="document.getElementById('followup-sec').style.display = this.checked ? 'block' : 'none'"> 📅 Schedule Next Follow-up Call
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
    renderFollowups: async function() {
        const res = await fetch('api/followups?action=list&filter=today');
        const data = await res.json();
        if (!data.success) return;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Follow-up Management</div>
                    <div class="page-subtitle">Track scheduled callback tasks</div>
                </div>
            </div>

            <div class="table-card">
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
                            ${data.data.map(f => `
                                <tr>
                                    <td><strong>${f.lead_name}</strong><br><small style="color:var(--text-muted)">${f.company_name || 'Lead'}</small></td>
                                    <td><a href="tel:${f.lead_mobile}" style="color:var(--success-text); font-weight:600;">📞 ${f.lead_mobile}</a></td>
                                    <td>${f.followup_date} at ${f.followup_time}</td>
                                    <td>${f.purpose || f.notes || 'Routine follow up'}</td>
                                    <td><span class="badge badge-amber">${f.status}</span></td>
                                    <td><button class="btn btn-success btn-sm" onclick="App.completeFollowup(${f.id})">Mark Done</button></td>
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
        const res = await fetch('api/meetings?action=list&filter=today');
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
    renderProjects: async function() {
        const res = await fetch('api/projects?action=list');
        const data = await res.json();
        if (!data.success) return;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Active Projects Workspace</div>
                    <div class="page-subtitle">Track project delivery, progress percentages & client payments</div>
                </div>
            </div>

            <div class="table-card">
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
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(p => `
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
                                    <td><span class="badge" style="background:${p.stage_color}22; color:${p.stage_color}; border:1px solid ${p.stage_color}55;">${p.stage_name}</span></td>
                                    ${this.currentUser.role_name !== 'operation_executive' ? `<td>₹${parseFloat(p.final_amount).toLocaleString()}</td><td><span class="badge badge-green">₹${parseFloat(p.paid_amount).toLocaleString()}</span></td>` : ''}
                                    <td>${p.expected_delivery_date || 'TBD'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    // 9. REPORTS MODULE
    renderReports: async function() {
        const res = await fetch('api/reports?type=leads');
        const data = await res.json();

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Analytics & Operations Reports</div>
                    <div class="page-subtitle">Multi-dimensional operational intelligence</div>
                </div>
            </div>

            <div class="kpi-grid">
                ${data.data.map(r => `
                    <div class="kpi-card">
                        <div class="kpi-header"><span>${r.status_name}</span></div>
                        <div class="kpi-val">${r.lead_count} Leads</div>
                        <div class="kpi-sub">Qualified: ${r.qualified_count}</div>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
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
                                            <button class="btn btn-secondary btn-sm" onclick="App.openCreateUserModal(App.usersCache.find(x => x.id == ${u.id}))">✏️ Edit</button>
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
                            ${isEdit ? '✏️ Edit Member & Selected Page Access' : '✨ Add New Team Member'}
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
                                🔒 Select Allowed Pages & Modules for this User
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
    renderImport: function() {
        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Bulk CSV Lead Importer</div>
                    <div class="page-subtitle">Upload CSV lists with automatic phone number duplicate check</div>
                </div>
            </div>

            <div class="card" style="background:var(--card-bg); border:1px solid var(--card-border); padding:32px; border-radius:12px; max-width:600px; box-shadow:var(--shadow-xs);">
                <form onsubmit="App.handleCsvUpload(event)">
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:8px;">Select CSV File (.csv)</label>
                        <input type="file" id="csv-file-input" accept=".csv" required style="width:100%; padding:12px; background:#ffffff; border:1px solid var(--card-border); border-radius:8px; color:var(--text-primary);">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">🚀 Process & Import Leads</button>
                </form>
                <div id="import-report-box" style="margin-top:24px;"></div>
            </div>
        `;
        document.getElementById('content-viewport').innerHTML = html;
    },

    handleCsvUpload: async function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('csv-file-input');
        if (!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('csv_file', fileInput.files[0]);

        document.getElementById('import-report-box').innerHTML = '<div style="color:var(--primary);">Parsing CSV and validating phone numbers...</div>';

        const res = await fetch('api/import', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            const s = data.summary;
            document.getElementById('import-report-box').innerHTML = `
                <div style="background:var(--success-light); border:1px solid #a7f3d0; padding:16px; border-radius:8px; color:var(--success-text);">
                    <div style="font-size:16px; font-weight:700; margin-bottom:8px;">Import Complete!</div>
                    <div>Total Rows: ${s.total_rows}</div>
                    <div>Successfully Imported: <strong>${s.imported}</strong></div>
                    <div>Duplicates Skipped: ${s.duplicates}</div>
                    <div>Invalid Rows: ${s.invalid}</div>
                </div>
            `;
        } else {
            document.getElementById('import-report-box').innerHTML = `<div style="color:var(--danger);">${data.message}</div>`;
        }
    },

    showNotifications: function() {
        const modal = document.createElement('div');
        modal.id = 'notif-modal';
        modal.className = 'modal-backdrop show';
        modal.innerHTML = `
            <div class="modal-box" style="max-width: 440px;">
                <div class="modal-header">
                    <div class="modal-title" style="display:flex; align-items:center; gap:8px;">
                        <span>🔔 Operations Center Alerts</span>
                    </div>
                    <button class="close-modal" onclick="App.closeModal('notif-modal')">✕</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="padding:12px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe;">
                        <div style="font-weight:700; font-size:13.5px; color:#1e40af;">System Auto-Assignment</div>
                        <div style="font-size:12.5px; color:#3b82f6; margin-top:2px;">3 new leads imported and auto-assigned to active callers</div>
                        <small style="color:#64748b; font-size:11px;">10 minutes ago</small>
                    </div>
                    <div style="padding:12px; background:#f0fdf4; border-radius:10px; border:1px solid #a7f3d0;">
                        <div style="font-weight:700; font-size:13.5px; color:#166534;">Follow-up Reminder</div>
                        <div style="font-size:12.5px; color:#15803d; margin-top:2px;">Product demonstration scheduled for Vijay Malhotra today</div>
                        <small style="color:#64748b; font-size:11px;">30 minutes ago</small>
                    </div>
                    <div style="padding:12px; background:#fff7ed; border-radius:10px; border:1px solid #fed7aa;">
                        <div style="font-weight:700; font-size:13.5px; color:#9a3412;">Project Conversion</div>
                        <div style="font-size:12.5px; color:#c2410c; margin-top:2px;">Lead #L-1094 successfully moved to Sales Funnel Stage 4</div>
                        <small style="color:#64748b; font-size:11px;">1 hour ago</small>
                    </div>
                </div>
                <div style="margin-top:18px; text-align:right;">
                    <button class="btn btn-secondary btn-sm" onclick="App.closeModal('notif-modal')">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeModal: function(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
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


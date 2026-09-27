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
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #4f46e5, #6366f1); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #ffffff; box-shadow: 0 4px 12px rgba(79,70,229,0.25);">▲</div>
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
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
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
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">+12% from last month</div>
                    </div>
                </div>

                <!-- CARD 2: TOTAL LEADS / ACTIVE USERS -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
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
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">+${d.new_leads_today} new today</div>
                    </div>
                </div>

                <!-- CARD 3: CALLS MADE TODAY -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
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
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">${d.connected_calls} connected calls</div>
                    </div>
                </div>

                <!-- CARD 4: QUALIFIED LEADS / ACTIVE PROJECTS -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
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
                        <div style="font-size: 12.5px; font-weight: 600; color: #16a34a;">${d.rates.qualification_rate}% conversion rate</div>
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
                            
                            <div style="display: flex; align-items: center; gap: 14px;">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    $
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">New deal closed & project converted</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Lead #L-1094 converted to Project Workspace</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">2 min ago</div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 14px;">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">New prospect assigned</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Rahul Sharma (+91 98765 43210) auto-assigned</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">5 min ago</div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 14px;">
                                <div style="width: 40px; height: 40px; border-radius: 12px; background: #faf5ff; color: #9333ea; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Call outcome logged</div>
                                    <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Interested in Enterprise BPO Package</div>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">10 min ago</div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 14px;">
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
                                            <tr>
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
                            
                            <div>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                    <span>Conversion Rate</span>
                                    <span style="font-weight: 800; color: #0f172a;">${d.rates.qualification_rate}%</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                                    <div style="width: ${Math.min(d.rates.qualification_rate * 5, 100)}%; height: 100%; background: #2563eb; border-radius: 9999px;"></div>
                                </div>
                            </div>

                            <div>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                    <span>Connected Call Ratio</span>
                                    <span style="font-weight: 800; color: #0f172a;">${d.calls_today > 0 ? Math.round((d.connected_calls/d.calls_today)*100) : 45}%</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                                    <div style="width: ${d.calls_today > 0 ? Math.round((d.connected_calls/d.calls_today)*100) : 45}%; height: 100%; background: #f97316; border-radius: 9999px;"></div>
                                </div>
                            </div>

                            <div>
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
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 12px;">
                                <span style="font-size: 13.5px; font-weight: 600; color: #0f172a;">BPO Telecalling Service</span>
                                <span class="badge badge-blue">42 Leads</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 12px;">
                                <span style="font-size: 13.5px; font-weight: 600; color: #0f172a;">Lead Generation Campaign</span>
                                <span class="badge badge-green">28 Leads</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 12px;">
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
                                        <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${l.id}, '${l.name}', '${l.mobile}')">Call Now</button>
                                        <button class="btn btn-secondary btn-sm" onclick="App.viewLeadDetail(${l.id})">Timeline</button>
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
    openCallModal: function(leadId, name, mobile) {
        let outcomesHtml = this.dropdowns.outcomes ? this.dropdowns.outcomes.map(o => `<option value="${o.id}">${o.name}</option>`).join('') : '';

        const modalHtml = `
            <div class="modal-backdrop show" id="call-modal">
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-title">📞 Log Call: ${name} (${mobile})</div>
                        <button class="close-modal" onclick="App.closeModal('call-modal')">✕</button>
                    </div>
                    <form onsubmit="App.submitCallLog(event, ${leadId})">
                        <div style="margin-bottom: 14px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Call Outcome</label>
                            <select id="modal-outcome" class="filter-select" style="width:100%;" required>
                                ${outcomesHtml}
                            </select>
                        </div>
                        <div style="margin-bottom: 14px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Call Remarks & Notes</label>
                            <textarea id="modal-remarks" required style="width:100%; height:80px; background:#ffffff; border:1px solid var(--card-border); border-radius:6px; color:var(--text-primary); padding:10px; font-size:13px; outline:none;" placeholder="Enter details discussed..."></textarea>
                        </div>

                        <div style="background:#f8fafc; padding:14px; border-radius:8px; border:1px solid var(--card-border); margin-bottom:18px;">
                            <label style="font-size:13px; font-weight:600; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="chk-followup" onchange="document.getElementById('followup-sec').style.display = this.checked ? 'block' : 'none'"> Schedule Follow-up Call
                            </label>
                            <div id="followup-sec" style="display:none; margin-top:12px;">
                                <div style="display:flex; gap:10px;">
                                    <input type="date" id="modal-fdate" class="filter-input" style="flex:1;">
                                    <input type="time" id="modal-ftime" class="filter-input" value="11:00" style="flex:1;">
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Save Call Log & Next Action</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    submitCallLog: async function(e, leadId) {
        e.preventDefault();
        const outcomeId = document.getElementById('modal-outcome').value;
        const remarks = document.getElementById('modal-remarks').value;
        const scheduleFollowup = document.getElementById('chk-followup').checked ? '1' : '0';
        const fdate = document.getElementById('modal-fdate').value;
        const ftime = document.getElementById('modal-ftime').value;

        const formData = new FormData();
        formData.append('action', 'log');
        formData.append('lead_id', leadId);
        formData.append('call_outcome_id', outcomeId);
        formData.append('remarks', remarks);
        formData.append('schedule_followup', scheduleFollowup);
        formData.append('followup_date', fdate);
        formData.append('followup_time', ftime);

        const res = await fetch('api/calls', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.closeModal('call-modal');
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
    renderUsers: async function() {
        const res = await fetch('api/users?action=list');
        const data = await res.json();
        if (!data.success) return;

        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">User & Role Management</div>
                    <div class="page-subtitle">Manage system users, managers, and operation executives</div>
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
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(u => `
                                <tr>
                                    <td><strong>${u.name}</strong></td>
                                    <td>${u.email}</td>
                                    <td>${u.mobile}</td>
                                    <td><span class="badge badge-blue">${u.role_display}</span></td>
                                    <td>${u.team_name || 'General'}</td>
                                    <td><span class="badge ${u.status==='active'?'badge-green':'badge-red'}">${u.status}</span></td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="App.toggleUserStatus(${u.id}, '${u.status==='active'?'inactive':'active'}')">Toggle Status</button>
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

    closeModal: function(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());

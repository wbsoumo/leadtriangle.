/* assets/js/app.js - SPA AJAX Application Controller */

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
        
        // Hide unauthorized sidebar items
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
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #4f46e5, #6366f1); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #ffffff; box-shadow: 0 4px 12px rgba(79,70,229,0.25);">▲</div>
                        <div>
                            <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">Leadstriangle CRM</div>
                            <div style="font-size: 12px; color: #64748b;">Internal Operations Portal</div>
                        </div>
                    </div>

                    ${warningBanner}

                    <div style="color: #475569; font-size: 13.5px; margin-bottom: 24px;">Sign in to your CRM telecalling account</div>
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
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">Default demo password: <strong style="color: #4f46e5;">Admin@123</strong></div>
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

        // Listen to browser Back/Forward navigation
        window.addEventListener('popstate', () => {
            const path = window.location.pathname.replace(/^\/+/, '');
            const view = path || 'dashboard';
            this.navigate(view, false);
        });

        // Detect initial URL path on load
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
        container.innerHTML = '<div style="color: #94a3b8; padding: 40px; text-align: center;">Loading module...</div>';

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
                    <div class="page-title">Operations & Sales Dashboard</div>
                    <div class="page-subtitle">Real-time telecalling KPI metrics & sales pipeline conversion</div>
                </div>
                <div class="header-actions">
                    <select class="filter-select" onchange="App.filterDashboard(this.value)">
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month" selected>This Month</option>
                        <option value="last_month">Last Month</option>
                    </select>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-header"><span>TOTAL LEADS</span><div class="kpi-icon">📋</div></div>
                    <div class="kpi-val">${d.total_leads}</div>
                    <div class="kpi-sub">New Today: +${d.new_leads_today}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header"><span>CALLS MADE TODAY</span><div class="kpi-icon">📞</div></div>
                    <div class="kpi-val">${d.calls_today}</div>
                    <div class="kpi-sub">Connected: ${d.connected_calls}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header"><span>TODAY'S FOLLOW-UPS</span><div class="kpi-icon">⏰</div></div>
                    <div class="kpi-val">${d.followups_today}</div>
                    <div class="kpi-sub" style="color: var(--danger)">Overdue: ${d.overdue_followups}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header"><span>QUALIFIED LEADS</span><div class="kpi-icon">⭐</div></div>
                    <div class="kpi-val">${d.qualified_leads}</div>
                    <div class="kpi-sub">Rate: ${d.rates.qualification_rate}%</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header"><span>ACTIVE PROJECTS</span><div class="kpi-icon">🚀</div></div>
                    <div class="kpi-val">${d.ongoing_projects}</div>
                    <div class="kpi-sub">Value: ₹${d.total_project_value.toLocaleString()}</div>
                </div>
            </div>
        `;

        if (d.employee_performance && d.employee_performance.length > 0) {
            html += `
                <div class="table-card" style="margin-top: 24px;">
                    <div class="table-filters" style="font-weight: 700; color: #fff;">Telecalling Team Performance Leaderboard</div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Leads Assigned</th>
                                    <th>Calls Today</th>
                                    <th>Connected</th>
                                    <th>Follow-ups</th>
                                    <th>Meetings</th>
                                    <th>Qualified Leads</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${d.employee_performance.map(emp => `
                                    <tr>
                                        <td><strong>${emp.name}</strong><br><small style="color:var(--text-muted)">${emp.email}</small></td>
                                        <td>${emp.total_leads}</td>
                                        <td><span class="badge badge-blue">${emp.calls_today}</span></td>
                                        <td>${emp.connected_calls}</td>
                                        <td>${emp.followups_today}</td>
                                        <td>${emp.meetings_today}</td>
                                        <td><span class="badge badge-green">${emp.qualified_leads}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

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
                    <button class="btn btn-secondary" onclick="App.navigate('import')">📥 Bulk CSV Import</button>
                    <button class="btn btn-primary" onclick="App.openCreateLeadModal()">+ Add New Lead</button>
                </div>
            </div>

            <div class="table-card">
                <div class="table-filters">
                    <input type="text" id="lead-search-input" placeholder="Search by name, phone, email, company..." class="filter-input" style="width: 280px;" value="${search}" onkeyup="if(event.key==='Enter') App.renderLeads(1)">
                    <button class="btn btn-secondary btn-sm" onclick="App.renderLeads(1)">Filter</button>
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
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
                                    <td><strong style="color:#38bdf8;">${l.lead_code}</strong></td>
                                    <td><strong>${l.name}</strong><br><small style="color:var(--text-muted)">${l.company_name || l.city || 'Individual'}</small></td>
                                    <td><a href="tel:${l.mobile}" style="color:#34d399; text-decoration:none; font-weight:600;">📞 ${l.mobile}</a></td>
                                    <td>${l.service_name || 'General Query'}</td>
                                    <td>${l.executive_name || '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
                                    <td><span class="badge" style="background:${l.status_color}22; color:${l.status_color}; border:1px solid ${l.status_color}55;">${l.status_name}</span></td>
                                    <td><span class="badge badge-amber">${l.priority}</span></td>
                                    <td>
                                        <button class="btn btn-primary btn-sm" onclick="App.openCallModal(${l.id}, '${l.name}', '${l.mobile}')">Call Now</button>
                                        <button class="btn btn-secondary btn-sm" onclick="App.viewLeadDetail(${l.id})">View</button>
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

    // 3. CALL LOG MODAL
    openCallModal: function(leadId, name, mobile) {
        let outcomesHtml = this.dropdowns.outcomes ? this.dropdowns.outcomes.map(o => `<option value="${o.id}">${o.name}</option>`).join('') : '';

        const modalHtml = `
            <div class="modal-backdrop show" id="call-modal">
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-title">📞 Telecalling Log: ${name} (${mobile})</div>
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
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Call Remarks & Conversation Notes</label>
                            <textarea id="modal-remarks" required style="width:100%; height:80px; background:#0b0f19; border:1px solid var(--card-border); border-radius:6px; color:#fff; padding:10px; font-size:13px; outline:none;" placeholder="Enter details discussed with client..."></textarea>
                        </div>

                        <div style="background:#0b0f19; padding:14px; border-radius:8px; border:1px solid var(--card-border); margin-bottom:18px;">
                            <label style="font-size:13px; font-weight:600; color:#fff; display:flex; align-items:center; gap:8px;">
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

    closeModal: function(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    // 4. BULK CSV IMPORT UI
    renderImport: function() {
        let html = `
            <div class="page-header">
                <div>
                    <div class="page-title">Bulk CSV Lead Importer</div>
                    <div class="page-subtitle">Upload CSV lists with automatic phone number duplicate check</div>
                </div>
            </div>

            <div class="card" style="background:var(--card-bg); border:1px solid var(--card-border); padding:32px; border-radius:12px; max-width:600px;">
                <form onsubmit="App.handleCsvUpload(event)">
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:8px;">Select CSV File (.csv)</label>
                        <input type="file" id="csv-file-input" accept=".csv" required style="width:100%; padding:12px; background:#0b0f19; border:1px solid var(--card-border); border-radius:8px; color:#fff;">
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

        document.getElementById('import-report-box').innerHTML = '<div style="color:#38bdf8;">Parsing CSV and validating phone numbers...</div>';

        const res = await fetch('api/import', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            const s = data.summary;
            document.getElementById('import-report-box').innerHTML = `
                <div style="background:rgba(16,185,129,0.15); border:1px solid var(--success); padding:16px; border-radius:8px; color:#34d399;">
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
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());

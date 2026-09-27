-- Database Schema for Leadstriangle CRM & BPO Calling Operations
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB (cPanel phpMyAdmin)

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS import_rows;
DROP TABLE IF EXISTS imports;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS project_updates;
DROP TABLE IF EXISTS project_files;
DROP TABLE IF EXISTS project_tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS opportunity_activities;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS followups;
DROP TABLE IF EXISTS call_logs;
DROP TABLE IF EXISTS lead_assignments_history;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS funnel_stages;
DROP TABLE IF EXISTS project_stages;
DROP TABLE IF EXISTS meeting_types;
DROP TABLE IF EXISTS call_outcomes;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS lead_sources;
DROP TABLE IF EXISTS lead_statuses;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Permissions
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Role Permissions
CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Teams
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    manager_id INT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    team_id INT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    profile_photo VARCHAR(255) DEFAULT NULL,
    joining_date DATE DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_user_role (role_id),
    INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add Manager FK to Teams now that Users table exists
ALTER TABLE teams ADD CONSTRAINT fk_team_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Lead Statuses
CREATE TABLE lead_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color_code VARCHAR(20) DEFAULT '#6c757d',
    sort_order INT DEFAULT 0,
    is_system TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Lead Sources
CREATE TABLE lead_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Services
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Call Outcomes
CREATE TABLE call_outcomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('connected', 'not_connected', 'unreachable', 'qualified', 'converted', 'lost') DEFAULT 'connected',
    color_code VARCHAR(20) DEFAULT '#17a2b8',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Meeting Types
CREATE TABLE meeting_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Funnel Stages
CREATE TABLE funnel_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    stage_order INT DEFAULT 0,
    default_probability INT DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Project Stages
CREATE TABLE project_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    stage_order INT DEFAULT 0,
    color_code VARCHAR(20) DEFAULT '#0d6efd',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Leads
CREATE TABLE leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    alternate_mobile VARCHAR(20) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    company_name VARCHAR(150) DEFAULT NULL,
    location VARCHAR(150) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    industry VARCHAR(100) DEFAULT NULL,
    lead_source_id INT DEFAULT NULL,
    service_id INT DEFAULT NULL,
    lead_type ENUM('Inbound', 'Outbound', 'Referral', 'Campaign') DEFAULT 'Outbound',
    assigned_manager_id INT DEFAULT NULL,
    assigned_executive_id INT DEFAULT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    status_id INT NOT NULL,
    last_contacted_at DATETIME DEFAULT NULL,
    next_followup_at DATETIME DEFAULT NULL,
    meeting_scheduled_at DATETIME DEFAULT NULL,
    initial_remark TEXT DEFAULT NULL,
    tags VARCHAR(255) DEFAULT NULL,
    is_qualified TINYINT(1) DEFAULT 0,
    is_archived TINYINT(1) DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_source_id) REFERENCES lead_sources(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_manager_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_executive_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES lead_statuses(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead_mobile (mobile),
    INDEX idx_lead_email (email),
    INDEX idx_lead_status (status_id),
    INDEX idx_lead_executive (assigned_executive_id),
    INDEX idx_lead_manager (assigned_manager_id),
    INDEX idx_lead_next_followup (next_followup_at),
    INDEX idx_lead_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Lead Assignment History
CREATE TABLE lead_assignments_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    previous_executive_id INT DEFAULT NULL,
    new_executive_id INT DEFAULT NULL,
    assigned_by INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Call Logs
CREATE TABLE call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    user_id INT NOT NULL,
    call_outcome_id INT NOT NULL,
    call_duration_seconds INT DEFAULT 0,
    remarks TEXT DEFAULT NULL,
    called_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (call_outcome_id) REFERENCES call_outcomes(id),
    INDEX idx_call_lead (lead_id),
    INDEX idx_call_user (user_id),
    INDEX idx_call_date (called_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Follow-ups
CREATE TABLE followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    user_id INT NOT NULL,
    followup_date DATE NOT NULL,
    followup_time TIME NOT NULL,
    purpose VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    status ENUM('Pending', 'Completed', 'Rescheduled', 'Cancelled', 'Missed') DEFAULT 'Pending',
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_followup_lead (lead_id),
    INDEX idx_followup_user (user_id),
    INDEX idx_followup_date (followup_date, followup_time),
    INDEX idx_followup_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Meetings
CREATE TABLE meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    assigned_user_id INT NOT NULL,
    meeting_title VARCHAR(200) NOT NULL,
    meeting_type_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    meeting_mode ENUM('Phone', 'Google Meet', 'Zoom', 'Office Meeting', 'Client Location', 'Other') DEFAULT 'Google Meet',
    meeting_link VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    status ENUM('Scheduled', 'Completed', 'Rescheduled', 'Cancelled', 'No Show') DEFAULT 'Scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id),
    FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(id),
    INDEX idx_meeting_lead (lead_id),
    INDEX idx_meeting_user (assigned_user_id),
    INDEX idx_meeting_date (meeting_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Sales Opportunities (Funnel)
CREATE TABLE opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_code VARCHAR(50) NOT NULL UNIQUE,
    lead_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    service_id INT DEFAULT NULL,
    assigned_manager_id INT NOT NULL,
    stage_id INT NOT NULL,
    expected_value DECIMAL(12,2) DEFAULT 0.00,
    probability INT DEFAULT 10,
    expected_closing_date DATE DEFAULT NULL,
    requirement_summary TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    status ENUM('Open', 'Won', 'Lost') DEFAULT 'Open',
    won_at DATETIME DEFAULT NULL,
    lost_at DATETIME DEFAULT NULL,
    lost_reason TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_manager_id) REFERENCES users(id),
    FOREIGN KEY (stage_id) REFERENCES funnel_stages(id),
    INDEX idx_opp_lead (lead_id),
    INDEX idx_opp_stage (stage_id),
    INDEX idx_opp_manager (assigned_manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Opportunity Activities
CREATE TABLE opportunity_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    user_id INT NOT NULL,
    from_stage_id INT DEFAULT NULL,
    to_stage_id INT DEFAULT NULL,
    activity_note TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Projects
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    opportunity_id INT NULL,
    lead_id INT NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) DEFAULT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) DEFAULT NULL,
    service_id INT DEFAULT NULL,
    assigned_manager_id INT NOT NULL,
    project_owner_id INT DEFAULT NULL,
    quoted_amount DECIMAL(12,2) DEFAULT 0.00,
    final_amount DECIMAL(12,2) DEFAULT 0.00,
    advance_amount DECIMAL(12,2) DEFAULT 0.00,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    payment_status ENUM('Unpaid', 'Partial', 'Paid', 'Overdue') DEFAULT 'Unpaid',
    stage_id INT NOT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    progress_percent INT DEFAULT 0,
    start_date DATE DEFAULT NULL,
    expected_delivery_date DATE DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_manager_id) REFERENCES users(id),
    FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (stage_id) REFERENCES project_stages(id),
    INDEX idx_project_lead (lead_id),
    INDEX idx_project_stage (stage_id),
    INDEX idx_project_manager (assigned_manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. Project Tasks
CREATE TABLE project_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    assigned_to INT DEFAULT NULL,
    due_date DATE DEFAULT NULL,
    status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. Project Files
CREATE TABLE project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT DEFAULT 0,
    file_type VARCHAR(50) DEFAULT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. Project Updates
CREATE TABLE project_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    update_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. Payments
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode ENUM('Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Credit Card', 'Other') DEFAULT 'UPI',
    transaction_reference VARCHAR(100) DEFAULT NULL,
    payment_date DATE NOT NULL,
    notes TEXT DEFAULT NULL,
    recorded_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. Activity / Audit Logs
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    record_id INT DEFAULT NULL,
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. Imports
CREATE TABLE imports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uploaded_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    total_rows INT DEFAULT 0,
    imported_rows INT DEFAULT 0,
    duplicate_rows INT DEFAULT 0,
    invalid_rows INT DEFAULT 0,
    status ENUM('Pending', 'Processing', 'Completed', 'Failed') DEFAULT 'Completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. Import Rows Log
CREATE TABLE import_rows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_id INT NOT NULL,
    row_number INT NOT NULL,
    raw_data TEXT,
    status ENUM('Success', 'Duplicate', 'Invalid') NOT NULL,
    error_message TEXT DEFAULT NULL,
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 29. System Settings
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

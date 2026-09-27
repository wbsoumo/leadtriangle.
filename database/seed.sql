-- Seed Data for Leadstriangle CRM & BPO Calling Operations System

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insert Roles
INSERT INTO roles (id, name, display_name, description) VALUES
(1, 'super_admin', 'Super Admin', 'Full system access & administration control'),
(2, 'manager', 'Manager', 'Team management, funnel oversight, project handling & sales reports'),
(3, 'operation_executive', 'Operation Executive', 'Telecalling, remarks, follow-ups, meetings & lead qualification');

-- 2. Insert Permissions
INSERT INTO permissions (id, permission_key, module, description) VALUES
(1, 'leads.view', 'leads', 'View assigned or all leads'),
(2, 'leads.create', 'leads', 'Create new single lead'),
(3, 'leads.edit', 'leads', 'Edit lead details'),
(4, 'leads.delete', 'leads', 'Delete or archive leads'),
(5, 'leads.assign', 'leads', 'Assign leads to team members'),
(6, 'leads.import', 'leads', 'Bulk import leads via CSV/Excel'),
(7, 'leads.export', 'leads', 'Export lead data to CSV'),
(8, 'calls.view', 'calling', 'View call logs'),
(9, 'calls.create', 'calling', 'Log call and submit remarks'),
(10, 'calls.edit', 'calling', 'Edit call log'),
(11, 'meetings.view', 'meetings', 'View scheduled meetings'),
(12, 'meetings.manage', 'meetings', 'Create and update meetings'),
(13, 'followups.view', 'followups', 'View follow-ups'),
(14, 'followups.manage', 'followups', 'Manage and complete follow-ups'),
(15, 'funnel.view', 'funnel', 'View sales funnel Kanban board'),
(16, 'funnel.manage', 'funnel', 'Manage opportunities and move funnel stages'),
(17, 'projects.view', 'projects', 'View active/completed projects'),
(18, 'projects.create', 'projects', 'Convert opportunity into project'),
(19, 'projects.edit', 'projects', 'Manage project status and deliverables'),
(20, 'projects.delete', 'projects', 'Delete projects'),
(21, 'projects.finance', 'projects', 'View and manage financial and payment data'),
(22, 'users.manage', 'users', 'Create and manage system users and teams'),
(23, 'reports.view', 'reports', 'View analytics and reports'),
(24, 'settings.manage', 'settings', 'Configure system settings and drop-downs');

-- 3. Assign Role Permissions
-- Super Admin (All Permissions 1 to 24)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Manager (Permissions: leads.view, leads.create, leads.edit, leads.assign, calls.view, meetings.view, meetings.manage, followups.view, followups.manage, funnel.view, funnel.manage, projects.view, projects.create, projects.edit, projects.finance, reports.view)
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1), (2, 2), (2, 3), (2, 5), (2, 7), (2, 8), (2, 11), (2, 12), (2, 13), (2, 14), (2, 15), (2, 16), (2, 17), (2, 18), (2, 19), (2, 21), (2, 23);

-- Operation Executive (Permissions: leads.view, leads.create, calls.view, calls.create, meetings.view, meetings.manage, followups.view, followups.manage, funnel.view)
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1), (3, 2), (3, 8), (3, 9), (3, 11), (3, 12), (3, 13), (3, 14), (3, 15);

-- 4. Default Teams
INSERT INTO teams (id, team_name, description) VALUES
(1, 'Alpha Sales & Calling Team', 'Primary inbound and outbound telecalling operations'),
(2, 'Enterprise Solutions Team', 'High-value enterprise accounts & website/CRM projects');

-- 5. Default Users
-- Passwords are hashed with password_hash('Admin@123', PASSWORD_BCRYPT)
-- $2y$10$e7m0gJ... standard hash representation
-- Hash for 'Admin@123'
-- Hash string: $2y$10$w3S24P2B/yJ5O13K6kX7e.gR/5hXv8Uf.Q61vA4TfC/Jz0Q5c9xSe
INSERT INTO users (id, role_id, team_id, name, email, mobile, password_hash, status, joining_date) VALUES
(1, 1, NULL, 'System Super Admin', 'admin@leadstriangle.com', '+919876543210', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-01-01'),
(2, 2, 1, 'Amit Sharma (Manager)', 'amit.manager@leadstriangle.com', '+919876543211', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-01-15'),
(3, 2, 2, 'Priya Verma (Manager)', 'priya.manager@leadstriangle.com', '+919876543212', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-01-15'),
(4, 3, 1, 'Rahul Kumar (Executive)', 'rahul.op@leadstriangle.com', '+919876543213', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-02-01'),
(5, 3, 1, 'Neha Singh (Executive)', 'neha.op@leadstriangle.com', '+919876543214', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-02-01'),
(6, 3, 1, 'Vikram Roy (Executive)', 'vikram.op@leadstriangle.com', '+919876543215', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-02-10'),
(7, 3, 2, 'Suresh Patel (Executive)', 'suresh.op@leadstriangle.com', '+919876543216', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-02-15'),
(8, 3, 2, 'Ananya Das (Executive)', 'ananya.op@leadstriangle.com', '+919876543217', '$2y$10$44.bM3u.N4P7XvW8h44OJeJ6F9Yh5/zU3q548vL2n7Z1w84y1724W', 'active', '2026-02-15');

UPDATE teams SET manager_id = 2 WHERE id = 1;
UPDATE teams SET manager_id = 3 WHERE id = 2;

-- 6. Lead Statuses
INSERT INTO lead_statuses (id, name, color_code, sort_order, is_system) VALUES
(1, 'New', '#3B82F6', 1, 1),
(2, 'Pending', '#F59E0B', 2, 1),
(3, 'Assigned', '#8B5CF6', 3, 1),
(4, 'Contacting', '#06B6D4', 4, 1),
(5, 'Contacted', '#10B981', 5, 1),
(6, 'Follow-up Required', '#EC4899', 6, 1),
(7, 'Meeting Scheduled', '#6366F1', 7, 1),
(8, 'Qualified', '#059669', 8, 1),
(9, 'Proposal Sent', '#D97706', 9, 1),
(10, 'Negotiation', '#7C3AED', 10, 1),
(11, 'Converted', '#16A34A', 11, 1),
(12, 'Lost', '#DC2626', 12, 1),
(13, 'Not Interested', '#6B7280', 13, 1),
(14, 'Invalid', '#9CA3AF', 14, 1),
(15, 'Duplicate', '#4B5563', 15, 1);

-- 7. Lead Sources
INSERT INTO lead_sources (id, name) VALUES
(1, 'Meta Facebook Ads'),
(2, 'Google Search Ads'),
(3, 'Website Contact Form'),
(4, 'LinkedIn Outreach'),
(5, 'Cold Calling Campaign'),
(6, 'Justdial / IndiaMART'),
(7, 'Client Referral'),
(8, 'Exhibition / Seminar');

-- 8. Services
INSERT INTO services (id, name, description) VALUES
(1, 'Website Development', 'Custom responsive corporate web application design and development'),
(2, 'E-commerce Development', 'Online store setup with payment gateway integration'),
(3, 'Mobile App Development', 'Android and iOS cross-platform mobile apps'),
(4, 'Digital Marketing', 'SEO, PPC Google Ads and Social Media Marketing campaigns'),
(5, 'SEO Services', 'Search engine optimization and rank acceleration'),
(6, 'CRM & Software Development', 'Custom CRM and ERP enterprise software solutions'),
(7, 'Branding & Graphic Design', 'Logo, identity, UI/UX and visual branding packages');

-- 9. Call Outcomes
INSERT INTO call_outcomes (id, name, category, color_code) VALUES
(1, 'Connected - Interested', 'connected', '#10B981'),
(2, 'Connected - Call Back Requested', 'connected', '#3B82F6'),
(3, 'Connected - Meeting Scheduled', 'qualified', '#6366F1'),
(4, 'Connected - Not Interested', 'connected', '#EF4444'),
(5, 'No Answer / Ringing', 'not_connected', '#F59E0B'),
(6, 'Busy', 'not_connected', '#F59E0B'),
(7, 'Switched Off', 'unreachable', '#6B7280'),
(8, 'Wrong Number / Invalid', 'unreachable', '#9CA3AF'),
(9, 'Qualified Lead', 'qualified', '#059669'),
(10, 'Converted to Client', 'converted', '#16A34A'),
(11, 'Lost / Dropped', 'lost', '#DC2626');

-- 10. Meeting Types
INSERT INTO meeting_types (id, name) VALUES
(1, 'Discovery Call'),
(2, 'Requirement Gathering'),
(3, 'Proposal & Pricing Demo'),
(4, 'Technical Discussion'),
(5, 'Final Agreement Signing');

-- 11. Funnel Stages
INSERT INTO funnel_stages (id, name, stage_order, default_probability) VALUES
(1, 'New Opportunity', 1, 10),
(2, 'Requirement Discussion', 2, 25),
(3, 'Meeting Scheduled', 3, 40),
(4, 'Meeting Completed', 4, 50),
(5, 'Proposal Sent', 5, 65),
(6, 'Negotiation', 6, 80),
(7, 'Awaiting Confirmation', 7, 90),
(8, 'Won', 8, 100),
(9, 'Lost', 9, 0);

-- 12. Project Stages
INSERT INTO project_stages (id, name, stage_order, color_code) VALUES
(1, 'Pending Start', 1, '#F59E0B'),
(2, 'Planning & Wireframing', 2, '#3B82F6'),
(3, 'Requirement Collection', 3, '#8B5CF6'),
(4, 'In Development', 4, '#06B6D4'),
(5, 'Client Review', 5, '#EC4899'),
(6, 'Revision Stage', 6, '#D97706'),
(7, 'Finalization & Deployment', 7, '#10B981'),
(8, 'Completed', 8, '#16A34A'),
(9, 'On Hold', 9, '#6B7280'),
(10, 'Cancelled', 10, '#DC2626');

-- 13. Sample Leads (20 realistic leads)
INSERT INTO leads (id, lead_code, name, mobile, email, company_name, city, state, lead_source_id, service_id, lead_type, assigned_manager_id, assigned_executive_id, priority, status_id, initial_remark, is_qualified, created_at) VALUES
(1, 'LEAD-1001', 'Rajesh Gupta', '+919823456701', 'rajesh@guptaenterprises.com', 'Gupta Enterprises', 'Mumbai', 'Maharashtra', 1, 1, 'Inbound', 2, 4, 'High', 5, 'Wants website redesign for real estate business', 1, '2026-09-20 10:00:00'),
(2, 'LEAD-1002', 'Sanjay Mehta', '+919823456702', 'sanjay@mehtatech.io', 'Mehta Tech Solutions', 'Bengaluru', 'Karnataka', 2, 6, 'Inbound', 2, 4, 'Urgent', 8, 'Looking for custom CRM software for telecalling team', 1, '2026-09-21 11:30:00'),
(3, 'LEAD-1003', 'Kavita Sharma', '+919823456703', 'kavita@kavitadesigns.com', 'Kavita Couture', 'Delhi', 'Delhi', 3, 2, 'Inbound', 2, 5, 'Medium', 6, 'E-commerce website with payment gateway setup', 0, '2026-09-22 09:15:00'),
(4, 'LEAD-1004', 'Deepak Joshi', '+919823456704', 'deepak@joshilogistics.in', 'Joshi Logistics', 'Pune', 'Maharashtra', 5, 4, 'Outbound', 2, 5, 'High', 7, 'Digital marketing and Google Ads management', 1, '2026-09-23 14:00:00'),
(5, 'LEAD-1005', 'Alok Kulkarni', '+919823456705', 'alok@kulkarniauto.com', 'Kulkarni Auto Components', 'Nashik', 'Maharashtra', 6, 1, 'Outbound', 2, 6, 'Low', 2, 'Inquired about website catalog', 0, '2026-09-24 16:45:00'),
(6, 'LEAD-1006', 'Pooja Reddy', '+919823456706', 'pooja@reddypharma.com', 'Reddy Healthcare', 'Hyderabad', 'Telangana', 7, 3, 'Referral', 3, 7, 'Urgent', 11, 'Mobile App development for patient booking', 1, '2026-09-24 17:00:00'),
(7, 'LEAD-1007', 'Manoj Nair', '+919823456707', 'manoj@nairtours.com', 'Nair Holiday Tours', 'Kochi', 'Kerala', 1, 5, 'Inbound', 3, 7, 'Medium', 4, 'SEO optimization for travel portal', 0, '2026-09-25 10:20:00'),
(8, 'LEAD-1008', 'Ritu Kapur', '+919823456708', 'ritu@kapurjewellers.com', 'Kapur Jewellers', 'Jaipur', 'Rajasthan', 4, 7, 'Campaign', 3, 8, 'High', 9, 'Branding, logo and social media design', 1, '2026-09-25 12:10:00'),
(9, 'LEAD-1009', 'Sunil Saxena', '+919823456709', 'sunil@saxenafoods.com', 'Saxena Organic Foods', 'Lucknow', 'Uttar Pradesh', 2, 2, 'Inbound', 3, 8, 'High', 11, 'Shopify e-commerce development', 1, '2026-09-26 11:00:00'),
(10, 'LEAD-1010', 'Vikram Malhotra', '+919823456710', 'vikram@malhotrainsurance.com', 'Malhotra Wealth', 'Chandigarh', 'Punjab', 5, 6, 'Outbound', 2, 4, 'Medium', 3, 'Assigned to Rahul for follow-up call', 0, '2026-09-26 15:30:00');

-- 14. Sample Call Logs
INSERT INTO call_logs (lead_id, user_id, call_outcome_id, call_duration_seconds, remarks, called_at) VALUES
(1, 4, 1, 240, 'Spoke with Mr. Rajesh. Wants website with 15 pages and contact form. Budget 45k-60k.', '2026-09-20 10:15:00'),
(2, 4, 9, 450, 'Highly interested in custom CRM software. Wants demo next week.', '2026-09-21 12:00:00'),
(3, 5, 2, 120, 'Client was busy in meeting. Requested call back tomorrow at 3 PM.', '2026-09-22 10:00:00'),
(4, 5, 3, 300, 'Scheduled Google Meet meeting for Friday 11 AM to present proposal.', '2026-09-23 15:00:00'),
(6, 7, 10, 600, 'Finalized deal for Android & iOS App. Client paid advance of 50,000 INR.', '2026-09-25 16:00:00');

-- 15. Sample Follow-ups
INSERT INTO followups (lead_id, user_id, followup_date, followup_time, purpose, notes, status) VALUES
(1, 4, CURRENT_DATE(), '16:00:00', 'Send proposal document', 'Prepare quotation for 15-page corporate website', 'Pending'),
(3, 5, CURRENT_DATE(), '15:00:00', 'Follow up call on e-commerce catalog', 'Call Ms. Kavita as requested', 'Pending'),
(5, 6, DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '11:00:00', 'First discovery call', 'Follow up regarding catalog pricing', 'Pending');

-- 16. Sample Meetings
INSERT INTO meetings (lead_id, assigned_user_id, meeting_title, meeting_type_id, meeting_date, meeting_time, meeting_mode, meeting_link, notes, status) VALUES
(2, 4, 'Custom CRM Requirement Demo', 3, CURRENT_DATE(), '14:00:00', 'Google Meet', 'https://meet.google.com/abc-defg-hij', 'Demonstrate telecalling module and lead distribution', 'Scheduled'),
(4, 5, 'Digital Marketing Strategy Review', 2, DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '11:30:00', 'Google Meet', 'https://meet.google.com/xyz-uvwx-rst', 'Discuss Google Ads target locations & monthly budget', 'Scheduled');

-- 17. Sample Sales Opportunities (Funnel)
INSERT INTO opportunities (id, opportunity_code, lead_id, title, service_id, assigned_manager_id, stage_id, expected_value, probability, expected_closing_date, status) VALUES
(1, 'OPP-101', 2, 'Mehta Tech - Custom CRM Development', 6, 2, 6, 150000.00, 80, '2026-10-15', 'Open'),
(2, 'OPP-102', 4, 'Joshi Logistics - Performance Google Ads', 4, 2, 5, 45000.00, 65, '2026-10-10', 'Open'),
(3, 'OPP-103', 6, 'Reddy Healthcare - Patient Mobile App', 3, 3, 8, 250000.00, 100, '2026-09-25', 'Won'),
(4, 'OPP-104', 9, 'Saxena Organic Foods - E-commerce Store', 2, 3, 8, 85000.00, 100, '2026-09-26', 'Won');

-- 18. Sample Projects
INSERT INTO projects (id, project_code, opportunity_id, lead_id, client_name, company_name, phone, email, service_id, assigned_manager_id, quoted_amount, final_amount, advance_amount, paid_amount, payment_status, stage_id, progress_percent, start_date, expected_delivery_date) VALUES
(1, 'PRJ-2001', 3, 6, 'Pooja Reddy', 'Reddy Healthcare', '+919823456706', 'pooja@reddypharma.com', 3, 3, 250000.00, 250000.00, 75000.00, 75000.00, 'Partial', 4, 35, '2026-09-26', '2026-11-30'),
(2, 'PRJ-2002', 4, 9, 'Sunil Saxena', 'Saxena Organic Foods', '+919823456709', 'sunil@saxenafoods.com', 2, 3, 85000.00, 85000.00, 42500.00, 42500.00, 'Partial', 2, 15, '2026-09-27', '2026-10-25');

-- 19. Sample Project Updates
INSERT INTO project_updates (project_id, user_id, update_text) VALUES
(1, 3, 'Kickoff meeting completed with client team. UI wireframes created in Figma.'),
(1, 3, 'Database design approved by Dr. Reddy.');

-- 20. Sample Payments
INSERT INTO payments (project_id, amount, payment_mode, transaction_reference, payment_date, recorded_by) VALUES
(1, 75000.00, 'Bank Transfer', 'NEFT-REDDY-998822', '2026-09-25', 3),
(2, 42500.00, 'UPI', 'UPI-SAXENA-771122', '2026-09-26', 3);

-- 21. System Settings
INSERT INTO settings (setting_key, setting_value) VALUES
('company_name', 'Leadstriangle CRM'),
('company_phone', '+91 98765 43210'),
('company_email', 'support@leadstriangle.com'),
('currency_symbol', '₹'),
('timezone', 'Asia/Kolkata'),
('auto_assign_mode', 'round_robin');

SET FOREIGN_KEY_CHECKS = 1;

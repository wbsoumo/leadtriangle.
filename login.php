<?php
// login.php - Professional AdminLTE 3 Login Page for Leadstriangle CRM
session_start();
if (!empty($_SESSION['user_id'])) {
    header('Location: /dashboard');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In &bull; Leadstriangle Enterprise CRM</title>
    <link rel="icon" type="image/png" href="assets/images/logo.png">
    <link rel="shortcut icon" type="image/png" href="assets/images/logo.png">

    <!-- Google Font: Source Sans Pro -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap" rel="stylesheet">

    <!-- Font Awesome (v5.15.4 Free) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <!-- Bootstrap 4.6.2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <!-- AdminLTE 3.2.0 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">

    <style>
        body.login-page {
            background-color: #f4f6f9;
            font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .login-box {
            width: 440px;
        }
        @media (max-width: 576px) {
            .login-box { width: 92%; }
        }
        .card-primary.card-outline {
            border-top: 3px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.06);
        }
        .brand-logo-img {
            width: 42px;
            height: 42px;
            border-radius: 8px;
            object-fit: contain;
        }
        .demo-credential-badge {
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .demo-credential-badge:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body class="hold-transition login-page">
<div class="login-box my-4">
    <!-- Login Logo -->
    <div class="login-logo text-center mb-3">
        <a href="/" class="d-flex align-items-center justify-content-center text-dark text-decoration-none">
            <img src="assets/images/logo.png" alt="Leadstriangle" class="brand-logo-img mr-2" onerror="this.style.display='none'">
            <span class="font-weight-bold" style="font-size: 24px; letter-spacing: -0.5px;">Leadstriangle</span>
            <span class="badge badge-primary text-xs ml-2">CRM</span>
        </a>
        <div class="text-muted text-xs mt-1">Enterprise Sales Execution &amp; BPO Calling Operations</div>
    </div>

    <!-- Login Card -->
    <div class="card card-outline card-primary">
        <div class="card-body login-card-body p-4">
            <p class="login-box-msg font-weight-bold text-secondary pb-0">Sign in to start your session</p>

            <!-- Alert notification -->
            <div id="login-alert" class="alert alert-danger py-2 px-3 mt-3 text-sm" style="display: none;" role="alert">
                <i class="fas fa-exclamation-circle mr-1"></i> <span id="login-alert-msg"></span>
            </div>

            <form id="login-form" onsubmit="handleLoginSubmit(event)" class="mt-3">
                <div class="form-group mb-3">
                    <label class="text-xs font-weight-bold text-muted mb-1">Email Address</label>
                    <div class="input-group">
                        <input type="email" id="email" class="form-control" placeholder="name@company.com" required autofocus value="admin@leadstriangle.com">
                        <div class="input-group-append">
                            <div class="input-group-text">
                                <span class="fas fa-envelope text-muted"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group mb-3">
                    <label class="text-xs font-weight-bold text-muted mb-1">Password</label>
                    <div class="input-group">
                        <input type="password" id="password" class="form-control" placeholder="••••••••" required value="Admin@123">
                        <div class="input-group-append">
                            <button type="button" class="btn btn-outline-secondary" onclick="togglePasswordVisibility()" title="Show/Hide Password">
                                <span class="fas fa-eye" id="eye-icon"></span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="row align-items-center mb-3">
                    <div class="col-8">
                        <div class="icheck-primary d-flex align-items-center">
                            <input type="checkbox" id="remember" checked style="width: 16px; height: 16px;">
                            <label for="remember" class="text-xs text-muted mb-0 ml-2 font-weight-normal" style="cursor: pointer;">
                                Keep me signed in (30 days)
                            </label>
                        </div>
                    </div>
                    <div class="col-4 text-right">
                        <button type="submit" id="submit-btn" class="btn btn-primary btn-block font-weight-bold">
                            <span id="btn-text">Sign In <i class="fas fa-arrow-right ml-1"></i></span>
                            <span id="btn-spinner" class="spinner-border spinner-border-sm" style="display:none;" role="status"></span>
                        </button>
                    </div>
                </div>
            </form>

            <!-- Quick Demo Credentials Selector -->
            <div class="mt-4 pt-3 border-top">
                <div class="text-xs font-weight-bold text-muted text-uppercase mb-2 text-center">Quick Demo Credentials (Click to fill)</div>
                <div class="d-flex flex-column" style="gap: 6px;">
                    <button type="button" class="btn btn-outline-primary btn-sm text-left demo-credential-badge d-flex justify-content-between align-items-center" onclick="fillCredentials('admin@leadstriangle.com', 'Admin@123')">
                        <div>
                            <strong>Super Admin</strong>
                            <div class="text-muted text-xs">admin@leadstriangle.com</div>
                        </div>
                        <span class="badge badge-primary">Full Control</span>
                    </button>
                    <button type="button" class="btn btn-outline-info btn-sm text-left demo-credential-badge d-flex justify-content-between align-items-center" onclick="fillCredentials('amit.manager@leadstriangle.com', 'Admin@123')">
                        <div>
                            <strong>Sales Manager</strong>
                            <div class="text-muted text-xs">amit.manager@leadstriangle.com</div>
                        </div>
                        <span class="badge badge-info">Team Lead</span>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm text-left demo-credential-badge d-flex justify-content-between align-items-center" onclick="fillCredentials('rahul.op@leadstriangle.com', 'Admin@123')">
                        <div>
                            <strong>Operation Executive</strong>
                            <div class="text-muted text-xs">rahul.op@leadstriangle.com</div>
                        </div>
                        <span class="badge badge-secondary">Caller / Agent</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="card-footer bg-white text-center py-2 text-xs text-muted border-top-0">
            Secure 256-bit SSL Session Encryption &bull; Leadstriangle
        </div>
    </div>
</div>

<!-- jQuery and Bootstrap 4 -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>

<script>
    function togglePasswordVisibility() {
        const pass = document.getElementById('password');
        const icon = document.getElementById('eye-icon');
        if (pass.type === 'password') {
            pass.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            pass.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    function fillCredentials(email, pass) {
        document.getElementById('email').value = email;
        document.getElementById('password').value = pass;
        const alertBox = document.getElementById('login-alert');
        alertBox.style.display = 'none';
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('submit-btn');
        const btnText = document.getElementById('btn-text');
        const btnSpinner = document.getElementById('btn-spinner');
        const alertBox = document.getElementById('login-alert');
        const alertMsg = document.getElementById('login-alert-msg');

        alertBox.style.display = 'none';
        alertBox.className = 'alert alert-danger py-2 px-3 mt-3 text-sm';
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline-block';

        try {
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', email);
            formData.append('password', password);

            const res = await fetch('api/auth', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                alertBox.className = 'alert alert-success py-2 px-3 mt-3 text-sm';
                alertMsg.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Login successful! Redirecting...';
                alertBox.style.display = 'block';
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 500);
            } else {
                alertMsg.innerText = data.message || 'Invalid email or password.';
                alertBox.style.display = 'block';
                submitBtn.disabled = false;
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
        } catch (err) {
            alertMsg.innerText = 'Network error or server unavailable. Please try again.';
            alertBox.style.display = 'block';
            submitBtn.disabled = false;
            btnText.style.display = 'inline-block';
            btnSpinner.style.display = 'none';
        }
    }
</script>
</body>
</html>

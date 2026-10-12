<?php
// login.php - Dedicated Professional Login Page for Leadstriangle CRM
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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --primary-glow: rgba(37, 99, 235, 0.35);
            --navy-dark: #070d19;
            --navy-surface: #0b1528;
            --navy-card: rgba(15, 23, 42, 0.72);
            --border-glass: rgba(255, 255, 255, 0.1);
            --border-glass-focus: rgba(59, 130, 246, 0.6);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        body {
            background-color: var(--navy-dark);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow-x: hidden;
            padding: 24px;
        }

        /* 3D Animated Interactive Canvas Background */
        #bg-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
        }

        /* Ambient glowing orbs */
        .ambient-glow-1 {
            position: fixed;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0) 70%);
            top: -150px;
            right: -100px;
            z-index: 1;
            filter: blur(50px);
            pointer-events: none;
            animation: pulseGlow 12s ease-in-out infinite alternate;
        }

        .ambient-glow-2 {
            position: fixed;
            width: 550px;
            height: 550px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.18) 0%, rgba(147, 51, 234, 0) 70%);
            bottom: -150px;
            left: -100px;
            z-index: 1;
            filter: blur(50px);
            pointer-events: none;
            animation: pulseGlow 14s ease-in-out infinite alternate-reverse;
        }

        @keyframes pulseGlow {
            0% { transform: scale(1) translate(0, 0); opacity: 0.7; }
            50% { transform: scale(1.15) translate(30px, -20px); opacity: 1; }
            100% { transform: scale(0.95) translate(-20px, 20px); opacity: 0.8; }
        }

        /* Split container layout */
        .login-container {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 1060px;
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            background: var(--navy-card);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            border: 1px solid var(--border-glass);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        /* Left Side Showcase */
        .showcase-side {
            background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
            padding: 48px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border-right: 1px solid var(--border-glass);
            position: relative;
            overflow: hidden;
        }

        .showcase-side::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15), transparent 60%);
            pointer-events: none;
        }

        .brand-header {
            display: flex;
            align-items: center;
            gap: 14px;
            text-decoration: none;
            position: relative;
            z-index: 2;
        }

        .brand-logo-img {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            object-fit: contain;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }

        .brand-name {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .brand-badge {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 800;
            background: rgba(37, 99, 235, 0.2);
            color: #60a5fa;
            border: 1px solid rgba(96, 165, 250, 0.3);
            padding: 3px 7px;
            border-radius: 6px;
            letter-spacing: 0.8px;
        }

        .showcase-content {
            margin: 40px 0;
            position: relative;
            z-index: 2;
        }

        .showcase-tag {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 999px;
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
            font-size: 12.5px;
            font-weight: 700;
            margin-bottom: 20px;
        }

        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
            animation: pulseGreen 2s infinite;
        }

        @keyframes pulseGreen {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }

        .showcase-title {
            font-size: 32px;
            font-weight: 800;
            line-height: 1.25;
            letter-spacing: -0.8px;
            color: #ffffff;
            margin-bottom: 16px;
        }

        .gradient-text {
            background: linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #38bdf8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .showcase-desc {
            color: var(--text-muted);
            font-size: 14.5px;
            line-height: 1.6;
            margin-bottom: 28px;
        }

        /* Feature cards */
        .showcase-cards {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .feature-card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feature-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(96, 165, 250, 0.4);
            transform: translateX(6px) translateY(-2px);
        }

        .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .card-icon.blue { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
        .card-icon.purple { background: rgba(147, 51, 234, 0.2); color: #c084fc; }
        .card-icon.green { background: rgba(16, 185, 129, 0.2); color: #34d399; }

        .card-text h4 {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 2px;
        }

        .card-text p {
            font-size: 12px;
            color: var(--text-muted);
        }

        .showcase-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-muted);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 20px;
            position: relative;
            z-index: 2;
        }

        .showcase-footer a {
            color: #60a5fa;
            text-decoration: none;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: color 0.2s;
        }

        .showcase-footer a:hover {
            color: #93c5fd;
            text-decoration: underline;
        }

        /* Right Form Side */
        .form-side {
            padding: 48px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: rgba(11, 21, 40, 0.85);
            position: relative;
        }

        .mobile-back-link {
            display: none;
            align-items: center;
            gap: 6px;
            color: #60a5fa;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            margin-bottom: 20px;
        }

        .form-header {
            margin-bottom: 32px;
        }

        .form-header h2 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.6px;
            color: #ffffff;
            margin-bottom: 8px;
        }

        .form-header p {
            font-size: 13.5px;
            color: var(--text-muted);
        }

        .alert-box {
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 24px;
            display: none;
            align-items: flex-start;
            gap: 12px;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
        }

        .form-group {
            margin-bottom: 22px;
        }

        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 8px;
            letter-spacing: 0.1px;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-icon {
            position: absolute;
            left: 15px;
            color: #64748b;
            pointer-events: none;
            display: flex;
            align-items: center;
            transition: color 0.2s;
        }

        .form-input {
            width: 100%;
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 13px 16px 13px 44px;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            outline: none;
            transition: all 0.25s ease;
        }

        .form-input:focus {
            border-color: #3b82f6;
            background: rgba(15, 23, 42, 0.95);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
        }

        .password-toggle {
            position: absolute;
            right: 14px;
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            transition: color 0.2s;
        }

        .password-toggle:hover {
            color: #cbd5e1;
        }

        .form-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            font-size: 13px;
        }

        .remember-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            cursor: pointer;
            user-select: none;
        }

        .remember-checkbox input {
            accent-color: var(--primary);
            width: 16px;
            height: 16px;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 14px 20px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.5);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.65);
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .credentials-card {
            margin-top: 28px;
            padding: 14px 18px;
            background: rgba(30, 41, 59, 0.4);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .credentials-card code {
            color: #60a5fa;
            background: rgba(37, 99, 235, 0.15);
            padding: 3px 7px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12.5px;
        }

        .copy-btn {
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: color 0.2s;
        }

        .copy-btn:hover {
            color: #60a5fa;
        }

        @media (max-width: 900px) {
            body {
                padding: 16px;
            }
            .login-container {
                grid-template-columns: 1fr;
                max-width: 460px;
                border-radius: 20px;
            }
            .showcase-side {
                display: none;
            }
            .form-side {
                padding: 36px 24px;
            }
            .mobile-back-link {
                display: inline-flex;
            }
        }
    </style>
</head>
<body>

    <!-- 3D Interactive Canvas -->
    <canvas id="bg-canvas"></canvas>

    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="login-container">
        <!-- Left Showcase Side -->
        <div class="showcase-side">
            <a href="/" class="brand-header">
                <img src="assets/images/logo.png" alt="Leadstriangle Logo" class="brand-logo-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\'width:44px;height:44px;background:#2563eb;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;\'>LT</div><div class=\'brand-name\'>Leadstriangle</div>';">
                <div class="brand-name">
                    Leadstriangle
                    <span class="brand-badge">CRM 2.0</span>
                </div>
            </a>

            <div class="showcase-content">
                <div class="showcase-tag">
                    <div class="pulse-dot"></div>
                    High Velocity BPO &amp; Sales Platform
                </div>

                <h1 class="showcase-title">
                    Accelerate Deals with <span class="gradient-text">Predictive Intelligence</span>
                </h1>

                <p class="showcase-desc">
                    Unify omnichannel lead distribution, automatic calling queues, sales pipelines, and real-time executive analytics in one single workspace.
                </p>

                <div class="showcase-cards">
                    <div class="feature-card">
                        <div class="card-icon blue">
                            <i data-lucide="zap" style="width:20px;height:20px;"></i>
                        </div>
                        <div class="card-text">
                            <h4>Zero-Latency Auto Dialing</h4>
                            <p>Real-time WebRTC &amp; SIM telephony synchronization</p>
                        </div>
                    </div>
                    <div class="feature-card">
                        <div class="card-icon purple">
                            <i data-lucide="target" style="width:20px;height:20px;"></i>
                        </div>
                        <div class="card-text">
                            <h4>Predictive Funnel Routing</h4>
                            <p>Automatic lead scoring and round-robin allocation</p>
                        </div>
                    </div>
                    <div class="feature-card">
                        <div class="card-icon green">
                            <i data-lucide="activity" style="width:20px;height:20px;"></i>
                        </div>
                        <div class="card-text">
                            <h4>360° Operations Cockpit</h4>
                            <p>Live calling metrics and executive pipeline conversion</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="showcase-footer">
                <span>&copy; <?php echo date('Y'); ?> Leadstriangle Inc.</span>
                <a href="/">
                    <i data-lucide="arrow-left" style="width:14px;height:14px;"></i>
                    Return to Homepage
                </a>
            </div>
        </div>

        <!-- Right Form Side -->
        <div class="form-side">
            <a href="/" class="mobile-back-link">
                <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                Back to Home
            </a>

            <div class="form-header">
                <h2>Welcome Back</h2>
                <p>Sign in with your authorized credentials to access your dashboard</p>
            </div>

            <div id="alert-box" class="alert-box">
                <span id="alert-msg"></span>
            </div>

            <form id="auth-form" onsubmit="handleFormSubmit(event)">
                <div class="form-group">
                    <label for="email">Work Email</label>
                    <div class="input-wrapper">
                        <input type="email" id="email" class="form-input" required placeholder="name@company.com" autocomplete="email">
                        <span class="input-icon">
                            <i data-lucide="mail" style="width:18px;height:18px;"></i>
                        </span>
                    </div>
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <div class="input-wrapper">
                        <input type="password" id="password" class="form-input" required placeholder="••••••••" autocomplete="current-password">
                        <span class="input-icon">
                            <i data-lucide="lock" style="width:18px;height:18px;"></i>
                        </span>
                        <button type="button" class="password-toggle" onclick="togglePasswordVisibility()" title="Show/Hide Password">
                            <i id="eye-icon" data-lucide="eye" style="width:18px;height:18px;"></i>
                        </button>
                    </div>
                </div>

                <div class="form-meta">
                    <label class="remember-checkbox">
                        <input type="checkbox" id="remember" checked>
                        <span>Keep me logged in for 30 days</span>
                    </label>
                </div>

                <button type="submit" id="submit-btn" class="btn-submit">
                    <span id="btn-text">Sign In to Dashboard &rarr;</span>
                    <div id="btn-spinner" class="spinner"></div>
                </button>
            </form>
        </div>
    </div>

    <!-- 3D Geometric Interactive Canvas Animation -->
    <script>
        if (window.lucide) {
            lucide.createIcons();
        }

        // Interactive 3D Particle Mesh Canvas
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let mouse = { x: null, y: null, radius: 150 };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        }

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        class Particle3D {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 400 + 50;
                this.vx = (Math.random() - 0.5) * 0.8;
                this.vy = (Math.random() - 0.5) * 0.8;
                this.vz = (Math.random() - 0.5) * 0.6;
                this.radius = Math.random() * 2 + 1;
                this.color = Math.random() > 0.4 ? 'rgba(59, 130, 246, ' : 'rgba(168, 85, 247, ';
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.z += this.vz;

                if (this.z < 50 || this.z > 450) this.vz = -this.vz;
                if (this.x < 0 || this.x > width) this.vx = -this.vx;
                if (this.y < 0 || this.y > height) this.vy = -this.vy;

                // Mouse interaction in 3D
                if (mouse.x !== null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouse.radius) {
                        let force = (mouse.radius - dist) / mouse.radius;
                        this.x -= (dx / dist) * force * 3;
                        this.y -= (dy / dist) * force * 3;
                    }
                }
            }

            draw() {
                let scale = 300 / (this.z + 200);
                let alpha = (scale * 0.6).toFixed(2);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * scale, 0, Math.PI * 2);
                ctx.fillStyle = this.color + alpha + ')';
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            const count = Math.min(Math.floor((width * height) / 12000), 85);
            for (let i = 0; i < count; i++) {
                particles.push(new Particle3D());
            }
        }

        function animateCanvas() {
            ctx.clearRect(0, 0, width, height);

            // Connect nearby particles with gradient lines
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    let dx = particles[i].x - particles[j].x;
                    let dy = particles[i].y - particles[j].y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 130) {
                        let alpha = ((1 - dist / 130) * 0.18).toFixed(2);
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
                particles[i].update();
                particles[i].draw();
            }

            requestAnimationFrame(animateCanvas);
        }

        resizeCanvas();
        animateCanvas();

        // Password visibility toggle
        function togglePasswordVisibility() {
            const passInput = document.getElementById('password');
            const eyeIcon = document.getElementById('eye-icon');
            if (passInput.type === 'password') {
                passInput.type = 'text';
                eyeIcon.setAttribute('data-lucide', 'eye-off');
            } else {
                passInput.type = 'password';
                eyeIcon.setAttribute('data-lucide', 'eye');
            }
            if (window.lucide) lucide.createIcons();
        }

        // Form Submit Handler
        async function handleFormSubmit(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('submit-btn');
            const btnText = document.getElementById('btn-text');
            const btnSpinner = document.getElementById('btn-spinner');
            const alertBox = document.getElementById('alert-box');
            const alertMsg = document.getElementById('alert-msg');

            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'block';

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
                    alertBox.className = 'alert-box alert-success';
                    alertMsg.textContent = 'Login successful! Redirecting to dashboard...';
                    alertBox.style.display = 'flex';
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 600);
                } else {
                    alertBox.className = 'alert-box alert-error';
                    alertMsg.textContent = data.message || 'Invalid email or password.';
                    alertBox.style.display = 'flex';
                    submitBtn.disabled = false;
                    btnText.style.display = 'block';
                    btnSpinner.style.display = 'none';
                }
            } catch (err) {
                alertBox.className = 'alert-box alert-error';
                alertMsg.textContent = 'Network or server error. Please try again.';
                alertBox.style.display = 'flex';
                submitBtn.disabled = false;
                btnText.style.display = 'block';
                btnSpinner.style.display = 'none';
            }
        }
    </script>
</body>
</html>

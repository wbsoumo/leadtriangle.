<?php
// index.php - High-Conversion 3D Animated Homepage for Leadstriangle CRM & Operations Platform
session_start();
$isLoggedIn = !empty($_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leadstriangle &bull; The Enterprise Sales Execution CRM &amp; BPO Telephony Engine</title>
    <meta name="description" content="Accelerate high-velocity sales, multi-channel lead distribution, automated SIM/WebRTC calling queues, and visual deal pipelines with Leadstriangle.">
    <link rel="icon" type="image/png" href="assets/images/logo.png">
    <link rel="shortcut icon" type="image/png" href="assets/images/logo.png">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    
    <!-- Three.js for true 3D interactive graphics -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <style>
        :root {
            --primary: #2563eb;
            --primary-light: #60a5fa;
            --primary-dark: #1d4ed8;
            --accent-cyan: #06b6d4;
            --accent-purple: #8b5cf6;
            --accent-orange: #f97316;
            --accent-green: #10b981;
            
            --bg-dark: #050814;
            --bg-card: rgba(15, 23, 42, 0.65);
            --bg-card-hover: rgba(30, 41, 59, 0.75);
            --border-glass: rgba(255, 255, 255, 0.08);
            --border-glass-bright: rgba(96, 165, 250, 0.35);
            
            --text-heading: #ffffff;
            --text-body: #94a3b8;
            --text-muted: #64748b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            background-color: var(--bg-dark);
            color: var(--text-heading);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* 3D WebGL Canvas Viewport */
        #webgl-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 0;
            pointer-events: none;
            opacity: 0.85;
        }

        /* Ambient glowing lights */
        .glow-sphere-1 {
            position: fixed;
            width: 650px;
            height: 650px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0) 70%);
            top: -200px;
            right: 5%;
            filter: blur(80px);
            z-index: 1;
            pointer-events: none;
            animation: floatGlow 14s ease-in-out infinite alternate;
        }

        .glow-sphere-2 {
            position: fixed;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, rgba(139, 92, 246, 0) 70%);
            bottom: 5%;
            left: -150px;
            filter: blur(80px);
            z-index: 1;
            pointer-events: none;
            animation: floatGlow 18s ease-in-out infinite alternate-reverse;
        }

        @keyframes floatGlow {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(40px, -30px) scale(1.12); }
            100% { transform: translate(-30px, 30px) scale(0.95); }
        }

        /* Layout wrapper */
        .site-wrapper {
            position: relative;
            z-index: 10;
            width: 100%;
        }

        /* NAVBAR */
        .navbar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 100;
            padding: 16px 24px;
            transition: all 0.3s ease;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            background: rgba(5, 8, 20, 0.75);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .nav-inner {
            max-width: 1240px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .brand-link {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #ffffff;
        }

        .brand-logo-img {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            object-fit: contain;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }

        .brand-text {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .version-badge {
            font-size: 10px;
            font-weight: 800;
            color: #60a5fa;
            background: rgba(37, 99, 235, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 2px 7px;
            border-radius: 6px;
            letter-spacing: 0.5px;
        }

        .nav-menu {
            display: flex;
            align-items: center;
            gap: 32px;
            list-style: none;
        }

        .nav-menu a {
            color: var(--text-body);
            text-decoration: none;
            font-size: 14.5px;
            font-weight: 600;
            transition: color 0.2s ease;
        }

        .nav-menu a:hover {
            color: #ffffff;
        }

        .nav-actions {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        /* Mobile Hamburger Toggle (3 line menu) */
        .mobile-menu-toggle {
            display: none;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: 10px;
            padding: 8px;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .mobile-menu-toggle:hover {
            background: rgba(255, 255, 255, 0.16);
        }

        /* Mobile White Bottom/Side Sheet */
        .mobile-sheet-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 9998;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .mobile-sheet-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .mobile-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            max-height: 90vh;
            background: #ffffff;
            color: #0f172a;
            border-top-left-radius: 28px;
            border-top-right-radius: 28px;
            padding: 24px 24px 36px;
            z-index: 9999;
            transform: translateY(100%);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 -15px 40px rgba(0, 0, 0, 0.35);
            overflow-y: auto;
        }

        .mobile-sheet.active {
            transform: translateY(0);
        }

        .sheet-drag-handle {
            width: 44px;
            height: 5px;
            background: #e2e8f0;
            border-radius: 99px;
            margin: 0 auto 18px;
        }

        .sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 16px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 20px;
        }

        .sheet-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sheet-brand img {
            width: 34px;
            height: 34px;
            border-radius: 8px;
            object-fit: contain;
        }

        .sheet-brand-name {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
        }

        .sheet-close-btn {
            background: #f1f5f9;
            border: none;
            color: #475569;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
        }

        .sheet-close-btn:hover {
            background: #e2e8f0;
        }

        .sheet-actions-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 24px;
        }

        .sheet-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s;
            text-align: center;
        }

        .sheet-btn-primary {
            background: #2563eb;
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        }

        .sheet-btn-primary:active {
            background: #1d4ed8;
        }

        .sheet-btn-outline {
            background: #f8fafc;
            border: 1.5px solid #e2e8f0;
            color: #1e293b;
        }

        .sheet-btn-outline:active {
            background: #f1f5f9;
        }

        .sheet-nav-links {
            display: flex;
            flex-direction: column;
            gap: 6px;
            border-top: 1px solid #f1f5f9;
            padding-top: 16px;
        }

        .sheet-nav-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            border-radius: 10px;
            text-decoration: none;
            color: #334155;
            font-size: 14.5px;
            font-weight: 600;
            transition: background 0.2s;
        }

        .sheet-nav-item:hover, .sheet-nav-item:active {
            background: #f8fafc;
            color: #2563eb;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 11px 22px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            cursor: pointer;
            border: none;
        }

        .btn-outline {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ffffff;
        }

        .btn-outline:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }

        .btn-primary {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            box-shadow: 0 4px 20px rgba(37, 99, 235, 0.45);
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.6);
        }

        .btn-glow {
            position: relative;
            overflow: hidden;
        }

        .btn-glow::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .btn-glow:hover::after {
            opacity: 1;
        }

        /* HERO SECTION */
        .hero-section {
            padding: 160px 24px 80px;
            max-width: 1240px;
            margin: 0 auto;
            min-height: 90vh;
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            align-items: center;
            gap: 40px;
            position: relative;
        }

        .hero-content {
            position: relative;
            z-index: 2;
        }

        .announcement-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 7px 16px;
            border-radius: 999px;
            background: rgba(37, 99, 235, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.28);
            color: #93c5fd;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 24px;
            backdrop-filter: blur(10px);
        }

        .badge-live-pulse {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
            animation: pulseGreen 1.8s infinite;
        }

        @keyframes pulseGreen {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.8); }
        }

        .hero-title {
            font-size: 58px;
            font-weight: 800;
            line-height: 1.12;
            letter-spacing: -1.8px;
            margin-bottom: 22px;
        }

        .gradient-span {
            background: linear-gradient(135deg, #60a5fa 0%, #a855f7 40%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .hero-description {
            font-size: 18px;
            line-height: 1.65;
            color: var(--text-body);
            margin-bottom: 36px;
            max-width: 540px;
        }

        .hero-cta-group {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 44px;
        }

        .hero-kpis {
            display: flex;
            align-items: center;
            gap: 36px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 28px;
        }

        .kpi-item h3 {
            font-size: 26px;
            font-weight: 800;
            color: #ffffff;
            font-family: 'Space Grotesk', sans-serif;
        }

        .kpi-item p {
            font-size: 12.5px;
            color: var(--text-muted);
            font-weight: 600;
            margin-top: 2px;
        }

        /* 3D HERO VISUAL CARD COCKPIT */
        .hero-3d-visual {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            perspective: 1000px;
        }

        .glass-cockpit {
            width: 100%;
            max-width: 520px;
            background: var(--bg-card);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            border: 1px solid var(--border-glass-bright);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 50px rgba(37, 99, 235, 0.15);
            transform-style: preserve-3d;
            transition: transform 0.2s ease-out;
            animation: floatCard 6s ease-in-out infinite alternate;
        }

        @keyframes floatCard {
            0% { transform: translateY(0px) rotateX(2deg) rotateY(-3deg); }
            100% { transform: translateY(-14px) rotateX(-2deg) rotateY(3deg); }
        }

        .cockpit-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 18px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            margin-bottom: 20px;
        }

        .dots-row {
            display: flex;
            gap: 6px;
        }

        .dot-circle {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .cockpit-status {
            font-size: 11.5px;
            font-weight: 700;
            color: #60a5fa;
            background: rgba(37, 99, 235, 0.15);
            padding: 4px 10px;
            border-radius: 6px;
        }

        /* Cockpit mini widgets */
        .cockpit-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }

        .metric-tile {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 14px;
            padding: 14px;
        }

        .metric-tile span {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .metric-tile .val {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            margin-top: 4px;
            font-family: 'Space Grotesk', sans-serif;
        }

        .metric-tile .trend {
            font-size: 11px;
            color: #10b981;
            font-weight: 700;
            margin-top: 2px;
        }

        .live-call-stream {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .stream-title {
            font-size: 12px;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .live-tag {
            color: #ef4444;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
        }

        .live-tag::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ef4444;
            animation: pulseGreen 1s infinite;
        }

        .call-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 10px;
            margin-bottom: 8px;
            font-size: 13px;
        }

        .call-row:last-child {
            margin-bottom: 0;
        }

        .lead-avatar {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #2563eb;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
        }

        .lead-detail h5 {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .lead-detail p {
            font-size: 11px;
            color: var(--text-muted);
        }

        .stage-pill {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
        }

        .stage-interested { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .stage-calling { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

        /* Floating satellites around cockpit */
        .floating-badge {
            position: absolute;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(14px);
            padding: 12px 18px;
            border-radius: 14px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 3;
            animation: floatSatellite 7s ease-in-out infinite alternate;
        }

        .sat-top-right {
            top: -24px;
            right: -24px;
        }

        .sat-bottom-left {
            bottom: -20px;
            left: -30px;
            animation-delay: -3.5s;
        }

        @keyframes floatSatellite {
            0% { transform: translateY(0px) rotate(0deg); }
            100% { transform: translateY(-16px) rotate(2deg); }
        }

        .sat-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sat-icon.blue { background: rgba(37, 99, 235, 0.25); color: #60a5fa; }
        .sat-icon.green { background: rgba(16, 185, 129, 0.25); color: #34d399; }

        .sat-info h6 {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .sat-info p {
            font-size: 11px;
            color: var(--text-muted);
        }

        /* CLIENTS / INTEGRATION MARQUEE */
        .marquee-section {
            padding: 40px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(15, 23, 42, 0.25);
            overflow: hidden;
            position: relative;
        }

        .marquee-title {
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 24px;
        }

        .marquee-track {
            display: flex;
            gap: 36px;
            width: max-content;
            animation: scrollMarquee 32s linear infinite;
        }

        @keyframes scrollMarquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        .marquee-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 15px;
            font-weight: 700;
            color: #cbd5e1;
            padding: 8px 18px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .marquee-item i {
            color: #60a5fa;
            width: 17px;
            height: 17px;
        }

        /* 3D FEATURE GRID */
        .features-section {
            padding: 120px 24px;
            max-width: 1240px;
            margin: 0 auto;
            position: relative;
        }

        .section-header {
            text-align: center;
            max-width: 720px;
            margin: 0 auto 70px;
        }

        .section-tag {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #60a5fa;
            letter-spacing: 1.2px;
            margin-bottom: 12px;
        }

        .section-title {
            font-size: 44px;
            font-weight: 800;
            line-height: 1.2;
            letter-spacing: -1.2px;
            margin-bottom: 16px;
        }

        .section-subtitle {
            font-size: 16.5px;
            color: var(--text-body);
            line-height: 1.6;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
        }

        .feature-box {
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: 20px;
            padding: 32px 28px;
            transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(16px);
        }

        .feature-box::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 3px;
            background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.7), transparent);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .feature-box:hover {
            transform: translateY(-8px);
            border-color: rgba(96, 165, 250, 0.4);
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 30px rgba(37, 99, 235, 0.15);
        }

        .feature-box:hover::before {
            opacity: 1;
        }

        .feature-icon-wrapper {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 22px;
        }

        .feature-icon-wrapper.blue { background: rgba(37, 99, 235, 0.18); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .feature-icon-wrapper.purple { background: rgba(139, 92, 246, 0.18); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }
        .feature-icon-wrapper.cyan { background: rgba(6, 182, 212, 0.18); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
        .feature-icon-wrapper.orange { background: rgba(249, 115, 22, 0.18); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
        .feature-icon-wrapper.green { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .feature-icon-wrapper.rose { background: rgba(244, 63, 94, 0.18); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }

        .feature-box h4 {
            font-size: 19px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 12px;
            letter-spacing: -0.3px;
        }

        .feature-box p {
            font-size: 14px;
            color: var(--text-body);
            line-height: 1.6;
        }

        /* WORKFLOW / INTERACTIVE SHOWCASE */
        .showcase-section {
            padding: 100px 24px;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(5, 8, 20, 0.8) 100%);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .showcase-container {
            max-width: 1240px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 60px;
            align-items: center;
        }

        .workflow-step {
            display: flex;
            gap: 20px;
            margin-bottom: 32px;
            padding: 18px 20px;
            border-radius: 16px;
            border: 1px solid transparent;
            transition: all 0.3s;
            cursor: pointer;
        }

        .workflow-step.active, .workflow-step:hover {
            background: rgba(30, 41, 59, 0.5);
            border-color: rgba(59, 130, 246, 0.3);
        }

        .step-num {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(37, 99, 235, 0.2);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 14px;
            flex-shrink: 0;
        }

        .step-content h5 {
            font-size: 17px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
        }

        .step-content p {
            font-size: 13.5px;
            color: var(--text-body);
            line-height: 1.5;
        }

        /* Pipeline Visualizer Box */
        .pipeline-card {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 32px;
            backdrop-filter: blur(20px);
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
        }

        .pipeline-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }

        .pipeline-lanes {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }

        .lane {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 14px;
            padding: 14px;
        }

        .lane-header {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
        }

        .lane-card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 10px;
            font-size: 12.5px;
            transition: transform 0.2s;
        }

        .lane-card:hover {
            transform: translateY(-2px);
            border-color: rgba(96, 165, 250, 0.4);
        }

        .card-company {
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 4px;
        }

        .card-amt {
            color: #34d399;
            font-weight: 800;
            font-size: 12px;
        }

        /* CTA CALLOUT */
        .cta-section {
            padding: 120px 24px;
            max-width: 1240px;
            margin: 0 auto;
            position: relative;
        }

        .cta-banner {
            background: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.35) 0%, rgba(15, 23, 42, 0.8) 70%);
            border: 1px solid rgba(96, 165, 250, 0.35);
            border-radius: 32px;
            padding: 70px 40px;
            text-align: center;
            box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 60px rgba(37, 99, 235, 0.2);
            position: relative;
            overflow: hidden;
        }

        .cta-banner h2 {
            font-size: 46px;
            font-weight: 800;
            letter-spacing: -1.2px;
            margin-bottom: 18px;
        }

        .cta-banner p {
            font-size: 18px;
            color: var(--text-body);
            max-width: 600px;
            margin: 0 auto 36px;
        }

        /* FOOTER */
        .footer {
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding: 60px 24px 36px;
            background: #02040a;
        }

        .footer-inner {
            max-width: 1240px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 40px;
            margin-bottom: 48px;
        }

        .footer-brand p {
            color: var(--text-muted);
            font-size: 14px;
            line-height: 1.6;
            margin-top: 14px;
            max-width: 320px;
        }

        .footer-col h5 {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 18px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .footer-col ul {
            list-style: none;
        }

        .footer-col ul li {
            margin-bottom: 12px;
        }

        .footer-col ul li a {
            color: var(--text-body);
            text-decoration: none;
            font-size: 13.5px;
            transition: color 0.2s;
        }

        .footer-col ul li a:hover {
            color: #60a5fa;
        }

        .footer-bottom {
            max-width: 1240px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding-top: 28px;
            font-size: 13px;
            color: var(--text-muted);
        }

        /* RESPONSIVE STYLES */
        @media (max-width: 1024px) {
            .hero-section {
                grid-template-columns: 1fr;
                padding-top: 120px;
                text-align: center;
            }
            .hero-title { font-size: 44px; }
            .hero-description { margin: 0 auto 32px; }
            .hero-cta-group { justify-content: center; }
            .hero-kpis { justify-content: center; }
            .hero-3d-visual { margin-top: 40px; }
            .feature-grid { grid-template-columns: repeat(2, 1fr); }
            .showcase-container { grid-template-columns: 1fr; }
            .footer-inner { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 768px) {
            .navbar {
                padding: 12px 18px;
            }
            .nav-menu { display: none; }
            .nav-actions { display: none; }
            .mobile-menu-toggle { display: inline-flex; }

            .hero-section {
                padding: 105px 18px 60px;
            }
            .hero-title {
                font-size: 34px;
                letter-spacing: -1px;
            }
            .hero-description {
                font-size: 15.5px;
                margin-bottom: 28px;
            }
            .hero-cta-group {
                flex-direction: column;
                width: 100%;
                gap: 12px;
            }
            .hero-cta-group .btn {
                width: 100%;
            }
            .hero-kpis {
                gap: 20px;
                flex-wrap: wrap;
                justify-content: space-around;
            }
            .kpi-item h3 { font-size: 22px; }

            .glass-cockpit {
                padding: 18px;
                border-radius: 18px;
            }
            .floating-badge {
                display: none; /* Hide floating badges on narrow screens to avoid horizontal overflow */
            }

            .feature-grid { grid-template-columns: 1fr; }
            .features-section { padding: 70px 18px; }
            .section-title { font-size: 32px; }

            .pipeline-card {
                padding: 20px 16px;
                border-radius: 18px;
            }
            .pipeline-lanes {
                grid-template-columns: 1fr;
            }

            .cta-banner {
                padding: 50px 20px;
                border-radius: 22px;
            }
            .cta-banner h2 { font-size: 30px; }
            .cta-banner p { font-size: 15px; }

            .footer-inner { grid-template-columns: 1fr; gap: 32px; }
            .footer-bottom { flex-direction: column; gap: 14px; text-align: center; }
        }
    </style>
</head>
<body>

    <!-- 3D WebGL Canvas Layer -->
    <canvas id="webgl-canvas"></canvas>

    <!-- Ambient Gradient Spheres -->
    <div class="glow-sphere-1"></div>
    <div class="glow-sphere-2"></div>

    <div class="site-wrapper">
        <!-- TOP NAVIGATION -->
        <nav class="navbar">
            <div class="nav-inner">
                <a href="/" class="brand-link">
                    <img src="assets/images/logo.png" alt="Leadstriangle Logo" class="brand-logo-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\'width:40px;height:40px;background:#2563eb;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;\'>LT</div><div class=\'brand-text\'>Leadstriangle</div>';">
                    <span class="brand-text">
                        Leadstriangle
                        <span class="version-badge">ENTERPRISE</span>
                    </span>
                </a>

                <ul class="nav-menu">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#telephony">Calling Ops</a></li>
                    <li><a href="#pipeline">Sales Funnel</a></li>
                    <li><a href="#integrations">Integrations</a></li>
                </ul>

                <!-- Desktop Nav Actions -->
                <div class="nav-actions">
                    <?php if ($isLoggedIn): ?>
                        <a href="/dashboard" class="btn btn-primary btn-glow">
                            Open Dashboard &rarr;
                        </a>
                    <?php else: ?>
                        <a href="/login" class="btn btn-outline">
                            Sign In
                        </a>
                        <a href="/login" class="btn btn-primary btn-glow">
                            Request Demo &rarr;
                        </a>
                    <?php endif; ?>
                </div>

                <!-- Mobile 3-Line Menu Button -->
                <button class="mobile-menu-toggle" onclick="toggleMobileSheet()" aria-label="Open Navigation Menu">
                    <i data-lucide="menu" style="width:24px;height:24px;"></i>
                </button>
            </div>
        </nav>

        <!-- MOBILE WHITE BOTTOM SHEET -->
        <div class="mobile-sheet-overlay" id="mobile-sheet-overlay" onclick="toggleMobileSheet()"></div>
        <div class="mobile-sheet" id="mobile-sheet">
            <div class="sheet-drag-handle"></div>
            
            <div class="sheet-header">
                <div class="sheet-brand">
                    <img src="assets/images/logo.png" alt="Leadstriangle Logo">
                    <span class="sheet-brand-name">Leadstriangle</span>
                </div>
                <button class="sheet-close-btn" onclick="toggleMobileSheet()" aria-label="Close Menu">
                    <i data-lucide="x" style="width:20px;height:20px;"></i>
                </button>
            </div>

            <!-- Primary Sheet Action Buttons -->
            <div class="sheet-actions-group">
                <?php if ($isLoggedIn): ?>
                    <a href="/dashboard" class="sheet-btn sheet-btn-primary">
                        <i data-lucide="layout-dashboard" style="width:18px;height:18px;"></i>
                        Open Dashboard &rarr;
                    </a>
                <?php else: ?>
                    <a href="/login" class="sheet-btn sheet-btn-primary">
                        <i data-lucide="calendar" style="width:18px;height:18px;"></i>
                        Request Demo &rarr;
                    </a>
                    <a href="/login" class="sheet-btn sheet-btn-outline">
                        <i data-lucide="log-in" style="width:18px;height:18px;"></i>
                        Sign In
                    </a>
                <?php endif; ?>
            </div>

            <!-- Quick Navigation In Sheet -->
            <div class="sheet-nav-links">
                <a href="#features" class="sheet-nav-item" onclick="toggleMobileSheet()">
                    <span>Platform Features</span>
                    <i data-lucide="chevron-right" style="width:16px;height:16px;color:#94a3b8;"></i>
                </a>
                <a href="#pipeline" class="sheet-nav-item" onclick="toggleMobileSheet()">
                    <span>Sales Pipeline Funnel</span>
                    <i data-lucide="chevron-right" style="width:16px;height:16px;color:#94a3b8;"></i>
                </a>
                <a href="#integrations" class="sheet-nav-item" onclick="toggleMobileSheet()">
                    <span>Telephony &amp; Integrations</span>
                    <i data-lucide="chevron-right" style="width:16px;height:16px;color:#94a3b8;"></i>
                </a>
            </div>
        </div>

        <!-- HERO SECTION -->
        <section class="hero-section">
            <div class="hero-content">
                <div class="announcement-badge">
                    <div class="badge-live-pulse"></div>
                    Next-Gen Telephony &amp; Deal Execution Engine
                </div>

                <h1 class="hero-title">
                    High-Velocity <br>
                    <span class="gradient-span">Sales Execution</span> &amp; CRM Telephony
                </h1>

                <p class="hero-description">
                    Empower your sales, telecalling, and operations teams with real-time lead ingestion, automated predictive dialers, dynamic funnels, and enterprise analytics.
                </p>

                <div class="hero-cta-group">
                    <a href="/login" class="btn btn-primary btn-glow" style="padding: 14px 30px; font-size: 15.5px;">
                        Launch Portal &rarr;
                    </a>
                    <a href="#features" class="btn btn-outline" style="padding: 14px 26px; font-size: 15.5px;">
                        Explore Platform
                    </a>
                </div>

                <div class="hero-kpis">
                    <div class="kpi-item">
                        <h3>99.98%</h3>
                        <p>TELEPHONY UPTIME</p>
                    </div>
                    <div class="kpi-item">
                        <h3>3.4x</h3>
                        <p>FASTER DIALING CYCLES</p>
                    </div>
                    <div class="kpi-item">
                        <h3>100%</h3>
                        <p>DATA SOVEREIGNTY</p>
                    </div>
                </div>
            </div>

            <!-- 3D INTERACTIVE HERO COCKPIT -->
            <div class="hero-3d-visual">
                <div class="glass-cockpit" id="cockpit-card">
                    <div class="cockpit-header">
                        <div class="dots-row">
                            <div class="dot-circle dot-red"></div>
                            <div class="dot-circle dot-yellow"></div>
                            <div class="dot-circle dot-green"></div>
                        </div>
                        <div class="cockpit-status">&bull; LIVE TELEPHONY DISPATCH</div>
                    </div>

                    <div class="cockpit-metrics">
                        <div class="metric-tile">
                            <span>Active Call Queue</span>
                            <div class="val">48 Leads</div>
                            <div class="trend">&uarr; +18% Auto-Routed</div>
                        </div>
                        <div class="metric-tile">
                            <span>Conversion Rate</span>
                            <div class="val">34.8%</div>
                            <div class="trend">&uarr; +5.2% Qualified</div>
                        </div>
                    </div>

                    <div class="live-call-stream">
                        <div class="stream-title">
                            <span>Real-Time Ingestion</span>
                            <span class="live-tag">LIVE SYNC</span>
                        </div>

                        <div class="call-row">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="lead-avatar">RK</div>
                                <div class="lead-detail">
                                    <h5>Rahul Kulkarni</h5>
                                    <p>Enterprise SaaS &bull; +91 98201 44589</p>
                                </div>
                            </div>
                            <span class="stage-pill stage-calling">Connecting...</span>
                        </div>

                        <div class="call-row">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="lead-avatar" style="background:#8b5cf6;">AM</div>
                                <div class="lead-detail">
                                    <h5>Anita Mehta</h5>
                                    <p>FinTech Tier 1 &bull; +91 98712 90123</p>
                                </div>
                            </div>
                            <span class="stage-pill stage-interested">Demo Booked</span>
                        </div>
                    </div>
                </div>

                <!-- Floating Satellite badges (Hidden on small mobile screens) -->
                <div class="floating-badge sat-top-right">
                    <div class="sat-icon blue">
                        <i data-lucide="zap" style="width:18px;height:18px;"></i>
                    </div>
                    <div class="sat-info">
                        <h6>Zero Dial Delay</h6>
                        <p>WebRTC &amp; SIM Gateway</p>
                    </div>
                </div>

                <div class="floating-badge sat-bottom-left">
                    <div class="sat-icon green">
                        <i data-lucide="target" style="width:18px;height:18px;"></i>
                    </div>
                    <div class="sat-info">
                        <h6>Smart Lead Scoring</h6>
                        <p>Auto-assign to top rep</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- MARQUEE INTEGRATIONS -->
        <section class="marquee-section" id="integrations">
            <div class="marquee-title">Powering Sales Operations Across Leading Workflows</div>
            <div class="marquee-track">
                <div class="marquee-item"><i data-lucide="phone-call"></i> Cloud Telephony Integration</div>
                <div class="marquee-item"><i data-lucide="smartphone"></i> Native Android CRM Sync</div>
                <div class="marquee-item"><i data-lucide="zap"></i> Instant Webhook Ingestion</div>
                <div class="marquee-item"><i data-lucide="message-square"></i> WhatsApp Business Automation</div>
                <div class="marquee-item"><i data-lucide="bar-chart-2"></i> Predictive Sales Analytics</div>
                <div class="marquee-item"><i data-lucide="shield"></i> Role-Based Team Hierarchy</div>
                <!-- Duplicate for seamless loop -->
                <div class="marquee-item"><i data-lucide="phone-call"></i> Cloud Telephony Integration</div>
                <div class="marquee-item"><i data-lucide="smartphone"></i> Native Android CRM Sync</div>
                <div class="marquee-item"><i data-lucide="zap"></i> Instant Webhook Ingestion</div>
                <div class="marquee-item"><i data-lucide="message-square"></i> WhatsApp Business Automation</div>
                <div class="marquee-item"><i data-lucide="bar-chart-2"></i> Predictive Sales Analytics</div>
                <div class="marquee-item"><i data-lucide="shield"></i> Role-Based Team Hierarchy</div>
            </div>
        </section>

        <!-- FEATURES SECTION -->
        <section class="features-section" id="features">
            <div class="section-header">
                <div class="section-tag">Enterprise Architecture</div>
                <h2 class="section-title">Engineered for High-Velocity Closing</h2>
                <p class="section-subtitle">
                    Everything modern telecalling operations and sales leaders need to eliminate idle agent time, prioritize qualified opportunities, and accelerate revenue.
                </p>
            </div>

            <div class="feature-grid">
                <div class="feature-box">
                    <div class="feature-icon-wrapper blue">
                        <i data-lucide="phone-call"></i>
                    </div>
                    <h4>Unified Calling Queue</h4>
                    <p>Automate outbound calling queues with one-click dialing, call dispositions, automated follow-up scheduling, and call outcome tracking.</p>
                </div>

                <div class="feature-box">
                    <div class="feature-icon-wrapper purple">
                        <i data-lucide="git-merge"></i>
                    </div>
                    <h4>Omnichannel Lead Capture</h4>
                    <p>Ingest leads in real-time from web forms, landing pages, Meta ads, external APIs, and CSV files with automatic deduplication.</p>
                </div>

                <div class="feature-box">
                    <div class="feature-icon-wrapper cyan">
                        <i data-lucide="trending-up"></i>
                    </div>
                    <h4>Visual Deal Funnel</h4>
                    <p>Track your opportunities through customizable pipeline stages from New Prospect to Proposal Sent, Negotiation, and Closed-Won.</p>
                </div>

                <div class="feature-box">
                    <div class="feature-icon-wrapper orange">
                        <i data-lucide="users"></i>
                    </div>
                    <h4>Team Performance &amp; BPO Hierarchy</h4>
                    <p>Organize reps by teams, territories, and supervisors. Control page-level access, calling quotas, and lead visibility granularly.</p>
                </div>

                <div class="feature-box">
                    <div class="feature-icon-wrapper green">
                        <i data-lucide="bar-chart-3"></i>
                    </div>
                    <h4>Real-Time Sales Cockpit</h4>
                    <p>Live KPI dashboards with conversion tracking, call connection ratios, revenue velocity, and executive activity timelines.</p>
                </div>

                <div class="feature-box">
                    <div class="feature-icon-wrapper rose">
                        <i data-lucide="shield-check"></i>
                    </div>
                    <h4>Enterprise Data Security</h4>
                    <p>End-to-end encrypted sessions, strict role-based permission locks, automatic session persistence, and audit logging.</p>
                </div>
            </div>
        </section>

        <!-- PIPELINE / WORKFLOW SHOWCASE -->
        <section class="showcase-section" id="pipeline">
            <div class="showcase-container">
                <div>
                    <div class="section-tag">Operational Excellence</div>
                    <h2 class="section-title" style="text-align: left; font-size: 38px;">From Raw Lead to Revenue in 4 Steps</h2>
                    <p class="section-subtitle" style="text-align: left; margin-bottom: 32px;">
                        Eliminate manual spreadsheet handoffs and automate every touchpoint across your sales cycle.
                    </p>

                    <div class="workflow-step active">
                        <div class="step-num">1</div>
                        <div class="step-content">
                            <h5>Automated Distribution</h5>
                            <p>Leads are immediately scored and round-robin assigned to available calling executives in less than 500 milliseconds.</p>
                        </div>
                    </div>

                    <div class="workflow-step">
                        <div class="step-num">2</div>
                        <div class="step-content">
                            <h5>Guided Telephony Engagement</h5>
                            <p>Executives dial directly through the integrated queue, capture notes, and record call outcomes with zero friction.</p>
                        </div>
                    </div>

                    <div class="workflow-step">
                        <div class="step-num">3</div>
                        <div class="step-content">
                            <h5>Dynamic Meeting Scheduling</h5>
                            <p>Lock in product demonstrations, generate calendar invites, and synchronize reminders for clients automatically.</p>
                        </div>
                    </div>
                </div>

                <div class="pipeline-card">
                    <div class="pipeline-header">
                        <div>
                            <h4 style="font-size: 16px; font-weight: 800; color: #ffffff;">Sales Funnel Kanban</h4>
                            <p style="font-size: 12px; color: var(--text-muted);">Live Deal Flow Pipeline</p>
                        </div>
                        <span style="font-size: 11px; font-weight: 700; color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 6px;">Total: $428,000</span>
                    </div>

                    <div class="pipeline-lanes">
                        <div class="lane">
                            <div class="lane-header">
                                <span>Prospecting</span>
                                <span>8</span>
                            </div>
                            <div class="lane-card">
                                <div class="card-company">Apex Logistics</div>
                                <div class="card-amt">$24,000 &bull; Tech</div>
                            </div>
                            <div class="lane-card">
                                <div class="card-company">Horizon Retail</div>
                                <div class="card-amt">$18,500 &bull; E-com</div>
                            </div>
                        </div>

                        <div class="lane">
                            <div class="lane-header">
                                <span>Qualified</span>
                                <span>5</span>
                            </div>
                            <div class="lane-card">
                                <div class="card-company">Sterling Capital</div>
                                <div class="card-amt">$54,000 &bull; BFSI</div>
                            </div>
                            <div class="lane-card">
                                <div class="card-company">Omni Health</div>
                                <div class="card-amt">$32,000 &bull; Med</div>
                            </div>
                        </div>

                        <div class="lane">
                            <div class="lane-header">
                                <span>Closed Won</span>
                                <span>12</span>
                            </div>
                            <div class="lane-card" style="border-color: rgba(16, 185, 129, 0.4);">
                                <div class="card-company">BlueWave Global</div>
                                <div class="card-amt">$88,000 &bull; Enterprise</div>
                            </div>
                            <div class="lane-card" style="border-color: rgba(16, 185, 129, 0.4);">
                                <div class="card-company">Krypton Labs</div>
                                <div class="card-amt">$45,000 &bull; SaaS</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA SECTION -->
        <section class="cta-section">
            <div class="cta-banner">
                <h2>Transform Your Sales Velocity Today</h2>
                <p>
                    Join high-performing telecalling and sales teams using Leadstriangle to drive pipeline growth and operational clarity.
                </p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
                    <a href="/login" class="btn btn-primary btn-glow" style="padding: 16px 36px; font-size: 16px;">
                        Access Operations Portal &rarr;
                    </a>
                </div>
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="footer">
            <div class="footer-inner">
                <div class="footer-brand">
                    <a href="/" class="brand-link">
                        <img src="assets/images/logo.png" alt="Leadstriangle Logo" class="brand-logo-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\'width:36px;height:36px;background:#2563eb;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;\'>LT</div><div class=\'brand-text\'>Leadstriangle</div>';">
                        <span class="brand-text">Leadstriangle</span>
                    </a>
                    <p>
                        High-velocity sales execution CRM and enterprise telecalling operations platform. Designed for modern revenue teams.
                    </p>
                </div>

                <div class="footer-col">
                    <h5>Product</h5>
                    <ul>
                        <li><a href="#features">Calling Queue</a></li>
                        <li><a href="#pipeline">Sales Funnel</a></li>
                        <li><a href="#features">Lead Management</a></li>
                        <li><a href="#features">Executive Reports</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h5>Platform</h5>
                    <ul>
                        <li><a href="/login">Portal Login</a></li>
                        <li><a href="/login">Demo Access</a></li>
                        <li><a href="/install.php">System Setup</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h5>Security</h5>
                    <ul>
                        <li><a href="#!">Role Permissions</a></li>
                        <li><a href="#!">30-Day Session Security</a></li>
                        <li><a href="#!">Telephony Compliance</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <span>&copy; <?php echo date('Y'); ?> Leadstriangle. All rights reserved.</span>
                <span>Production Enterprise Grade Release v1.0.4</span>
            </div>
        </footer>
    </div>

    <!-- 3D THREE.JS INTERACTIVE ANIMATION & SCRIPT -->
    <script>
        // Lucide icon replacement
        if (window.lucide) {
            lucide.createIcons();
        }

        // Toggle Mobile White Sheet
        function toggleMobileSheet() {
            const sheet = document.getElementById('mobile-sheet');
            const overlay = document.getElementById('mobile-sheet-overlay');
            if (sheet && overlay) {
                const isOpen = sheet.classList.contains('active');
                if (isOpen) {
                    sheet.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                } else {
                    sheet.classList.add('active');
                    overlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        }

        // Initialize Three.js 3D Geometric Mesh & Particle Field
        (function() {
            const canvas = document.getElementById('webgl-canvas');
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 45;

            const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // 1. Central 3D Icosahedron Lattice (representing the Triangle / CRM core)
            const icoGeometry = new THREE.IcosahedronGeometry(18, 1);
            const icoMaterial = new THREE.MeshBasicMaterial({
                color: 0x3b82f6,
                wireframe: true,
                transparent: true,
                opacity: 0.16
            });
            const icosahedron = new THREE.Mesh(icoGeometry, icoMaterial);
            icosahedron.position.set(22, 0, -10);
            scene.add(icosahedron);

            // Inner glowing dodecahedron
            const innerGeo = new THREE.DodecahedronGeometry(10, 0);
            const innerMat = new THREE.MeshBasicMaterial({
                color: 0x8b5cf6,
                wireframe: true,
                transparent: true,
                opacity: 0.28
            });
            const innerMesh = new THREE.Mesh(innerGeo, innerMat);
            icosahedron.add(innerMesh);

            // 2. Floating Particle Constellation
            const particlesCount = 750;
            const posArray = new Float32Array(particlesCount * 3);
            const colorArray = new Float32Array(particlesCount * 3);

            for (let i = 0; i < particlesCount * 3; i += 3) {
                posArray[i] = (Math.random() - 0.5) * 120;
                posArray[i + 1] = (Math.random() - 0.5) * 80;
                posArray[i + 2] = (Math.random() - 0.5) * 70;

                // Color tint mix (Blue to Cyan to Violet)
                const ratio = Math.random();
                if (ratio > 0.6) {
                    colorArray[i] = 0.23; colorArray[i+1] = 0.51; colorArray[i+2] = 0.96; // Blue
                } else if (ratio > 0.3) {
                    colorArray[i] = 0.02; colorArray[i+1] = 0.71; colorArray[i+2] = 0.83; // Cyan
                } else {
                    colorArray[i] = 0.55; colorArray[i+1] = 0.36; colorArray[i+2] = 0.96; // Violet
                }
            }

            const particleGeometry = new THREE.BufferGeometry();
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            particleGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

            const particleMaterial = new THREE.PointsMaterial({
                size: 0.85,
                vertexColors: true,
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending
            });

            const particleMesh = new THREE.Points(particleGeometry, particleMaterial);
            scene.add(particleMesh);

            // 3. Mouse Interaction & Parallax
            let mouseX = 0;
            let mouseY = 0;
            let targetX = 0;
            let targetY = 0;

            const windowHalfX = window.innerWidth / 2;
            const windowHalfY = window.innerHeight / 2;

            document.addEventListener('mousemove', (event) => {
                mouseX = (event.clientX - windowHalfX) * 0.0008;
                mouseY = (event.clientY - windowHalfY) * 0.0008;
            });

            // 4. Cockpit 3D Tilt Effect
            const cockpit = document.getElementById('cockpit-card');
            if (cockpit && window.innerWidth > 768) {
                document.addEventListener('mousemove', (e) => {
                    const rect = cockpit.getBoundingClientRect();
                    const cardX = e.clientX - (rect.left + rect.width / 2);
                    const cardY = e.clientY - (rect.top + rect.height / 2);
                    const rotX = -(cardY / 25).toFixed(2);
                    const rotY = (cardX / 25).toFixed(2);
                    cockpit.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px)`;
                });
                cockpit.addEventListener('mouseleave', () => {
                    cockpit.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
                });
            }

            // Window Resize Handler
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            // Clock for smooth delta animation
            const clock = new THREE.Clock();

            function animate() {
                requestAnimationFrame(animate);
                const elapsedTime = clock.getElapsedTime();

                // Rotate 3D geometrical lattices
                icosahedron.rotation.x = elapsedTime * 0.12;
                icosahedron.rotation.y = elapsedTime * 0.18;
                innerMesh.rotation.x = -elapsedTime * 0.25;
                innerMesh.rotation.y = elapsedTime * 0.22;

                // Parallax camera easing
                targetX += (mouseX - targetX) * 0.05;
                targetY += (mouseY - targetY) * 0.05;

                particleMesh.rotation.y = elapsedTime * 0.04 + targetX * 2;
                particleMesh.rotation.x = targetY * 1.5;

                renderer.render(scene, camera);
            }

            animate();
        })();
    </script>
</body>
</html>

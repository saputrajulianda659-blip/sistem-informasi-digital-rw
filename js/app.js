// js/app.js
import './utils/badge.js';
import { router } from './router.js';
import { initDB } from './utils/db.js';
import { showAlertDialog, showConfirmDialog } from './utils/uiDialog.js';
import { startAutoSync } from './services/syncService.js';

// Monkey-patch native window.alert and window.confirm safely to guarantee custom UI dialogs
if (typeof window !== 'undefined') {
    window.alert = (message) => {
        showAlertDialog(String(message || ''), 'info');
    };
    window.confirm = (message) => {
        console.warn('Native window.confirm intercepted. Prefer using await showConfirmDialog() instead.');
        showConfirmDialog({ message: String(message || '') });
        return false;
    };
}

// Global performance tuning: disable heavy chart animations if Chart.js is loaded
if (typeof window !== 'undefined' && typeof window.Chart !== 'undefined' && window.Chart.defaults) {
    window.Chart.defaults.animation = false;
    if (window.Chart.defaults.transitions && window.Chart.defaults.transitions.active) {
        window.Chart.defaults.transitions.active.animation = { duration: 0 };
    }
}

// Global error safety handlers
window.addEventListener('error', (event) => {
    console.error('Global application runtime error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Global unhandled promise rejection:', event.reason);
});

// Initialize the application
function initApp() {
    try {
        // Inisialisasi database lokal jika belum ada
        initDB();

        // Inisialisasi tema awal dari browser storage (Dark / Light Mode)
        const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('digitalrw_theme') : 'light';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            if (document.body) document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            if (document.body) document.body.classList.remove('dark');
        }

        // Pengecekan status sidebar awal dari storage sebelum konten ditampilkan
        const isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('sidebar_collapsed') === 'true';
        if (typeof document !== 'undefined' && document.body) {
            if (isCollapsed) {
                document.body.classList.add('sidebar-collapsed');
            } else {
                document.body.classList.remove('sidebar-collapsed');
            }
        }

        // Listen for hash changes exclusively to prevent double-firing with popstate
        window.removeEventListener('hashchange', router);
        window.addEventListener('hashchange', router);

        // Run the router initially
        router();

        // Start background auto-sync & live polling worker
        startAutoSync();
    } catch (err) {
        console.error("Critical error initializing application:", err);
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 2rem; font-family: 'Inter', sans-serif;">
                    <div style="max-width: 520px; width: 100%; background: #ffffff; border-radius: 16px; padding: 2.25rem; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center; border: 1px solid #e2e8f0;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.25rem auto;">
                            ⚠️
                        </div>
                        <h2 style="font-size: 1.35rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem;">Pemulihan Sistem Digital RW</h2>
                        <p style="font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem;">
                            Terjadi kendala saat memuat sistem: <strong>${err.message || 'Unknown error'}</strong>.
                        </p>
                        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                            <button onclick="window.location.reload()" style="background: #2563eb; color: #ffffff; border: none; padding: 0.7rem 1.25rem; border-radius: 8px; font-weight: 700; cursor: pointer;">
                                Muat Ulang Halaman
                            </button>
                            <a href="#/login" onclick="localStorage.clear(); window.location.hash='#/login'; window.location.reload();" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 0.7rem 1.25rem; border-radius: 8px; font-weight: 600; text-decoration: none;">
                                Bersihkan Cache & Login
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Start app when DOM is fully loaded or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}



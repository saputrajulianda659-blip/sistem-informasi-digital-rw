import { renderLogin, setupLoginEvents } from './pages/Login.js';
import { renderRegister, setupRegisterEvents, RegisterView } from './pages/Register.js';
import { renderDashboard, setupDashboardEvents } from './pages/Dashboard.js';
import { renderDataWarga, setupDataWargaEvents } from './pages/DataWarga.js';
import { renderFormWarga, setupFormWargaEvents } from './pages/FormWarga.js';
import { renderDetailWarga, setupDetailWargaEvents } from './pages/DetailWarga.js';
import { renderPelayananList, setupPelayananListEvents } from './pages/PelayananList.js';
import { renderStatusPengajuan, setupStatusPengajuanEvents } from './pages/StatusPengajuan.js';
import { renderVerifikasiPengajuan, setupVerifikasiPengajuanEvents } from './pages/VerifikasiPengajuan.js';
import { renderPersetujuanPelayanan, setupPersetujuanPelayananEvents } from './pages/PersetujuanPelayanan.js';
import { renderAjukanSurat, setupAjukanSuratEvents, renderPelayananForm, setupPelayananFormEvents } from './pages/AjukanSurat.js';
import { renderPelayananDetail, setupPelayananDetailEvents } from './pages/PelayananDetail.js';
import { renderPengumumanList, setupPengumumanListEvents } from './pages/PengumumanList.js';
import { renderPengumumanForm, setupPengumumanFormEvents } from './pages/PengumumanForm.js';
import { renderPengaduanList, setupPengaduanListEvents } from './pages/PengaduanList.js';
import { renderPengaduanForm, setupPengaduanFormEvents } from './pages/PengaduanForm.js';
import { renderPengaduanDetail, setupPengaduanDetailEvents } from './pages/PengaduanDetail.js';
import { renderKasList, setupKasListEvents } from './pages/KasList.js';
import { renderAIAssistant, setupAIAssistantEvents } from './pages/AIAssistant.js';
import { renderManajemenAI, setupManajemenAIEvents } from './pages/ManajemenAI.js';
import { renderUserManagement, setupUserManagementEvents } from './pages/UserManagement.js';
import { renderRwRtManagement, setupRwRtManagementEvents } from './pages/RwRtManagement.js';
import { renderMonitoringKegiatan, setupMonitoringKegiatanEvents } from './pages/MonitoringKegiatan.js';
import { renderStatistikRW } from './pages/StatistikRW.js';
import { renderNotificationCenter, setupNotificationCenterEvents } from './pages/NotificationCenter.js';
import { renderNotificationSettings, setupNotificationSettingsEvents } from './pages/NotificationSettings.js';
import { renderUjiNotifikasi, setupUjiNotifikasiEvents } from './pages/UjiNotifikasi.js';
import { renderMainLayout, setupLayoutEvents, updateSidebarActiveNav } from './components/Layout.js';
import { getCurrentUser, logout, ROLES } from './models/User.js';
import { syncWithBackend } from './utils/db.js';
import { startAutoSync, stopAutoSync } from './services/syncService.js';

// Dummy renderer for unimplemented pages
const renderPlaceholder = (title) => () => `
    <div>
        <h1 class="text-2xl font-bold mb-4">${title}</h1>
        <div class="card">
            <p class="text-muted">Halaman ini sedang dalam tahap pengembangan.</p>
        </div>
    </div>
`;

const routes = {
    '/login': { render: renderLogin, setup: setupLoginEvents, layout: 'auth', public: true },
    '#/login': { render: renderLogin, setup: setupLoginEvents, layout: 'auth', public: true },
    '/register': { render: renderRegister, setup: setupRegisterEvents, layout: 'auth', public: true },
    '#/register': { render: renderRegister, setup: setupRegisterEvents, layout: 'auth', public: true },
    '/dashboard': { render: renderDashboard, setup: setupDashboardEvents, layout: 'main' },

    // Kas & Iuran Routes (Dapat diakses Warga, Ketua RT, Ketua RW)
    '/kas-iuran': { render: renderKasList, setup: setupKasListEvents, layout: 'main', allowedRoles: [ROLES.WARGA, ROLES.KETUA_RT, ROLES.KETUA_RW] },
    '/kas': { render: renderKasList, setup: setupKasListEvents, layout: 'main', allowedRoles: [ROLES.WARGA, ROLES.KETUA_RT, ROLES.KETUA_RW] },

    '/manajemen-pengguna': { render: renderUserManagement, setup: setupUserManagementEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN] },
    '/manajemen-rw-rt': { render: renderRwRtManagement, setup: setupRwRtManagementEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN] },
    '/manajemen-ai': { render: renderManajemenAI, setup: setupManajemenAIEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN] },

    // Data Warga Routes
    '/data-warga': { render: renderDataWarga, setup: setupDataWargaEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT] },
    '/warga-data': { render: renderDataWarga, setup: setupDataWargaEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT] },
    '/data-warga/form': { render: renderFormWarga, setup: setupFormWargaEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT] },
    '/data-warga/detail': { render: renderDetailWarga, setup: setupDetailWargaEvents, layout: 'main' }, // Detail is accessible to all, logic handled in component

    // Pelayanan Routes
    '/pelayanan': { render: renderPelayananList, setup: setupPelayananListEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW] },

    // Pengaduan Routes
    '/pengaduan': { render: renderPengaduanList, setup: setupPengaduanListEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA] },
    '/pengaduan/form': { render: renderPengaduanForm, setup: setupPengaduanFormEvents, layout: 'main', allowedRoles: [ROLES.WARGA] },
    '/pengaduan/detail': { render: renderPengaduanDetail, setup: setupPengaduanDetailEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA] },

    // Pengumuman Routes
    '/pengumuman': { render: renderPengumumanList, setup: setupPengumumanListEvents, layout: 'main' }, // Accessible by all, UI handles permissions
    '/pengumuman/form': { render: renderPengumumanForm, setup: setupPengumumanFormEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW] },

    // Ketua RW Routes
    '/persetujuan-pelayanan': { render: renderPersetujuanPelayanan, setup: setupPersetujuanPelayananEvents, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.SUPER_ADMIN] },
    // Monitoring Kegiatan (Ketua RW, Ketua RT, Super Admin)
    '/monitoring-kegiatan': { render: renderMonitoringKegiatan, setup: setupMonitoringKegiatanEvents, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN] },
    '/activity-monitoring': { render: renderMonitoringKegiatan, setup: setupMonitoringKegiatanEvents, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN] },
    '/statistik-rw': { render: renderStatistikRW, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN] },
    '/rw-statistics': { render: renderStatistikRW, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN] },

    // Ketua RT Routes
    '/verifikasi-pengajuan': { render: renderVerifikasiPengajuan, setup: setupVerifikasiPengajuanEvents, layout: 'main', allowedRoles: [ROLES.KETUA_RT] },

    // Warga Routes
    '/pengajuan-pelayanan': { render: renderAjukanSurat, setup: setupAjukanSuratEvents, layout: 'main', allowedRoles: [ROLES.WARGA] },
    '/status-pengajuan': { render: renderStatusPengajuan, setup: setupStatusPengajuanEvents, layout: 'main', allowedRoles: [ROLES.WARGA] },
    '/ai-assistant': { render: renderAIAssistant, setup: setupAIAssistantEvents, layout: 'main', allowedRoles: [ROLES.WARGA] },

    // Shared Detail Route
    '/pelayanan/detail': { render: renderPelayananDetail, setup: setupPelayananDetailEvents, layout: 'main' },

    // Notification Center, Testing Sandbox & Settings
    '/notifikasi': { render: renderNotificationCenter, setup: setupNotificationCenterEvents, layout: 'main' },
    '/notifications': { render: renderNotificationCenter, setup: setupNotificationCenterEvents, layout: 'main' },
    '/uji-notifikasi': { render: renderUjiNotifikasi, setup: setupUjiNotifikasiEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW] },
    '/test-notification': { render: renderUjiNotifikasi, setup: setupUjiNotifikasiEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW] },
    '/pengaturan-notifikasi': { render: renderNotificationSettings, setup: setupNotificationSettingsEvents, layout: 'main' },
    '/notification-settings': { render: renderNotificationSettings, setup: setupNotificationSettingsEvents, layout: 'main' },

    // Aliases for quick navigation / global search
    '/monitoring': { render: renderMonitoringKegiatan, setup: setupMonitoringKegiatanEvents, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN] },
    '/statistik': { render: renderStatistikRW, layout: 'main', allowedRoles: [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN] },
    '/manajemen-wilayah': { render: renderRwRtManagement, setup: setupRwRtManagementEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN] },
    '/users': { render: renderUserManagement, setup: setupUserManagementEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN] },
    '/persetujuan-surat': { render: renderPelayananList, setup: setupPelayananListEvents, layout: 'main', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT] }
};

let lastProcessedHash = null;
let lastProcessedTime = 0;
let bgSyncTimer = null;

export function router() {
    try {
        const app = document.getElementById('app');
        if (!app) return;

        const rawHash = window.location.hash;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        // Mencegah eksekusi ganda dalam rentang waktu singkat
        if (lastProcessedHash === rawHash && (now - lastProcessedTime) < 80) {
            return;
        }
        lastProcessedHash = rawHash;
        lastProcessedTime = now;

        // Pengecekan status sidebar otomatis saat navigasi halaman (Routing)
        const isSidebarCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('sidebar_collapsed') === 'true';
        if (typeof document !== 'undefined' && document.body) {
            if (isSidebarCollapsed) {
                document.body.classList.add('sidebar-collapsed');
            } else {
                document.body.classList.remove('sidebar-collapsed');
            }
        }

        const path = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
        const basePath = path ? path.split('?')[0] : '';

        const user = getCurrentUser();
        if (!user) {
            stopAutoSync();
        } else {
            // Sinkronisasi data ke server didebounce di latar belakang agar tidak mengganggu kecepatan render navigasi
            if (bgSyncTimer) clearTimeout(bgSyncTimer);
            bgSyncTimer = setTimeout(() => {
                syncWithBackend().catch(() => {});
            }, 2000);
        }

        // 1. URL akar atau hash kosong (#, #/, atau tanpa hash) -> alihkan default
        if (!rawHash || rawHash === '#' || rawHash === '#/' || basePath === '' || basePath === '/') {
            if (user) {
                window.location.hash = '#/dashboard';
            } else {
                window.location.hash = '#/login';
            }
            return;
        }

        // Routing khusus halaman autentikasi & registrasi
        switch (basePath) {
            case '#/register':
            case '/register':
            case 'register':
                if (user) {
                    window.location.hash = '#/dashboard';
                    return;
                }
                if (typeof RegisterView !== 'undefined' && typeof RegisterView.render === 'function') {
                    RegisterView.render();
                } else {
                    app.innerHTML = renderRegister();
                    setupRegisterEvents();
                }
                return;
            case '#/login':
            case '/login':
            case 'login':
            case '#info-rw05':
            case 'info-rw05':
            case '/info-rw05':
                if (user) {
                    window.location.hash = '#/dashboard';
                    return;
                }
                app.innerHTML = renderLogin();
                setupLoginEvents();
                if (basePath.includes('info-rw05')) {
                    setTimeout(() => {
                        const target = document.getElementById('info-rw05');
                        if (target) target.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
                return;
        }

        // 2. Belum Login: Jika tidak ada data pengguna dan mencoba membuka selain rute publik, paksa redirect ke #/login
        if (!user) {
            if (basePath !== '/login' && basePath !== '/register' && basePath !== '#/register' && !routes[basePath]?.public) {
                window.location.hash = '#/login';
                return;
            }
        }

        // 3. Sudah Login: Jika mencoba membuka #/login atau #/register, alihkan otomatis ke #/dashboard
        if (basePath === '/login' || basePath === '/register' || basePath === '#/register') {
            window.location.hash = '#/dashboard';
            return;
        }

        // 4. Cek ketersediaan rute
        const route = routes[basePath];
        if (!route) {
            app.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                    <h1>404</h1>
                    <p>Halaman tidak ditemukan.</p>
                    <a href="#/dashboard" class="btn btn-primary mt-4">Kembali ke Dashboard</a>
                </div>
            `;
            return;
        }

        // 5. Role Protection Check (jika role user tidak diizinkan untuk rute ini)
        if (route.allowedRoles && !route.allowedRoles.includes(user.role)) {
            // Khusus Super Admin jika mengakses rute kas/kas-iuran secara manual, redirect langsung ke dashboard
            if ((basePath === '/kas-iuran' || basePath === '/kas') && user.role === ROLES.SUPER_ADMIN) {
                window.location.hash = '#/dashboard';
                return;
            }

            const deniedHtml = `
                <div style="max-width: 600px; margin: 2rem auto; text-align: center;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.25rem auto;">
                        <i class="ph-fill ph-prohibit"></i>
                    </div>
                    <h1 class="text-2xl font-bold mb-2" style="color: var(--danger-color);">Akses Ditolak</h1>
                    <div class="card" style="padding: 1.5rem;">
                        <p style="font-size: 1.05rem; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">Anda tidak memiliki akses ke halaman ini.</p>
                        <p class="text-muted" style="margin-bottom: 1.5rem;">Halaman ini dibatasi hanya untuk peran tertentu (${route.allowedRoles.join(', ')}). Peran Anda saat ini adalah <strong>${user ? user.role : 'Tamu'}</strong>.</p>
                        <a href="#/dashboard" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                            <i class="ph-bold ph-arrow-left"></i> Kembali ke Dashboard
                        </a>
                    </div>
                </div>
            `;

            const currentMainLayout = document.querySelector('.main-layout');
            const pageContent = document.querySelector('.main-layout .page-content');
            if (currentMainLayout && pageContent) {
                pageContent.innerHTML = deniedHtml;
                updateSidebarActiveNav(basePath);
                window.scrollTo({ top: 0, behavior: 'instant' });
            } else {
                app.innerHTML = renderMainLayout(deniedHtml);
                setupLayoutEvents();
            }
            return;
        }

        // 6. Render matched and authorized route
        let pageHtml = '';
        try {
            pageHtml = route.render();
        } catch (renderErr) {
            console.error("Page render error:", renderErr);
            pageHtml = `
                <div class="card" style="padding: 2rem; border-left: 4px solid var(--danger-color); max-width: 700px; margin: 1.5rem auto;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem;">
                        <i class="ph-bold ph-warning-circle" style="font-size: 1.5rem; color: var(--danger-color);"></i>
                        <h3 style="color: var(--danger-color); font-weight: 700; margin: 0;">Kendala Memuat Konten Halaman</h3>
                    </div>
                    <p class="text-muted" style="margin-bottom: 1.25rem;">Komponen halaman mengalami kendala teknis: ${renderErr.message || 'Render error'}</p>
                    <a href="#/dashboard" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-house"></i> Kembali ke Dashboard
                    </a>
                </div>
            `;
        }

        if (route.layout === 'main') {
            const currentMainLayout = document.querySelector('.main-layout') || document.getElementById('mainLayout');
            const pageContent = document.querySelector('.main-layout .page-content') || document.getElementById('pageContent') || document.getElementById('main-content');

            if (currentMainLayout && pageContent) {
                // Partial render instan (0ms): perbarui HANYA container konten utama tanpa menimpa sidebar & header
                pageContent.innerHTML = pageHtml;
                updateSidebarActiveNav(basePath);
                window.scrollTo({ top: 0, behavior: 'instant' });

                // Batasi pemindaian icon library (seperti lucide) hanya pada elemen konten yang baru di-render
                if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
                    try {
                        lucide.createIcons({ root: pageContent });
                    } catch (e) {}
                }
            } else {
                app.innerHTML = renderMainLayout(pageHtml);
                try {
                    setupLayoutEvents();
                } catch (layoutSetupErr) {
                    console.warn("Layout setup warning:", layoutSetupErr);
                }
                if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
                    try {
                        const targetRoot = document.getElementById('pageContent') || app;
                        lucide.createIcons({ root: targetRoot });
                    } catch (e) {}
                }
            }
        } else {
            app.innerHTML = pageHtml;
        }

        if (route.setup) {
            try {
                route.setup();
            } catch (setupErr) {
                console.error("Route setup error:", setupErr);
            }
        }
    } catch (err) {
        console.error("Router error:", err);
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 2rem; text-align: center;">
                    <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: var(--danger-color);">Terjadi Kendala Memuat Halaman</h2>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Sistem mengalami kendala saat merender tampilan. Silakan kembali ke Dashboard atau login ulang.</p>
                    <div style="display: flex; gap: 1rem;">
                        <a href="#/dashboard" class="btn btn-primary">Ke Dashboard</a>
                        <a href="#/login" class="btn" style="border: 1px solid var(--border-color);">Ke Halaman Login</a>
                    </div>
                </div>
            `;
        }
    }
}


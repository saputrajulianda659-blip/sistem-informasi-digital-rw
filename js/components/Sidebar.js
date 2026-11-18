// js/components/Sidebar.js
import { ROLES } from '../models/User.js';

export function renderSidebar(user) {
    if (!user) return '';

    let menuHtml = '';

    if (user.role === ROLES.SUPER_ADMIN) {
        menuHtml = `
            <div class="sidebar-section-title">Menu Utama</div>
            <a href="#/dashboard" class="nav-item">
                <i class="ph-bold ph-house"></i>
                <span>Dashboard</span>
            </a>
            
            <div class="sidebar-section-title">Kependudukan</div>
            <a href="#/data-warga" class="nav-item">
                <i class="ph-bold ph-users"></i>
                <span>Data Warga</span>
            </a>

            <div class="sidebar-section-title">Monitoring & Pengawasan</div>
            <a href="#/monitoring-kegiatan" class="nav-item">
                <i class="ph-bold ph-calendar-check"></i>
                <span>Monitoring Kegiatan</span>
            </a>
            <a href="#/pengaduan" class="nav-item">
                <i class="ph-bold ph-warning-circle"></i>
                <span>Pengaduan Warga</span>
            </a>
            <a href="#/statistik-rw" class="nav-item">
                <i class="ph-bold ph-chart-bar"></i>
                <span>Statistik RW</span>
            </a>

            <div class="sidebar-section-title">Informasi</div>
            <a href="#/pengumuman" class="nav-item">
                <i class="ph-bold ph-megaphone"></i>
                <span>Pengumuman</span>
            </a>

            <div class="sidebar-section-title">Administrasi Sistem</div>
            <a href="#/manajemen-pengguna" class="nav-item">
                <i class="ph-bold ph-users-three"></i>
                <span>Manajemen Pengguna</span>
            </a>
            <a href="#/manajemen-rw-rt" class="nav-item">
                <i class="ph-bold ph-buildings"></i>
                <span>Manajemen RW / RT</span>
            </a>

            <div class="sidebar-section-title">Konfigurasi AI</div>
            <a href="#/manajemen-ai" class="nav-item">
                <i class="ph-bold ph-robot"></i>
                <span>Manajemen AI</span>
            </a>
        `;
    } else if (user.role === ROLES.KETUA_RW) {
        menuHtml = `
            <div class="sidebar-section-title">Menu Utama</div>
            <a href="#/dashboard" class="nav-item">
                <i class="ph-bold ph-house"></i>
                <span>Dashboard</span>
            </a>

            <div class="sidebar-section-title">Pengawasan & Persetujuan</div>
            <a href="#/data-warga" class="nav-item">
                <i class="ph-bold ph-users"></i>
                <span>Data Warga</span>
            </a>
            <a href="#/persetujuan-pelayanan" class="nav-item">
                <i class="ph-bold ph-file-text"></i>
                <span>Persetujuan Pelayanan</span>
            </a>
            <a href="#/pengaduan" class="nav-item">
                <i class="ph-bold ph-warning-circle"></i>
                <span>Pengaduan Warga</span>
            </a>
            <a href="#/monitoring-kegiatan" class="nav-item">
                <i class="ph-bold ph-calendar-check"></i>
                <span>Monitoring Kegiatan</span>
            </a>
            <a href="#/statistik-rw" class="nav-item">
                <i class="ph-bold ph-chart-bar"></i>
                <span>Statistik RW</span>
            </a>

            <div class="sidebar-section-title">Informasi & Kas</div>
            <a href="#/pengumuman" class="nav-item">
                <i class="ph-bold ph-megaphone"></i>
                <span>Pengumuman</span>
            </a>
            <a href="#/kas-iuran" class="nav-item">
                <i class="ph-bold ph-wallet"></i>
                <span>Kas & Iuran</span>
            </a>
        `;
    } else if (user.role === ROLES.KETUA_RT) {
        menuHtml = `
            <div class="sidebar-section-title">Menu Utama</div>
            <a href="#/dashboard" class="nav-item">
                <i class="ph-bold ph-house"></i>
                <span>Dashboard</span>
            </a>

            <div class="sidebar-section-title">Layanan RT ${user.rt || ''}</div>
            <a href="#/data-warga" class="nav-item">
                <i class="ph-bold ph-users"></i>
                <span>Data Warga RT</span>
            </a>
            <a href="#/verifikasi-pengajuan" class="nav-item">
                <i class="ph-bold ph-file-text"></i>
                <span>Verifikasi Pengajuan</span>
            </a>
            <a href="#/pengaduan" class="nav-item">
                <i class="ph-bold ph-warning-circle"></i>
                <span>Pengaduan Warga</span>
            </a>
            <a href="#/monitoring-kegiatan" class="nav-item">
                <i class="ph-bold ph-calendar-check"></i>
                <span>Monitoring Kegiatan</span>
            </a>
            <a href="#/statistik-rw" class="nav-item">
                <i class="ph-bold ph-chart-bar"></i>
                <span>Statistik RW</span>
            </a>

            <div class="sidebar-section-title">Informasi & Kas</div>
            <a href="#/pengumuman" class="nav-item">
                <i class="ph-bold ph-megaphone"></i>
                <span>Pengumuman</span>
            </a>
            <a href="#/kas-iuran" class="nav-item">
                <i class="ph-bold ph-wallet"></i>
                <span>Kas & Iuran</span>
            </a>
        `;
    } else if (user.role === ROLES.WARGA) {
        menuHtml = `
            <div class="sidebar-section-title">Menu Utama</div>
            <a href="#/dashboard" class="nav-item">
                <i class="ph-bold ph-house"></i>
                <span>Dashboard</span>
            </a>

            <div class="sidebar-section-title">Layanan Mandiri</div>
            <a href="#/pengajuan-pelayanan" class="nav-item">
                <i class="ph-bold ph-file-text"></i>
                <span>Pengajuan Pelayanan</span>
            </a>
            <a href="#/status-pengajuan" class="nav-item">
                <i class="ph-bold ph-clock"></i>
                <span>Status Pengajuan</span>
            </a>

            <div class="sidebar-section-title">Komunitas & Bantuan</div>
            <a href="#/pengaduan" class="nav-item">
                <i class="ph-bold ph-warning-circle"></i>
                <span>Pengaduan Warga</span>
            </a>
            <a href="#/pengumuman" class="nav-item">
                <i class="ph-bold ph-megaphone"></i>
                <span>Pengumuman</span>
            </a>
            <a href="#/kas-iuran" class="nav-item">
                <i class="ph-bold ph-wallet"></i>
                <span>Kas & Iuran</span>
            </a>
        `;
    } else {
        menuHtml = `
            <div class="sidebar-section-title">Menu Utama</div>
            <a href="#/dashboard" class="nav-item">
                <i class="ph-bold ph-house"></i>
                <span>Dashboard</span>
            </a>
        `;
    }

    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

    menuHtml += `
        <div class="sidebar-section-title">Notifikasi & Sistem</div>
        <a href="#/notifikasi" class="nav-item">
            <i class="ph-bold ph-bell"></i>
            <span>Pusat Notifikasi</span>
        </a>
        ${isSuperAdmin ? `
            <a href="#/uji-notifikasi" class="nav-item">
                <i class="ph-bold ph-paper-plane-tilt"></i>
                <span>Uji Coba Notifikasi</span>
            </a>
            <a href="#/pengaturan-notifikasi" class="nav-item">
                <i class="ph-bold ph-gear"></i>
                <span>Pengaturan Notifikasi</span>
            </a>
        ` : ''}

        <div class="sidebar-section-title">Akun & Sesi</div>
        <a href="javascript:void(0)" class="nav-item sidebar-logout-btn" id="btnSidebarLogout" role="button" title="Keluar dari sistem">
            <i class="ph-bold ph-sign-out text-danger"></i>
            <span class="text-danger font-semibold">Logout</span>
        </a>
    `;

    const isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('sidebar_collapsed') === 'true';

    return `
        <aside class="sidebar ${isCollapsed ? 'collapsed sidebar-collapsed' : ''}">
            <div class="sidebar-logo">
                <a href="#/dashboard" class="sidebar-brand">
                    <span class="brand-icon-box">
                        <i class="ph-bold ph-house-line"></i>
                    </span>
                    <div class="brand-text">
                        <span class="brand-primary">Digital</span><span class="brand-dark">RW</span>
                    </div>
                </a>
                <button id="sidebarCloseBtn" class="sidebar-close-btn" aria-label="Tutup Menu" title="Tutup Menu">
                    <i class="ph-bold ph-x text-xl"></i>
                </button>
            </div>
            
            <nav class="sidebar-nav">
                ${menuHtml}
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-role-pill">
                    <span class="role-indicator-dot"></span>
                    <div class="role-info-text">
                        ${user.role || 'Warga'} ${user.rt ? `• RT ${user.rt}` : ''}
                    </div>
                </div>
            </div>
        </aside>
        <div id="sidebarBackdrop" class="sidebar-backdrop"></div>
    `;
}

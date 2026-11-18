// js/components/Layout.js
import { getCurrentUser, logout, ROLES } from '../models/User.js';
import { getUnreadNotifikasi, markAllAsRead, getAllNotifikasi, markAsRead, getUniqueNotifikasi } from '../models/Notifikasi.js';
import { renderAiWidget, setupAiWidgetEvents } from './AiWidget.js';
import { renderSidebar } from './Sidebar.js';
import { getCollection, waitForPendingSaves } from '../utils/db.js';

export { renderSidebar };

export function getSavedTheme() {
    try {
        return localStorage.getItem('digitalrw_theme') === 'dark' ? 'dark' : 'light';
    } catch (e) {
        return 'light';
    }
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
    }
    try {
        localStorage.setItem('digitalrw_theme', newTheme);
    } catch (e) {}

    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
        btn.innerHTML = `<i class="ph-bold ${newTheme === 'dark' ? 'ph-sun' : 'ph-moon'}"></i>`;
        btn.setAttribute('title', newTheme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap');
        btn.setAttribute('aria-label', newTheme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap');
    }
    return newTheme;
}

export function renderNavbar(user) {
    let unreadNotif = [];
    let allNotif = [];
    const currentUser = user || getCurrentUser();
    const isDark = (typeof localStorage !== 'undefined' && localStorage.getItem('digitalrw_theme') === 'dark');

    try {
        if (currentUser && typeof getAllNotifikasi === 'function') {
            const rawNotif = getAllNotifikasi(currentUser) || [];
            const safeRaw = Array.isArray(rawNotif) ? rawNotif : [];
            // Deduplikasi data notifikasi sebelum badge unread dihitung dan sebelum dirender ke dropdown
            const uniqueNotif = safeRaw.filter((item, index, self) => {
                if (!item) return false;
                if (item.id) {
                    return index === self.findIndex((t) => t && t.id === item.id);
                }
                return index === self.findIndex((t) => 
                    t && t.judul === item.judul && t.pesan === item.pesan && (t.createdAt === item.createdAt || t.created_at === item.created_at || t.tanggal === item.tanggal)
                );
            });
            const deduped = typeof getUniqueNotifikasi === 'function' ? (getUniqueNotifikasi(uniqueNotif) || []) : uniqueNotif;
            allNotif = Array.isArray(deduped) ? deduped : [];
            unreadNotif = allNotif.filter(n => n && !n.is_read && n.isRead !== true);
        }
    } catch (notifErr) {
        console.warn("Error loading notifications for navbar:", notifErr);
        unreadNotif = [];
        allNotif = [];
    }

    if (!Array.isArray(unreadNotif)) unreadNotif = [];
    if (!Array.isArray(allNotif)) allNotif = [];

    const unreadCount = (unreadNotif || []).length;
    const hasUnread = unreadCount > 0;

    // Get user initials
    const fullName = currentUser ? (currentUser.nama || currentUser.name || 'Warga') : 'User';
    const nameParts = fullName.trim().split(' ');
    const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : fullName.substring(0, 2).toUpperCase();

    // Build Notification Dropdown Items
    let notifListHtml = '';
    if ((allNotif || []).length === 0) {
        notifListHtml = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">Belum ada notifikasi</div>';
    } else {
        const displayNotifs = (allNotif || []).slice(0, 8);
        notifListHtml = (displayNotifs || []).map(n => {
            if (!n) return '';
            let iconClass = 'ph-info';
            if (n.type === 'success') iconClass = 'ph-check-circle';
            if (n.type === 'warning') iconClass = 'ph-warning';
            if (n.type === 'error') iconClass = 'ph-x-circle';

            let formattedDate = 'Baru saja';
            try {
                const dateVal = n.created_at || n.tanggal;
                if (dateVal) {
                    formattedDate = new Date(dateVal).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {}

            const isRead = (n.is_read === true || n.isRead === true);
            return `
                <a href="${n.link || '#'}" class="notification-item ${isRead ? '' : 'unread'}" data-id="${n.id}">
                    <div class="notification-icon ${n.type || 'info'}">
                        <i class="ph-fill ${iconClass}"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        ${n.judul ? `<p style="font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--text-main); line-height: 1.25;">${n.judul}</p>` : ''}
                        <p style="font-size: 0.775rem; font-weight: 500; margin-bottom: 0.2rem; color: #475569; line-height: 1.3;">${n.pesan || ''}</p>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">${formattedDate}</span>
                    </div>
                </a>
            `;
        }).join('');
    }

    const notifDropdownHtml = `
        <div class="relative">
            <button id="btnNotifToggle" class="btn-notif" title="Notifikasi" aria-label="Notifikasi">
                <i class="ph-bold ph-bell"></i>
                <span class="notif-badge-count" style="${hasUnread ? '' : 'display: none;'}">${unreadCount > 99 ? '99+' : unreadCount}</span>
            </button>
            <div id="notificationDropdown" class="notification-dropdown hidden">
                <div class="notification-header">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <h3 style="font-weight: 700; font-size: 0.9375rem; color: var(--text-main); margin: 0;">Notifikasi</h3>
                        <span id="notifHeaderCountBadge" style="background: var(--danger-color, #ef4444); color: white; font-size: 0.6875rem; font-weight: 700; padding: 2px 7px; border-radius: 9999px; ${hasUnread ? '' : 'display: none;'}">${unreadCount} Baru</span>
                    </div>
                    <button id="btnMarkAllRead" style="font-size: 0.75rem; color: var(--primary-color); font-weight: 700; background: none; border: none; cursor: pointer; ${hasUnread ? '' : 'display: none;'}">Tandai dibaca</button>
                </div>
                <div class="notification-body">
                    ${notifListHtml}
                </div>
                <div class="notification-footer" style="padding: 0.75rem 1rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 0 0 12px 12px;">
                    <a href="#/notifikasi" id="btnViewAllNotif" style="font-size: 0.8125rem; font-weight: 600; color: var(--primary-color); display: flex; align-items: center; gap: 0.25rem; text-decoration: none;">
                        <span>Pusat Notifikasi</span>
                        <i class="ph-bold ph-arrow-right"></i>
                    </a>
                    <a href="#/pengaturan-notifikasi" title="Pengaturan Notifikasi" style="font-size: 0.8125rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; text-decoration: none;">
                        <i class="ph-bold ph-gear"></i>
                        <span>Pengaturan</span>
                    </a>
                </div>
            </div>
        </div>
    `;

    return `
        <header class="navbar">
            <div class="navbar-left">
                <button id="menuToggle" class="menu-toggle-btn" aria-label="Toggle Sidebar" title="Buka/Tutup Menu">
                    <i class="ph-bold ph-list"></i>
                </button>
                <div class="dash-search-box">
                    <i class="ph-bold ph-magnifying-glass"></i>
                    <input type="text" id="globalNavSearch" placeholder="Cari layanan, pengumuman, data..." autocomplete="off">
                    <div id="globalNavSearchResults" class="global-search-results" style="display: none;"></div>
                </div>
            </div>
            
            <div class="navbar-right">
                <button id="btnThemeToggle" class="btn-theme-toggle" title="${isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}" aria-label="Ganti Mode Gelap/Terang">
                    <i class="ph-bold ${isDark ? 'ph-sun' : 'ph-moon'}"></i>
                </button>

                ${notifDropdownHtml}

                <div class="navbar-user-profile" id="btnHeaderUserProfile" role="button" tabindex="0" title="Klik untuk melihat Profil Saya" aria-label="Profil Saya">
                    <div class="user-avatar-circle" title="${fullName}">
                        ${initials}
                    </div>
                    <div class="user-meta-info">
                        <span class="user-name-text">${fullName}</span>
                        <span class="user-role-badge">${user ? user.role : 'Pengguna'} ${user && user.rt && user.rw ? `(RT ${user.rt}/RW ${user.rw})` : ''}</span>
                    </div>
                    <i class="ph-bold ph-caret-down" style="font-size: 0.75rem; color: var(--text-muted); margin-left: 2px;"></i>
                </div>

                <button class="btn-logout" id="btnLogout" title="Keluar dari sistem" aria-label="Logout">
                    <i class="ph-bold ph-sign-out text-base"></i>
                    <span>Logout</span>
                </button>
            </div>
        </header>

        <!-- Modal Pop-over Profil Saya (Sesi Aktif Pengguna) -->
        <div id="modalUserProfile" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); z-index: 10002; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 2rem 1rem; overflow-y: auto;">
            <div class="modal-content" style="background: #ffffff; border-radius: 16px; width: 100%; max-width: 360px; box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.22); overflow: hidden; border: 1px solid #e2e8f0; margin: auto;">
                
                <!-- Header Modal -->
                <div style="background: linear-gradient(135deg, #4880FF 0%, #356BE5 100%); color: #ffffff; padding: 0.75rem 1.15rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 26px; height: 26px; border-radius: 6px; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; color: #ffffff;">
                            <i class="ph-bold ph-user-circle"></i>
                        </div>
                        <h3 style="font-size: 0.925rem; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: -0.01em;">Profil Saya</h3>
                    </div>
                    <button id="btnCloseProfileModal" title="Tutup" aria-label="Tutup" style="background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                        <i class="ph-bold ph-x" style="font-size: 0.95rem;"></i>
                    </button>
                </div>

                <!-- Body Modal -->
                <div style="padding: 1rem 1.15rem;">
                    <!-- User Avatar & Identity Header -->
                    <div style="text-align: center; margin-bottom: 0.85rem;">
                        <div id="profModalAvatar" style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #4880FF 0%, #8280FF 100%); color: #ffffff; font-weight: 800; font-size: 1.35rem; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px -2px rgba(72, 128, 255, 0.35); border: 2.5px solid #ffffff; margin-bottom: 0.45rem;">
                            ${initials}
                        </div>
                        <h4 id="profModalName" style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0; line-height: 1.2;">${fullName}</h4>
                        <div style="display: inline-flex; align-items: center; gap: 0.25rem; background: #eff6ff; color: #1d4ed8; padding: 2px 10px; border-radius: 9999px; font-size: 0.725rem; font-weight: 700; border: 1px solid #bfdbfe;">
                            <i class="ph-fill ph-shield-check"></i>
                            <span id="profModalRole">${user ? user.role : 'Pengguna'}</span>
                        </div>
                    </div>

                    <!-- Details Card Grid -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.6rem 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 0.35rem;">
                            <span style="font-size: 0.775rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                                <i class="ph-bold ph-identification-card" style="color: #4880FF; font-size: 0.875rem;"></i> NIK
                            </span>
                            <span id="profModalNik" style="font-size: 0.785rem; font-weight: 700; color: #1e293b; font-family: monospace;">${user && user.nik ? user.nik : '-'}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 0.35rem;">
                            <span style="font-size: 0.775rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                                <i class="ph-bold ph-user" style="color: #4880FF; font-size: 0.875rem;"></i> Username
                            </span>
                            <span id="profModalUsername" style="font-size: 0.785rem; font-weight: 700; color: #1e293b;">${user && user.username ? user.username : '-'}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 0.35rem;">
                            <span style="font-size: 0.775rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                                <i class="ph-bold ph-map-pin" style="color: #4880FF; font-size: 0.875rem;"></i> Wilayah
                            </span>
                            <span id="profModalWilayah" style="font-size: 0.785rem; font-weight: 700; color: #1e293b;">${(user && user.rt && user.rw) ? `RT ${user.rt} / RW ${user.rw}` : `RW ${user ? user.rw || '05' : '05'}`}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 0.35rem;">
                            <span style="font-size: 0.775rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                                <i class="ph-bold ph-check-circle" style="color: #10b981; font-size: 0.875rem;"></i> Status Akun
                            </span>
                            <span id="profModalStatus" style="font-size: 0.72rem; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1.5px 7px; border-radius: 5px;">${user && user.status ? user.status : 'Aktif'}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 0.35rem;">
                            <span style="font-size: 0.775rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                                <i class="ph-bold ph-phone" style="color: #4880FF; font-size: 0.875rem;"></i> No. Kontak
                            </span>
                            <div id="profModalContactWrapper" style="text-align: right;">
                                <span id="profModalContact" style="font-size: 0.775rem; font-weight: 600; color: #334155;">${user && (user.no_hp || user.telepon) ? (user.no_hp || user.telepon) : '-'}</span>
                                <input type="text" id="inputProfContact" style="display: none; width: 145px; padding: 4px 8px; font-size: 0.775rem; font-weight: 600; border: 1.5px solid #4880FF; border-radius: 6px; outline: none; background: #ffffff; color: #0f172a;" placeholder="08xxxxxxxxxx">
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.775rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                                <i class="ph-bold ph-envelope" style="color: #4880FF; font-size: 0.875rem;"></i> Email
                            </span>
                            <div id="profModalEmailWrapper" style="text-align: right;">
                                <span id="profModalEmail" style="font-size: 0.775rem; font-weight: 600; color: #475569;">${user && user.email ? user.email : '-'}</span>
                                <input type="email" id="inputProfEmail" style="display: none; width: 145px; padding: 4px 8px; font-size: 0.775rem; font-weight: 600; border: 1.5px solid #4880FF; border-radius: 6px; outline: none; background: #ffffff; color: #0f172a;" placeholder="nama@email.com">
                            </div>
                        </div>
                    </div>

                    <!-- Tombol Aksi Modal Profil (View vs Edit Mode) -->
                    <div style="margin-top: 0.85rem;">
                        <div id="profileViewActions" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button id="btnStartEditProfile" type="button" class="btn" style="flex: 1; justify-content: center; padding: 7px 12px; height: 36px; border-radius: 8px; font-size: 0.825rem; font-weight: 700; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="ph-bold ph-pencil-simple"></i> Edit Profil
                            </button>
                            <button id="btnDoneProfileModal" type="button" class="btn btn-primary" style="flex: 1; justify-content: center; padding: 7px 14px; height: 36px; border-radius: 8px; font-size: 0.825rem; font-weight: 700; cursor: pointer;">
                                Tutup
                            </button>
                        </div>
                        <div id="profileEditActions" style="display: none; gap: 0.5rem; justify-content: flex-end;">
                            <button id="btnCancelEditProfile" type="button" class="btn" style="flex: 1; justify-content: center; padding: 7px 12px; height: 36px; border-radius: 8px; font-size: 0.825rem; font-weight: 700; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; cursor: pointer;">
                                Batal
                            </button>
                            <button id="btnSaveEditProfile" type="button" class="btn btn-primary" style="flex: 1; justify-content: center; padding: 7px 12px; height: 36px; border-radius: 8px; font-size: 0.825rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="ph-bold ph-floppy-disk"></i> Simpan
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Modal Pop-over Verifikasi OTP 6 Digit -->
        <div id="modalOtpVerification" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); z-index: 10005; align-items: center; justify-content: center; backdrop-filter: blur(5px); padding: 1.5rem 1rem;">
            <div style="background: #ffffff; border-radius: 16px; width: 100%; max-width: 330px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3); overflow: hidden; border: 1px solid #e2e8f0;">
                
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 0.85rem 1.15rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph-bold ph-shield-check" style="font-size: 1.25rem;"></i>
                        <h3 style="font-size: 0.95rem; font-weight: 800; margin: 0; color: #ffffff;">Verifikasi OTP</h3>
                    </div>
                    <button id="btnCloseOtpModal" type="button" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; border-radius: 6px; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>

                <div style="padding: 1.25rem 1.15rem; text-align: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 0.65rem;">
                        <i class="ph-bold ph-key"></i>
                    </div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 0.35rem 0;">Masukkan 6 Digit OTP</h4>
                    <p id="otpNoticeTarget" style="font-size: 0.75rem; color: #64748b; line-height: 1.4; margin: 0 0 1rem 0;">
                        Kode verifikasi telah dikirimkan ke No. WhatsApp/Email baru Anda.
                    </p>

                    <div style="margin-bottom: 1rem;">
                        <input type="text" id="inputOtpCode" maxlength="6" autocomplete="one-time-code" placeholder="000000" style="width: 100%; height: 46px; font-size: 1.5rem; font-weight: 800; text-align: center; letter-spacing: 8px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-family: monospace; color: #1e293b; background: #f8fafc;" onfocus="this.style.borderColor='#2563eb'; this.style.backgroundColor='#ffffff';" onblur="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#f8fafc';">
                        <div id="otpFeedbackMsg" style="font-size: 0.725rem; font-weight: 600; margin-top: 0.4rem; min-height: 18px; color: #ef4444;"></div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button id="btnSubmitVerifyOtp" type="button" class="btn btn-primary" style="width: 100%; justify-content: center; height: 38px; font-weight: 700; font-size: 0.85rem; border-radius: 8px; cursor: pointer;">
                            Verifikasi & Simpan
                        </button>
                        <button id="btnResendOtp" type="button" style="background: none; border: none; color: #2563eb; font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 4px;">
                            Kirim Ulang Kode OTP
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;
}

export function renderMainLayout(contentHtml) {
    try {
        const user = getCurrentUser();
        if (!user) {
            window.location.hash = '#/login';
            return '';
        }

        const isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('sidebar_collapsed') === 'true';

        // Terapkan class penutup sidebar langsung pada body sebelum konten ditampilkan
        if (typeof document !== 'undefined' && document.body) {
            if (isCollapsed) {
                document.body.classList.add('sidebar-collapsed');
            } else {
                document.body.classList.remove('sidebar-collapsed');
            }
        }

        let sidebarHtml = '';
        try {
            sidebarHtml = renderSidebar(user);
        } catch (sErr) {
            console.error("Error rendering sidebar:", sErr);
            sidebarHtml = `<aside class="sidebar ${isCollapsed ? 'collapsed sidebar-collapsed' : ''}"><div style="padding:1rem;color:#ef4444;">Menu Sidebar gagal dimuat</div></aside>`;
        }

        let navbarHtml = '';
        try {
            navbarHtml = renderNavbar(user);
        } catch (nErr) {
            console.error("Error rendering navbar:", nErr);
            navbarHtml = '<header class="navbar"><div style="padding:1rem;font-weight:bold;">Digital RW</div></header>';
        }

        let aiWidgetHtml = '';
        try {
            aiWidgetHtml = renderAiWidget();
        } catch (aErr) {
            console.error("Error rendering AI widget:", aErr);
            aiWidgetHtml = '';
        }

        return `
            <div id="mainLayout" class="main-layout ${isCollapsed ? 'sidebar-collapsed' : ''}">
                ${sidebarHtml}
                <main id="main-content" class="main-content ${isCollapsed ? 'expanded' : ''}">
                    ${navbarHtml}
                    <div id="pageContent" class="page-content">
                        ${contentHtml || ''}
                    </div>
                </main>
            </div>
            ${aiWidgetHtml}
        `;
    } catch (layoutErr) {
        console.error("Critical error in renderMainLayout:", layoutErr);
        return `
            <div style="padding: 2rem; max-width: 800px; margin: 2rem auto; font-family: sans-serif;">
                <h2 style="color: #ef4444;">Terjadi Kendala Memuat Layout</h2>
                <p>${layoutErr.message}</p>
                <div style="margin-top: 1rem;">
                    ${contentHtml || ''}
                </div>
            </div>
        `;
    }
}

/**
 * Memperbarui active state menu sidebar secara instan (0ms) berdasarkan hash / rute aktif.
 */
export function updateSidebarActiveNav(targetPath) {
    try {
        if (typeof document === 'undefined') return;
        const currentHash = targetPath 
            ? (targetPath.startsWith('#') ? targetPath : '#' + (targetPath.startsWith('/') ? targetPath : '/' + targetPath))
            : (window.location.hash || '#/dashboard');
        const basePath = currentHash.split('?')[0];

        const aliasMap = {
            '#/monitoring': '#/monitoring-kegiatan',
            '#/activity-monitoring': '#/monitoring-kegiatan',
            '#/statistik': '#/statistik-rw',
            '#/rw-statistics': '#/statistik-rw',
            '#/manajemen-wilayah': '#/manajemen-rw-rt',
            '#/users': '#/manajemen-pengguna',
            '#/persetujuan-surat': '#/persetujuan-pelayanan',
            '#/notifications': '#/notifikasi',
            '#/test-notification': '#/uji-notifikasi',
            '#/notification-settings': '#/pengaturan-notifikasi',
            '#/warga-data': '#/data-warga',
            '#/kas': '#/kas-iuran'
        };
        const canonicalPath = aliasMap[basePath] || basePath;

        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            if (!item || typeof item.getAttribute !== 'function') return;
            const itemHref = item.getAttribute('href');
            if (!itemHref) return;
            const itemCanonical = aliasMap[itemHref] || itemHref;
            if (itemCanonical === canonicalPath || (canonicalPath.startsWith(itemCanonical + '/') && itemCanonical !== '#/dashboard')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    } catch (err) {
        console.warn("Failed updating sidebar active state:", err);
    }
}

export function setupLayoutEvents() {
    // 0. Theme Toggle Button Handling
    try {
        const btnThemeToggle = document.getElementById('btnThemeToggle');
        if (btnThemeToggle) {
            btnThemeToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleTheme();
            });
        }
    } catch (e) {
        console.warn("Theme toggle event error:", e);
    }

    // 1. Menu toggle handling (Sidebar mobile & desktop collapse)
    try {
        const menuToggle = document.getElementById('menuToggle');
        const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const mainLayout = document.querySelector('.main-layout');

        const isMobile = () => window.innerWidth <= 768;

        // Baca status sidebar dari localStorage
        const isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('sidebar_collapsed') === 'true';

        // Terapkan status konsisten pada desktop
        if (!isMobile()) {
            if (isCollapsed) {
                if (sidebar) {
                    sidebar.classList.add('collapsed');
                    sidebar.classList.add('sidebar-collapsed');
                }
                if (mainContent) mainContent.classList.add('expanded');
                if (mainLayout) mainLayout.classList.add('sidebar-collapsed');
                if (document.body) document.body.classList.add('sidebar-collapsed');
            } else {
                if (sidebar) {
                    sidebar.classList.remove('collapsed');
                    sidebar.classList.remove('sidebar-collapsed');
                }
                if (mainContent) mainContent.classList.remove('expanded');
                if (mainLayout) mainLayout.classList.remove('sidebar-collapsed');
                if (document.body) document.body.classList.remove('sidebar-collapsed');
            }
        }

        const closeSidebarMobile = () => {
            if (sidebar) sidebar.classList.remove('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
            document.body.style.overflow = '';
        };

        const openSidebarMobile = () => {
            if (sidebar) sidebar.classList.add('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isMobile()) {
                    if (sidebar.classList.contains('open')) {
                        closeSidebarMobile();
                    } else {
                        openSidebarMobile();
                    }
                } else {
                    const willCollapse = !sidebar.classList.contains('collapsed');
                    sidebar.classList.toggle('collapsed', willCollapse);
                    sidebar.classList.toggle('sidebar-collapsed', willCollapse);
                    if (mainContent) {
                        mainContent.classList.toggle('expanded', willCollapse);
                    }
                    if (mainLayout) {
                        mainLayout.classList.toggle('sidebar-collapsed', willCollapse);
                    }
                    if (document.body) {
                        document.body.classList.toggle('sidebar-collapsed', willCollapse);
                    }

                    // Periksa status sidebar saat ini dan simpan ke browser storage
                    const isNowCollapsed = sidebar.classList.contains('collapsed');
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('sidebar_collapsed', isNowCollapsed ? 'true' : 'false');
                    }
                }
            });
        }

        if (sidebarCloseBtn) {
            sidebarCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSidebarMobile();
            });
        }

        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSidebarMobile();
            });
        }

        // Auto-close on mobile and instant optimistic active highlight when any nav item in sidebar is clicked
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                if (isMobile()) {
                    closeSidebarMobile();
                }
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMobile() && sidebar && sidebar.classList.contains('open')) {
                closeSidebarMobile();
            }
        });

        // Set active menu based on current hash (termasuk alias)
        updateSidebarActiveNav();
    } catch (e) {
        console.warn("Sidebar events error:", e);
    }

    // 2. Global Search box functionality in navbar (Navigasi Menu Cepat & Prefix/Fuzzy Matching)
    try {
        const globalSearch = document.getElementById('globalNavSearch');
        const resultsDropdown = document.getElementById('globalNavSearchResults');

        if (globalSearch && resultsDropdown) {
            const getNavMenuItems = (user) => {
                if (!user) return [];
                const role = user.role;

                const allItems = [
                    {
                        title: 'Dashboard',
                        route: '#/dashboard',
                        category: 'Menu Utama',
                        icon: 'ph-house',
                        keywords: ['dashboard', 'beranda', 'home', 'ringkasan', 'utama'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA]
                    },
                    {
                        title: 'Data Warga',
                        route: '#/data-warga',
                        category: 'Kependudukan',
                        icon: 'ph-users',
                        keywords: ['data warga', 'warga', 'kependudukan', 'penduduk', 'keluarga', 'kk', 'nik', 'warga data'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT]
                    },
                    {
                        title: 'Monitoring Kegiatan',
                        route: '#/monitoring',
                        category: 'Monitoring & Pengawasan',
                        icon: 'ph-calendar-check',
                        keywords: ['monitoring kegiatan', 'monitoring', 'kegiatan', 'pantau kegiatan', 'pengawasan', 'ronda', 'posyandu', 'kerja bakti', 'activity monitoring'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT]
                    },
                    {
                        title: 'Pengaduan Warga',
                        route: '#/pengaduan',
                        category: 'Layanan & Aduan',
                        icon: 'ph-warning-circle',
                        keywords: ['pengaduan warga', 'pengaduan', 'aduan', 'lapor', 'keluhan', 'aspirasi', 'komplain'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA]
                    },
                    {
                        title: 'Statistik RW',
                        route: '#/statistik',
                        category: 'Monitoring & Pengawasan',
                        icon: 'ph-chart-bar',
                        keywords: ['statistik rw', 'statistik', 'grafik', 'analitik', 'demografi', 'rekap', 'laporan', 'rw statistics'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT]
                    },
                    {
                        title: 'Manajemen RW / RT',
                        route: '#/manajemen-wilayah',
                        category: 'Administrasi Sistem',
                        icon: 'ph-buildings',
                        keywords: ['manajemen rw/rt', 'manajemen rw / rt', 'manajemen wilayah', 'manajemen rw', 'manajemen rt', 'wilayah', 'rt', 'rw', 'struktur organisasi'],
                        roles: [ROLES.SUPER_ADMIN]
                    },
                    {
                        title: 'Manajemen Pengguna',
                        route: '#/users',
                        category: 'Administrasi Sistem',
                        icon: 'ph-users-three',
                        keywords: ['manajemen pengguna', 'users', 'pengguna', 'user', 'kelola akun', 'akun', 'password', 'hak akses'],
                        roles: [ROLES.SUPER_ADMIN]
                    },
                    {
                        title: 'Pusat Notifikasi',
                        route: '#/notifikasi',
                        category: 'Notifikasi & Sistem',
                        icon: 'ph-bell',
                        keywords: ['pusat notifikasi', 'notifikasi', 'notifications', 'pemberitahuan', 'pesan', 'inbox'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA]
                    },
                    {
                        title: 'Uji Coba Notifikasi',
                        route: '#/uji-notifikasi',
                        category: 'Notifikasi & Sistem',
                        icon: 'ph-paper-plane-tilt',
                        keywords: ['uji coba notifikasi', 'uji notifikasi', 'test notifikasi', 'sandbox notifikasi', 'kirim notifikasi', 'test notification'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW]
                    },
                    {
                        title: 'Pengaturan Notifikasi',
                        route: '#/pengaturan-notifikasi',
                        category: 'Notifikasi & Sistem',
                        icon: 'ph-gear',
                        keywords: ['pengaturan notifikasi', 'setting notifikasi', 'preferensi notifikasi', 'notification settings'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA]
                    },
                    {
                        title: role === ROLES.KETUA_RT ? 'Verifikasi Pengajuan' : 'Persetujuan Pelayanan',
                        route: role === ROLES.KETUA_RT ? '#/verifikasi-pengajuan' : (role === ROLES.KETUA_RW ? '#/persetujuan-pelayanan' : '#/pelayanan'),
                        category: 'Pengawasan & Persetujuan',
                        icon: 'ph-file-text',
                        keywords: ['persetujuan pelayanan', 'persetujuan surat', 'verifikasi pengajuan', 'verifikasi surat', 'pelayanan', 'surat pengantar', 'validasi'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT]
                    },
                    {
                        title: 'Status Pengajuan',
                        route: '#/status-pengajuan',
                        category: 'Layanan Mandiri',
                        icon: 'ph-clock',
                        keywords: ['status pengajuan', 'status surat', 'lacak surat', 'permohonan surat', 'riwayat surat', 'riwayat pengajuan'],
                        roles: [ROLES.WARGA]
                    },
                    {
                        title: 'Pengajuan Pelayanan',
                        route: '#/pengajuan-pelayanan',
                        category: 'Layanan Mandiri',
                        icon: 'ph-file-text',
                        keywords: ['pengajuan pelayanan', 'pengajuan surat', 'buat surat', 'ajukan surat', 'layanan mandiri', 'surat pengantar'],
                        roles: [ROLES.WARGA]
                    },
                    {
                        title: 'Manajemen AI',
                        route: '#/manajemen-ai',
                        category: 'Konfigurasi AI',
                        icon: 'ph-robot',
                        keywords: ['manajemen ai', 'kelola ai', 'prompt ai', 'api key ai', 'konfigurasi ai', 'gemini', 'ai config'],
                        roles: [ROLES.SUPER_ADMIN]
                    },
                    {
                        title: 'AI Assistant',
                        route: '#/ai-assistant',
                        category: 'Bantuan Pintar',
                        icon: 'ph-sparkle',
                        keywords: ['ai assistant', 'tanya ai', 'rw assistant', 'bantuan ai', 'chat ai', 'bot', 'tanya'],
                        roles: [ROLES.WARGA]
                    },
                    {
                        title: 'Pengumuman',
                        route: '#/pengumuman',
                        category: 'Informasi',
                        icon: 'ph-megaphone',
                        keywords: ['pengumuman', 'informasi', 'berita', 'warta', 'agenda', 'kabar'],
                        roles: [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.WARGA]
                    },
                    {
                        title: 'Kas & Iuran',
                        route: '#/kas-iuran',
                        category: 'Informasi & Kas',
                        icon: 'ph-wallet',
                        keywords: ['kas & iuran', 'kas', 'iuran', 'keuangan', 'saldo', 'bayar iuran', 'rekap kas', 'kas iuran'],
                        roles: [ROLES.WARGA, ROLES.KETUA_RT, ROLES.KETUA_RW]
                    }
                ];

                return allItems.filter(item => item.roles.includes(role));
            };

            const performSearch = (query, menuItems) => {
                const cleanQuery = (query || '').toLowerCase().trim();
                if (!cleanQuery) return [];

                const scored = [];
                for (const item of menuItems) {
                    const titleLower = item.title.toLowerCase();
                    let score = 0;

                    if (titleLower.startsWith(cleanQuery)) {
                        score = 100;
                    } else if (titleLower.includes(cleanQuery)) {
                        score = 80;
                    } else if (item.keywords.some(k => k.toLowerCase().startsWith(cleanQuery))) {
                        score = 60;
                    } else if (item.keywords.some(k => k.toLowerCase().includes(cleanQuery))) {
                        score = 40;
                    } else {
                        const tokens = cleanQuery.split(/\s+/).filter(Boolean);
                        if (tokens.length > 1 && tokens.every(t => titleLower.includes(t) || item.keywords.some(k => k.includes(t)))) {
                            score = 30;
                        }
                    }

                    if (score > 0) {
                        scored.push({ item, score });
                    }
                }

                scored.sort((a, b) => b.score - a.score);
                return scored.map(s => s.item);
            };

            let activeSelectedIndex = 0;
            let currentMatches = [];

            const hideDropdown = () => {
                resultsDropdown.style.display = 'none';
                resultsDropdown.innerHTML = '';
                activeSelectedIndex = 0;
                currentMatches = [];
            };

            const navigateTo = (route) => {
                if (!route) return;
                window.location.hash = route;
                globalSearch.value = '';
                globalSearch.blur();
                hideDropdown();
            };

            const updateSelectedHighlight = () => {
                const items = resultsDropdown.querySelectorAll('.nav-search-result-item');
                items.forEach((itemEl, idx) => {
                    const badge = itemEl.querySelector('.enter-badge');
                    if (idx === activeSelectedIndex) {
                        itemEl.classList.add('selected');
                        itemEl.style.backgroundColor = '#EFF4FF';
                        if (badge) badge.style.display = 'inline-block';
                        itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    } else {
                        itemEl.classList.remove('selected');
                        itemEl.style.backgroundColor = '';
                        if (badge) badge.style.display = 'none';
                    }
                });
            };

            const renderDropdown = (matches, query) => {
                currentMatches = matches;
                activeSelectedIndex = 0;

                if (matches.length === 0) {
                    resultsDropdown.innerHTML = `
                        <div style="padding: 1.15rem 0.85rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                            <i class="ph-bold ph-magnifying-glass" style="font-size: 1.25rem; display: block; margin: 0 auto 0.35rem; opacity: 0.5;"></i>
                            Menu tidak ditemukan untuk <strong>"${query.replace(/</g, '&lt;')}"</strong>
                        </div>
                    `;
                    resultsDropdown.style.display = 'block';
                    return;
                }

                resultsDropdown.innerHTML = `
                    <div style="padding: 0.4rem 0.65rem 0.45rem; font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; margin-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>Navigasi Menu Cepat (${matches.length})</span>
                        <span style="font-size: 0.65rem; color: #cbd5e1; font-weight: normal; text-transform: none;">Gunakan ↑↓ & Enter</span>
                    </div>
                    <div class="nav-search-items-list" style="display: flex; flex-direction: column; gap: 2px;">
                        ${matches.map((item, idx) => `
                            <div class="nav-search-result-item ${idx === 0 ? 'selected' : ''}" data-route="${item.route}" data-index="${idx}">
                                <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                                    <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(72, 128, 255, 0.1); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
                                        <i class="ph-bold ${item.icon}"></i>
                                    </div>
                                    <div style="text-align: left; overflow: hidden;">
                                        <div class="nav-search-title" style="font-size: 0.875rem; font-weight: 600; color: var(--text-main); line-height: 1.25; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
                                            ${item.title}
                                        </div>
                                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                                            ${item.category}
                                        </div>
                                    </div>
                                </div>
                                <div class="nav-search-enter-wrapper" style="flex-shrink: 0; margin-left: 0.5rem;">
                                    <span class="enter-badge" style="${idx === 0 ? 'display: inline-block;' : 'display: none;'} font-size: 0.65rem; color: #4880FF; font-weight: 700; background: #EFF4FF; padding: 2px 7px; border-radius: 6px; border: 1px solid #DCE7FF; white-space: nowrap;">↵ Enter</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                resultsDropdown.style.display = 'block';

                resultsDropdown.querySelectorAll('.nav-search-result-item').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const route = el.getAttribute('data-route');
                        navigateTo(route);
                    });
                });
            };

            globalSearch.addEventListener('input', () => {
                const query = globalSearch.value.trim().toLowerCase();
                if (!query) {
                    hideDropdown();
                    return;
                }
                const user = getCurrentUser();
                const menuItems = getNavMenuItems(user);
                const matches = performSearch(query, menuItems);
                renderDropdown(matches, query);
            });

            globalSearch.addEventListener('focus', () => {
                const query = globalSearch.value.trim().toLowerCase();
                if (query) {
                    const user = getCurrentUser();
                    const menuItems = getNavMenuItems(user);
                    const matches = performSearch(query, menuItems);
                    renderDropdown(matches, query);
                }
            });

            globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    hideDropdown();
                    return;
                }

                if (e.key === 'ArrowDown') {
                    if (currentMatches.length > 0) {
                        e.preventDefault();
                        activeSelectedIndex = (activeSelectedIndex + 1) % currentMatches.length;
                        updateSelectedHighlight();
                    }
                    return;
                }

                if (e.key === 'ArrowUp') {
                    if (currentMatches.length > 0) {
                        e.preventDefault();
                        activeSelectedIndex = (activeSelectedIndex - 1 + currentMatches.length) % currentMatches.length;
                        updateSelectedHighlight();
                    }
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = globalSearch.value.trim().toLowerCase();
                    if (!query) return;

                    const user = getCurrentUser();
                    const menuItems = getNavMenuItems(user);
                    const matches = currentMatches.length > 0 ? currentMatches : performSearch(query, menuItems);

                    if (matches.length > 0) {
                        const target = matches[activeSelectedIndex] || matches[0];
                        navigateTo(target.route);
                    } else {
                        // Fallback ke input filter tabel/halaman jika ada
                        const pageSearch = document.querySelector('input[type="text"][placeholder*="Cari"]:not(#globalNavSearch)');
                        if (pageSearch) {
                            pageSearch.value = globalSearch.value;
                            pageSearch.dispatchEvent(new Event('input'));
                            hideDropdown();
                        }
                    }
                }
            });

            // Sembunyikan dropdown saat klik di luar area pencarian
            document.addEventListener('click', (e) => {
                if (!globalSearch.contains(e.target) && !resultsDropdown.contains(e.target)) {
                    hideDropdown();
                }
            });
        }
    } catch (e) {
        console.warn("Global Search events error:", e);
    }

    // 3. Logout Handling with pending saves protection
    try {
        const handleLogout = async (btn, e) => {
            if (e) e.preventDefault();
            try {
                if (btn) {
                    btn.style.pointerEvents = 'none';
                    btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> <span>Menyimpan...</span>`;
                }
                await waitForPendingSaves(6000);
            } catch (err) {
                console.warn('[Logout] Error waiting for pending saves:', err);
            } finally {
                logout();
                window.location.hash = '#/login';
            }
        };

        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => handleLogout(btnLogout, e));
        }

        const btnSidebarLogout = document.getElementById('btnSidebarLogout');
        if (btnSidebarLogout) {
            btnSidebarLogout.addEventListener('click', (e) => handleLogout(btnSidebarLogout, e));
        }
    } catch (e) {
        console.warn("Logout event error:", e);
    }

    // 4. Notification Dropdown handling
    try {
        const btnNotifToggle = document.getElementById('btnNotifToggle');
        const notificationDropdown = document.getElementById('notificationDropdown');
        const btnMarkAllRead = document.getElementById('btnMarkAllRead');

        if (btnNotifToggle && notificationDropdown) {
            btnNotifToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!notificationDropdown.contains(e.target) && !btnNotifToggle.contains(e.target)) {
                    notificationDropdown.classList.add('hidden');
                }
            });

            if (btnMarkAllRead) {
                btnMarkAllRead.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const user = getCurrentUser();
                    if (user) {
                        await markAllAsRead(user);
                        syncNavbarNotifHandler();
                    }
                });
            }

            notificationDropdown.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    notificationDropdown.classList.add('hidden');
                });
            });

            // Live update dropdown & badge notification saat auto-sync mendeteksi data/notifikasi baru
            const syncNavbarNotifHandler = () => {
                try {
                    const user = getCurrentUser();
                    if (!user) return;
                    let rawNotif = [];
                    try {
                        rawNotif = (typeof getAllNotifikasi === 'function' ? getAllNotifikasi(user) : []) || [];
                    } catch (e) {
                        rawNotif = [];
                    }
                    const notifArray = Array.isArray(rawNotif) ? rawNotif : [];
                    // Saring array notifikasi agar hanya menyimpan item unik
                    const uniqueNotif = notifArray.filter((item, index, self) => {
                        if (!item) return false;
                        if (item.id) {
                            return index === self.findIndex((t) => t && t.id === item.id);
                        }
                        return index === self.findIndex((t) => 
                            t && t.judul === item.judul && t.pesan === item.pesan && (t.createdAt === item.createdAt || t.created_at === item.created_at || t.tanggal === item.tanggal)
                        );
                    });
                    const allNotif = typeof getUniqueNotifikasi === 'function' ? (getUniqueNotifikasi(uniqueNotif) || []) : uniqueNotif;
                    const safeAllNotif = Array.isArray(allNotif) ? allNotif : [];
                    const unreadNotif = safeAllNotif.filter(n => n && !n.is_read && n.isRead !== true);
                    const unreadCount = (unreadNotif || []).length;

                    // Update badge count di bell button
                    const btnToggle = document.getElementById('btnNotifToggle');
                    if (btnToggle) {
                        let badge = btnToggle.querySelector('.notif-badge-count');
                        if (!badge && typeof document !== 'undefined' && typeof document.createElement === 'function') {
                            badge = document.createElement('span');
                            badge.className = 'notif-badge-count';
                            if (typeof btnToggle.appendChild === 'function') btnToggle.appendChild(badge);
                        }
                        if (badge) {
                            if (unreadCount > 0) {
                                badge.style.display = '';
                                badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
                            } else {
                                badge.style.display = 'none';
                            }
                        }
                    }

                    // Update header badge count & tombol mark all read
                    const headerCountBadge = notificationDropdown.querySelector('#notifHeaderCountBadge');
                    const markAllBtn = notificationDropdown.querySelector('#btnMarkAllRead');
                    if (unreadCount > 0) {
                        if (headerCountBadge) {
                            headerCountBadge.style.display = '';
                            headerCountBadge.textContent = `${unreadCount} Baru`;
                        }
                        if (markAllBtn) {
                            markAllBtn.style.display = '';
                        }
                    } else {
                        if (headerCountBadge) headerCountBadge.style.display = 'none';
                        if (markAllBtn) markAllBtn.style.display = 'none';
                    }

                    // Update konten body dropdown
                    const notifBody = notificationDropdown.querySelector('.notification-body');
                    if (notifBody) {
                        if (safeAllNotif.length === 0) {
                            notifBody.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">Belum ada notifikasi</div>';
                        } else {
                            const displayNotifs = safeAllNotif.slice(0, 8);
                            notifBody.innerHTML = (displayNotifs || []).map(n => {
                                if (!n) return '';
                                let iconClass = 'ph-info';
                                if (n.type === 'success') iconClass = 'ph-check-circle';
                                if (n.type === 'warning') iconClass = 'ph-warning';
                                if (n.type === 'error') iconClass = 'ph-x-circle';

                                let formattedDate = 'Baru saja';
                                try {
                                    const dateVal = n.created_at || n.tanggal || n.waktu;
                                    if (dateVal) {
                                        formattedDate = new Date(dateVal).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                    }
                                } catch (e) {}

                                const isRead = (n.is_read === true || n.isRead === true);
                                return `
                                    <a href="${n.link || '#'}" class="notification-item ${isRead ? '' : 'unread'}" data-id="${n.id}">
                                        <div class="notification-icon ${n.type || 'info'}">
                                            <i class="ph-fill ${iconClass}"></i>
                                        </div>
                                        <div style="flex: 1; min-width: 0;">
                                            ${n.judul ? `<p style="font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--text-main); line-height: 1.25;">${n.judul}</p>` : ''}
                                            <p style="font-size: 0.775rem; font-weight: 500; margin-bottom: 0.2rem; color: #475569; line-height: 1.3;">${n.pesan || ''}</p>
                                            <span style="font-size: 0.7rem; color: var(--text-muted);">${formattedDate}</span>
                                        </div>
                                    </a>
                                `;
                            }).join('');

                            // Re-bind click event to mark individual notification as read
                            notifBody.querySelectorAll('.notification-item').forEach(item => {
                                item.addEventListener('click', async () => {
                                    notificationDropdown.classList.add('hidden');
                                    const id = item.getAttribute('data-id');
                                    if (id) {
                                        await markAsRead(id);
                                        syncNavbarNotifHandler();
                                    }
                                });
                            });
                        }
                    }
                } catch (errSync) {
                    console.warn("Error in syncNavbarNotifHandler:", errSync);
                }
            };
            if (window._syncNavbarNotifHandler) {
                window.removeEventListener('db:synced', window._syncNavbarNotifHandler);
            }
            window._syncNavbarNotifHandler = syncNavbarNotifHandler;
            window.addEventListener('db:synced', window._syncNavbarNotifHandler);

            // Inisialisasi awal instan (0ms) untuk sinkronisasi badge & item notifikasi
            syncNavbarNotifHandler();
        }
    } catch (e) {
        console.warn("Notification dropdown events error:", e);
    }

    // 5. Initialize Global Floating AI Widget events
    try {
        setupAiWidgetEvents();
    } catch (e) {
        console.warn("AI widget events error:", e);
    }

    // 6. User Profile Pop-over Modal (Sesi Aktif Pengguna)
    try {
        const btnHeaderUserProfile = document.getElementById('btnHeaderUserProfile');
        const modalUserProfile = document.getElementById('modalUserProfile');
        const btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
        const btnDoneProfileModal = document.getElementById('btnDoneProfileModal');

        if (btnHeaderUserProfile && modalUserProfile) {
            const openModal = () => {
                const user = getCurrentUser();
                if (!user) return;

                // Ambil data terbaru dari database lokal jika tersedia
                let freshUser = { ...user };
                try {
                    const allUsers = getCollection('users') || [];
                    const foundUser = allUsers.find(u =>
                        (user.id && u.id === user.id) ||
                        (user.username && u.username && u.username.toLowerCase() === user.username.toLowerCase()) ||
                        (user.nik && u.nik && u.nik === user.nik)
                    );
                    if (foundUser) {
                        freshUser = { ...freshUser, ...foundUser };
                    }

                    const allWarga = getCollection('warga') || [];
                    let linkedWarga = null;
                    if (freshUser.nik) {
                        linkedWarga = allWarga.find(w => w.nik === freshUser.nik);
                    }
                    if (linkedWarga) {
                        freshUser.no_hp = freshUser.no_hp || linkedWarga.no_hp || linkedWarga.telepon;
                        freshUser.alamat = freshUser.alamat || linkedWarga.alamat;
                    }
                } catch (dbErr) {
                    console.warn("Error getting fresh user details for profile modal:", dbErr);
                }

                const nameEl = document.getElementById('profModalName');
                const roleEl = document.getElementById('profModalRole');
                const usernameEl = document.getElementById('profModalUsername');
                const nikEl = document.getElementById('profModalNik');
                const wilayahEl = document.getElementById('profModalWilayah');
                const statusEl = document.getElementById('profModalStatus');
                const contactEl = document.getElementById('profModalContact');
                const emailEl = document.getElementById('profModalEmail');
                const avatarEl = document.getElementById('profModalAvatar');

                const fullName = freshUser.nama || freshUser.name || 'Pengguna';
                const role = freshUser.role || 'Warga';
                const username = freshUser.username || '-';
                const nik = freshUser.nik || '-';
                const rt = freshUser.rt ? String(freshUser.rt).padStart(2, '0') : null;
                const rw = freshUser.rw ? String(freshUser.rw).padStart(2, '0') : '05';
                const wilayah = (rt && rt !== '00' && rt !== '-') ? `RT ${rt} / RW ${rw}` : `RW ${rw}`;
                const status = freshUser.status || 'Aktif';
                const contact = freshUser.no_hp || freshUser.telepon || freshUser.phone || '-';
                const email = freshUser.email || '-';
                const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                if (nameEl) nameEl.textContent = fullName;
                if (roleEl) roleEl.textContent = role;
                if (usernameEl) usernameEl.textContent = username;
                if (nikEl) nikEl.textContent = nik;
                if (wilayahEl) wilayahEl.textContent = wilayah;
                if (statusEl) statusEl.textContent = status;
                if (contactEl) contactEl.textContent = contact;
                if (emailEl) emailEl.textContent = email;
                if (avatarEl) avatarEl.textContent = initials;

                modalUserProfile.style.display = 'flex';
            };

            const closeModal = () => {
                exitEditMode();
                modalUserProfile.style.display = 'none';
            };

            // ========================================================
            // LOGIKA EDIT PROFIL & VERIFIKASI OTP
            // ========================================================
            const btnStartEditProfile = document.getElementById('btnStartEditProfile');
            const btnCancelEditProfile = document.getElementById('btnCancelEditProfile');
            const btnSaveEditProfile = document.getElementById('btnSaveEditProfile');
            const profileViewActions = document.getElementById('profileViewActions');
            const profileEditActions = document.getElementById('profileEditActions');

            const contactSpan = document.getElementById('profModalContact');
            const emailSpan = document.getElementById('profModalEmail');
            const inputContact = document.getElementById('inputProfContact');
            const inputEmail = document.getElementById('inputProfEmail');

            const modalOtp = document.getElementById('modalOtpVerification');
            const btnCloseOtpModal = document.getElementById('btnCloseOtpModal');
            const inputOtpCode = document.getElementById('inputOtpCode');
            const btnSubmitVerifyOtp = document.getElementById('btnSubmitVerifyOtp');
            const btnResendOtp = document.getElementById('btnResendOtp');
            const otpFeedbackMsg = document.getElementById('otpFeedbackMsg');
            const otpNoticeTarget = document.getElementById('otpNoticeTarget');

            let pendingProfileData = null;

            function enterEditMode() {
                if (inputContact && contactSpan) {
                    inputContact.value = contactSpan.textContent !== '-' ? contactSpan.textContent.trim() : '';
                    contactSpan.style.display = 'none';
                    inputContact.style.display = 'inline-block';
                }
                if (inputEmail && emailSpan) {
                    inputEmail.value = emailSpan.textContent !== '-' ? emailSpan.textContent.trim() : '';
                    emailSpan.style.display = 'none';
                    inputEmail.style.display = 'inline-block';
                }
                if (profileViewActions) profileViewActions.style.display = 'none';
                if (profileEditActions) profileEditActions.style.display = 'flex';
                if (inputContact) inputContact.focus();
            }

            function exitEditMode() {
                if (inputContact && contactSpan) {
                    inputContact.style.display = 'none';
                    contactSpan.style.display = 'inline-block';
                }
                if (inputEmail && emailSpan) {
                    inputEmail.style.display = 'none';
                    emailSpan.style.display = 'inline-block';
                }
                if (profileViewActions) profileViewActions.style.display = 'flex';
                if (profileEditActions) profileEditActions.style.display = 'none';
            }

            if (btnStartEditProfile) {
                btnStartEditProfile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    enterEditMode();
                });
            }

            if (btnCancelEditProfile) {
                btnCancelEditProfile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    exitEditMode();
                });
            }

            // Fungsi Request OTP ke Backend
            const requestOtpCode = async () => {
                const user = getCurrentUser();
                if (!user || !pendingProfileData) return false;

                try {
                    if (otpFeedbackMsg) otpFeedbackMsg.textContent = '';
                    const payload = {
                        action: 'request_otp',
                        username: user.username || '',
                        user_id: user.id || '',
                        nama: user.nama || user.name || '',
                        no_hp: pendingProfileData.no_hp,
                        email: pendingProfileData.email
                    };

                    const res = await fetch('api/otp_handler.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();

                    if (json && json.success) {
                        if (otpNoticeTarget) {
                            otpNoticeTarget.textContent = `Kode OTP dikirim ke ${pendingProfileData.no_hp || pendingProfileData.email}. (Berlaku 5 menit)`;
                        }
                        if (json.debug_otp && otpFeedbackMsg) {
                            otpFeedbackMsg.style.color = '#2563eb';
                            otpFeedbackMsg.textContent = `[Info Dev/Testing OTP: ${json.debug_otp}]`;
                        }
                        return true;
                    } else {
                        if (otpFeedbackMsg) {
                            otpFeedbackMsg.style.color = '#ef4444';
                            otpFeedbackMsg.textContent = json.error || 'Gagal mengirim OTP.';
                        }
                        return false;
                    }
                } catch (err) {
                    console.error("Error request OTP:", err);
                    if (otpFeedbackMsg) {
                        otpFeedbackMsg.style.color = '#ef4444';
                        otpFeedbackMsg.textContent = 'Koneksi server gagal.';
                    }
                    return false;
                }
            };

            if (btnSaveEditProfile) {
                btnSaveEditProfile.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const newContact = inputContact ? inputContact.value.trim() : '';
                    const newEmail = inputEmail ? inputEmail.value.trim() : '';

                    if (!newContact && !newEmail) {
                        alert('Silakan masukkan minimal No. Kontak atau Email.');
                        return;
                    }

                    pendingProfileData = {
                        no_hp: newContact,
                        email: newEmail
                    };

                    btnSaveEditProfile.disabled = true;
                    btnSaveEditProfile.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Memproses...`;

                    const ok = await requestOtpCode();
                    btnSaveEditProfile.disabled = false;
                    btnSaveEditProfile.innerHTML = `<i class="ph-bold ph-floppy-disk"></i> Simpan`;

                    if (ok && modalOtp) {
                        if (inputOtpCode) inputOtpCode.value = '';
                        modalOtp.style.display = 'flex';
                        if (inputOtpCode) inputOtpCode.focus();
                    }
                });
            }

            if (btnCloseOtpModal) {
                btnCloseOtpModal.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (modalOtp) modalOtp.style.display = 'none';
                });
            }

            if (btnResendOtp) {
                btnResendOtp.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    btnResendOtp.disabled = true;
                    btnResendOtp.textContent = 'Mengirim ulang...';
                    await requestOtpCode();
                    setTimeout(() => {
                        btnResendOtp.disabled = false;
                        btnResendOtp.textContent = 'Kirim Ulang Kode OTP';
                    }, 8000);
                });
            }

            if (btnSubmitVerifyOtp) {
                btnSubmitVerifyOtp.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const user = getCurrentUser();
                    const otpVal = inputOtpCode ? inputOtpCode.value.trim() : '';

                    if (!otpVal || otpVal.length !== 6) {
                        if (otpFeedbackMsg) {
                            otpFeedbackMsg.style.color = '#ef4444';
                            otpFeedbackMsg.textContent = 'Masukkan 6 digit angka OTP yang benar.';
                        }
                        return;
                    }

                    btnSubmitVerifyOtp.disabled = true;
                    btnSubmitVerifyOtp.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Memvalidasi...`;

                    try {
                        const verifyRes = await fetch('api/otp_handler.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'verify_otp',
                                username: user.username,
                                otp: otpVal
                            })
                        });
                        const verifyJson = await verifyRes.json();

                        if (!verifyJson || !verifyJson.success) {
                            if (otpFeedbackMsg) {
                                otpFeedbackMsg.style.color = '#ef4444';
                                otpFeedbackMsg.textContent = verifyJson.error || 'Kode OTP salah atau kadaluarsa.';
                            }
                            btnSubmitVerifyOtp.disabled = false;
                            btnSubmitVerifyOtp.innerHTML = 'Verifikasi & Simpan';
                            return;
                        }

                        const updateRes = await fetch('api/update_profile.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username: user.username,
                                no_hp: pendingProfileData.no_hp,
                                email: pendingProfileData.email
                            })
                        });
                        const updateJson = await updateRes.json();

                        if (updateJson && updateJson.success) {
                            const updatedUser = {
                                ...user,
                                no_hp: pendingProfileData.no_hp,
                                telepon: pendingProfileData.no_hp,
                                email: pendingProfileData.email
                            };

                            localStorage.setItem('rwdigital_current_user', JSON.stringify(updatedUser));
                            localStorage.setItem('user', JSON.stringify(updatedUser));

                            if (contactSpan) contactSpan.textContent = pendingProfileData.no_hp || '-';
                            if (emailSpan) emailSpan.textContent = pendingProfileData.email || '-';

                            if (modalOtp) modalOtp.style.display = 'none';
                            exitEditMode();

                            try {
                                const db = JSON.parse(localStorage.getItem('rwdigital_db_v3') || '{}');
                                if (Array.isArray(db.users)) {
                                    const uIdx = db.users.findIndex(u => u.username === user.username);
                                    if (uIdx !== -1) {
                                        db.users[uIdx].no_hp = pendingProfileData.no_hp;
                                        db.users[uIdx].email = pendingProfileData.email;
                                        localStorage.setItem('rwdigital_db_v3', JSON.stringify(db));
                                    }
                                }
                            } catch (e) {}

                            alert('Profil Anda berhasil diperbarui!');
                        } else {
                            if (otpFeedbackMsg) {
                                otpFeedbackMsg.style.color = '#ef4444';
                                otpFeedbackMsg.textContent = updateJson.error || 'Gagal menyimpan profil.';
                            }
                        }
                    } catch (err) {
                        console.error("Error saving profile:", err);
                        if (otpFeedbackMsg) {
                            otpFeedbackMsg.style.color = '#ef4444';
                            otpFeedbackMsg.textContent = 'Terjadi kesalahan sistem.';
                        }
                    } finally {
                        btnSubmitVerifyOtp.disabled = false;
                        btnSubmitVerifyOtp.innerHTML = 'Verifikasi & Simpan';
                    }
                });
            }

            btnHeaderUserProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal();
            });

            btnHeaderUserProfile.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal();
                }
            });

            if (btnCloseProfileModal) {
                btnCloseProfileModal.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeModal();
                });
            }

            if (btnDoneProfileModal) {
                btnDoneProfileModal.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeModal();
                });
            }

            modalUserProfile.addEventListener('click', (e) => {
                if (e.target === modalUserProfile) {
                    closeModal();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalUserProfile.style.display === 'flex') {
                    closeModal();
                }
            });
        }
    } catch (e) {
        console.warn("Profile modal events error:", e);
    }
}


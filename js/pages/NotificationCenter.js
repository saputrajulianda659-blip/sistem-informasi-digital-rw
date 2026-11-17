// js/pages/NotificationCenter.js
import { getAllNotifikasi, markAsRead, markAllAsRead, KATEGORI_NOTIFIKASI, getUniqueNotifikasi } from '../models/Notifikasi.js';
import { getCurrentUser } from '../models/User.js';

export function renderNotificationCenter() {
    const user = getCurrentUser();
    if (!user) return '';

    const rawNotifications = (typeof getAllNotifikasi === 'function' ? getAllNotifikasi(user.id) : []) || [];
    const safeRaw = Array.isArray(rawNotifications) ? rawNotifications : [];
    const deduped = (typeof getUniqueNotifikasi === 'function' ? getUniqueNotifikasi(safeRaw) : safeRaw) || [];
    const notifications = (Array.isArray(deduped) ? deduped : []).filter((item, index, self) => {
        if (!item) return false;
        if (item.id) return index === self.findIndex((t) => t && t.id === item.id);
        return index === self.findIndex((t) => t && t.judul === item.judul && t.pesan === item.pesan);
    });
    const unreadCount = (notifications || []).filter(n => n && !n.is_read && n.isRead !== true).length;

    return `
        <div class="notification-center-page">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="font-size: 1.65rem; color: var(--text-main); margin: 0 0 0.25rem 0;">Pusat Notifikasi Digital RW</h1>
                    <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Kelola seluruh pemberitahuan pelayanan, pengaduan, kegiatan warga, dan pengumuman lingkungan.</p>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                    ${unreadCount > 0 ? `
                        <button id="btnCenterMarkAllRead" class="btn btn-outline" style="font-weight: 600; padding: 0.6rem 1rem; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="ph-bold ph-checks"></i> Tandai Semua Dibaca (${unreadCount})
                        </button>
                    ` : ''}
                    <a href="#/pengaturan-notifikasi" class="btn" style="border: 1px solid #cbd5e1; color: var(--text-main); font-weight: 600; padding: 0.6rem 1rem; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-gear"></i> Pengaturan
                    </a>
                </div>
            </div>

            <!-- Filter & Category Tabs -->
            <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <!-- Category Chips -->
                    <div id="notifCategoryChips" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                        <button class="chip active" data-category="" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #2563eb; background: #2563eb; color: #ffffff; font-size: 0.8125rem; font-weight: 700; cursor: pointer;">
                            Semua (${notifications.length})
                        </button>
                        <button class="chip" data-category="Pengumuman" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                            Pengumuman
                        </button>
                        <button class="chip" data-category="Pelayanan" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                            Pelayanan Surat
                        </button>
                        <button class="chip" data-category="Pengaduan" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                            Pengaduan
                        </button>
                        <button class="chip" data-category="Kegiatan" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                            Kegiatan
                        </button>
                        <button class="chip" data-category="Kas" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                            Kas & Iuran
                        </button>
                        <button class="chip" data-category="Darurat" style="padding: 6px 14px; border-radius: 9999px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; font-size: 0.8125rem; font-weight: 700; cursor: pointer;">
                            🚨 Darurat
                        </button>
                    </div>

                    <!-- Read Status Filter -->
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <select id="filterReadStatus" class="form-input" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem; font-weight: 600;">
                            <option value="">Status: Semua</option>
                            <option value="unread">Belum Dibaca (${unreadCount})</option>
                            <option value="read">Sudah Dibaca</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Notifications Container -->
            <div id="notifListContainer" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- Populated dynamically via events -->
            </div>
        </div>
    `;
}

export function setupNotificationCenterEvents() {
    const user = getCurrentUser();
    if (!user) return;

    let selectedCategory = '';
    let selectedStatus = '';

    const container = document.getElementById('notifListContainer');
    const statusSelect = document.getElementById('filterReadStatus');
    const chips = document.querySelectorAll('#notifCategoryChips .chip');
    const btnMarkAll = document.getElementById('btnCenterMarkAllRead');

    const renderItems = () => {
        if (!container) return;
        const rawNotifs = getAllNotifikasi(user.id);
        const allNotifs = (typeof getUniqueNotifikasi === 'function' ? getUniqueNotifikasi(rawNotifs) : rawNotifs).filter((item, index, self) => {
            if (item.id) return index === self.findIndex((t) => t.id === item.id);
            return index === self.findIndex((t) => t.judul === item.judul && t.pesan === item.pesan);
        });

        let filtered = allNotifs.filter(n => {
            const matchCat = !selectedCategory || (n.kategori && n.kategori.toLowerCase() === selectedCategory.toLowerCase());
            let matchStatus = true;
            if (selectedStatus === 'unread') matchStatus = (!n.is_read && n.isRead !== true);
            if (selectedStatus === 'read') matchStatus = (n.is_read || n.isRead === true);
            return matchCat && matchStatus;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card" style="padding: 3.5rem 1.5rem; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
                    <div style="width: 64px; height: 64px; border-radius: 9999px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem auto;">
                        <i class="ph ph-bell-slash"></i>
                    </div>
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: #334155; margin: 0 0 0.25rem 0;">Belum Ada Notifikasi</h3>
                    <p style="font-size: 0.875rem; color: #94a3b8; margin: 0;">Belum ada notifikasi yang masuk.</p>
                </div>
            `;
            return;
        }

        const categoryColors = {
            'Pengumuman': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: 'ph-megaphone' },
            'Pelayanan': { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: 'ph-file-text' },
            'Pengaduan': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: 'ph-warning-circle' },
            'Kegiatan': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: 'ph-calendar-check' },
            'Kas': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', icon: 'ph-wallet' },
            'Darurat': { bg: '#fee2e2', color: '#991b1b', border: '#f87171', icon: 'ph-warning-octagon' }
        };

        container.innerHTML = filtered.map(n => {
            const catConfig = categoryColors[n.kategori] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: 'ph-info' };
            const formattedDate = new Date(n.tanggal).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' WIB';

            const isUnread = (!n.is_read && n.isRead !== true);
            const unreadIndicator = isUnread ? `
                <span style="width: 8px; height: 8px; border-radius: 9999px; background: #2563eb; display: inline-block; margin-right: 6px;"></span>
            ` : '';

            return `
                <div class="card notif-card-item" data-id="${n.id}" style="background: ${n.is_read ? '#ffffff' : '#f8faff'}; border: 1px solid ${n.is_read ? '#e2e8f0' : '#bfdbfe'}; border-left: 4px solid ${n.is_read ? '#cbd5e1' : '#2563eb'}; border-radius: 12px; padding: 1.25rem; transition: transform 0.2s ease, box-shadow 0.2s ease;">
                    <div style="display: flex; gap: 1rem; align-items: flex-start;">
                        <div style="width: 44px; height: 44px; border-radius: 10px; background: ${catConfig.bg}; color: ${catConfig.color}; border: 1px solid ${catConfig.border}; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
                            <i class="ph-bold ${catConfig.icon}"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.5rem;">
                                <div style="display: flex; align-items: center;">
                                    ${unreadIndicator}
                                    <span style="font-size: 0.75rem; font-weight: 700; color: ${catConfig.color}; background: ${catConfig.bg}; border: 1px solid ${catConfig.border}; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
                                        ${n.kategori || 'Informasi'}
                                    </span>
                                </div>
                                <span style="font-size: 0.75rem; color: #64748b;">${formattedDate}</span>
                            </div>
                            <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 0.35rem 0; line-height: 1.3;">
                                ${n.judul || 'Pemberitahuan Digital RW'}
                            </h4>
                            <p style="font-size: 0.875rem; color: #334155; margin: 0 0 0.75rem 0; line-height: 1.5; white-space: pre-line;">
                                ${n.pesan || ''}
                            </p>
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                                <div>
                                    ${n.link ? `
                                        <a href="${n.link}" class="btn btn-sm btn-action-open" data-id="${n.id}" style="padding: 5px 12px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                                            <span>Buka Detail</span> <i class="ph-bold ph-arrow-right"></i>
                                        </a>
                                    ` : ''}
                                </div>
                                <div>
                                    ${!n.is_read ? `
                                        <button class="btn btn-sm btn-mark-single-read" data-id="${n.id}" style="background: none; border: none; color: #64748b; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-decoration: underline;">
                                            Tandai sudah dibaca
                                        </button>
                                    ` : `
                                        <span style="font-size: 0.75rem; color: #94a3b8;"><i class="ph-bold ph-check"></i> Sudah dibaca</span>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners for open & mark read
        container.querySelectorAll('.btn-mark-single-read').forEach(b => {
            b.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (id) {
                    await markAsRead(id);
                    renderItems();
                    updateNavbarBadge();
                }
            };
        });

        container.querySelectorAll('.btn-action-open').forEach(b => {
            b.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (id) {
                    await markAsRead(id);
                    updateNavbarBadge();
                }
            };
        });
    };

    const updateNavbarBadge = () => {
        const rawNotifs = (typeof getAllNotifikasi === 'function' ? getAllNotifikasi(user.id) : []) || [];
        const safeRaw = Array.isArray(rawNotifs) ? rawNotifs : [];
        const deduped = (typeof getUniqueNotifikasi === 'function' ? getUniqueNotifikasi(safeRaw) : safeRaw) || [];
        const uniqueNotifs = (Array.isArray(deduped) ? deduped : []).filter((item, index, self) => {
            if (!item) return false;
            if (item.id) return index === self.findIndex((t) => t && t.id === item.id);
            return index === self.findIndex((t) => t && t.judul === item.judul && t.pesan === item.pesan);
        });
        const unread = (uniqueNotifs || []).filter(n => n && !n.is_read && n.isRead !== true).length;
        const badgeEl = document.querySelector('.notif-badge-count');
        if (badgeEl) {
            if (unread > 0) {
                badgeEl.innerText = unread > 99 ? '99+' : unread;
                badgeEl.style.display = 'flex';
            } else {
                badgeEl.style.display = 'none';
            }
        }
    };

    // Category chips click
    chips.forEach(chip => {
        chip.onclick = () => {
            chips.forEach(c => {
                c.style.background = '#ffffff';
                c.style.color = '#475569';
                c.style.border = '1px solid #cbd5e1';
                c.classList.remove('active');
            });
            chip.classList.add('active');
            chip.style.background = '#2563eb';
            chip.style.color = '#ffffff';
            chip.style.border = '1px solid #2563eb';

            selectedCategory = chip.getAttribute('data-category') || '';
            renderItems();
        };
    });

    if (statusSelect) {
        statusSelect.onchange = () => {
            selectedStatus = statusSelect.value;
            renderItems();
        };
    }

    if (btnMarkAll) {
        btnMarkAll.onclick = async () => {
            await markAllAsRead(user.id);
            btnMarkAll.remove();
            renderItems();
            updateNavbarBadge();
        };
    }

    // Auto-refresh daftar notifikasi ketika background polling (auto-sync) menerima data baru
    const notifSyncHandler = () => {
        if (window.location.hash.startsWith('#/notifikasi')) {
            renderItems();
            updateNavbarBadge();
        }
    };
    if (window._notifCenterSyncHandler) {
        window.removeEventListener('db:synced', window._notifCenterSyncHandler);
    }
    window._notifCenterSyncHandler = notifSyncHandler;
    window.addEventListener('db:synced', window._notifCenterSyncHandler);

    renderItems();
}

// js/pages/PengaduanList.js
import { getAllPengaduan, getPengaduanByNik, STATUS_PENGADUAN } from '../models/Pengaduan.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { getWargaByNIK } from '../models/Warga.js';
import { renderStatusBadge } from '../utils/badge.js';

export function getDbUrl() {
    if (typeof window !== 'undefined' && window.location) {
        // Jika diakses via subfolder Apache (http://localhost/project%20RPL/...)
        const path = window.location.pathname;
        if (path.includes('project')) {
            const rootFolder = path.substring(0, path.indexOf('/', 1) + 1);
            return `${rootFolder}api/database.json`;
        }
        // Jika diakses via root (http://localhost:3000/...)
        return '/api/database.json';
    }
    return 'api/database.json';
}

export const getDatabaseUrl = getDbUrl;

function getStatusBadge(status) {
    return renderStatusBadge(status);
}

function formatTanggalIndo(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

export function filterPengaduanByUser(allPengaduan, currentUser) {
    if (!Array.isArray(allPengaduan)) return [];
    return allPengaduan.filter(item => {
        if (!item || typeof item !== 'object') return false;

        const role = String(currentUser?.role || '').toLowerCase();

        // 1. Super Admin dan Ketua RW: Melihat semua laporan
        if (currentUser?.role === 'super_admin' || currentUser?.role === 'rw' || 
            currentUser?.role === ROLES?.SUPER_ADMIN || currentUser?.role === ROLES?.KETUA_RW ||
            role === 'super_admin' || role === 'rw' || role.includes('rw') || role.includes('super')) {
            return true;
        }

        // 2. Ketua RT: HANYA melihat laporan yang berada di RT yang sama persis
        if (currentUser?.role === 'rt' || currentUser?.role === ROLES?.KETUA_RT || role === 'rt' || role.includes('rt')) {
            let resolvedItemRt = item.rt;
            if (!resolvedItemRt) {
                const nik = item.nik || item.nik_pelapor;
                if (nik && typeof getWargaByNIK === 'function') {
                    try {
                        const warga = getWargaByNIK(nik);
                        if (warga && warga.rt) resolvedItemRt = warga.rt;
                    } catch (e) {}
                }
            }
            if (!resolvedItemRt && item.lokasi) {
                const rtMatch = String(item.lokasi).match(/RT\s*0?(\d+)/i);
                if (rtMatch) resolvedItemRt = rtMatch[1];
            }

            // Normalisasi format RT (misal '01' atau '1')
            const itemRt = String(resolvedItemRt || item.rt || '').padStart(2, '0');
            const userRt = String(currentUser?.rt || '').padStart(2, '0');
            return Boolean(userRt && itemRt === userRt);
        }

        // 3. Warga: HANYA melihat laporan yang dibuat oleh dirinya sendiri (PRIVAT)
        if (currentUser?.role === 'warga' || currentUser?.role === ROLES?.WARGA || role === 'warga') {
            const itemNik = item.nik || item.nik_pelapor;
            const userNik = currentUser?.nik;
            const cocokNik = Boolean(itemNik && userNik && String(itemNik).trim() === String(userNik).trim());
            
            const itemUserId = item.userId || item.user_id;
            const cocokUser = Boolean(itemUserId && currentUser?.id && String(itemUserId) === String(currentUser.id));
            
            const pelaporName = item.pelapor || item.nama_pelapor;
            const userName = currentUser?.nama || currentUser?.name;
            const cocokPelapor = Boolean(pelaporName && userName && String(pelaporName).toLowerCase() === String(userName).toLowerCase());

            return cocokNik || cocokUser || cocokPelapor;
        }

        return false;
    });
}

export function renderPengaduanCards(pengaduanList, isWargaRole) {
    if (!pengaduanList || pengaduanList.length === 0) {
        return `
            <div class="card text-center" style="border: 1px dashed var(--border-color); padding: 3.5rem 1.5rem; text-align: center;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1rem auto;">
                    <i class="ph-bold ph-chat-circle-dots"></i>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Belum Ada Pengaduan</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Tidak ada laporan pengaduan lingkungan yang diajukan saat ini.</p>
            </div>
        `;
    }

    return pengaduanList.map(p => {
        if (!p) return '';
        const judul = p.judul || 'Laporan Pengaduan';
        const kategori = p.kategori || 'Lainnya';
        const status = p.status || 'Baru';
        const deskripsi = p.deskripsi || '-';
        const pelapor = p.nama_pelapor || p.pelapor || '-';
        const lokasi = p.lokasi || '-';
        const tanggal = formatTanggalIndo(p.tanggal_pengaduan || p.created_at);

        return `
        <div class="card pengaduan-item-card" data-judul="${String(judul).toLowerCase()}" data-kategori="${String(kategori).toLowerCase()}" data-status="${String(status).toLowerCase()}" style="padding: 22px; transition: transform var(--transition-fast), box-shadow var(--transition-fast);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 10px; flex-wrap: wrap;">
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.3;">${judul}</h3>
                ${getStatusBadge(status)}
            </div>
            
            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px;">
                <span style="display: inline-flex; align-items: center; gap: 6px;"><i class="ph-bold ph-tag" style="color: var(--primary-color); font-size: 1rem;"></i> <strong>${kategori}</strong></span>
                <span style="display: inline-flex; align-items: center; gap: 6px;"><i class="ph-bold ph-calendar" style="font-size: 1rem;"></i> ${tanggal}</span>
                ${!isWargaRole ? `<span style="display: inline-flex; align-items: center; gap: 6px;"><i class="ph-bold ph-user" style="font-size: 1rem;"></i> ${pelapor}</span>` : ''}
                <span style="display: inline-flex; align-items: center; gap: 6px;"><i class="ph-bold ph-map-pin" style="color: var(--danger-color); font-size: 1rem;"></i> ${lokasi}</span>
            </div>
            
            <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 14px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${deskripsi}
            </p>
            
            <div style="border-top: 1px solid var(--border-light); padding-top: 12px; display: flex; justify-content: flex-end;">
                <a href="#/pengaduan/detail?id=${p.id}" class="btn btn-sm btn-outline" style="font-weight: 700; color: var(--primary-color); display: inline-flex; align-items: center; gap: 6px;">
                    <i class="ph-bold ph-eye"></i> Detail Pengaduan &rarr;
                </a>
            </div>
        </div>
        `;
    }).join('');
}

export async function muatPengaduanTerbaru() {
    try {
        const targetUrl = getDbUrl();
        const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.pengaduan)) {
                try {
                    localStorage.setItem('pengaduan', JSON.stringify(data.pengaduan));
                    const rawDb = localStorage.getItem('rwdigital_db_v3');
                    const parsedDb = rawDb ? JSON.parse(rawDb) : {};
                    parsedDb.pengaduan = data.pengaduan;
                    localStorage.setItem('rwdigital_db_v3', JSON.stringify(parsedDb));
                } catch (e) {}
                return data.pengaduan;
            }
        }
    } catch (err) {
        console.warn('Gagal memuat pengaduan live:', err);
    }
    return getAllPengaduan() || [];
}

export function renderPengaduanList() {
    try {
        // Fallback aman untuk currentUser mencegah error runtime layar putih jika data user belum siap / null
        const currentUser = (() => {
            try {
                const parsed = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    return parsed;
                }
            } catch (e) {}
            try {
                const fromModel = getCurrentUser();
                if (fromModel && typeof fromModel === 'object') return fromModel;
            } catch (e) {}
            return {};
        })();

        let allPengaduan = [];
        try {
            allPengaduan = (typeof getAllPengaduan === 'function' ? getAllPengaduan() : []) || [];
            if (!Array.isArray(allPengaduan) || allPengaduan.length === 0) {
                const fromLocal = JSON.parse(localStorage.getItem('pengaduan') || '[]');
                if (Array.isArray(fromLocal) && fromLocal.length > 0) {
                    allPengaduan = fromLocal;
                } else {
                    const rawDb = localStorage.getItem('rwdigital_db_v3');
                    if (rawDb) {
                        const parsed = JSON.parse(rawDb);
                        if (Array.isArray(parsed.pengaduan)) allPengaduan = parsed.pengaduan;
                    }
                }
            }
        } catch (e) {
            allPengaduan = [];
        }

        const pengaduanList = filterPengaduanByUser(allPengaduan, currentUser);
        const isWargaRole = currentUser?.role === 'warga' || currentUser?.role === ROLES?.WARGA;
        const listHtml = renderPengaduanCards(pengaduanList, isWargaRole);

        const btnCreateHtml = isWargaRole ? `
            <a href="#/pengaduan/form" class="btn btn-primary" style="white-space: nowrap; font-weight: 700;">
                <i class="ph-bold ph-plus"></i> Buat Pengaduan
            </a>
        ` : '';

        return `
            <div>
                <!-- Header Section -->
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Daftar Pengaduan Warga</h1>
                        <p class="page-subtitle">Pantau dan tindak lanjuti laporan aspirasi, keamanan, dan ketertiban lingkungan</p>
                    </div>
                    ${btnCreateHtml}
                </div>

                <!-- Search & Filter Toolbar -->
                <div class="card mb-4" style="padding: 1rem 1.25rem;">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                        <div style="display: flex; gap: 0.75rem; flex: 1; min-width: 260px; max-width: 500px;">
                            <input type="text" id="searchPengaduanInput" class="form-input" placeholder="🔍 Cari judul pengaduan, kategori, lokasi..." style="padding: 8px 14px;">
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">
                            Total: <strong id="pengaduanTotalCount" style="color: var(--text-main);">${pengaduanList.length}</strong> pengaduan
                        </div>
                    </div>
                </div>
                
                <div id="pengaduanListContainer" style="display: flex; flex-direction: column; gap: 16px;">
                    ${listHtml}
                </div>
            </div>
        `;
    } catch (renderError) {
        console.error("Error rendering pengaduan list:", renderError);
        return `
            <div class="card" style="padding: 2rem; border-left: 4px solid var(--danger-color); max-width: 700px; margin: 1.5rem auto;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem;">
                    <i class="ph-bold ph-warning-circle" style="font-size: 1.5rem; color: var(--danger-color);"></i>
                    <h3 style="color: var(--danger-color); font-weight: 700; margin: 0;">Kendala Memuat Pengaduan</h3>
                </div>
                <p class="text-muted" style="margin-bottom: 1.25rem;">Terjadi kendala saat memproses daftar pengaduan: ${renderError.message || 'Unknown error'}</p>
                <a href="#/dashboard" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                    <i class="ph-bold ph-house"></i> Kembali ke Dashboard
                </a>
            </div>
        `;
    }
}

export async function setupPengaduanListEvents() {
    const searchInput = document.getElementById('searchPengaduanInput');
    const container = document.getElementById('pengaduanListContainer');
    const totalCountEl = document.getElementById('pengaduanTotalCount');

    const updateUIWithItems = (rawItems) => {
        if (!container) return;
        const currentUser = (() => {
            try {
                const parsed = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {}
            return {};
        })();
        const isWargaRole = currentUser?.role === 'warga' || currentUser?.role === ROLES?.WARGA;
        const filtered = filterPengaduanByUser(rawItems, currentUser);
        container.innerHTML = renderPengaduanCards(filtered, isWargaRole);
        if (totalCountEl) {
            totalCountEl.innerText = filtered.length;
        }
    };

    if (searchInput && container) {
        searchInput.addEventListener('input', (e) => {
            const query = (e.target.value || '').trim().toLowerCase();
            const cards = container.querySelectorAll('.pengaduan-item-card');

            cards.forEach(card => {
                const judul = card.getAttribute('data-judul') || '';
                const kategori = card.getAttribute('data-kategori') || '';
                const status = card.getAttribute('data-status') || '';

                if (judul.includes(query) || kategori.includes(query) || status.includes(query)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // 1. Muat pengaduan terbaru secara live di latar belakang (tanpa memblokir render UI instan 0ms)
    setTimeout(async () => {
        try {
            const liveItems = await muatPengaduanTerbaru();
            if (Array.isArray(liveItems)) {
                updateUIWithItems(liveItems);
            }
        } catch (e) {}
    }, 500);

    // 2. Listener auto-sync background
    const syncHandler = (e) => {
        if (!window.location.hash.startsWith('#/pengaduan') || window.location.hash.includes('form') || window.location.hash.includes('detail')) return;
        const liveItems = e.detail?.database?.pengaduan;
        if (Array.isArray(liveItems)) {
            updateUIWithItems(liveItems);
        }
    };
    if (window._pengaduanLiveSyncHandler) {
        window.removeEventListener('db:synced', window._pengaduanLiveSyncHandler);
    }
    window._pengaduanLiveSyncHandler = syncHandler;
    window.addEventListener('db:synced', window._pengaduanLiveSyncHandler);
}

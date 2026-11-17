// js/pages/PengumumanList.js
import { getAllPengumuman, deletePengumuman } from '../models/Pengumuman.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { syncWithBackend } from '../utils/db.js';

function getKategoriBadge(kategori) {
    switch(kategori) {
        case 'Kegiatan': 
            return '<span class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"><i class="ph-bold ph-calendar-check"></i> KEGIATAN</span>';
        case 'Informasi': 
            return '<span class="bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"><i class="ph-bold ph-info"></i> INFORMASI</span>';
        case 'Administrasi': 
            return '<span class="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"><i class="ph-bold ph-file-text"></i> ADMINISTRASI</span>';
        case 'Darurat': 
            return '<span class="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"><i class="ph-bold ph-warning"></i> DARURAT</span>';
        default: 
            return '<span class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"><i class="ph-bold ph-megaphone"></i> ' + (kategori || 'PENGUMUMAN').toUpperCase() + '</span>';
    }
}

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

export function getApiUrl(endpoint = '') {
    // Bersihkan endpoint dari slash depan jika ada
    const cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\//, '');
    
    // Jika dibuka di port 3000 (npx serve / root development)
    if (typeof window !== 'undefined' && window.location.port === '3000') {
        return `api/${cleanEndpoint}`;
    }
    
    // Jika dibuka lewat Apache Laragon (localhost/project%20RPL/ atau sejenisnya)
    if (typeof window !== 'undefined' && window.location) {
        const path = window.location.pathname;
        const projectFolderMatch = path.match(/^\/([^\/]+)\//);
        const baseFolder = projectFolderMatch ? projectFolderMatch[0] : '/';
        return `${baseFolder}api/${cleanEndpoint}`;
    }
    return `api/${cleanEndpoint}`;
}

/**
 * Muat pengumuman terbaru secara live langsung dari file api/database.json
 * Mengabaikan cache browser / Apache (anti-cache no-store)
 */
export async function muatPengumumanTerbaru() {
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
            if (data && Array.isArray(data.pengumuman)) {
                // Update state lokal dan sinkronkan localStorage
                localStorage.setItem('pengumuman', JSON.stringify(data.pengumuman));
                try {
                    const rawDb = localStorage.getItem('rwdigital_db_v3');
                    if (rawDb) {
                        const parsedDb = JSON.parse(rawDb);
                        parsedDb.pengumuman = data.pengumuman;
                        localStorage.setItem('rwdigital_db_v3', JSON.stringify(parsedDb));
                    }
                } catch (e) {}
                return data.pengumuman;
            }
        }
    } catch (err) {
        console.error("Gagal memuat pengumuman live, gunakan fallback:", err);
    }
    // Fallback hanya jika fetch jaringan gagal total
    return JSON.parse(localStorage.getItem('pengumuman') || '[]');
}

export function renderPengumumanCards(pengumumanList, canManage) {
    if (!pengumumanList || pengumumanList.length === 0) {
        return `
            <div id="emptyPengumumanState" class="card text-center" style="border: 1px dashed var(--border-color); padding: 3.5rem 1.5rem; text-align: center;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1rem auto;">
                    <i class="ph-bold ph-megaphone"></i>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Belum Ada Pengumuman</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Pemberitahuan atau agenda lingkungan akan tampil di sini.</p>
            </div>
        `;
    }

    let cardsHtml = `<div id="pengumumanGrid" class="grid grid-cols-1 md:grid-cols-2 gap-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">`;
    cardsHtml += pengumumanList.map(p => {
        const date = new Date(p.tanggal_dibuat).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const adminActions = canManage ? `
            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; justify-content: flex-end;">
                <a href="#/pengumuman/form?id=${p.id}" class="btn btn-sm btn-outline" style="color: var(--primary-color); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Edit Pengumuman">
                    <i class="ph-bold ph-pencil-simple"></i> Edit
                </a>
                <button class="btn btn-sm btn-outline btn-delete-pengumuman" data-id="${p.id}" data-judul="${escapeHtml(p.judul)}" style="color: var(--danger-color); border-color: rgba(239, 56, 38, 0.3); font-weight: 700; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Hapus Pengumuman">
                    <i class="ph-bold ph-trash"></i> Hapus
                </button>
            </div>
        ` : '';

        const draftBadge = p.status_publikasi === 'Draft' 
            ? `<span class="badge-pastel-yellow" style="margin-left: 0.5rem;">DRAFT</span>` 
            : '';

        let rawIsi = p.isi || '';
        let mapsLink = (p.lampiran && p.lampiran.includes('google.com/maps')) ? p.lampiran : null;
        const mapsRegex = /(https?:\/\/(?:www\.)?(?:google\.com\/maps[^\s]+|maps\.app\.goo\.gl[^\s]+|maps\.google\.com[^\s]+))/i;
        const match = rawIsi.match(mapsRegex);
        if (match) {
            if (!mapsLink) mapsLink = match[0];
            rawIsi = rawIsi.replace(match[0], '').trim();
        }
        rawIsi = rawIsi.replace(/Lokasi:\s*$/i, '').trim();

        let mapsBtnHtml = '';
        if (mapsLink) {
            mapsBtnHtml = `
                <div style="margin-top: 12px;">
                    <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background-color: var(--primary-light); color: var(--primary-color); border: 1px solid rgba(72, 128, 255, 0.25); font-weight: 700; padding: 6px 14px; border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
                        <i class="ph-bold ph-map-pin"></i> Buka Peta GPS
                    </a>
                </div>
            `;
        }

        const lampiranHtml = (p.lampiran && !p.lampiran.includes('google.com/maps')) ? `
            <div style="margin-top: 1rem; padding-top: 0.875rem; border-top: 1px solid var(--border-light, #f1f5f9); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                    <i class="ph-bold ph-paperclip" style="color: #94a3b8;"></i>
                    <span style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(p.lampiran)}">${escapeHtml(p.lampiran)}</span>
                </div>
                <a href="${p.lampiran.startsWith('http') || p.lampiran.startsWith('data:') ? p.lampiran : '#'}" 
                   target="_blank" download="${escapeHtml(p.lampiran)}"
                   class="download-lampiran-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                   title="Unduh Lampiran">
                    <i class="ph-bold ph-download-simple"></i> Unduh Lampiran
                </a>
            </div>
        ` : '';

        return `
            <div id="card-pengumuman-${p.id}" class="pengumuman-list-card border-l-4 border-l-blue-600 rounded-2xl shadow-sm border border-slate-200/80 p-6" style="border-left: 4px solid #2563eb; background: var(--surface-color, #ffffff); border-radius: 1rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); border-top: 1px solid rgba(226, 232, 240, 0.8); border-right: 1px solid rgba(226, 232, 240, 0.8); border-bottom: 1px solid rgba(226, 232, 240, 0.8); padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; transition: box-shadow 0.2s ease, transform 0.2s ease;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 6px;">
                        ${getKategoriBadge(p.kategori)}
                        ${draftBadge}
                    </div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem; line-height: 1.35; color: var(--text-main, #1e293b);">${escapeHtml(p.judul)}</h3>
                    <p style="font-size: 0.78rem; color: var(--text-muted, #64748b); margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-calendar"></i> ${date} &nbsp;•&nbsp; <i class="ph-bold ph-user"></i> ${escapeHtml(p.penulis || 'Pengurus RW')}
                    </p>
                    <div style="color: var(--text-secondary, #475569); font-size: 0.9rem; line-height: 1.6;">
                        ${rawIsi.replace(/\n/g, '<br>')}
                    </div>
                    ${mapsBtnHtml}
                    ${lampiranHtml}
                </div>
                ${adminActions}
            </div>
        `;
    }).join('');
    cardsHtml += `</div>`;
    return cardsHtml;
}

export function renderPengumumanList() {
    const user = getCurrentUser();
    const canManage = [ROLES.SUPER_ADMIN, ROLES.ADMIN_RW, ROLES.KETUA_RW].includes(user?.role);
    
    // Managers see all (including Drafts), others see only Published
    const pengumumanList = getAllPengumuman(!canManage);
    
    const btnAddHtml = canManage 
        ? `<a href="#/pengumuman/form" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
             <i class="ph-bold ph-plus"></i> Buat Pengumuman Baru
           </a>` 
        : '';

    const cardsHtml = renderPengumumanCards(pengumumanList, canManage);

    return `
        <div>
            <!-- Header Section -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Portal Informasi & Pengumuman RW</h1>
                    <p class="page-subtitle">Pusat publikasi agenda kegiatan, kerja bakti, pengumuman resmi, dan informasi darurat</p>
                </div>
                <div>
                    ${btnAddHtml}
                </div>
            </div>

            <div id="pengumumanAlertContainer" style="margin-bottom: 1rem;"></div>

            <div id="pengumumanCardsWrapper">
                ${cardsHtml}
            </div>

            <!-- Modal Konfirmasi Hapus Pengumuman Custom UI -->
            <div id="modalConfirmDeletePengumuman" class="modal-backdrop" style="display: none; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(15,23,42,0.65); z-index: 10001; backdrop-filter: blur(4px); padding: 1rem;">
                <div class="card" style="width: 100%; max-width: 480px; padding: 2rem; border-radius: 16px; background: #ffffff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); text-align: left;">
                    <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0;">
                            <i class="ph-bold ph-trash"></i>
                        </div>
                        <div>
                            <h3 id="deletePengumumanModalTitle" style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0 0 0.35rem 0;">Hapus Pengumuman?</h3>
                            <p id="deletePengumumanModalMessage" style="font-size: 0.885rem; color: #64748b; margin: 0; line-height: 1.5;">Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.</p>
                        </div>
                    </div>

                    <div id="deletePengumumanTargetPreview" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.9rem; color: #334155; font-weight: 600;">
                        -
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button type="button" id="btnCancelDeletePengumuman" class="btn btn-secondary btn-cancel" style="padding: 9px 18px;">
                            Batal
                        </button>
                        <button type="button" id="btnConfirmDeletePengumuman" class="btn btn-danger" style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 9px 22px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                            <i class="ph-bold ph-trash"></i> Ya, Hapus
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export async function setupPengumumanListEvents() {
    const alertContainer = document.getElementById('pengumumanAlertContainer');

    let pendingDeleteId = null;
    let pendingDeleteJudul = '';
    let pendingCardEl = null;

    const showNotification = (message, type = 'success') => {
        if (!alertContainer) return;
        const bg = type === 'success' ? '#dcfce7' : '#fee2e2';
        const color = type === 'success' ? '#166534' : '#991b1b';
        const border = type === 'success' ? '#bbf7d0' : '#fecaca';
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';

        alertContainer.innerHTML = `
            <div style="padding: 12px 18px; border-radius: 10px; background: ${bg}; color: ${color}; border: 1px solid ${border}; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 0.9rem; box-shadow: var(--shadow-sm); animation: fadeIn 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="ph-bold ${icon}" style="font-size: 1.25rem;"></i>
                    <span>${message}</span>
                </div>
                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: ${color}; font-size: 1.2rem; cursor: pointer;">&times;</button>
            </div>
        `;

        setTimeout(() => {
            if (alertContainer.firstChild) {
                alertContainer.innerHTML = '';
            }
        }, 5000);
    };

    // Core execution function for deleting an announcement permanently
    const executeDelete = async (id, cardEl) => {
        try {
            await deletePengumuman(id);

            if (cardEl) {
                cardEl.style.transition = 'all 0.35s ease';
                cardEl.style.opacity = '0';
                cardEl.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    cardEl.remove();
                    const grid = document.getElementById('pengumumanGrid');
                    if (grid && grid.children.length === 0) {
                        grid.outerHTML = `
                            <div id="emptyPengumumanState" class="card text-center" style="border: 1px dashed var(--border-color); padding: 3.5rem 1.5rem; text-align: center;">
                                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1rem auto;">
                                    <i class="ph-bold ph-megaphone"></i>
                                </div>
                                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Belum Ada Pengumuman</h3>
                                <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Pemberitahuan atau agenda lingkungan akan tampil di sini.</p>
                            </div>
                        `;
                    }
                }, 350);
            }

            if (typeof window.Swal !== 'undefined') {
                window.Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Dihapus',
                    text: 'Pengumuman telah dihapus secara permanen dari database.',
                    timer: 2200,
                    showConfirmButton: false
                });
            } else {
                showNotification('Pengumuman berhasil dihapus secara permanen dari database.', 'success');
            }
        } catch (err) {
            console.error('Delete error:', err);
            if (typeof window.Swal !== 'undefined') {
                window.Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menghapus',
                    text: err.message || 'Terjadi kesalahan saat menghapus pengumuman.'
                });
            } else {
                showNotification(err.message || 'Gagal menghapus pengumuman.', 'error');
            }
        }
    };

    // Helper to bind delete buttons & modal
    const bindDeleteHandlers = () => {
        const deleteButtons = document.querySelectorAll('.btn-delete-pengumuman');
        const customModal = document.getElementById('modalConfirmDeletePengumuman');
        const modalPreview = document.getElementById('deletePengumumanTargetPreview');
        const btnCancelModal = document.getElementById('btnCancelDeletePengumuman');
        const btnConfirmModal = document.getElementById('btnConfirmDeletePengumuman');

        const closeCustomModal = () => {
            if (customModal) customModal.style.display = 'none';
            pendingDeleteId = null;
            pendingDeleteJudul = '';
            pendingCardEl = null;
            if (btnConfirmModal) {
                btnConfirmModal.disabled = false;
                btnConfirmModal.innerHTML = '<i class="ph-bold ph-trash"></i> Ya, Hapus';
            }
        };

        if (btnCancelModal) {
            btnCancelModal.onclick = closeCustomModal;
        }

        if (customModal) {
            customModal.onclick = (e) => {
                if (e.target === customModal) closeCustomModal();
            };
        }

        deleteButtons.forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const judul = e.currentTarget.getAttribute('data-judul') || 'Pengumuman';
                const cardEl = document.getElementById(`card-pengumuman-${id}`) || e.currentTarget.closest('.card');

                if (typeof window.Swal !== 'undefined') {
                    const swalResult = await window.Swal.fire({
                        title: 'Hapus Pengumuman?',
                        text: 'Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Ya, Hapus',
                        cancelButtonText: 'Batal',
                        reverseButtons: true,
                        focusCancel: true
                    });

                    if (swalResult.isConfirmed) {
                        await executeDelete(id, cardEl);
                    }
                } else {
                    pendingDeleteId = id;
                    pendingDeleteJudul = judul;
                    pendingCardEl = cardEl;

                    if (modalPreview) {
                        modalPreview.innerText = `Pengumuman: "${judul}"`;
                    }
                    if (customModal) {
                        customModal.style.display = 'flex';
                    }
                }
            };
        });

        if (btnConfirmModal) {
            btnConfirmModal.onclick = async () => {
                if (!pendingDeleteId) return;

                btnConfirmModal.disabled = true;
                btnConfirmModal.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Menghapus...';

                const idToDelete = pendingDeleteId;
                const cardToDelete = pendingCardEl;

                closeCustomModal();
                await executeDelete(idToDelete, cardToDelete);
            };
        }
    };

    // Bind initial delete handlers
    bindDeleteHandlers();

    // 1. Muat pengumuman terbaru di latar belakang (tanpa memblokir render UI instan 0ms)
    setTimeout(async () => {
        try {
            const liveItems = await muatPengumumanTerbaru();
            if (Array.isArray(liveItems)) {
                const user = getCurrentUser();
                const canManage = [ROLES.SUPER_ADMIN, ROLES.ADMIN_RW, ROLES.KETUA_RW].includes(user?.role);
                const freshList = getAllPengumuman(!canManage, user, liveItems);

                const wrapper = document.getElementById('pengumumanCardsWrapper');
                if (wrapper) {
                    wrapper.innerHTML = renderPengumumanCards(freshList, canManage);
                    bindDeleteHandlers();
                }
            }
        } catch (e) {
            console.warn('Live pengumuman reload notice:', e);
        }
    }, 500);

    // 2. Live listener ketika auto-sync background mendeteksi data pengumuman baru
    const pengumumanLiveSyncHandler = (e) => {
        if (!window.location.hash.startsWith('#/pengumuman') || window.location.hash.includes('form')) return;
        const liveItems = e.detail?.database?.pengumuman;
        if (Array.isArray(liveItems)) {
            const user = getCurrentUser();
            const canManage = [ROLES.SUPER_ADMIN, ROLES.ADMIN_RW, ROLES.KETUA_RW].includes(user?.role);
            const freshList = getAllPengumuman(!canManage, user, liveItems);
            const wrapper = document.getElementById('pengumumanCardsWrapper');
            if (wrapper) {
                wrapper.innerHTML = renderPengumumanCards(freshList, canManage);
                bindDeleteHandlers();
            }
        }
    };
    if (window._pengumumanLiveSyncHandler) {
        window.removeEventListener('db:synced', window._pengumumanLiveSyncHandler);
    }
    window._pengumumanLiveSyncHandler = pengumumanLiveSyncHandler;
    window.addEventListener('db:synced', window._pengumumanLiveSyncHandler);
}
